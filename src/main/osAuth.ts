import { spawn } from "node:child_process";

export type OsAuthResult =
  | { success: true }
  | { success: false; reason: string };

const AUTH_TIMEOUT_MS = 120000;

function getFailureReason(code: number | null): string {
  switch (code) {
    case 2:
      return "Operating system authentication was cancelled.";
    case 4:
      return "Operating system authentication failed. Check your Windows sign-in and try again.";
    case 5:
      return "Windows could not open a device authentication prompt on this PC.";
    default:
      return "Operating system authentication was cancelled or failed.";
  }
}

function runCommand(command: string, args: string[]): Promise<OsAuthResult> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      windowsHide: false,
      stdio: "ignore"
    });

    const timeout = setTimeout(() => {
      child.kill();
      resolve({ success: false, reason: "Operating system authentication timed out." });
    }, AUTH_TIMEOUT_MS);

    child.on("error", () => {
      clearTimeout(timeout);
      resolve({ success: false, reason: "Operating system authentication is unavailable on this device." });
    });

    child.on("exit", (code) => {
      clearTimeout(timeout);
      resolve(
        code === 0
          ? { success: true }
          : { success: false, reason: getFailureReason(code) }
      );
    });
  });
}

function getWindowsAuthScript(): string {
  return `
$code = @"
using System;
using System.Runtime.InteropServices;

public static class AutopilotWindowsAuth {
  [DllImport("advapi32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
  public static extern bool LogonUser(
    string lpszUsername,
    string lpszDomain,
    string lpszPassword,
    int dwLogonType,
    int dwLogonProvider,
    out IntPtr phToken
  );

  [DllImport("kernel32.dll", SetLastError = true)]
  public static extern bool CloseHandle(IntPtr hObject);
}
"@

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type -TypeDefinition $code

function Wait-WinRtOperation($operation, [Type]$resultType) {
  $method = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq "AsTask" -and $_.IsGenericMethodDefinition -and $_.GetParameters().Count -eq 1
  })[0]
  $task = $method.MakeGenericMethod($resultType).Invoke($null, @($operation))
  $task.Wait()
  $task.Result
}

function Try-CurrentUserDeviceVerification {
  try {
    Add-Type -AssemblyName System.Runtime.WindowsRuntime
    [Windows.Security.Credentials.UI.UserConsentVerifier,Windows.Security.Credentials.UI,ContentType=WindowsRuntime] | Out-Null
    [Windows.Security.Credentials.UI.UserConsentVerifierAvailability,Windows.Security.Credentials.UI,ContentType=WindowsRuntime] | Out-Null
    [Windows.Security.Credentials.UI.UserConsentVerificationResult,Windows.Security.Credentials.UI,ContentType=WindowsRuntime] | Out-Null

    $availability = Wait-WinRtOperation ([Windows.Security.Credentials.UI.UserConsentVerifier]::CheckAvailabilityAsync()) ([Windows.Security.Credentials.UI.UserConsentVerifierAvailability])

    if ($availability.ToString() -ne "Available") {
      return $false
    }

    $result = Wait-WinRtOperation ([Windows.Security.Credentials.UI.UserConsentVerifier]::RequestVerificationAsync("Unlock Autopilot saved password")) ([Windows.Security.Credentials.UI.UserConsentVerificationResult])

    if ($result.ToString() -eq "Verified") {
      exit 0
    }

    if ($result.ToString() -eq "Canceled") {
      exit 2
    }

    exit 4
  } catch {
    return $false
  }
}

function Request-AutopilotPassword {
  $form = New-Object System.Windows.Forms.Form
  $form.Text = "Autopilot Password Manager"
  $form.Width = 420
  $form.Height = 188
  $form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::FixedDialog
  $form.MaximizeBox = $false
  $form.MinimizeBox = $false
  $form.StartPosition = [System.Windows.Forms.FormStartPosition]::CenterScreen
  $form.TopMost = $true
  $form.BackColor = [System.Drawing.Color]::FromArgb(255, 250, 242)

  $label = New-Object System.Windows.Forms.Label
  $label.Text = "Enter your Windows password to reveal this saved password."
  $label.AutoSize = $false
  $label.Left = 18
  $label.Top = 18
  $label.Width = 360
  $label.Height = 36
  $label.Font = New-Object System.Drawing.Font("Segoe UI", 9)
  $form.Controls.Add($label)

  $passwordBox = New-Object System.Windows.Forms.TextBox
  $passwordBox.Left = 18
  $passwordBox.Top = 62
  $passwordBox.Width = 366
  $passwordBox.UseSystemPasswordChar = $true
  $passwordBox.Font = New-Object System.Drawing.Font("Segoe UI", 10)
  $form.Controls.Add($passwordBox)

  $okButton = New-Object System.Windows.Forms.Button
  $okButton.Text = "Unlock"
  $okButton.Left = 214
  $okButton.Top = 104
  $okButton.Width = 82
  $okButton.Height = 30
  $okButton.DialogResult = [System.Windows.Forms.DialogResult]::OK
  $form.Controls.Add($okButton)

  $cancelButton = New-Object System.Windows.Forms.Button
  $cancelButton.Text = "Cancel"
  $cancelButton.Left = 304
  $cancelButton.Top = 104
  $cancelButton.Width = 82
  $cancelButton.Height = 30
  $cancelButton.DialogResult = [System.Windows.Forms.DialogResult]::Cancel
  $form.Controls.Add($cancelButton)

  $form.AcceptButton = $okButton
  $form.CancelButton = $cancelButton
  $form.Add_Shown({ $passwordBox.Focus() })

  if ($form.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK) {
    exit 2
  }

  $passwordBox.Text
}

if (Try-CurrentUserDeviceVerification) {
  exit 0
}

$identity = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$logonUsername = [Environment]::UserName
$logonDomain = [Environment]::UserDomainName
if ($identity.Contains("\\")) {
  $parts = $identity.Split("\\", 2)
  $logonDomain = $parts[0]
  $logonUsername = $parts[1]
} elseif ($identity.Contains("@")) {
  $logonUsername = $identity
  $logonDomain = $null
}

$password = Request-AutopilotPassword
if ([string]::IsNullOrEmpty($password)) { exit 2 }

$token = [IntPtr]::Zero
$LOGON32_LOGON_INTERACTIVE = 2
$LOGON32_PROVIDER_DEFAULT = 0
$ok = [AutopilotWindowsAuth]::LogonUser($logonUsername, $logonDomain, $password, $LOGON32_LOGON_INTERACTIVE, $LOGON32_PROVIDER_DEFAULT, [ref]$token)
try {
  if ($ok -and $token -ne [IntPtr]::Zero) {
    [AutopilotWindowsAuth]::CloseHandle($token) | Out-Null
  }
  if (-not $ok) { exit 4 }
  exit 0
} finally {
  $password = $null
}
`;
}

export async function authenticateOperatingSystem(): Promise<OsAuthResult> {
  if (process.platform === "win32") {
    return runCommand("powershell.exe", [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      getWindowsAuthScript()
    ]);
  }

  if (process.platform === "darwin") {
    return runCommand("osascript", [
      "-e",
      'do shell script "true" with administrator privileges with prompt "Autopilot wants to reveal a saved password."'
    ]);
  }

  if (process.platform === "linux") {
    return runCommand("pkexec", ["/bin/true"]);
  }

  return { success: false, reason: "Operating system authentication is not supported on this platform." };
}

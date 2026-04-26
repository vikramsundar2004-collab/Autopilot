$ErrorActionPreference = "SilentlyContinue"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$ElectronPath = Join-Path $ProjectRoot "node_modules\electron\dist\electron.exe"

if (-not (Test-Path -LiteralPath $ElectronPath)) {
  Add-Type -AssemblyName PresentationFramework
  [System.Windows.MessageBox]::Show("Autopilot could not find Electron at $ElectronPath. Run npm install in $ProjectRoot.", "Autopilot Browser")
  exit 1
}

$escapedRoot = $ProjectRoot.Replace("\", "\\")
$runningAutopilot = Get-CimInstance Win32_Process |
  Where-Object {
    $_.Name -eq "electron.exe" -and
    $_.CommandLine -match [regex]::Escape($ProjectRoot)
  }

foreach ($process in $runningAutopilot) {
  Stop-Process -Id $process.ProcessId -Force
}

Start-Process -FilePath $ElectronPath -ArgumentList "`"$ProjectRoot`"" -WorkingDirectory $ProjectRoot -WindowStyle Hidden

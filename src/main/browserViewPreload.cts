import { ipcRenderer } from "electron";

type CredentialCapture = {
  origin: string;
  url: string;
  title: string;
  username: string;
  password: string;
  action: string;
};

type PendingPasswordSave = {
  id: string;
  origin: string;
  url: string;
  title: string;
  username: string;
  createdAt: number;
};

type PasswordSaveResult =
  | { success: true; entries: unknown[] }
  | { success: false; reason: string; entries: unknown[] };

let lastSignature = "";
let lastCaptureAt = 0;
let promptHost: HTMLDivElement | null = null;

function isInputElement(value: Element | null): value is HTMLInputElement {
  return Boolean(value && value.tagName.toLocaleLowerCase() === "input");
}

function isUsableInput(input: HTMLInputElement): boolean {
  const type = (input.getAttribute("type") || "text").toLocaleLowerCase();
  return type !== "hidden" && !input.disabled;
}

function isPasswordInput(input: HTMLInputElement): boolean {
  return (input.getAttribute("type") || "").toLocaleLowerCase() === "password" && isUsableInput(input);
}

function isUsernameCandidate(input: HTMLInputElement): boolean {
  const type = (input.getAttribute("type") || "text").toLocaleLowerCase();
  return ["email", "text", "tel", "search", "url"].includes(type) && isUsableInput(input);
}

function getAutocompleteScore(input: HTMLInputElement): number {
  const autocomplete = input.autocomplete.toLocaleLowerCase();
  if (autocomplete.includes("username") || autocomplete.includes("email")) {
    return 8;
  }

  const label = `${input.name} ${input.id} ${input.placeholder}`.toLocaleLowerCase();
  if (/(user|email|login|account|phone)/u.test(label)) {
    return 5;
  }

  return 0;
}

function findUsernameInput(inputs: HTMLInputElement[], passwordInput: HTMLInputElement): HTMLInputElement | null {
  const passwordIndex = inputs.indexOf(passwordInput);
  const candidates = inputs.filter(isUsernameCandidate);
  if (candidates.length === 0) {
    return null;
  }

  return candidates
    .map((input) => {
      const index = inputs.indexOf(input);
      const beforePasswordBonus = index >= 0 && index < passwordIndex ? 4 : 0;
      const distancePenalty = index >= 0 && passwordIndex >= 0 ? Math.abs(passwordIndex - index) : 0;
      return {
        input,
        score: getAutocompleteScore(input) + beforePasswordBonus - distancePenalty
      };
    })
    .sort((left, right) => right.score - left.score)[0]?.input ?? null;
}

function getFormAction(container: ParentNode): string {
  if (container instanceof HTMLFormElement && container.action) {
    return container.action;
  }

  return window.location.href;
}

function collectCredential(container: ParentNode): CredentialCapture | null {
  const inputs = Array.from(container.querySelectorAll<HTMLInputElement>("input"));
  const passwordInput = inputs.find(isPasswordInput);
  if (!passwordInput || passwordInput.value.length === 0) {
    return null;
  }

  const usernameInput = findUsernameInput(inputs, passwordInput);
  return {
    origin: window.location.origin,
    url: window.location.href,
    title: document.title,
    username: usernameInput?.value ?? "",
    password: passwordInput.value,
    action: getFormAction(container)
  };
}

function getCredentialHost(origin: string): string {
  try {
    return new URL(origin).hostname.replace(/^www\./, "");
  } catch {
    return origin;
  }
}

function getUsernameLabel(username: string): string {
  return username.trim() || "No username detected";
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "\"":
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

function removePasswordPrompt(): void {
  promptHost?.remove();
  promptHost = null;
}

function getPromptStyles(): string {
  return `
    :host {
      all: initial;
      position: fixed;
      top: 18px;
      right: 18px;
      z-index: 2147483647;
      color-scheme: light;
    }

    .card {
      box-sizing: border-box;
      display: grid;
      grid-template-columns: 38px minmax(0, 1fr);
      gap: 11px;
      width: min(360px, calc(100vw - 36px));
      border: 1px solid #deccb5;
      border-radius: 16px;
      background: #fffaf2;
      color: #17231d;
      box-shadow: 0 22px 64px rgba(51, 39, 31, 0.2);
      font-family: Inter, "DM Sans", Aptos, ui-sans-serif, system-ui, sans-serif;
      padding: 13px;
    }

    .icon {
      display: grid;
      place-items: center;
      width: 38px;
      height: 38px;
      border-radius: 12px;
      background: #edf3e8;
      color: #1f4a37;
      font-size: 20px;
      font-weight: 900;
    }

    .copy {
      display: grid;
      gap: 3px;
      min-width: 0;
    }

    strong,
    span,
    small,
    .status {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    strong {
      font-size: 14px;
      font-weight: 900;
      line-height: 1.25;
    }

    span {
      color: #6f6257;
      font-size: 13px;
      font-weight: 750;
      line-height: 1.3;
    }

    small {
      color: #806f61;
      font-size: 11px;
      font-weight: 750;
      line-height: 1.3;
    }

    .actions {
      grid-column: 1 / -1;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-top: 2px;
    }

    button {
      min-height: 38px;
      border: 1px solid #deccb5;
      border-radius: 10px;
      cursor: pointer;
      font: 800 13px Inter, "DM Sans", Aptos, ui-sans-serif, system-ui, sans-serif;
      transition: background 140ms ease, transform 140ms ease;
    }

    button:hover {
      transform: translateY(-1px);
    }

    button:disabled {
      cursor: wait;
      opacity: .65;
      transform: none;
    }

    .save {
      border-color: #1f4a37;
      background: #1f4a37;
      color: #fffaf2;
    }

    .dismiss {
      background: #fffaf2;
      color: #17231d;
    }

    .status {
      grid-column: 1 / -1;
      min-height: 17px;
      color: #6f6257;
      font-size: 12px;
      font-weight: 750;
    }
  `;
}

function showPasswordPrompt(pending: PendingPasswordSave): void {
  removePasswordPrompt();

  promptHost = document.createElement("div");
  promptHost.id = "autopilot-password-save-prompt";
  promptHost.setAttribute("data-autopilot-password-prompt", "true");
  const shadow = promptHost.attachShadow({ mode: "open" });
  shadow.innerHTML = `
    <style>${getPromptStyles()}</style>
    <section class="card" role="dialog" aria-label="Save password">
      <div class="icon" aria-hidden="true">A</div>
      <div class="copy">
        <strong>Save password for ${escapeHtml(getCredentialHost(pending.origin))}?</strong>
        <span>${escapeHtml(getUsernameLabel(pending.username))}</span>
        <small>Autopilot stores username + password with your device key.</small>
      </div>
      <div class="actions">
        <button class="save" type="button" data-autopilot-password-action="save">Save</button>
        <button class="dismiss" type="button" data-autopilot-password-action="dismiss">Not now</button>
      </div>
      <div class="status" role="status"></div>
    </section>
  `;

  const saveButton = shadow.querySelector<HTMLButtonElement>("[data-autopilot-password-action='save']");
  const dismissButton = shadow.querySelector<HTMLButtonElement>("[data-autopilot-password-action='dismiss']");
  const status = shadow.querySelector<HTMLDivElement>(".status");

  saveButton?.addEventListener("click", () => {
    if (!saveButton || !dismissButton || !status) {
      return;
    }

    saveButton.disabled = true;
    dismissButton.disabled = true;
    status.textContent = "Saving...";
    void ipcRenderer.invoke("passwords:save-pending", pending.id).then((result: PasswordSaveResult) => {
      if (result.success) {
        status.textContent = "Saved.";
        window.setTimeout(removePasswordPrompt, 900);
        return;
      }

      saveButton.disabled = false;
      dismissButton.disabled = false;
      status.textContent = result.reason;
    });
  });

  dismissButton?.addEventListener("click", () => {
    void ipcRenderer.invoke("passwords:dismiss-pending", pending.id).finally(removePasswordPrompt);
  });

  const mountTarget = document.body ?? document.documentElement;
  mountTarget.appendChild(promptHost);
}

function sendCredential(container: ParentNode): void {
  const credential = collectCredential(container);
  if (!credential) {
    return;
  }

  const now = Date.now();
  const signature = `${credential.origin}|${credential.username}|${credential.password}`;
  if (signature === lastSignature && now - lastCaptureAt < 2000) {
    return;
  }

  lastSignature = signature;
  lastCaptureAt = now;
  void ipcRenderer.invoke("passwords:stage", credential).then((pending: PendingPasswordSave | null) => {
    if (pending) {
      showPasswordPrompt(pending);
    }
  });
}

function findPasswordContainer(start: Element): ParentNode | null {
  const form = start.closest("form");
  if (form) {
    return form;
  }

  let current: Element | null = start;
  for (let depth = 0; current && depth < 5; depth += 1) {
    if (current.querySelector("input[type='password']")) {
      return current;
    }
    current = current.parentElement;
  }

  return document.querySelector("input[type='password']") ? document : null;
}

document.addEventListener(
  "submit",
  (event) => {
    if (event.target instanceof HTMLFormElement) {
      sendCredential(event.target);
    }
  },
  true
);

document.addEventListener(
  "click",
  (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const control = target?.closest("button, input[type='submit'], input[type='button']");
    if (!control || !isInputElement(control) && control.tagName.toLocaleLowerCase() !== "button") {
      return;
    }

    const container = findPasswordContainer(control);
    if (container) {
      window.setTimeout(() => sendCredential(container), 0);
    }
  },
  true
);

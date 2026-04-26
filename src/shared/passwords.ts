const MAX_LABEL_LENGTH = 160;
const MAX_URL_LENGTH = 2048;
const MAX_PASSWORD_LENGTH = 4096;

export type PasswordAvailability = {
  secureStorage: boolean;
  backend: string;
  reason?: string;
};

export type PasswordCaptureInput = {
  origin?: string;
  url?: string;
  title?: string;
  username?: string;
  password?: string;
  action?: string;
};

export type SanitizedPasswordCapture = {
  origin: string;
  url: string;
  title: string;
  username: string;
  password: string;
  action: string;
};

export type PendingPasswordSave = {
  id: string;
  origin: string;
  url: string;
  title: string;
  username: string;
  createdAt: number;
};

export type PasswordCredentialSummary = {
  id: string;
  origin: string;
  url: string;
  title: string;
  username: string;
  createdAt: number;
  updatedAt: number;
};

export type PasswordCredentialReveal = PasswordCredentialSummary & {
  password: string;
};

export type PasswordSaveResult =
  | { success: true; entries: PasswordCredentialSummary[] }
  | { success: false; reason: string; entries: PasswordCredentialSummary[] };

export type PasswordRevealResult =
  | { success: true; entry: PasswordCredentialReveal }
  | { success: false; reason: string };

export type StoredPasswordRecord = PasswordCredentialSummary & {
  encryptedPassword: string;
};

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function cleanLabel(value: unknown, fallback: string): string {
  const cleaned = readString(value).replace(/\s+/g, " ").trim().slice(0, MAX_LABEL_LENGTH);
  return cleaned || fallback;
}

function cleanOptionalLabel(value: unknown): string {
  return readString(value).replace(/\s+/g, " ").trim().slice(0, MAX_LABEL_LENGTH);
}

function cleanCredentialUrl(value: unknown): string | null {
  const rawValue = readString(value).trim();
  if (!rawValue) {
    return null;
  }

  try {
    const url = new URL(rawValue);
    if (!["http:", "https:"].includes(url.protocol)) {
      return null;
    }

    return url.href.slice(0, MAX_URL_LENGTH);
  } catch {
    return null;
  }
}

export function normalizeCredentialOrigin(value: unknown): string | null {
  const safeUrl = cleanCredentialUrl(value);
  if (!safeUrl) {
    return null;
  }

  return new URL(safeUrl).origin;
}

export function createCredentialId(origin: string, username: string): string {
  return `${origin}::${username.trim().toLocaleLowerCase()}`;
}

export function sanitizePasswordCapture(input: PasswordCaptureInput): SanitizedPasswordCapture | null {
  const origin = normalizeCredentialOrigin(input.origin) ?? normalizeCredentialOrigin(input.url);
  if (!origin) {
    return null;
  }

  const password = readString(input.password).slice(0, MAX_PASSWORD_LENGTH);
  if (password.length === 0) {
    return null;
  }

  const hostname = new URL(origin).hostname;
  return {
    origin,
    url: cleanCredentialUrl(input.url) ?? origin,
    title: cleanLabel(input.title, hostname),
    username: cleanOptionalLabel(input.username),
    password,
    action: cleanCredentialUrl(input.action) ?? origin
  };
}

export function summarizePasswordRecord(record: StoredPasswordRecord): PasswordCredentialSummary {
  const { encryptedPassword: _encryptedPassword, ...summary } = record;
  return summary;
}

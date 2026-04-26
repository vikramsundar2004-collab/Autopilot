import { app, safeStorage, shell } from "electron";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  parseEmailSender,
  type EmailConnectResult,
  type EmailConnectionStatus,
  type EmailMessageSummary,
  type EmailProviderId,
  type EmailSyncResult
} from "../shared/email.js";

type GmailDeviceCodeResponse = {
  device_code: string;
  user_code: string;
  verification_url?: string;
  verification_uri?: string;
  verification_uri_complete?: string;
  expires_in: number;
  interval?: number;
};

type GmailTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

type GmailProfileResponse = {
  emailAddress?: string;
};

type GmailListResponse = {
  messages?: Array<{ id: string; threadId: string }>;
};

type GmailMessageResponse = {
  id?: string;
  threadId?: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string;
  payload?: {
    headers?: Array<{ name: string; value: string }>;
  };
};

type StoredEmailAccount = {
  provider: EmailProviderId;
  accountEmail: string;
  encryptedAccessToken: string;
  encryptedRefreshToken: string;
  expiresAt: number;
  scope: string;
  updatedAt: number;
};

type EmailAccountsFile = {
  version: 1;
  accounts: StoredEmailAccount[];
};

type EmailInboxCacheFile = {
  version: 1;
  messages: EmailMessageSummary[];
};

const STORE_VERSION = 1;
const GMAIL_PROVIDER: EmailProviderId = "gmail";
const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
const GMAIL_DEVICE_CODE_URL = "https://oauth2.googleapis.com/device/code";
const GMAIL_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

function getGoogleClientId(): string {
  return (process.env.AUTOPILOT_GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || "").trim();
}

function isStoredAccount(value: unknown): value is StoredEmailAccount {
  if (!value || typeof value !== "object") {
    return false;
  }

  const account = value as StoredEmailAccount;
  return (
    account.provider === GMAIL_PROVIDER &&
    typeof account.accountEmail === "string" &&
    typeof account.encryptedAccessToken === "string" &&
    typeof account.encryptedRefreshToken === "string" &&
    typeof account.expiresAt === "number" &&
    typeof account.scope === "string" &&
    typeof account.updatedAt === "number"
  );
}

function isMessageSummary(value: unknown): value is EmailMessageSummary {
  if (!value || typeof value !== "object") {
    return false;
  }

  const message = value as EmailMessageSummary;
  return (
    message.provider === GMAIL_PROVIDER &&
    typeof message.id === "string" &&
    typeof message.threadId === "string" &&
    typeof message.from === "string" &&
    typeof message.fromEmail === "string" &&
    typeof message.subject === "string" &&
    typeof message.snippet === "string" &&
    typeof message.receivedAt === "number" &&
    typeof message.unread === "boolean" &&
    typeof message.url === "string"
  );
}

async function postForm<T>(url: string, form: Record<string, string>): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams(form)
  });
  const body = (await response.json()) as T;
  if (!response.ok) {
    const errorBody = body as Partial<GmailTokenResponse>;
    throw new Error(errorBody.error_description || errorBody.error || `Request failed with status ${response.status}`);
  }

  return body;
}

async function getJson<T>(url: string, accessToken: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      authorization: `Bearer ${accessToken}`
    }
  });
  const body = (await response.json()) as T;
  if (!response.ok) {
    throw new Error(`Gmail request failed with status ${response.status}`);
  }

  return body;
}

function getHeader(message: GmailMessageResponse, headerName: string): string {
  const header = message.payload?.headers?.find((entry) => entry.name.toLowerCase() === headerName.toLowerCase());
  return header?.value?.trim() || "";
}

function toMessageSummary(message: GmailMessageResponse): EmailMessageSummary | null {
  if (!message.id || !message.threadId) {
    return null;
  }

  const sender = parseEmailSender(getHeader(message, "From"));
  const dateHeader = Date.parse(getHeader(message, "Date"));
  const internalDate = Number.parseInt(message.internalDate ?? "", 10);
  const receivedAt = Number.isFinite(dateHeader) ? dateHeader : Number.isFinite(internalDate) ? internalDate : Date.now();

  return {
    id: message.id,
    provider: GMAIL_PROVIDER,
    threadId: message.threadId,
    from: sender.name,
    fromEmail: sender.email,
    subject: getHeader(message, "Subject") || "(No subject)",
    snippet: message.snippet || "",
    receivedAt,
    unread: message.labelIds?.includes("UNREAD") ?? false,
    url: `https://mail.google.com/mail/u/0/#inbox/${message.threadId}`
  };
}

export class EmailService {
  constructor(
    private readonly getAccountsPath = () => path.join(app.getPath("userData"), "email-accounts.json"),
    private readonly getCachePath = () => path.join(app.getPath("userData"), "email-inbox.json")
  ) {}

  getStatus(): EmailConnectionStatus {
    const clientId = getGoogleClientId();
    const account = this.getAccount();
    if (!clientId) {
      return {
        provider: GMAIL_PROVIDER,
        configured: false,
        connected: false,
        accountEmail: account?.accountEmail ?? null,
        reason: "Set AUTOPILOT_GOOGLE_CLIENT_ID to enable Gmail sync."
      };
    }

    if (!safeStorage.isEncryptionAvailable()) {
      return {
        provider: GMAIL_PROVIDER,
        configured: true,
        connected: false,
        accountEmail: account?.accountEmail ?? null,
        reason: "Secure token storage is unavailable on this device."
      };
    }

    return {
      provider: GMAIL_PROVIDER,
      configured: true,
      connected: Boolean(account),
      accountEmail: account?.accountEmail ?? null,
      updatedAt: account?.updatedAt,
      reason: account ? undefined : "Connect Gmail to pull inbox messages."
    };
  }

  listCachedMessages(): EmailMessageSummary[] {
    const cachePath = this.getCachePath();
    if (!existsSync(cachePath)) {
      return [];
    }

    try {
      const parsed = JSON.parse(readFileSync(cachePath, "utf8")) as Partial<EmailInboxCacheFile>;
      return Array.isArray(parsed.messages) ? parsed.messages.filter(isMessageSummary) : [];
    } catch {
      return [];
    }
  }

  async connectGmail(): Promise<EmailConnectResult> {
    const clientId = getGoogleClientId();
    if (!clientId || !safeStorage.isEncryptionAvailable()) {
      return {
        success: false,
        status: this.getStatus(),
        reason: this.getStatus().reason
      };
    }

    try {
      const device = await postForm<GmailDeviceCodeResponse>(GMAIL_DEVICE_CODE_URL, {
        client_id: clientId,
        scope: GMAIL_SCOPE
      });
      await shell.openExternal(device.verification_uri_complete || device.verification_uri || device.verification_url || "https://www.google.com/device");
      const token = await this.pollForToken(clientId, device);
      if (!token.access_token) {
        return {
          success: false,
          status: this.getStatus(),
          reason: token.error_description || token.error || "Google did not return an access token."
        };
      }

      const profile = await getJson<GmailProfileResponse>(`${GMAIL_API_BASE}/profile`, token.access_token);
      const now = Date.now();
      const account: StoredEmailAccount = {
        provider: GMAIL_PROVIDER,
        accountEmail: profile.emailAddress || "Gmail account",
        encryptedAccessToken: this.encrypt(token.access_token),
        encryptedRefreshToken: this.encrypt(token.refresh_token || ""),
        expiresAt: now + (token.expires_in ?? 3600) * 1000,
        scope: token.scope || GMAIL_SCOPE,
        updatedAt: now
      };
      this.writeAccounts([account]);
      const sync = await this.syncInbox();

      return {
        success: true,
        status: this.getStatus(),
        messages: sync.messages
      };
    } catch (error) {
      return {
        success: false,
        status: this.getStatus(),
        reason: error instanceof Error ? error.message : "Gmail connection failed."
      };
    }
  }

  async syncInbox(): Promise<EmailSyncResult> {
    const account = this.getAccount();
    if (!account) {
      return {
        success: false,
        status: this.getStatus(),
        messages: this.listCachedMessages(),
        reason: "Connect Gmail before syncing the inbox."
      };
    }

    try {
      const accessToken = await this.getValidAccessToken(account);
      const list = await getJson<GmailListResponse>(
        `${GMAIL_API_BASE}/messages?maxResults=25&q=${encodeURIComponent("in:inbox newer_than:30d")}`,
        accessToken
      );
      const messageRefs = list.messages ?? [];
      const messages = (
        await Promise.all(
          messageRefs.map((message) =>
            getJson<GmailMessageResponse>(
              `${GMAIL_API_BASE}/messages/${message.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
              accessToken
            )
          )
        )
      )
        .map(toMessageSummary)
        .filter((message): message is EmailMessageSummary => Boolean(message))
        .sort((left, right) => right.receivedAt - left.receivedAt);

      this.writeCache(messages);
      return {
        success: true,
        status: this.getStatus(),
        messages
      };
    } catch (error) {
      return {
        success: false,
        status: this.getStatus(),
        messages: this.listCachedMessages(),
        reason: error instanceof Error ? error.message : "Gmail sync failed."
      };
    }
  }

  disconnect(): EmailConnectionStatus {
    this.writeAccounts([]);
    this.writeCache([]);
    return this.getStatus();
  }

  private async pollForToken(clientId: string, device: GmailDeviceCodeResponse): Promise<GmailTokenResponse> {
    const startedAt = Date.now();
    let interval = Math.max(device.interval ?? 5, 5);

    while (Date.now() - startedAt < device.expires_in * 1000) {
      await new Promise((resolve) => setTimeout(resolve, interval * 1000));
      const token = await postForm<GmailTokenResponse>(GMAIL_TOKEN_URL, {
        client_id: clientId,
        device_code: device.device_code,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code"
      }).catch((error) => ({ error: error instanceof Error ? error.message : "authorization_pending" }));

      if (token.error === "authorization_pending") {
        continue;
      }

      if (token.error === "slow_down") {
        interval += 5;
        continue;
      }

      return token;
    }

    return { error: "expired_token", error_description: "Google sign-in timed out." };
  }

  private async getValidAccessToken(account: StoredEmailAccount): Promise<string> {
    if (account.expiresAt > Date.now() + 60_000) {
      return this.decrypt(account.encryptedAccessToken);
    }

    const refreshToken = this.decrypt(account.encryptedRefreshToken);
    if (!refreshToken) {
      throw new Error("Gmail needs to be connected again.");
    }

    const token = await postForm<GmailTokenResponse>(GMAIL_TOKEN_URL, {
      client_id: getGoogleClientId(),
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    });
    if (!token.access_token) {
      throw new Error(token.error_description || token.error || "Google did not return a refreshed access token.");
    }

    const updatedAccount: StoredEmailAccount = {
      ...account,
      encryptedAccessToken: this.encrypt(token.access_token),
      expiresAt: Date.now() + (token.expires_in ?? 3600) * 1000,
      updatedAt: Date.now()
    };
    this.writeAccounts([updatedAccount]);
    return token.access_token;
  }

  private getAccount(): StoredEmailAccount | null {
    return this.readAccounts()[0] ?? null;
  }

  private readAccounts(): StoredEmailAccount[] {
    const accountsPath = this.getAccountsPath();
    if (!existsSync(accountsPath)) {
      return [];
    }

    try {
      const parsed = JSON.parse(readFileSync(accountsPath, "utf8")) as Partial<EmailAccountsFile>;
      return Array.isArray(parsed.accounts) ? parsed.accounts.filter(isStoredAccount) : [];
    } catch {
      return [];
    }
  }

  private writeAccounts(accounts: StoredEmailAccount[]): void {
    const accountsPath = this.getAccountsPath();
    mkdirSync(path.dirname(accountsPath), { recursive: true });
    const tempPath = `${accountsPath}.tmp`;
    writeFileSync(tempPath, JSON.stringify({ version: STORE_VERSION, accounts }, null, 2), "utf8");
    renameSync(tempPath, accountsPath);
  }

  private writeCache(messages: EmailMessageSummary[]): void {
    const cachePath = this.getCachePath();
    mkdirSync(path.dirname(cachePath), { recursive: true });
    const tempPath = `${cachePath}.tmp`;
    writeFileSync(tempPath, JSON.stringify({ version: STORE_VERSION, messages }, null, 2), "utf8");
    renameSync(tempPath, cachePath);
  }

  private encrypt(value: string): string {
    return safeStorage.encryptString(value).toString("base64");
  }

  private decrypt(value: string): string {
    return safeStorage.decryptString(Buffer.from(value, "base64"));
  }
}


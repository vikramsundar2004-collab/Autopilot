import { app, safeStorage, shell } from "electron";
import { createHash, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { createServer, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";

import { mapWithConcurrency } from "../shared/async.js";
import {
  EMAIL_ACTION_ANALYSIS_CANDIDATE_LIMIT,
  GOOGLE_SYNC_SCOPE,
  getEmailActionAnalysisCandidates,
  getGmailMaxResults,
  getGoogleConnectionCapabilities,
  getGrantedGoogleScopes,
  parseEmailSender,
  type EmailActionAnalysisResult,
  type EmailActionSuggestion,
  type EmailConnectResult,
  type EmailConnectionStatus,
  type EmailMessageSummary,
  type EmailProviderId,
  type EmailSyncResult
} from "../shared/email.js";

type GoogleAuthorizationControls = {
  signal: AbortSignal;
  cancel: (reason?: string) => void;
};

type OpenAuthorizationUrl = (url: string, controls: GoogleAuthorizationControls) => Promise<void> | void;

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
  payload?: GmailMessagePart;
};

type GmailMessagePart = {
  mimeType?: string;
  headers?: Array<{ name: string; value: string }>;
  body?: {
    data?: string;
  };
  parts?: GmailMessagePart[];
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

type OpenAiChatCompletionsResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

type OpenAiActionPayload = {
  actions?: unknown[];
};

const STORE_VERSION = 1;
const GMAIL_PROVIDER: EmailProviderId = "gmail";
const GMAIL_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GMAIL_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";
const GMAIL_REDIRECT_PATH = "/oauth/gmail/callback";
const DEFAULT_GMAIL_REDIRECT_PORT = 53682;
const DEFAULT_GOOGLE_SIGN_IN_TIMEOUT_MS = 1000 * 60 * 5;
const DEFAULT_GMAIL_REQUEST_TIMEOUT_MS = 15_000;
const DEFAULT_GMAIL_RETRY_ATTEMPTS = 2;
const DEFAULT_GMAIL_MESSAGE_FETCH_CONCURRENCY = 4;
const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_OPENAI_REQUEST_TIMEOUT_MS = 30_000;
const MAX_OPENAI_EMAIL_MESSAGES = 16;

function getGoogleClientId(): string {
  return (process.env.AUTOPILOT_GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || "").trim();
}

function getGoogleClientSecret(): string {
  return (process.env.AUTOPILOT_GOOGLE_CLIENT_SECRET || process.env.VITE_GOOGLE_CLIENT_SECRET || "").trim();
}

function getGoogleRedirectPort(): number {
  const value = Number.parseInt(process.env.AUTOPILOT_GOOGLE_REDIRECT_PORT || "", 10);
  return Number.isInteger(value) && value > 1024 && value < 65536 ? value : DEFAULT_GMAIL_REDIRECT_PORT;
}

function getGoogleSignInTimeoutMs(): number {
  const value = Number.parseInt(process.env.AUTOPILOT_GOOGLE_SIGN_IN_TIMEOUT_MS || "", 10);
  return Number.isInteger(value) && value >= 30000 && value <= 10 * 60 * 1000 ? value : DEFAULT_GOOGLE_SIGN_IN_TIMEOUT_MS;
}

function getGmailRequestTimeoutMs(): number {
  const value = Number.parseInt(process.env.AUTOPILOT_GMAIL_REQUEST_TIMEOUT_MS || "", 10);
  return Number.isInteger(value) && value >= 3000 && value <= 60000 ? value : DEFAULT_GMAIL_REQUEST_TIMEOUT_MS;
}

function getGmailRetryAttempts(): number {
  const value = Number.parseInt(process.env.AUTOPILOT_GMAIL_RETRY_ATTEMPTS || "", 10);
  return Number.isInteger(value) && value >= 0 && value <= 5 ? value : DEFAULT_GMAIL_RETRY_ATTEMPTS;
}

function getGmailMessageFetchConcurrency(): number {
  const value = Number.parseInt(process.env.AUTOPILOT_GMAIL_MESSAGE_CONCURRENCY || "", 10);
  return Number.isInteger(value) && value >= 1 && value <= 8 ? value : DEFAULT_GMAIL_MESSAGE_FETCH_CONCURRENCY;
}

function getConfiguredGmailMaxResults(): number {
  return getGmailMaxResults(process.env.AUTOPILOT_GMAIL_MAX_RESULTS);
}

function getOpenAiApiKey(): string {
  return (process.env.AUTOPILOT_OPENAI_API_KEY || process.env.OPENAI_API_KEY || "").trim();
}

function getOpenAiModel(): string {
  return (process.env.AUTOPILOT_OPENAI_MODEL || DEFAULT_OPENAI_MODEL).trim();
}

function getOpenAiBaseUrl(): string {
  return (process.env.AUTOPILOT_OPENAI_BASE_URL || DEFAULT_OPENAI_BASE_URL).trim().replace(/\/+$/u, "");
}

function getOpenAiRequestTimeoutMs(): number {
  const value = Number.parseInt(process.env.AUTOPILOT_OPENAI_REQUEST_TIMEOUT_MS || "", 10);
  return Number.isInteger(value) && value >= 5000 && value <= 120000 ? value : DEFAULT_OPENAI_REQUEST_TIMEOUT_MS;
}

function getGoogleOAuthForm(input: Record<string, string>): Record<string, string> {
  const clientSecret = getGoogleClientSecret();
  return clientSecret ? { ...input, client_secret: clientSecret } : input;
}

function base64Url(buffer: Buffer): string {
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function createPkceChallenge(): { verifier: string; challenge: string } {
  const verifier = base64Url(randomBytes(32));
  const challenge = base64Url(createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

function writeOAuthResponse(response: ServerResponse, title: string, message: string): void {
  response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  response.end(`<!doctype html><html><head><title>${title}</title></head><body style="font-family: system-ui; padding: 32px;"><h1>${title}</h1><p>${message}</p></body></html>`);
}

function closeServerSafely(server: ReturnType<typeof createServer>): void {
  try {
    server.close();
  } catch {
    // Already closed.
  }
}

function getGoogleSignInAbortReason(signal: AbortSignal): string {
  return typeof signal.reason === "string" && signal.reason.trim()
    ? signal.reason
    : "Google sign-in was cancelled. Click Connect Google to try again.";
}

async function requestGmailAuthorizationCode(
  clientId: string,
  challenge: string,
  openAuthorizationUrl: OpenAuthorizationUrl
): Promise<{ code: string; redirectUri: string }> {
  const state = base64Url(randomBytes(16));
  const server = createServer();
  const abortController = new AbortController();
  let settled = false;
  let timeout: NodeJS.Timeout | null = null;

  const finish = (
    resolve: (value: { code: string; redirectUri: string }) => void,
    reject: (reason?: unknown) => void,
    value: { code: string; redirectUri: string } | Error
  ): void => {
    if (settled) {
      return;
    }

    settled = true;
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
    closeServerSafely(server);

    if (value instanceof Error) {
      reject(value);
      return;
    }

    resolve(value);
  };

  const codePromise = new Promise<{ code: string; redirectUri: string }>((resolve, reject) => {
    timeout = setTimeout(() => {
      abortController.abort("Google sign-in timed out. Click Connect Google to try again.");
    }, getGoogleSignInTimeoutMs());

    abortController.signal.addEventListener(
      "abort",
      () => {
        finish(resolve, reject, new Error(getGoogleSignInAbortReason(abortController.signal)));
      },
      { once: true }
    );

    server.on("request", (request, response) => {
      const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
      if (requestUrl.pathname !== GMAIL_REDIRECT_PATH) {
        response.writeHead(404);
        response.end("Not found");
        return;
      }

      const error = requestUrl.searchParams.get("error");
      if (error) {
        writeOAuthResponse(response, "Autopilot Google sign-in failed", "Google did not complete the sign-in.");
        finish(resolve, reject, new Error(error));
        return;
      }

      if (requestUrl.searchParams.get("state") !== state) {
        writeOAuthResponse(response, "Autopilot Google sign-in failed", "The sign-in response did not match this Autopilot session.");
        finish(resolve, reject, new Error("Google sign-in state did not match."));
        return;
      }

      const code = requestUrl.searchParams.get("code");
      if (!code) {
        writeOAuthResponse(response, "Autopilot Google sign-in failed", "Google did not return an authorization code.");
        finish(resolve, reject, new Error("Google did not return an authorization code."));
        return;
      }

      const address = server.address() as AddressInfo;
      writeOAuthResponse(response, "Autopilot Google connected", "Gmail and Calendar access are connected. You can close this tab and return to Autopilot.");
      finish(resolve, reject, {
        code,
        redirectUri: `http://127.0.0.1:${address.port}${GMAIL_REDIRECT_PATH}`
      });
    });
  });

  try {
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(getGoogleRedirectPort(), "127.0.0.1", () => {
        server.removeListener("error", reject);
        resolve();
      });
    });
  } catch (error) {
    abortController.abort("Could not start Google sign-in. If another sign-in tab is open, close it and try Connect Google again.");
    void codePromise.catch(() => undefined);
    throw error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "EADDRINUSE"
      ? new Error("A previous Google sign-in is still waiting. Close the old sign-in tab, then click Connect Google again.")
      : error;
  }

  const address = server.address() as AddressInfo;
  const redirectUri = `http://127.0.0.1:${address.port}${GMAIL_REDIRECT_PATH}`;
  const authUrl = new URL(GMAIL_AUTH_URL);
  authUrl.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GOOGLE_SYNC_SCOPE,
    access_type: "offline",
    prompt: "consent",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256"
  }).toString();

  const controls: GoogleAuthorizationControls = {
    signal: abortController.signal,
    cancel: (reason?: string) => {
      if (!abortController.signal.aborted) {
        abortController.abort(reason || "Google sign-in was cancelled. Click Connect Google to try again.");
      }
    }
  };

  try {
    await openAuthorizationUrl(authUrl.toString(), controls);
  } catch (error) {
    controls.cancel(error instanceof Error ? error.message : "Could not open Google sign-in.");
  }

  return codePromise.then((result) => ({
    ...result,
    redirectUri
  }));
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
  const response = await fetchWithRetry(url, {
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
  const response = await fetchWithRetry(url, {
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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

function getRetryDelayMs(response: Response | null, attempt: number): number {
  const retryAfter = response?.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number.parseInt(retryAfter, 10);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return Math.min(seconds * 1000, 30_000);
    }

    const dateMs = Date.parse(retryAfter);
    if (Number.isFinite(dateMs)) {
      return Math.min(Math.max(0, dateMs - Date.now()), 30_000);
    }
  }

  return Math.min(500 * 2 ** attempt, 5_000);
}

function normalizeFetchError(error: unknown, url: string): Error {
  if (error instanceof Error && error.name === "AbortError") {
    return new Error(`Request to ${new URL(url).hostname} timed out after ${Math.round(getGmailRequestTimeoutMs() / 1000)} seconds.`);
  }

  return error instanceof Error ? error : new Error("Network request failed.");
}

async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  const maxAttempts = getGmailRetryAttempts() + 1;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), getGmailRequestTimeoutMs());

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal
      });

      if (!isRetryableStatus(response.status) || attempt === maxAttempts - 1) {
        return response;
      }

      await response.body?.cancel().catch(() => undefined);
      clearTimeout(timeout);
      await delay(getRetryDelayMs(response, attempt));
    } catch (error) {
      lastError = normalizeFetchError(error, url);
      clearTimeout(timeout);
      if (attempt === maxAttempts - 1) {
        throw lastError;
      }

      await delay(getRetryDelayMs(null, attempt));
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError ?? new Error("Network request failed.");
}

function getHeader(message: GmailMessageResponse, headerName: string): string {
  const header = message.payload?.headers?.find((entry) => entry.name.toLowerCase() === headerName.toLowerCase());
  return header?.value?.trim() || "";
}

function decodeBase64Url(value: string): string {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    return Buffer.from(normalized, "base64").toString("utf8");
  } catch {
    return "";
  }
}

function stripHtmlToText(value: string): string {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function collectBodyParts(part: GmailMessagePart | undefined, plainTextParts: string[], htmlParts: string[]): void {
  if (!part) {
    return;
  }

  const data = part.body?.data ? decodeBase64Url(part.body.data) : "";
  if (data && part.mimeType === "text/plain") {
    plainTextParts.push(data);
  }

  if (data && part.mimeType === "text/html") {
    htmlParts.push(stripHtmlToText(data));
  }

  for (const childPart of part.parts ?? []) {
    collectBodyParts(childPart, plainTextParts, htmlParts);
  }
}

function getMessageActionText(message: GmailMessageResponse): string {
  const plainTextParts: string[] = [];
  const htmlParts: string[] = [];
  collectBodyParts(message.payload, plainTextParts, htmlParts);
  const bodyText = (plainTextParts.length > 0 ? plainTextParts : htmlParts)
    .join("\n")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  return bodyText.slice(0, 6000);
}

function stripActionTextForCache(message: EmailMessageSummary): EmailMessageSummary {
  const { actionText: _actionText, ...summary } = message;
  return summary;
}

function compactForOpenAi(value: string, maxLength: number): string {
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function buildOpenAiEmailDigest(messages: EmailMessageSummary[]): string {
  return messages
    .slice(0, MAX_OPENAI_EMAIL_MESSAGES)
    .map((message, index) => {
      const body = compactForOpenAi(message.actionText || message.snippet, 1400);
      return [
        `Email ${index + 1}`,
        `id: ${message.id}`,
        `from: ${message.from}${message.fromEmail ? ` <${message.fromEmail}>` : ""}`,
        `subject: ${message.subject}`,
        `receivedAt: ${new Date(message.receivedAt).toISOString()}`,
        `snippet: ${compactForOpenAi(message.snippet, 500)}`,
        `body: ${body || "(no readable body)"}`
      ].join("\n");
    })
    .join("\n\n---\n\n");
}

function cleanOpenAiActionTitle(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, 140) : "";
}

function cleanOpenAiActionContext(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, 220) : "";
}

function cleanOpenAiPriority(value: unknown): EmailActionSuggestion["priority"] {
  return value === "high" || value === "medium" || value === "low" ? value : undefined;
}

function cleanOpenAiActionSummary(value: unknown): string | undefined {
  const summary = typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, 260) : "";
  return summary || undefined;
}

function cleanOpenAiConfidence(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  const normalized = value > 1 ? value / 100 : value;
  return Math.max(0, Math.min(1, normalized));
}

function cleanOpenAiRecommendedAssistant(value: unknown): EmailActionSuggestion["recommendedAssistant"] {
  return value === "productivity" || value === "design" || value === "coding" || value === "automation" ? value : undefined;
}

function cleanOpenAiRequestedOutput(value: unknown): EmailActionSuggestion["requestedOutput"] {
  return value === "reply" ||
    value === "document" ||
    value === "slide_deck" ||
    value === "website_design" ||
    value === "code_change" ||
    value === "research_brief" ||
    value === "scheduling" ||
    value === "task"
    ? value
    : undefined;
}

function cleanOpenAiBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function parseOpenAiActionSuggestions(content: string, messages: EmailMessageSummary[]): EmailActionSuggestion[] {
  let parsed: OpenAiActionPayload;
  try {
    parsed = JSON.parse(content) as OpenAiActionPayload;
  } catch {
    return [];
  }

  if (!Array.isArray(parsed.actions)) {
    return [];
  }

  const messageIds = new Set(messages.map((message) => message.id));
  const suggestions: EmailActionSuggestion[] = [];
  const seenKeys = new Set<string>();

  for (const rawAction of parsed.actions) {
    if (!rawAction || typeof rawAction !== "object") {
      continue;
    }

    const action = rawAction as Record<string, unknown>;
    const title = cleanOpenAiActionTitle(action.title);
    if (!title) {
      continue;
    }

    const sourceMessageId = typeof action.sourceMessageId === "string" && messageIds.has(action.sourceMessageId) ? action.sourceMessageId : undefined;
    const sourceMessage = sourceMessageId ? messages.find((message) => message.id === sourceMessageId) : undefined;
    if (!sourceMessageId || !sourceMessage) {
      continue;
    }

    const confidence = cleanOpenAiConfidence(action.confidence) ?? 0.72;
    if (confidence < 0.55) {
      continue;
    }

    const summary = cleanOpenAiActionSummary(action.summary);
    const reason = cleanOpenAiActionSummary(action.reason);
    const context =
      cleanOpenAiActionContext(action.context) ||
      summary ||
      `${sourceMessage.from} - ${sourceMessage.subject}`.slice(0, 220);
    const key = `${sourceMessageId}:${context}:${title}`.toLowerCase();
    if (seenKeys.has(key)) {
      continue;
    }

    seenKeys.add(key);
    suggestions.push({
      title,
      context,
      sourceMessageId,
      priority: cleanOpenAiPriority(action.priority),
      summary,
      confidence,
      recommendedAssistant: cleanOpenAiRecommendedAssistant(action.recommendedAssistant),
      requestedOutput: cleanOpenAiRequestedOutput(action.requestedOutput),
      reason,
      draftSuggested: cleanOpenAiBoolean(action.draftSuggested)
    });
  }

  const priorityWeight: Record<NonNullable<EmailActionSuggestion["priority"]>, number> = { high: 0, medium: 1, low: 2 };
  return suggestions
    .sort((left, right) => (priorityWeight[left.priority ?? "medium"] - priorityWeight[right.priority ?? "medium"]) || (right.confidence ?? 0) - (left.confidence ?? 0))
    .slice(0, 10);
}

function createLocalEmailActionSuggestions(messages: EmailMessageSummary[]): EmailActionSuggestion[] {
  const candidates = getEmailActionAnalysisCandidates(messages, Math.min(24, messages.length));
  const suggestions: EmailActionSuggestion[] = [];
  const seenKeys = new Set<string>();

  for (const message of candidates) {
    const text = `${message.from} ${message.fromEmail} ${message.subject} ${message.snippet} ${message.actionText ?? ""}`.toLowerCase();
    const isMarketing =
      /\b(newsletter|unsubscribe|promotion|sale|discount|receipt|digest|weekly update|advertisement)\b/u.test(text) &&
      !/\b(failed|failure|security|urgent|deadline|due|please|can you|could you|reply|respond|review|schedule)\b/u.test(text);
    if (isMarketing) {
      continue;
    }

    let title = "";
    let priority: EmailActionSuggestion["priority"] = "medium";
    if (/\b(github|gitlab|workflow|ci|build|test|failed|failure|blocked|error)\b/u.test(text)) {
      title = `Review and fix: ${message.subject}`;
      priority = "high";
    } else if (/\b(security alert|password reset|account|login|storage|billing)\b/u.test(text)) {
      title = `Review account alert: ${message.subject}`;
      priority = "high";
    } else if (/\b(slide|deck|presentation)\b/u.test(text)) {
      title = `Prepare slides for: ${message.subject}`;
    } else if (/\b(document|report|proposal|resume|write up|write-up)\b/u.test(text)) {
      title = `Prepare document for: ${message.subject}`;
    } else if (/\b(schedule|meeting|interview|call|calendar|available|availability)\b/u.test(text)) {
      title = `Schedule or confirm: ${message.subject}`;
    } else if (/\b(reply|respond|follow up|follow-up|please|can you|could you|\?)\b/u.test(text)) {
      title = `Reply to ${message.from || "sender"} about: ${message.subject}`;
    } else if (message.unread && /\b(urgent|deadline|due|today|tomorrow|action required|needs action|assignment|homework)\b/u.test(text)) {
      title = `Follow up on: ${message.subject}`;
    }

    const cleanedTitle = title.replace(/\s+/g, " ").trim().slice(0, 180);
    if (!cleanedTitle) {
      continue;
    }

    const context = `${message.from} - ${message.subject}`.replace(/\s+/g, " ").trim().slice(0, 120);
    const key = `${message.id}:${cleanedTitle}`.toLowerCase();
    if (seenKeys.has(key)) {
      continue;
    }

    seenKeys.add(key);
    suggestions.push({
      title: cleanedTitle,
      context,
      sourceMessageId: message.id,
      priority
    });
  }

  return suggestions.slice(0, 14);
}

async function fetchOpenAiActionSuggestions(messages: EmailMessageSummary[]): Promise<EmailActionAnalysisResult> {
  const apiKey = getOpenAiApiKey();
  const model = getOpenAiModel();
  const candidates = getEmailActionAnalysisCandidates(messages, EMAIL_ACTION_ANALYSIS_CANDIDATE_LIMIT);
  if (!apiKey) {
    const localCandidates = createLocalEmailActionSuggestions(messages);
    return {
      success: true,
      configured: false,
      actions: [],
      model,
      reason: `OpenAI email analysis is not configured, so Autopilot did not add guessed email tasks to the Action Queue. ${localCandidates.length} possible emails stay in the Inbox for review.`
    };
  }

  if (candidates.length === 0) {
    return {
      success: true,
      configured: true,
      actions: [],
      model
    };
  }

  const endpoint = new URL("chat/completions", `${getOpenAiBaseUrl()}/`);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getOpenAiRequestTimeoutMs());

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You turn inbox emails into a concise, high-precision work queue. Return JSON only as {\"actions\":[{\"title\":\"specific next action\",\"summary\":\"plain-English summary of what is needed\",\"context\":\"sender - subject plus the useful detail\",\"sourceMessageId\":\"email id\",\"priority\":\"high|medium|low\",\"confidence\":0.0,\"recommendedAssistant\":\"productivity|design|coding|automation\",\"requestedOutput\":\"reply|document|slide_deck|website_design|code_change|research_brief|scheduling|task\",\"reason\":\"why this is a real task\",\"draftSuggested\":true}]}. Only include real user work. Exclude newsletters, generic FYI, marketing, receipts, alerts without required response, and anything below 0.55 confidence."
          },
          {
            role: "user",
            content: `Read these ranked Gmail candidates and extract only the exact tasks the user or Autopilot should handle. Preserve the sourceMessageId for every task. If there are no real user actions, return {"actions":[]}.\n\n${buildOpenAiEmailDigest(candidates)}`
          }
        ]
      }),
      signal: controller.signal
    });
    const body = (await response.json()) as OpenAiChatCompletionsResponse;
    if (!response.ok) {
      return {
        success: false,
        configured: true,
        actions: [],
        model,
        reason: body.error?.message || `OpenAI request failed with status ${response.status}.`
      };
    }

    const content = body.choices?.[0]?.message?.content ?? "";
    return {
      success: true,
      configured: true,
      actions: parseOpenAiActionSuggestions(content, candidates),
      model
    };
  } catch (error) {
    return {
      success: false,
      configured: true,
      actions: [],
      model,
      reason:
        error instanceof Error && error.name === "AbortError"
          ? `OpenAI email analysis timed out after ${Math.round(getOpenAiRequestTimeoutMs() / 1000)} seconds.`
          : error instanceof Error
            ? error.message
            : "OpenAI email analysis failed."
    };
  } finally {
    clearTimeout(timeout);
  }
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
    actionText: getMessageActionText(message),
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
    const grantedScopes = getGrantedGoogleScopes(account?.scope);
    const capabilities = getGoogleConnectionCapabilities(grantedScopes);
    if (!clientId) {
      return {
        provider: GMAIL_PROVIDER,
        configured: false,
        connected: false,
        accountEmail: account?.accountEmail ?? null,
        grantedScopes,
        capabilities,
        reason: "Paste AUTOPILOT_GOOGLE_CLIENT_ID into .env.local, then rebuild or restart Autopilot to enable Google sync."
      };
    }

    if (!safeStorage.isEncryptionAvailable()) {
      return {
        provider: GMAIL_PROVIDER,
        configured: true,
        connected: false,
        accountEmail: account?.accountEmail ?? null,
        grantedScopes,
        capabilities,
        reason: "Secure token storage is unavailable on this device."
      };
    }

    return {
      provider: GMAIL_PROVIDER,
      configured: true,
      connected: Boolean(account),
      accountEmail: account?.accountEmail ?? null,
      grantedScopes,
      capabilities,
      updatedAt: account?.updatedAt,
      reason: account ? undefined : "Connect Google to pull Gmail messages and Calendar events."
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

  async connectGmail(openAuthorizationUrl: OpenAuthorizationUrl = (url) => shell.openExternal(url)): Promise<EmailConnectResult> {
    const clientId = getGoogleClientId();
    if (!clientId || !safeStorage.isEncryptionAvailable()) {
      return {
        success: false,
        status: this.getStatus(),
        reason: this.getStatus().reason
      };
    }

    try {
      const pkce = createPkceChallenge();
      const authorization = await requestGmailAuthorizationCode(clientId, pkce.challenge, openAuthorizationUrl);
      const token = await postForm<GmailTokenResponse>(
        GMAIL_TOKEN_URL,
        getGoogleOAuthForm({
          client_id: clientId,
          code: authorization.code,
          code_verifier: pkce.verifier,
          grant_type: "authorization_code",
          redirect_uri: authorization.redirectUri
        })
      );
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
        scope: token.scope || GOOGLE_SYNC_SCOPE,
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

  async analyzeActionItems(messages: EmailMessageSummary[]): Promise<EmailActionAnalysisResult> {
    return fetchOpenAiActionSuggestions(messages);
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
        `${GMAIL_API_BASE}/messages?maxResults=${getConfiguredGmailMaxResults()}&q=${encodeURIComponent("in:inbox newer_than:30d")}`,
        accessToken
      );
      const messageRefs = list.messages ?? [];
      const messages = (
        await mapWithConcurrency(
          messageRefs,
          getGmailMessageFetchConcurrency(),
          (message) =>
            getJson<GmailMessageResponse>(`${GMAIL_API_BASE}/messages/${message.id}?format=full`, accessToken)
        )
      )
        .map(toMessageSummary)
        .filter((message): message is EmailMessageSummary => Boolean(message))
        .sort((left, right) => right.receivedAt - left.receivedAt);

      this.writeCache(messages.map(stripActionTextForCache));
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

  async getGoogleAccessToken(
    requiredScopes: string[] = []
  ): Promise<{ success: true; accessToken: string; accountEmail: string; scope: string } | { success: false; reason: string }> {
    const account = this.getAccount();
    if (!account) {
      return {
        success: false,
        reason: "Connect Google before syncing Calendar."
      };
    }

    const grantedScopes = new Set(getGrantedGoogleScopes(account.scope));
    const missingScopes = requiredScopes.filter((scope) => !grantedScopes.has(scope));
    if (missingScopes.length > 0) {
      return {
        success: false,
        reason: "Reconnect Google from Productivity so Autopilot can read Calendar events."
      };
    }

    try {
      return {
        success: true,
        accessToken: await this.getValidAccessToken(account),
        accountEmail: account.accountEmail,
        scope: account.scope
      };
    } catch (error) {
      return {
        success: false,
        reason: error instanceof Error ? error.message : "Google token refresh failed."
      };
    }
  }

  disconnect(): EmailConnectionStatus {
    this.writeAccounts([]);
    this.writeCache([]);
    return this.getStatus();
  }

  private async getValidAccessToken(account: StoredEmailAccount): Promise<string> {
    if (account.expiresAt > Date.now() + 60_000) {
      return this.decrypt(account.encryptedAccessToken);
    }

    const refreshToken = this.decrypt(account.encryptedRefreshToken);
    if (!refreshToken) {
      throw new Error("Gmail needs to be connected again.");
    }

    const token = await postForm<GmailTokenResponse>(
      GMAIL_TOKEN_URL,
      getGoogleOAuthForm({
        client_id: getGoogleClientId(),
        refresh_token: refreshToken,
        grant_type: "refresh_token"
      })
    );
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

import { app, safeStorage } from "electron";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";

import type { AccountSignInRequest, AccountSignInResult, AccountStatus } from "../shared/account.js";
import {
  DEFAULT_AUTOPILOT_OPENAI_MODEL,
  DEFAULT_AUTOPILOT_SUPABASE_PROJECT_REF,
  DEFAULT_AUTOPILOT_SUPABASE_URL
} from "../shared/backendConfig.js";
import { createAiModelRoutingConfig, getDefaultAiModel } from "../shared/aiModels.js";

const ACCOUNT_SESSION_FILE = "account-session.json";
export const AUTOPILOT_AUTH_PROTOCOL = "autopilot";
export const DEFAULT_AUTOPILOT_AUTH_CALLBACK_URL = `${AUTOPILOT_AUTH_PROTOCOL}://auth/callback`;

type SupabaseUser = {
  id?: string;
  email?: string;
};

type SupabaseAuthResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  user?: SupabaseUser;
  msg?: string;
  error_description?: string;
  error?: string;
};

type StoredAccountSession = {
  version: 1;
  encryptedAccessToken: string;
  encryptedRefreshToken: string;
  expiresAt: number;
  userEmail: string | null;
  userId: string | null;
  updatedAt: number;
};

export class AccountService {
  constructor(private readonly dataRoot: string | (() => string) = () => app.getPath("userData")) {}

  async getStatus(): Promise<AccountStatus> {
    const e2eStatus = getE2eAccountStatus();
    if (e2eStatus) {
      return e2eStatus;
    }

    const backend = getBackendConfig();
    const session = await this.getStoredSession();
    const signedIn = Boolean(session);
    const proxyHealth = await checkAiProxyHealth(backend.aiProxyUrl);
    const readyForProxy = Boolean(backend.aiProxyUrl && backend.hasSupabaseAnonKey && signedIn && proxyHealth.health !== "unreachable");
    const configured = Boolean(backend.supabaseUrl && backend.hasSupabaseAnonKey);

    return {
      configured,
      signedIn,
      userEmail: session?.userEmail ?? null,
      userId: session?.userId ?? null,
      backend: {
        ...backend,
        aiProxyHealth: proxyHealth.health,
        aiProxyHealthReason: proxyHealth.reason,
        aiProxyReady: readyForProxy,
        localDevelopmentMode: backend.hasOpenAiKeyInProcess && !readyForProxy
      },
      reason: getStatusReason(configured, signedIn, readyForProxy, backend)
    };
  }

  async getConfig(): Promise<AccountStatus["backend"]> {
    return (await this.getStatus()).backend;
  }

  async getSessionAccessToken(): Promise<string | null> {
    const backend = getBackendConfig();
    if (!backend.supabaseUrl || !backend.hasSupabaseAnonKey) {
      return null;
    }

    const session = await this.getStoredSession();
    if (!session) {
      return null;
    }

    if (session.expiresAt > Date.now() + 60_000) {
      return this.decrypt(session.encryptedAccessToken);
    }

    const refreshed = await this.refreshSession(session);
    return refreshed ? this.decrypt(refreshed.encryptedAccessToken) : null;
  }

  async signIn(request: AccountSignInRequest): Promise<AccountSignInResult> {
    const status = await this.getStatus();
    if (!status.configured) {
      return {
        success: false,
        status,
        reason: status.reason,
        nextStep: "Package AUTOPILOT_SUPABASE_ANON_KEY and AUTOPILOT_AI_PROXY_URL, then restart Autopilot."
      };
    }

    const email = request.email?.trim();
    const password = request.password ?? "";
    if (request.provider === "email" && email && password) {
      return this.signInWithPassword(email, password);
    }

    if (request.provider === "email" && email) {
      return this.sendMagicLink(email);
    }

    return {
      success: false,
      status,
      reason: "Use email sign-in for this build. Google Supabase OAuth callback is not packaged yet.",
      nextStep: "Use the Google Gmail/Calendar connection for sources, and sign into Autopilot with email for backend AI access."
    };
  }

  async signUp(request: AccountSignInRequest): Promise<AccountSignInResult> {
    const status = await this.getStatus();
    if (!status.configured) {
      return {
        success: false,
        status,
        reason: status.reason,
        nextStep: "Package AUTOPILOT_SUPABASE_ANON_KEY and AUTOPILOT_AI_PROXY_URL, then restart Autopilot."
      };
    }

    const email = request.email?.trim();
    const password = request.password ?? "";
    if (!email || !password) {
      return {
        success: false,
        status,
        reason: "Email and password are required to create an Autopilot account.",
        nextStep: "Enter an email and password, or request a magic link."
      };
    }

    return this.signUpWithPassword(email, password);
  }

  async signOut(): Promise<AccountStatus> {
    const backend = getBackendConfig();
    const token = await this.getSessionAccessToken();
    if (backend.supabaseUrl && backend.hasSupabaseAnonKey && token) {
      try {
        await fetch(`${backend.supabaseUrl}/auth/v1/logout`, {
          method: "POST",
          headers: {
            apikey: getSupabaseAnonKey(),
            authorization: `Bearer ${token}`
          }
        });
      } catch (error) {
        warnAccountIssue("Supabase logout request failed; clearing local session anyway.", error);
      }
    }
    this.clearStoredSession();
    return this.getStatus();
  }

  async completeMagicLinkCallback(callbackUrl: string): Promise<AccountSignInResult> {
    const status = await this.getStatus();
    const parsed = parseAuthCallbackUrl(callbackUrl);
    if (!parsed.success) {
      return {
        success: false,
        status,
        reason: parsed.reason,
        nextStep: "Request a fresh magic link from Autopilot Settings."
      };
    }

    if (!safeStorage.isEncryptionAvailable()) {
      return {
        success: false,
        status,
        reason: "Secure account token storage is unavailable on this device.",
        nextStep: "Enable OS keychain support before signing into Autopilot."
      };
    }

    const user = await this.fetchUserForAccessToken(parsed.accessToken);
    this.saveStoredSession({
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      expiresIn: parsed.expiresIn,
      user
    });

    return {
      success: true,
      status: await this.getStatus(),
      reason: "Magic link confirmed. Signed into Autopilot.",
      nextStep: "AI tools can now use the secure backend proxy when it is configured."
    };
  }

  private async signInWithPassword(email: string, password: string): Promise<AccountSignInResult> {
    const status = await this.getStatus();
    const backend = status.backend;
    if (!backend.supabaseUrl) {
      return { success: false, status, reason: "Supabase URL is missing." };
    }

    const response = await this.callSupabaseAuth("token?grant_type=password", {
      email,
      password
    });
    if (!response.success) {
      return response;
    }

    return {
      success: true,
      status: await this.getStatus(),
      reason: "Signed into Autopilot.",
      nextStep: "AI tools will use the secure backend proxy when it is configured."
    };
  }

  private async signUpWithPassword(email: string, password: string): Promise<AccountSignInResult> {
    const response = await this.callSupabaseAuth("signup", {
      email,
      password
    });
    if (!response.success) {
      return response;
    }

    return {
      success: true,
      status: await this.getStatus(),
      reason: "Autopilot account created.",
      nextStep: (await this.getStatus()).signedIn
        ? "AI tools will use the secure backend proxy when it is configured."
        : "Check your email if Supabase requires email confirmation before sign-in."
    };
  }

  private async sendMagicLink(email: string): Promise<AccountSignInResult> {
    const status = await this.getStatus();
    const anonKey = getSupabaseAnonKey();
    const supabaseUrl = status.backend.supabaseUrl;
    if (!supabaseUrl || !anonKey) {
      return {
        success: false,
        status,
        reason: "Supabase public config is missing.",
        nextStep: "Add AUTOPILOT_SUPABASE_ANON_KEY and restart Autopilot."
      };
    }

    try {
      const response = await fetch(`${supabaseUrl}/auth/v1/otp`, {
        method: "POST",
        headers: {
          apikey: anonKey,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          email,
          create_user: true,
          email_redirect_to: getAuthRedirectUrl()
        })
      });

      if (!response.ok) {
        return {
          success: false,
          status,
          reason: `Supabase rejected the magic link request (${response.status}).`,
          nextStep: "Check Supabase Auth email settings and redirect URLs."
        };
      }

      return {
        success: true,
        status,
        reason: "Magic link sent.",
        nextStep: `Open the sign-in link sent to ${email}. It should return to Autopilot automatically.`
      };
    } catch (error) {
      return {
        success: false,
        status,
        reason: error instanceof Error ? error.message : "Could not contact Supabase.",
        nextStep: "Check network access and Supabase project configuration."
      };
    }
  }

  private async callSupabaseAuth(pathname: string, body: Record<string, string>): Promise<AccountSignInResult> {
    const status = await this.getStatus();
    const backend = status.backend;
    const anonKey = getSupabaseAnonKey();
    if (!backend.supabaseUrl || !anonKey) {
      return {
        success: false,
        status,
        reason: "Supabase public config is missing.",
        nextStep: "Add AUTOPILOT_SUPABASE_ANON_KEY and restart Autopilot."
      };
    }

    if (!safeStorage.isEncryptionAvailable()) {
      return {
        success: false,
        status,
        reason: "Secure account token storage is unavailable on this device.",
        nextStep: "Enable OS keychain support before signing into Autopilot."
      };
    }

    try {
      const response = await fetch(`${backend.supabaseUrl}/auth/v1/${pathname}`, {
        method: "POST",
        headers: {
          apikey: anonKey,
          "content-type": "application/json"
        },
        body: JSON.stringify(body)
      });
      const parsed = (await response.json()) as SupabaseAuthResponse;
      if (!response.ok) {
        return {
          success: false,
          status,
          reason: parsed.error_description || parsed.msg || parsed.error || `Supabase auth failed with status ${response.status}.`,
          nextStep: "Check the account credentials and Supabase Auth settings."
        };
      }

      if (parsed.access_token && parsed.refresh_token) {
        this.saveStoredSession({
          accessToken: parsed.access_token,
          refreshToken: parsed.refresh_token,
          expiresIn: parsed.expires_in,
          user: parsed.user
        });
      }

      return {
        success: true,
        status: await this.getStatus()
      };
    } catch (error) {
      return {
        success: false,
        status,
        reason: error instanceof Error ? error.message : "Could not contact Supabase.",
        nextStep: "Check network access and Supabase project configuration."
      };
    }
  }

  private async refreshSession(session: StoredAccountSession): Promise<StoredAccountSession | null> {
    const backend = getBackendConfig();
    const refreshToken = this.decrypt(session.encryptedRefreshToken);
    if (!backend.supabaseUrl || !backend.hasSupabaseAnonKey || !refreshToken) {
      this.clearStoredSession();
      return null;
    }

    try {
      const response = await fetch(`${backend.supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
        method: "POST",
        headers: {
          apikey: getSupabaseAnonKey(),
          "content-type": "application/json"
        },
        body: JSON.stringify({
          refresh_token: refreshToken
        })
      });
      const parsed = (await response.json()) as SupabaseAuthResponse;
      if (!response.ok || !parsed.access_token || !parsed.refresh_token) {
        this.clearStoredSession();
        return null;
      }

      this.saveStoredSession({
        accessToken: parsed.access_token,
        refreshToken: parsed.refresh_token,
        expiresIn: parsed.expires_in,
        user: parsed.user ?? {
          email: session.userEmail ?? undefined,
          id: session.userId ?? undefined
        }
      });
      return this.getStoredSession();
    } catch (error) {
      warnAccountIssue("Could not refresh Supabase session; keeping valid local session if possible.", error);
      return session.expiresAt > Date.now() ? session : null;
    }
  }

  private async fetchUserForAccessToken(accessToken: string): Promise<SupabaseUser | undefined> {
    const backend = getBackendConfig();
    const anonKey = getSupabaseAnonKey();
    if (!backend.supabaseUrl || !anonKey) {
      return undefined;
    }

    try {
      const response = await fetch(`${backend.supabaseUrl}/auth/v1/user`, {
        method: "GET",
        headers: {
          apikey: anonKey,
          authorization: `Bearer ${accessToken}`
        }
      });
      if (!response.ok) {
        warnAccountIssue(`Supabase user lookup failed with status ${response.status}.`);
        return undefined;
      }

      return (await response.json()) as SupabaseUser;
    } catch (error) {
      warnAccountIssue("Supabase user lookup failed.", error);
      return undefined;
    }
  }

  private async getStoredSession(): Promise<StoredAccountSession | null> {
    if (!existsSync(this.getSessionPath()) || !safeStorage.isEncryptionAvailable()) {
      return null;
    }

    try {
      const parsed = JSON.parse(readFileSync(this.getSessionPath(), "utf8")) as Partial<StoredAccountSession>;
      if (
        parsed.version === 1 &&
        typeof parsed.encryptedAccessToken === "string" &&
        typeof parsed.encryptedRefreshToken === "string" &&
        typeof parsed.expiresAt === "number"
      ) {
        return {
          version: 1,
          encryptedAccessToken: parsed.encryptedAccessToken,
          encryptedRefreshToken: parsed.encryptedRefreshToken,
          expiresAt: parsed.expiresAt,
          userEmail: typeof parsed.userEmail === "string" ? parsed.userEmail : null,
          userId: typeof parsed.userId === "string" ? parsed.userId : null,
          updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : Date.now()
        };
      }
    } catch (error) {
      warnAccountIssue("Could not read stored account session; ignoring local session file.", error);
      return null;
    }

    return null;
  }

  private saveStoredSession(input: { accessToken: string; refreshToken: string; expiresIn?: number; user?: SupabaseUser }): void {
    const sessionPath = this.getSessionPath();
    mkdirSync(path.dirname(sessionPath), { recursive: true });
    const now = Date.now();
    const session: StoredAccountSession = {
      version: 1,
      encryptedAccessToken: this.encrypt(input.accessToken),
      encryptedRefreshToken: this.encrypt(input.refreshToken),
      expiresAt: now + (input.expiresIn ?? 3600) * 1000,
      userEmail: input.user?.email ?? null,
      userId: input.user?.id ?? null,
      updatedAt: now
    };
    writeFileSync(sessionPath, JSON.stringify(session, null, 2), "utf8");
  }

  private clearStoredSession(): void {
    try {
      unlinkSync(this.getSessionPath());
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? (error as NodeJS.ErrnoException).code : undefined;
      if (code !== "ENOENT") {
        warnAccountIssue("Could not clear stored account session.", error);
      }
    }
  }

  private getSessionPath(): string {
    const dataRoot = typeof this.dataRoot === "function" ? this.dataRoot() : this.dataRoot;
    return path.join(dataRoot, ACCOUNT_SESSION_FILE);
  }

  private encrypt(value: string): string {
    return safeStorage.encryptString(value).toString("base64");
  }

  private decrypt(value: string): string {
    return safeStorage.decryptString(Buffer.from(value, "base64"));
  }
}

function getBackendConfig(): AccountStatus["backend"] {
  const supabaseUrl = (process.env.AUTOPILOT_SUPABASE_URL || process.env.SUPABASE_URL || DEFAULT_AUTOPILOT_SUPABASE_URL).trim();
  const supabaseProjectRef = (process.env.AUTOPILOT_SUPABASE_PROJECT_REF || DEFAULT_AUTOPILOT_SUPABASE_PROJECT_REF).trim();
  const supabaseAnonKey = getSupabaseAnonKey();
  const aiProxyUrl = getAiProxyUrl();
  const hasOpenAiKeyInProcess = Boolean((process.env.AUTOPILOT_OPENAI_API_KEY || process.env.OPENAI_API_KEY || "").trim());
  const model = getDefaultAiModel(createAiModelRoutingConfig((name) => process.env[name])) || DEFAULT_AUTOPILOT_OPENAI_MODEL;

  return {
    supabaseUrl: supabaseUrl || null,
    supabaseProjectRef: supabaseProjectRef || null,
    hasSupabaseAnonKey: Boolean(supabaseAnonKey),
    aiProxyUrl,
    hasOpenAiKeyInProcess,
    aiProxyReady: false,
    aiProxyHealth: aiProxyUrl ? "unknown" : "unconfigured",
    localDevelopmentMode: false,
    model
  };
}

function getE2eAccountStatus(): AccountStatus | null {
  if (process.env.NODE_ENV !== "test" || process.env.AUTOPILOT_E2E_ACCOUNT_BYPASS !== "1") {
    return null;
  }

  const backend = getBackendConfig();
  return {
    configured: true,
    signedIn: true,
    userEmail: "e2e@autopilot.local",
    userId: "e2e-user",
    backend: {
      ...backend,
      supabaseUrl: backend.supabaseUrl ?? DEFAULT_AUTOPILOT_SUPABASE_URL,
      supabaseProjectRef: backend.supabaseProjectRef ?? DEFAULT_AUTOPILOT_SUPABASE_PROJECT_REF,
      hasSupabaseAnonKey: true,
      aiProxyUrl: backend.aiProxyUrl ?? "http://127.0.0.1/e2e-ai-proxy",
      aiProxyReady: true,
      aiProxyHealth: "ready",
      aiProxyHealthReason: undefined,
      localDevelopmentMode: false
    },
    reason: "E2E account bypass is active for visual QA only."
  };
}

function warnAccountIssue(message: string, error?: unknown): void {
  const detail = error instanceof Error ? error.message : typeof error === "string" ? error : undefined;
  console.warn(detail ? `${message} ${detail}` : message);
}

function getStatusReason(
  configured: boolean,
  signedIn: boolean,
  readyForProxy: boolean,
  backend: AccountStatus["backend"]
): string {
  if (readyForProxy) {
    return "Supabase account and secure AI proxy are ready. AI tools will use the backend key, not a desktop key.";
  }
  if (!configured) {
    return "Add AUTOPILOT_SUPABASE_ANON_KEY to the packaged config so downloaded users can sign into Autopilot.";
  }
  if (!backend.aiProxyUrl) {
    return backend.hasOpenAiKeyInProcess
      ? "Local OpenAI key detected for development. Add AUTOPILOT_AI_PROXY_URL before public launch."
      : "Add AUTOPILOT_AI_PROXY_URL so signed-in users can use server-side AI.";
  }
  if (!signedIn) {
    return "Sign into Autopilot to unlock the secure AI proxy for this device.";
  }
  if (backend.aiProxyHealth === "unreachable") {
    return backend.aiProxyHealthReason ?? "The configured AI proxy could not be reached.";
  }
  return "Backend configuration is incomplete.";
}

function getSupabaseAnonKey(): string {
  return (process.env.AUTOPILOT_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "").trim();
}

function getAiProxyUrl(): string | null {
  const configured = (process.env.AUTOPILOT_AI_PROXY_URL || process.env.NETLIFY_AI_PROXY_URL || "").trim();
  if (!configured) {
    return null;
  }

  try {
    const url = new URL(configured);
    if (url.pathname === "/" || url.pathname === "") {
      url.pathname = "/api/ai";
    }
    return url.toString();
  } catch {
    return configured;
  }
}

function getAuthRedirectUrl(): string {
  return (process.env.AUTOPILOT_AUTH_REDIRECT_URL || DEFAULT_AUTOPILOT_AUTH_CALLBACK_URL).trim();
}

export function isAutopilotAccountCallbackUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === `${AUTOPILOT_AUTH_PROTOCOL}:` && parsed.hostname === "auth" && parsed.pathname === "/callback";
  } catch {
    return false;
  }
}

function parseAuthCallbackUrl(
  callbackUrl: string
): { success: true; accessToken: string; refreshToken: string; expiresIn?: number } | { success: false; reason: string } {
  if (!isAutopilotAccountCallbackUrl(callbackUrl)) {
    return { success: false, reason: "That link is not an Autopilot account callback." };
  }

  const parsed = new URL(callbackUrl);
  const params = new URLSearchParams(parsed.search);
  const hashParams = new URLSearchParams(parsed.hash.startsWith("#") ? parsed.hash.slice(1) : parsed.hash);
  for (const [key, value] of hashParams.entries()) {
    if (!params.has(key)) {
      params.set(key, value);
    }
  }

  const error = params.get("error_description") || params.get("error");
  if (error) {
    return { success: false, reason: error };
  }

  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  if (!accessToken || !refreshToken) {
    if (params.has("code")) {
      return {
        success: false,
        reason: "Supabase returned a PKCE code, but this desktop build expects token callbacks. Use a magic-link redirect URL that returns access_token and refresh_token."
      };
    }
    return { success: false, reason: "The magic link callback did not include a Supabase session." };
  }

  const expiresIn = Number(params.get("expires_in") ?? "");
  return {
    success: true,
    accessToken,
    refreshToken,
    expiresIn: Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : undefined
  };
}

async function checkAiProxyHealth(aiProxyUrl: string | null): Promise<{ health: AccountStatus["backend"]["aiProxyHealth"]; reason?: string }> {
  if (!aiProxyUrl) {
    return { health: "unconfigured" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);
  try {
    const response = await fetch(getAiProxyHealthUrl(aiProxyUrl), {
      method: "GET",
      signal: controller.signal
    });
    if (!response.ok) {
      return { health: "unreachable", reason: `AI proxy health check failed with status ${response.status}.` };
    }
    const parsed = (await response.json().catch(() => null)) as { success?: unknown; openAiConfigured?: unknown; reason?: unknown } | null;
    if (parsed && parsed.success === false) {
      return {
        health: "unreachable",
        reason:
          typeof parsed.reason === "string"
            ? parsed.reason
            : parsed.openAiConfigured === false
              ? "AI proxy is reachable, but OPENAI_API_KEY is not configured server-side."
              : "AI proxy reported it is not ready."
      };
    }
    return { health: "ready" };
  } catch (error) {
    return {
      health: "unreachable",
      reason: error instanceof Error && error.name === "AbortError" ? "AI proxy health check timed out." : "AI proxy health check failed."
    };
  } finally {
    clearTimeout(timeout);
  }
}

function getAiProxyHealthUrl(aiProxyUrl: string): string {
  try {
    const url = new URL(aiProxyUrl);
    if (url.pathname.endsWith("/api/ai")) {
      url.pathname = `${url.pathname}/health`;
    }
    return url.toString();
  } catch {
    return aiProxyUrl;
  }
}

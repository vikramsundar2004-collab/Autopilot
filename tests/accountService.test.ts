import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const electronMock = vi.hoisted(() => ({
  paths: {
    userData: ""
  } as Record<string, string>,
  encryptString: vi.fn((value: string) => Buffer.from(value, "utf8")),
  decryptString: vi.fn((value: Buffer) => value.toString("utf8")),
  isEncryptionAvailable: vi.fn(() => true)
}));

vi.mock("electron", () => ({
  app: {
    getPath: (name: string) => electronMock.paths[name] ?? ""
  },
  safeStorage: {
    encryptString: electronMock.encryptString,
    decryptString: electronMock.decryptString,
    isEncryptionAvailable: electronMock.isEncryptionAvailable
  }
}));

const { AccountService } = await import("../src/main/account");

describe("AccountService magic-link auth", () => {
  let userDataRoot = "";
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    userDataRoot = await mkdtemp(path.join(tmpdir(), "autopilot-account-"));
    electronMock.paths.userData = userDataRoot;
    electronMock.encryptString.mockClear();
    electronMock.decryptString.mockClear();
    electronMock.isEncryptionAvailable.mockReturnValue(true);
    process.env.AUTOPILOT_SUPABASE_URL = "https://ctvxwmmclsfxortzmkeq.supabase.co";
    process.env.AUTOPILOT_SUPABASE_ANON_KEY = "anon-key";
    delete process.env.AUTOPILOT_AUTH_REDIRECT_URL;
    delete process.env.AUTOPILOT_AI_PROXY_URL;
    delete process.env.NETLIFY_AI_PROXY_URL;
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    delete process.env.AUTOPILOT_SUPABASE_URL;
    delete process.env.AUTOPILOT_SUPABASE_ANON_KEY;
    delete process.env.AUTOPILOT_AUTH_REDIRECT_URL;
    await rm(userDataRoot, { recursive: true, force: true });
  });

  it("requests Supabase magic links with the Autopilot desktop callback URL", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200
    });
    const service = new AccountService(userDataRoot);

    const result = await service.signIn({ provider: "email", email: "vikram@example.com" });

    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("https://ctvxwmmclsfxortzmkeq.supabase.co/auth/v1/otp");
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      email: "vikram@example.com",
      create_user: true,
      email_redirect_to: "autopilot://auth/callback"
    });
  });

  it("completes an Autopilot callback by storing the Supabase session", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        id: "user-1",
        email: "vikram@example.com"
      })
    });
    const service = new AccountService(userDataRoot);

    const result = await service.completeMagicLinkCallback(
      "autopilot://auth/callback#access_token=access-token&refresh_token=refresh-token&expires_in=7200"
    );

    expect(result.success).toBe(true);
    expect(result.status.signedIn).toBe(true);
    expect(result.status.userEmail).toBe("vikram@example.com");
    expect(await service.getSessionAccessToken()).toBe("access-token");
    expect(fetchMock.mock.calls[0][0]).toBe("https://ctvxwmmclsfxortzmkeq.supabase.co/auth/v1/user");
    expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({
      apikey: "anon-key",
      authorization: "Bearer access-token"
    });
  });

  it("returns a clear error when Supabase sends a PKCE code instead of session tokens", async () => {
    const service = new AccountService(userDataRoot);

    const result = await service.completeMagicLinkCallback("autopilot://auth/callback?code=pkce-code");

    expect(result.success).toBe(false);
    expect(result.reason).toContain("PKCE code");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

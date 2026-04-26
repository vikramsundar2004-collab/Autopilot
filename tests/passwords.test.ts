import { describe, expect, it } from "vitest";

import {
  createCredentialId,
  normalizeCredentialOrigin,
  sanitizePasswordCapture,
  summarizePasswordRecord,
  type StoredPasswordRecord
} from "../src/shared/passwords";

describe("password helpers", () => {
  it("normalizes http and https credential origins", () => {
    expect(normalizeCredentialOrigin("https://example.com/login?next=/home")).toBe("https://example.com");
    expect(normalizeCredentialOrigin("http://localhost:5173/sign-in")).toBe("http://localhost:5173");
  });

  it("rejects non-web credential origins", () => {
    expect(normalizeCredentialOrigin("file:///C:/secret.html")).toBeNull();
    expect(normalizeCredentialOrigin("autopilot://home")).toBeNull();
  });

  it("sanitizes submitted password credentials without trimming the password", () => {
    const capture = sanitizePasswordCapture({
      origin: "https://accounts.example.com",
      url: "https://accounts.example.com/login",
      title: "  Example Login  ",
      username: "  student@example.com  ",
      password: " secret with spaces ",
      action: "https://accounts.example.com/session"
    });

    expect(capture).toEqual(
      expect.objectContaining({
        origin: "https://accounts.example.com",
        title: "Example Login",
        username: "student@example.com",
        password: " secret with spaces "
      })
    );
  });

  it("rejects empty password captures", () => {
    expect(
      sanitizePasswordCapture({
        origin: "https://example.com",
        password: ""
      })
    ).toBeNull();
  });

  it("keeps username blank when a form only has a password field", () => {
    expect(
      sanitizePasswordCapture({
        origin: "https://example.com",
        password: "secret"
      })?.username
    ).toBe("");
  });

  it("creates stable credential ids per site and username", () => {
    expect(createCredentialId("https://example.com", "Student@Example.com")).toBe(
      createCredentialId("https://example.com", "student@example.com")
    );
  });

  it("summarizes stored records without returning encrypted material", () => {
    const record: StoredPasswordRecord = {
      id: "https://example.com::student",
      origin: "https://example.com",
      url: "https://example.com/login",
      title: "Example",
      username: "student",
      encryptedPassword: "ciphertext",
      createdAt: 1,
      updatedAt: 2
    };

    expect(summarizePasswordRecord(record)).not.toHaveProperty("encryptedPassword");
  });
});

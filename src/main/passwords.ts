import { app, safeStorage } from "electron";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

import { authenticateOperatingSystem, type OsAuthResult } from "./osAuth.js";
import {
  createCredentialId,
  sanitizePasswordCapture,
  summarizePasswordRecord,
  type PasswordAvailability,
  type PasswordCaptureInput,
  type PasswordCredentialSummary,
  type PasswordRevealResult,
  type PasswordSaveResult,
  type PendingPasswordSave,
  type SanitizedPasswordCapture,
  type StoredPasswordRecord
} from "../shared/passwords.js";

type PasswordStoreFile = {
  version: 1;
  entries: StoredPasswordRecord[];
};

type PendingPasswordRecord = SanitizedPasswordCapture & {
  id: string;
  credentialId: string;
  createdAt: number;
};

const STORE_VERSION = 1;

function getBackendLabel(): string {
  if (process.platform === "win32") {
    return "Windows device login key";
  }

  if (process.platform === "darwin") {
    return "macOS Keychain";
  }

  return "Electron safe storage";
}

function isStoredRecord(value: unknown): value is StoredPasswordRecord {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as StoredPasswordRecord;
  return (
    typeof record.id === "string" &&
    typeof record.origin === "string" &&
    typeof record.url === "string" &&
    typeof record.title === "string" &&
    typeof record.username === "string" &&
    typeof record.createdAt === "number" &&
    typeof record.updatedAt === "number" &&
    typeof record.encryptedPassword === "string"
  );
}

export class PasswordStore {
  private readonly pending = new Map<string, PendingPasswordRecord>();

  constructor(
    private readonly getStorePath = () => path.join(app.getPath("userData"), "passwords.json"),
    private readonly authenticate = authenticateOperatingSystem
  ) {}

  getAvailability(): PasswordAvailability {
    const secureStorage = safeStorage.isEncryptionAvailable();
    return {
      secureStorage,
      backend: getBackendLabel(),
      reason: secureStorage ? undefined : "Secure password storage is unavailable on this device."
    };
  }

  list(): PasswordCredentialSummary[] {
    return this.readRecords().map(summarizePasswordRecord);
  }

  stage(input: PasswordCaptureInput): PendingPasswordSave | null {
    const capture = sanitizePasswordCapture(input);
    if (!capture) {
      return null;
    }

    const credentialId = createCredentialId(capture.origin, capture.username);
    const pending: PendingPasswordRecord = {
      ...capture,
      id: crypto.randomUUID(),
      credentialId,
      createdAt: Date.now()
    };

    this.pending.set(pending.id, pending);
    return this.toPendingSummary(pending);
  }

  savePending(pendingId: string): PasswordSaveResult {
    const pending = this.pending.get(pendingId);
    const entries = this.list();
    if (!pending) {
      return { success: false, reason: "That password save request is no longer available.", entries };
    }

    if (!safeStorage.isEncryptionAvailable()) {
      return { success: false, reason: "Secure password storage is unavailable on this device.", entries };
    }

    const currentRecords = this.readRecords();
    const now = Date.now();
    const existing = currentRecords.find((record) => record.id === pending.credentialId);
    const encryptedPassword = safeStorage.encryptString(pending.password).toString("base64");
    const nextRecord: StoredPasswordRecord = {
      id: pending.credentialId,
      origin: pending.origin,
      url: pending.url,
      title: pending.title,
      username: pending.username,
      encryptedPassword,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    };

    const nextRecords = [
      nextRecord,
      ...currentRecords.filter((record) => record.id !== pending.credentialId)
    ].sort((left, right) => right.updatedAt - left.updatedAt);

    this.writeRecords(nextRecords);
    this.pending.delete(pendingId);
    return { success: true, entries: nextRecords.map(summarizePasswordRecord) };
  }

  dismissPending(pendingId: string): void {
    this.pending.delete(pendingId);
  }

  async reveal(id: string): Promise<PasswordRevealResult> {
    const record = this.readRecords().find((entry) => entry.id === id);
    if (!record) {
      return { success: false, reason: "Saved password not found." };
    }

    const authentication = await this.authenticateBeforeReveal();
    if (!authentication.success) {
      return authentication;
    }

    const password = this.decryptPassword(record);
    if (password === null) {
      return { success: false, reason: "This saved password could not be unlocked with the device login key." };
    }

    return {
      success: true,
      entry: {
        ...summarizePasswordRecord(record),
        password
      }
    };
  }

  remove(id: string): PasswordCredentialSummary[] {
    const nextRecords = this.readRecords().filter((record) => record.id !== id);
    this.writeRecords(nextRecords);
    return nextRecords.map(summarizePasswordRecord);
  }

  private async authenticateBeforeReveal(): Promise<OsAuthResult> {
    return this.authenticate();
  }

  private toPendingSummary(pending: PendingPasswordRecord): PendingPasswordSave {
    return {
      id: pending.id,
      origin: pending.origin,
      url: pending.url,
      title: pending.title,
      username: pending.username,
      createdAt: pending.createdAt
    };
  }

  private decryptPassword(record: StoredPasswordRecord): string | null {
    try {
      return safeStorage.decryptString(Buffer.from(record.encryptedPassword, "base64"));
    } catch {
      return null;
    }
  }

  private readRecords(): StoredPasswordRecord[] {
    const storePath = this.getStorePath();
    if (!existsSync(storePath)) {
      return [];
    }

    try {
      const parsed = JSON.parse(readFileSync(storePath, "utf8")) as Partial<PasswordStoreFile>;
      return Array.isArray(parsed.entries) ? parsed.entries.filter(isStoredRecord) : [];
    } catch {
      return [];
    }
  }

  private writeRecords(entries: StoredPasswordRecord[]): void {
    const storePath = this.getStorePath();
    mkdirSync(path.dirname(storePath), { recursive: true });
    const tempPath = `${storePath}.tmp`;
    writeFileSync(tempPath, JSON.stringify({ version: STORE_VERSION, entries }, null, 2), "utf8");
    renameSync(tempPath, storePath);
  }
}

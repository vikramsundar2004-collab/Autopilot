import { app } from "electron";
import fs from "node:fs/promises";
import path from "node:path";

import {
  createDiagnosticLogEntry,
  sanitizeDiagnosticLogEntry,
  type CreateDiagnosticLogInput,
  type DiagnosticExportResult,
  type DiagnosticLogEntry
} from "../shared/diagnostics.js";

const DIAGNOSTICS_FILE = "diagnostics.jsonl";
const DEFAULT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const DEFAULT_LIST_LIMIT = 300;

export class DiagnosticStore {
  constructor(
    private readonly dataRoot = app.getPath("userData"),
    private readonly now = () => Date.now(),
    private readonly retentionMs = DEFAULT_RETENTION_MS
  ) {}

  async append(input: CreateDiagnosticLogInput): Promise<DiagnosticLogEntry> {
    const entry = createDiagnosticLogEntry(input, this.now());
    const filePath = this.getDiagnosticsPath();
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.appendFile(filePath, `${JSON.stringify(entry)}\n`, "utf8");
    await this.prune();
    return entry;
  }

  async list(limit = DEFAULT_LIST_LIMIT): Promise<DiagnosticLogEntry[]> {
    const safeLimit = Math.max(1, Math.min(2000, Math.round(limit)));
    const entries = await this.readAll();
    return entries.sort((left, right) => right.createdAt - left.createdAt).slice(0, safeLimit);
  }

  async clear(): Promise<DiagnosticLogEntry[]> {
    await fs.rm(this.getDiagnosticsPath(), { force: true });
    return [];
  }

  async exportLog(): Promise<DiagnosticExportResult> {
    try {
      const entries = await this.list(2000);
      const exportPath = path.join(this.dataRoot, `autopilot-diagnostics-${new Date(this.now()).toISOString().replace(/[:.]/g, "-")}.json`);
      await fs.mkdir(path.dirname(exportPath), { recursive: true });
      await fs.writeFile(exportPath, `${JSON.stringify(entries, null, 2)}\n`, "utf8");
      return { success: true, path: exportPath };
    } catch (error) {
      return {
        success: false,
        reason: error instanceof Error ? error.message : "Diagnostics could not be exported."
      };
    }
  }

  async prune(): Promise<void> {
    const entries = await this.readAll();
    const cutoff = this.now() - this.retentionMs;
    const retained = entries.filter((entry) => entry.createdAt >= cutoff);
    if (retained.length === entries.length) {
      return;
    }

    const filePath = this.getDiagnosticsPath();
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, retained.map((entry) => JSON.stringify(entry)).join("\n") + (retained.length ? "\n" : ""), "utf8");
  }

  private async readAll(): Promise<DiagnosticLogEntry[]> {
    try {
      const raw = await fs.readFile(this.getDiagnosticsPath(), "utf8");
      return raw
        .split(/\r?\n/u)
        .flatMap((line) => {
          if (!line.trim()) {
            return [];
          }

          try {
            const entry = sanitizeDiagnosticLogEntry(JSON.parse(line));
            return entry ? [entry] : [];
          } catch {
            return [];
          }
        });
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? (error as NodeJS.ErrnoException).code : undefined;
      if (code !== "ENOENT") {
        console.warn("Autopilot could not read diagnostics.", error);
      }
      return [];
    }
  }

  private getDiagnosticsPath(): string {
    return path.join(this.dataRoot, DIAGNOSTICS_FILE);
  }
}

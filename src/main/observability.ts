import { app } from "electron";
import fs from "node:fs/promises";
import path from "node:path";

import {
  createRunLogEvent,
  sanitizeRunLogEvent,
  type AutopilotRunLogEvent,
  type CreateRunLogEventInput
} from "../shared/observability.js";

const RUN_LOG_FILE = "runs.jsonl";
const DEFAULT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const DEFAULT_LIST_LIMIT = 200;

export class ObservabilityStore {
  constructor(
    private readonly dataRoot = app.getPath("userData"),
    private readonly now = () => Date.now(),
    private readonly retentionMs = DEFAULT_RETENTION_MS
  ) {}

  async append(input: CreateRunLogEventInput): Promise<AutopilotRunLogEvent> {
    const event = createRunLogEvent(input, this.now());
    const filePath = this.getRunLogPath();
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.appendFile(filePath, `${JSON.stringify(event)}\n`, "utf8");
    await this.prune();
    return event;
  }

  async list(limit = DEFAULT_LIST_LIMIT): Promise<AutopilotRunLogEvent[]> {
    const safeLimit = Math.max(1, Math.min(2000, Math.round(limit)));
    const events = await this.readAll();
    return events.sort((left, right) => right.createdAt - left.createdAt).slice(0, safeLimit);
  }

  async prune(): Promise<void> {
    const events = await this.readAll();
    const cutoff = this.now() - this.retentionMs;
    const retainedEvents = events.filter((event) => event.createdAt >= cutoff);
    if (retainedEvents.length === events.length) {
      return;
    }

    const filePath = this.getRunLogPath();
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, retainedEvents.map((event) => JSON.stringify(event)).join("\n") + (retainedEvents.length ? "\n" : ""), "utf8");
  }

  private async readAll(): Promise<AutopilotRunLogEvent[]> {
    try {
      const raw = await fs.readFile(this.getRunLogPath(), "utf8");
      return raw
        .split(/\r?\n/u)
        .flatMap((line) => {
          if (!line.trim()) {
            return [];
          }

          try {
            const event = sanitizeRunLogEvent(JSON.parse(line));
            return event ? [event] : [];
          } catch {
            return [];
          }
        });
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? (error as NodeJS.ErrnoException).code : undefined;
      if (code !== "ENOENT") {
        console.warn("Autopilot could not read run logs.", error);
      }
      return [];
    }
  }

  private getRunLogPath(): string {
    return path.join(this.dataRoot, RUN_LOG_FILE);
  }
}

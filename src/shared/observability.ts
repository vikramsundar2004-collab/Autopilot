import type { WorkspaceRole } from "./workItems.js";

export type AutopilotRunLogEventKind =
  | "assignment_routed"
  | "assignment_updated"
  | "source_synced"
  | "proactive_started"
  | "proactive_finished"
  | "automation_run"
  | "coding_command"
  | "artifact_quality";

export type AutopilotRunLogSeverity = "info" | "warning" | "error";

export type RunLogMetadataValue = string | number | boolean | null;

export type AutopilotRunLogEvent = {
  id: string;
  kind: AutopilotRunLogEventKind;
  createdAt: number;
  message: string;
  severity: AutopilotRunLogSeverity;
  entityId?: string;
  workspace?: WorkspaceRole;
  metadata: Record<string, RunLogMetadataValue>;
};

export type CreateRunLogEventInput = {
  id?: string;
  kind: AutopilotRunLogEventKind;
  createdAt?: number;
  message: string;
  severity?: AutopilotRunLogSeverity;
  entityId?: string;
  workspace?: WorkspaceRole;
  metadata?: Record<string, unknown>;
};

const EVENT_KINDS = new Set<AutopilotRunLogEventKind>([
  "assignment_routed",
  "assignment_updated",
  "source_synced",
  "proactive_started",
  "proactive_finished",
  "automation_run",
  "coding_command",
  "artifact_quality"
]);

const SEVERITIES = new Set<AutopilotRunLogSeverity>(["info", "warning", "error"]);
const WORKSPACES = new Set<WorkspaceRole>(["productivity", "design", "coding", "automation"]);

export function createRunLogEvent(input: CreateRunLogEventInput, now = Date.now()): AutopilotRunLogEvent {
  return {
    id: sanitizeText(input.id, 120) || makeRunLogEventId(input.kind, now),
    kind: input.kind,
    createdAt: sanitizeFiniteNumber(input.createdAt) ?? now,
    message: sanitizeText(input.message, 500) || "Autopilot run event.",
    severity: input.severity && SEVERITIES.has(input.severity) ? input.severity : "info",
    entityId: sanitizeText(input.entityId, 180) || undefined,
    workspace: input.workspace && WORKSPACES.has(input.workspace) ? input.workspace : undefined,
    metadata: sanitizeRunLogMetadata(input.metadata)
  };
}

export function sanitizeRunLogEvent(value: unknown): AutopilotRunLogEvent | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const raw = value as Partial<AutopilotRunLogEvent>;
  if (!raw.kind || !EVENT_KINDS.has(raw.kind)) {
    return null;
  }

  const message = sanitizeText(raw.message, 500);
  const createdAt = sanitizeFiniteNumber(raw.createdAt);
  if (!message || createdAt === undefined) {
    return null;
  }

  return {
    id: sanitizeText(raw.id, 120) || makeRunLogEventId(raw.kind, createdAt),
    kind: raw.kind,
    createdAt,
    message,
    severity: raw.severity && SEVERITIES.has(raw.severity) ? raw.severity : "info",
    entityId: sanitizeText(raw.entityId, 180) || undefined,
    workspace: raw.workspace && WORKSPACES.has(raw.workspace) ? raw.workspace : undefined,
    metadata: sanitizeRunLogMetadata(raw.metadata)
  };
}

export function sanitizeRunLogEvents(values: unknown[]): AutopilotRunLogEvent[] {
  return values.flatMap((value) => {
    const event = sanitizeRunLogEvent(value);
    return event ? [event] : [];
  });
}

function sanitizeRunLogMetadata(value: unknown): Record<string, RunLogMetadataValue> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const metadata: Record<string, RunLogMetadataValue> = {};
  for (const [key, rawValue] of Object.entries(value)) {
    const safeKey = sanitizeText(key, 80);
    if (!safeKey) {
      continue;
    }

    if (typeof rawValue === "string") {
      metadata[safeKey] = sanitizeText(rawValue, 400);
    } else if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
      metadata[safeKey] = rawValue;
    } else if (typeof rawValue === "boolean" || rawValue === null) {
      metadata[safeKey] = rawValue;
    }
  }

  return metadata;
}

function makeRunLogEventId(kind: AutopilotRunLogEventKind, now: number): string {
  return `run:${kind}:${now.toString(36)}:${Math.random().toString(36).slice(2, 10)}`;
}

function sanitizeFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function sanitizeText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, maxLength) : "";
}

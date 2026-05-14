import type { WorkspaceRole } from "./workItems.js";

export type DiagnosticSeverity = "info" | "warning" | "error";
export type DiagnosticWorkspace = WorkspaceRole | "browser" | "settings" | "system";

export type DiagnosticRelatedEntity = {
  kind: "tab" | "email" | "workspace" | "work-item" | "assignment" | "artifact" | "coding-file" | "download" | "account" | "unknown";
  id?: string;
  label?: string;
};

export type DiagnosticLogEntry = {
  id: string;
  severity: DiagnosticSeverity;
  workspace: DiagnosticWorkspace;
  source: string;
  message: string;
  details?: string;
  suggestedAction?: string;
  relatedEntity?: DiagnosticRelatedEntity;
  createdAt: number;
  resolvedAt?: number;
};

export type CreateDiagnosticLogInput = {
  id?: string;
  severity?: DiagnosticSeverity;
  workspace?: DiagnosticWorkspace;
  source?: string;
  message: string;
  details?: string;
  suggestedAction?: string;
  relatedEntity?: DiagnosticRelatedEntity;
  createdAt?: number;
  resolvedAt?: number;
};

export type DiagnosticExportResult = {
  success: boolean;
  path?: string;
  reason?: string;
};

const SEVERITIES = new Set<DiagnosticSeverity>(["info", "warning", "error"]);
const WORKSPACES = new Set<DiagnosticWorkspace>(["browser", "productivity", "design", "coding", "automation", "settings", "system"]);
const ENTITY_KINDS = new Set<DiagnosticRelatedEntity["kind"]>([
  "tab",
  "email",
  "workspace",
  "work-item",
  "assignment",
  "artifact",
  "coding-file",
  "download",
  "account",
  "unknown"
]);

const SECRET_PATTERNS: RegExp[] = [
  /\bsk-[a-z0-9_-]{12,}\b/giu,
  /\beyJ[a-z0-9_-]{12,}\.[a-z0-9_-]{12,}\.[a-z0-9_-]{12,}\b/giu,
  /\bya29\.[a-z0-9_-]+\b/giu,
  /\b(access_token|refresh_token|id_token|api[_-]?key|password|authorization)\s*[:=]\s*["']?[^"'\s,;}]+/giu
];

export function redactDiagnosticText(value: unknown, maxLength = 2400): string {
  let text = typeof value === "string" ? value : value === undefined || value === null ? "" : String(value);
  for (const pattern of SECRET_PATTERNS) {
    text = text.replace(pattern, (match) => {
      const separator = match.match(/[:=]/u)?.[0];
      if (separator) {
        const key = match.slice(0, match.indexOf(separator)).trim();
        return `${key}${separator} [redacted]`;
      }
      return "[redacted]";
    });
  }
  return text.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export function createDiagnosticLogEntry(input: CreateDiagnosticLogInput, now = Date.now()): DiagnosticLogEntry {
  const createdAt = sanitizeFiniteNumber(input.createdAt) ?? now;
  return {
    id: redactDiagnosticText(input.id, 140) || makeDiagnosticId(createdAt),
    severity: input.severity && SEVERITIES.has(input.severity) ? input.severity : "error",
    workspace: input.workspace && WORKSPACES.has(input.workspace) ? input.workspace : "system",
    source: redactDiagnosticText(input.source || "Autopilot", 120) || "Autopilot",
    message: redactDiagnosticText(input.message, 500) || "Autopilot recorded an issue.",
    details: redactDiagnosticText(input.details, 2400) || undefined,
    suggestedAction: redactDiagnosticText(input.suggestedAction, 400) || undefined,
    relatedEntity: sanitizeRelatedEntity(input.relatedEntity),
    createdAt,
    resolvedAt: sanitizeFiniteNumber(input.resolvedAt)
  };
}

export function sanitizeDiagnosticLogEntry(value: unknown): DiagnosticLogEntry | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const raw = value as Partial<DiagnosticLogEntry>;
  const createdAt = sanitizeFiniteNumber(raw.createdAt);
  const message = redactDiagnosticText(raw.message, 500);
  if (!createdAt || !message) {
    return null;
  }

  return createDiagnosticLogEntry(
    {
      id: raw.id,
      severity: raw.severity,
      workspace: raw.workspace,
      source: raw.source,
      message,
      details: raw.details,
      suggestedAction: raw.suggestedAction,
      relatedEntity: raw.relatedEntity,
      createdAt,
      resolvedAt: raw.resolvedAt
    },
    createdAt
  );
}

export function sanitizeDiagnosticLogEntries(values: unknown[]): DiagnosticLogEntry[] {
  return values.flatMap((value) => {
    const entry = sanitizeDiagnosticLogEntry(value);
    return entry ? [entry] : [];
  });
}

function sanitizeRelatedEntity(value: unknown): DiagnosticRelatedEntity | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const raw = value as Partial<DiagnosticRelatedEntity>;
  const kind = raw.kind && ENTITY_KINDS.has(raw.kind) ? raw.kind : "unknown";
  return {
    kind,
    id: redactDiagnosticText(raw.id, 240) || undefined,
    label: redactDiagnosticText(raw.label, 160) || undefined
  };
}

function makeDiagnosticId(now: number): string {
  return `diagnostic:${now.toString(36)}:${Math.random().toString(36).slice(2, 10)}`;
}

function sanitizeFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

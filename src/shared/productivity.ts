export type PageTextCaptureResult =
  | {
      success: true;
      title: string;
      url: string;
      text: string;
    }
  | {
      success: false;
      reason: string;
    };

export type ProductivityTaskState = "todo" | "waiting" | "snoozed" | "done";

export type ProductivityTaskPriority = "high" | "medium" | "low";

export type ProductivityDraftKind = "document" | "slide_deck" | "website_design";

export type ProductivityDraftStatus = "draft" | "needs_review" | "approved";

export type ProductivityConnectorStatus = {
  id: "gmail" | "google-calendar" | "slack" | "outlook" | "manual";
  label: string;
  connected: boolean;
  configured: boolean;
  reason?: string;
  lastSyncedAt?: number;
};

export type ProductivityTaskSource = {
  provider: "gmail" | "google-calendar" | "slack" | "outlook" | "manual" | "web" | "coding";
  label: string;
  messageId?: string;
  url?: string;
  from?: string;
  subject?: string;
};

export type ProductivityTask = {
  id: string;
  title: string;
  context: string;
  state: ProductivityTaskState;
  priority: ProductivityTaskPriority;
  source: ProductivityTaskSource;
  createdAt: number;
  updatedAt: number;
  snoozedUntil?: number;
  completedAt?: number;
};

export type ProductivityDraft = {
  id: string;
  title: string;
  body: string;
  preview: string;
  status: ProductivityDraftStatus;
  artifactId?: string;
  artifactKind: ProductivityDraftKind;
  source: ProductivityTaskSource;
  createdAt: number;
  updatedAt: number;
};

export type ProductivityTaskSyncResult = {
  success: boolean;
  tasks: ProductivityTask[];
  addedCount: number;
  updatedCount: number;
  model?: string;
  reason?: string;
};

export function sanitizeProductivityTasks(value: unknown): ProductivityTask[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .flatMap((rawTask) => {
      if (!rawTask || typeof rawTask !== "object") {
        return [];
      }

      const task = rawTask as Partial<ProductivityTask>;
      const title = typeof task.title === "string" ? task.title.replace(/\s+/g, " ").trim().slice(0, 180) : "";
      if (!title) {
        return [];
      }

      return [
        {
          id: typeof task.id === "string" && task.id.trim() ? task.id.trim().slice(0, 160) : makeTaskKey(title, task.context ?? "", undefined),
          title,
          context:
            typeof task.context === "string" && task.context.trim()
              ? task.context.replace(/\s+/g, " ").trim().slice(0, 220)
              : "No extra context",
          state: sanitizeTaskState(task.state),
          priority: sanitizeTaskPriority(task.priority),
          source: sanitizeTaskSource(task.source),
          createdAt: sanitizeTaskTime(task.createdAt),
          updatedAt: sanitizeTaskTime(task.updatedAt),
          snoozedUntil: typeof task.snoozedUntil === "number" && Number.isFinite(task.snoozedUntil) ? task.snoozedUntil : undefined,
          completedAt: typeof task.completedAt === "number" && Number.isFinite(task.completedAt) ? task.completedAt : undefined
        }
      ];
    })
    .sort((leftTask, rightTask) => sortProductivityTasks(leftTask, rightTask));
}

export function sanitizeProductivityDrafts(value: unknown): ProductivityDraft[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .flatMap((rawDraft) => {
      if (!rawDraft || typeof rawDraft !== "object") {
        return [];
      }

      const draft = rawDraft as Partial<ProductivityDraft>;
      const title = typeof draft.title === "string" ? draft.title.replace(/\s+/g, " ").trim().slice(0, 180) : "";
      const body = typeof draft.body === "string" ? draft.body.trim().slice(0, 24000) : "";
      const previewSource = typeof draft.preview === "string" && draft.preview.trim() ? draft.preview : body;
      if (!title || !body) {
        return [];
      }

      return [
        {
          id:
            typeof draft.id === "string" && draft.id.trim()
              ? draft.id.trim().slice(0, 180)
              : makeTaskKey(title, body, draft.source?.messageId),
          title,
          body,
          preview: previewSource.replace(/\s+/g, " ").trim().slice(0, 260),
          status: sanitizeDraftStatus(draft.status),
          artifactId: typeof draft.artifactId === "string" && draft.artifactId.trim() ? draft.artifactId.trim().slice(0, 180) : undefined,
          artifactKind: sanitizeDraftKind(draft.artifactKind),
          source: sanitizeTaskSource(draft.source),
          createdAt: sanitizeTaskTime(draft.createdAt),
          updatedAt: sanitizeTaskTime(draft.updatedAt)
        }
      ];
    })
    .sort((leftDraft, rightDraft) => rightDraft.updatedAt - leftDraft.updatedAt);
}

export function makeTaskKey(title: string, context: string, sourceMessageId?: string): string {
  return `${sourceMessageId || "task"}:${normalizeTaskText(context)}:${normalizeTaskText(title)}`;
}

export function sortProductivityTasks(leftTask: ProductivityTask, rightTask: ProductivityTask): number {
  const stateWeight = getTaskStateWeight(leftTask.state) - getTaskStateWeight(rightTask.state);
  if (stateWeight !== 0) {
    return stateWeight;
  }

  const priorityWeight = getTaskPriorityWeight(leftTask.priority) - getTaskPriorityWeight(rightTask.priority);
  if (priorityWeight !== 0) {
    return priorityWeight;
  }

  return rightTask.updatedAt - leftTask.updatedAt;
}

function sanitizeTaskSource(value: unknown): ProductivityTaskSource {
  if (!value || typeof value !== "object") {
    return {
      provider: "manual",
      label: "Manual"
    };
  }

  const source = value as Partial<ProductivityTaskSource>;
  const provider =
    source.provider === "gmail" ||
    source.provider === "google-calendar" ||
    source.provider === "slack" ||
    source.provider === "outlook" ||
    source.provider === "web" ||
    source.provider === "coding"
      ? source.provider
      : "manual";

  return {
    provider,
    label: typeof source.label === "string" && source.label.trim() ? source.label.trim().slice(0, 120) : provider,
    messageId: typeof source.messageId === "string" && source.messageId.trim() ? source.messageId.trim().slice(0, 200) : undefined,
    url: typeof source.url === "string" && source.url.trim() ? source.url.trim().slice(0, 2048) : undefined,
    from: typeof source.from === "string" && source.from.trim() ? source.from.trim().slice(0, 160) : undefined,
    subject: typeof source.subject === "string" && source.subject.trim() ? source.subject.trim().slice(0, 220) : undefined
  };
}

function sanitizeTaskState(value: unknown): ProductivityTaskState {
  return value === "waiting" || value === "snoozed" || value === "done" ? value : "todo";
}

function sanitizeDraftStatus(value: unknown): ProductivityDraftStatus {
  return value === "needs_review" || value === "approved" ? value : "draft";
}

function sanitizeDraftKind(value: unknown): ProductivityDraftKind {
  return value === "slide_deck" || value === "website_design" ? value : "document";
}

function sanitizeTaskPriority(value: unknown): ProductivityTaskPriority {
  return value === "high" || value === "low" ? value : "medium";
}

function sanitizeTaskTime(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : Date.now();
}

function getTaskStateWeight(state: ProductivityTaskState): number {
  switch (state) {
    case "todo":
      return 0;
    case "waiting":
      return 1;
    case "snoozed":
      return 2;
    case "done":
      return 3;
  }
}

function getTaskPriorityWeight(priority: ProductivityTaskPriority): number {
  switch (priority) {
    case "high":
      return 0;
    case "medium":
      return 1;
    case "low":
      return 2;
  }
}

function normalizeTaskText(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().toLowerCase().slice(0, 140) : "";
}

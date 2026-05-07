import type { CalendarRecurrence } from "./localCalendar.js";

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

export type PageDomElementKind = "link" | "button" | "input" | "textarea" | "select" | "contenteditable" | "other";

export type PageDomElementSummary = {
  selector: string;
  kind: PageDomElementKind;
  label: string;
  tagName: string;
  text: string;
  placeholder?: string;
  name?: string;
  type?: string;
  href?: string;
  value?: string;
  disabled: boolean;
  visible: boolean;
  approvalRequired: boolean;
  approvalReason?: string;
};

export type PageDomSnapshotResult =
  | {
      success: true;
      title: string;
      url: string;
      text: string;
      elements: PageDomElementSummary[];
    }
  | {
      success: false;
      reason: string;
    };

export type PageDomActionKind = "click" | "fill" | "scroll";

export type PageDomActionResult =
  | {
      success: true;
      action: PageDomActionKind;
      selector?: string;
      label?: string;
      value?: string;
    }
  | {
      success: false;
      reason: string;
      action?: PageDomActionKind;
      selector?: string;
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

export type ProductivitySyncSourceId = Exclude<ProductivityConnectorStatus["id"], "manual">;

export const PRODUCTIVITY_SYNC_SOURCE_IDS: ProductivitySyncSourceId[] = ["gmail", "google-calendar", "slack", "outlook"];
export const DEFAULT_PRODUCTIVITY_SYNC_SOURCE_IDS: ProductivitySyncSourceId[] = ["gmail", "google-calendar", "slack"];

export function sanitizeProductivitySyncSourceIds(
  value: unknown,
  fallback: ProductivitySyncSourceId[] = DEFAULT_PRODUCTIVITY_SYNC_SOURCE_IDS
): ProductivitySyncSourceId[] {
  if (!Array.isArray(value)) {
    return [...fallback];
  }

  const validIds = new Set<ProductivitySyncSourceId>(PRODUCTIVITY_SYNC_SOURCE_IDS);
  const selectedIds = value.filter((sourceId): sourceId is ProductivitySyncSourceId => typeof sourceId === "string" && validIds.has(sourceId as ProductivitySyncSourceId));
  const uniqueIds = [...new Set(selectedIds)];
  return uniqueIds.length > 0 ? uniqueIds : [...fallback];
}

export type ProductivityTaskSource = {
  provider: "gmail" | "google-calendar" | "slack" | "outlook" | "manual" | "web" | "coding";
  label: string;
  messageId?: string;
  url?: string;
  from?: string;
  subject?: string;
  calendarId?: string;
  calendarName?: string;
  eventStartAt?: number;
  eventEndAt?: number;
  eventAllDay?: boolean;
  eventRecurringId?: string;
  eventRecurrence?: CalendarRecurrence;
  eventRecurrenceLabel?: string;
  eventRecurrenceInterval?: number;
  eventRecurrenceWeekdays?: number[];
  actionSummary?: string;
  actionConfidence?: number;
  requestedOutput?: string;
  recommendedAssistant?: string;
  routeReason?: string;
  draftSuggested?: boolean;
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
  sourceResults?: ProductivitySourceSyncResult[];
};

export type ProductivitySourceSyncResult = {
  id: ProductivityConnectorStatus["id"];
  label: string;
  success: boolean;
  connected: boolean;
  configured: boolean;
  addedCount: number;
  updatedCount: number;
  itemCount: number;
  reason?: string;
  accountEmail?: string;
  lastSyncedAt?: number;
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
    subject: typeof source.subject === "string" && source.subject.trim() ? source.subject.trim().slice(0, 220) : undefined,
    calendarId: typeof source.calendarId === "string" && source.calendarId.trim() ? source.calendarId.trim().slice(0, 200) : undefined,
    calendarName: typeof source.calendarName === "string" && source.calendarName.trim() ? source.calendarName.trim().slice(0, 120) : undefined,
    eventStartAt: typeof source.eventStartAt === "number" && Number.isFinite(source.eventStartAt) ? source.eventStartAt : undefined,
    eventEndAt: typeof source.eventEndAt === "number" && Number.isFinite(source.eventEndAt) ? source.eventEndAt : undefined,
    eventAllDay: typeof source.eventAllDay === "boolean" ? source.eventAllDay : undefined,
    eventRecurringId: typeof source.eventRecurringId === "string" && source.eventRecurringId.trim() ? source.eventRecurringId.trim().slice(0, 200) : undefined,
    eventRecurrence: sanitizeCalendarRecurrence(source.eventRecurrence),
    eventRecurrenceLabel:
      typeof source.eventRecurrenceLabel === "string" && source.eventRecurrenceLabel.trim()
        ? source.eventRecurrenceLabel.trim().slice(0, 80)
        : undefined,
    eventRecurrenceInterval:
      typeof source.eventRecurrenceInterval === "number" &&
      Number.isFinite(source.eventRecurrenceInterval) &&
      source.eventRecurrenceInterval >= 1 &&
      source.eventRecurrenceInterval <= 52
        ? Math.floor(source.eventRecurrenceInterval)
        : undefined,
    eventRecurrenceWeekdays: sanitizeCalendarWeekdays(source.eventRecurrenceWeekdays),
    actionSummary: typeof source.actionSummary === "string" && source.actionSummary.trim() ? source.actionSummary.trim().slice(0, 260) : undefined,
    actionConfidence:
      typeof source.actionConfidence === "number" && Number.isFinite(source.actionConfidence)
        ? Math.max(0, Math.min(100, Math.round(source.actionConfidence)))
        : undefined,
    requestedOutput: typeof source.requestedOutput === "string" && source.requestedOutput.trim() ? source.requestedOutput.trim().slice(0, 80) : undefined,
    recommendedAssistant:
      typeof source.recommendedAssistant === "string" && source.recommendedAssistant.trim() ? source.recommendedAssistant.trim().slice(0, 80) : undefined,
    routeReason: typeof source.routeReason === "string" && source.routeReason.trim() ? source.routeReason.trim().slice(0, 220) : undefined,
    draftSuggested: typeof source.draftSuggested === "boolean" ? source.draftSuggested : undefined
  };
}

function sanitizeCalendarRecurrence(value: unknown): CalendarRecurrence | undefined {
  return value === "daily" || value === "weekly" || value === "monthly" || value === "monthly-day" ? value : undefined;
}

function sanitizeCalendarWeekdays(value: unknown): number[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const weekdays = [...new Set(value.filter((weekday): weekday is number => Number.isInteger(weekday) && weekday >= 0 && weekday <= 6))].sort(
    (leftDay, rightDay) => leftDay - rightDay
  );
  return weekdays.length > 0 ? weekdays : undefined;
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

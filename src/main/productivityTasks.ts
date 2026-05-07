import { app } from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

import type { GoogleCalendarEventSummary } from "../shared/calendar.js";
import type { EmailActionAnalysisResult, EmailActionSuggestion, EmailMessageSummary } from "../shared/email.js";
import type { AutopilotRunLogEvent, CreateRunLogEventInput } from "../shared/observability.js";
import {
  makeTaskKey,
  sanitizeProductivityDrafts,
  sanitizeProductivityTasks,
  sortProductivityTasks,
  type ProductivityDraft,
  type ProductivityTask,
  type ProductivityTaskState,
  type ProductivityTaskSyncResult
} from "../shared/productivity.js";
import { createAssignmentsForWorkItem, createWorkItemFromTask, sanitizeWorkAssignments, sanitizeWorkItems } from "../shared/workItems.js";
import type { WorkAssignment, WorkItem, WorkRouteResult } from "../shared/workItems.js";

const PRODUCTIVITY_TASKS_FILE = "productivity-tasks.json";
const PRODUCTIVITY_DRAFTS_FILE = "productivity-drafts.json";
const WORK_ITEMS_FILE = "work-items.json";
const WORK_ASSIGNMENTS_FILE = "work-assignments.json";

type TaskPatch = Partial<Pick<ProductivityTask, "state" | "priority" | "title" | "context" | "snoozedUntil" | "completedAt">>;
type DraftInput = Partial<ProductivityDraft> & Pick<ProductivityDraft, "title" | "body" | "artifactKind" | "source">;
type ObservabilityWriter = {
  append(input: CreateRunLogEventInput): Promise<AutopilotRunLogEvent>;
};
export type SlackMessageSummary = {
  id: string;
  channelId: string;
  channelName: string;
  user: string;
  text: string;
  url?: string;
  createdAt: number;
};

export class ProductivityTaskStore {
  private tasks: ProductivityTask[] | null = null;
  private drafts: ProductivityDraft[] | null = null;
  private workItems: WorkItem[] | null = null;
  private workAssignments: WorkAssignment[] | null = null;

  constructor(
    private readonly dataRoot = app.getPath("userData"),
    private readonly observability?: ObservabilityWriter
  ) {}

  async listTasks(): Promise<ProductivityTask[]> {
    const tasks = await this.ensureLoaded();
    return structuredClone(tasks);
  }

  async listDrafts(): Promise<ProductivityDraft[]> {
    const drafts = await this.ensureDraftsLoaded();
    return structuredClone(drafts);
  }

  async listWorkItems(): Promise<WorkItem[]> {
    await this.ensureWorkItemsFromTasks();
    return structuredClone(this.workItems ?? []);
  }

  async listWorkAssignments(): Promise<WorkAssignment[]> {
    await this.ensureWorkItemsFromTasks();
    return structuredClone(this.workAssignments ?? []);
  }

  async routeWorkItem(workItemId: string): Promise<WorkRouteResult | null> {
    await this.ensureWorkItemsFromTasks();
    const workItems = this.workItems ?? [];
    const workAssignments = this.workAssignments ?? [];
    const workItem = workItems.find((item) => item.id === workItemId);
    if (!workItem) {
      return null;
    }

    const existingAssignments = workAssignments.filter((assignment) => assignment.workItemId === workItem.id);
    const assignments = createAssignmentsForWorkItem(workItem, existingAssignments);
    const assignmentIds = new Set(assignments.map((assignment) => assignment.id));
    this.workAssignments = [...assignments, ...workAssignments.filter((assignment) => !assignmentIds.has(assignment.id))];
    this.workItems = workItems.map((item) =>
      item.id === workItem.id
        ? {
            ...item,
            state: "working",
            updatedAt: Date.now()
          }
        : item
    );
    await Promise.all([this.saveWorkItems(), this.saveWorkAssignments()]);
    await this.logRun({
      kind: "assignment_routed",
      message: `Routed "${workItem.title}" to ${assignments.map((assignment) => assignment.role).join(", ")}.`,
      entityId: workItem.id,
      workspace: assignments[0]?.role,
      metadata: {
        assignmentCount: assignments.length,
        roles: assignments.map((assignment) => assignment.role).join(", "),
        priority: workItem.priority,
        routeConfidence: workItem.routeConfidence
      }
    });
    return {
      workItem: structuredClone(this.workItems.find((item) => item.id === workItem.id) ?? workItem),
      assignments: structuredClone(assignments)
    };
  }

  async updateWorkAssignment(assignmentId: string, patch: Partial<WorkAssignment>): Promise<WorkAssignment[]> {
    await this.ensureWorkItemsFromTasks();
    const now = Date.now();
    this.workAssignments = (this.workAssignments ?? []).map((assignment) =>
      assignment.id === assignmentId
        ? {
            ...assignment,
            ...patch,
            id: assignment.id,
            workItemId: assignment.workItemId,
            role: assignment.role,
            updatedAt: now
          }
        : assignment
    );
    await this.saveWorkAssignments();
    const updatedAssignment = this.workAssignments.find((assignment) => assignment.id === assignmentId);
    if (updatedAssignment) {
      await this.logRun({
        kind: "assignment_updated",
        message: `Assignment "${updatedAssignment.title}" moved to ${updatedAssignment.state}.`,
        severity: updatedAssignment.state === "failed" ? "error" : "info",
        entityId: updatedAssignment.id,
        workspace: updatedAssignment.role,
        metadata: {
          state: updatedAssignment.state,
          runState: updatedAssignment.runState ?? null,
          qualityScore: updatedAssignment.qualityScore ?? null,
          approvalState: updatedAssignment.approvalState
        }
      });
    }
    return structuredClone(this.workAssignments);
  }

  async upsertDraft(input: DraftInput): Promise<ProductivityDraft[]> {
    const drafts = await this.ensureDraftsLoaded();
    const now = Date.now();
    const existingDraft = input.id ? drafts.find((draft) => draft.id === input.id) : null;
    const sanitizedDraft = sanitizeProductivityDrafts([
      {
        ...existingDraft,
        ...input,
        id: input.id ?? existingDraft?.id ?? makeProductivityDraftId(input),
        createdAt: existingDraft?.createdAt ?? input.createdAt ?? now,
        updatedAt: now
      }
    ])[0];

    if (!sanitizedDraft) {
      return structuredClone(drafts);
    }

    this.drafts = [sanitizedDraft, ...drafts.filter((draft) => draft.id !== sanitizedDraft.id)]
      .sort((leftDraft, rightDraft) => rightDraft.updatedAt - leftDraft.updatedAt)
      .slice(0, 200);
    await this.saveDrafts();
    return structuredClone(this.drafts);
  }

  async deleteDraft(draftId: string): Promise<ProductivityDraft[]> {
    const drafts = await this.ensureDraftsLoaded();
    this.drafts = drafts.filter((draft) => draft.id !== draftId);
    await this.saveDrafts();
    return structuredClone(this.drafts);
  }

  async updateTask(taskId: string, patch: TaskPatch): Promise<ProductivityTask[]> {
    const tasks = await this.ensureLoaded();
    const now = Date.now();
    this.tasks = tasks.map((task) =>
      task.id === taskId
        ? sanitizeProductivityTasks([
            {
              ...task,
              ...patch,
              completedAt: patch.state === "done" ? patch.completedAt ?? now : patch.state ? undefined : task.completedAt,
              updatedAt: now
            }
          ])[0] ?? task
        : task
    );
    this.tasks.sort(sortProductivityTasks);
    await this.save();
    return structuredClone(this.tasks);
  }

  async setTaskState(taskId: string, state: ProductivityTaskState): Promise<ProductivityTask[]> {
    const now = Date.now();
    return this.updateTask(taskId, {
      state,
      completedAt: state === "done" ? now : undefined,
      snoozedUntil: state === "snoozed" ? now + 24 * 60 * 60 * 1000 : undefined
    });
  }

  async syncFromEmailActions(messages: EmailMessageSummary[], analysis: EmailActionAnalysisResult): Promise<ProductivityTaskSyncResult> {
    const tasks = await this.ensureLoaded();
    if (!analysis.success) {
      return {
        success: false,
        tasks: structuredClone(tasks),
        addedCount: 0,
        updatedCount: 0,
        model: analysis.model,
        reason: analysis.reason
      };
    }

    const messagesById = new Map(messages.map((message) => [message.id, message]));
    const existingById = new Map(tasks.map((task) => [task.id, task]));
    let addedCount = 0;
    let updatedCount = 0;
    const now = Date.now();

    for (const action of analysis.actions.filter(isQueueReadyEmailAction)) {
      const message = action.sourceMessageId ? messagesById.get(action.sourceMessageId) : undefined;
      const task = createTaskFromEmailAction(action, message, now);
      const existingTask = existingById.get(task.id);
      if (existingTask) {
        const nextTask: ProductivityTask = {
          ...existingTask,
          title: task.title,
          context: task.context,
          priority: task.priority,
          source: task.source,
          updatedAt: now
        };
        existingById.set(task.id, nextTask);
        updatedCount += 1;
      } else {
        existingById.set(task.id, task);
        addedCount += 1;
      }
    }

    this.tasks = sanitizeProductivityTasks([...existingById.values()]).sort(sortProductivityTasks);
    await this.save();
    await this.ensureWorkItemsFromTasks();
    return {
      success: true,
      tasks: structuredClone(this.tasks),
      addedCount,
      updatedCount,
      model: analysis.model
    };
  }

  async syncFromCalendarEvents(events: GoogleCalendarEventSummary[]): Promise<ProductivityTaskSyncResult> {
    const tasks = await this.ensureLoaded();
    const existingById = new Map(tasks.map((task) => [task.id, task]));
    let addedCount = 0;
    let updatedCount = 0;
    const now = Date.now();

    for (const event of events) {
      const task = createTaskFromCalendarEvent(event, now);
      const existingTask = existingById.get(task.id);
      if (existingTask) {
        existingById.set(task.id, {
          ...existingTask,
          title: task.title,
          context: task.context,
          priority: existingTask.state === "done" ? existingTask.priority : task.priority,
          source: task.source,
          updatedAt: now
        });
        updatedCount += 1;
      } else {
        existingById.set(task.id, task);
        addedCount += 1;
      }
    }

    this.tasks = sanitizeProductivityTasks([...existingById.values()]).sort(sortProductivityTasks);
    await this.save();
    await this.ensureWorkItemsFromTasks();
    return {
      success: true,
      tasks: structuredClone(this.tasks),
      addedCount,
      updatedCount
    };
  }

  async syncFromSlackMessages(messages: SlackMessageSummary[]): Promise<ProductivityTaskSyncResult> {
    const tasks = await this.ensureLoaded();
    const existingById = new Map(tasks.map((task) => [task.id, task]));
    let addedCount = 0;
    let updatedCount = 0;
    const now = Date.now();

    for (const message of messages) {
      const task = createTaskFromSlackMessage(message, now);
      if (!task) {
        continue;
      }

      const existingTask = existingById.get(task.id);
      if (existingTask) {
        existingById.set(task.id, {
          ...existingTask,
          title: task.title,
          context: task.context,
          priority: existingTask.state === "done" ? existingTask.priority : task.priority,
          source: task.source,
          updatedAt: now
        });
        updatedCount += 1;
      } else {
        existingById.set(task.id, task);
        addedCount += 1;
      }
    }

    this.tasks = sanitizeProductivityTasks([...existingById.values()]).sort(sortProductivityTasks);
    await this.save();
    await this.ensureWorkItemsFromTasks();
    return {
      success: true,
      tasks: structuredClone(this.tasks),
      addedCount,
      updatedCount
    };
  }

  private async ensureLoaded(): Promise<ProductivityTask[]> {
    if (this.tasks) {
      return this.tasks;
    }

    try {
      const rawTasks = await fs.readFile(this.getTasksPath(), "utf8");
      this.tasks = sanitizeProductivityTasks(JSON.parse(rawTasks));
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? (error as NodeJS.ErrnoException).code : undefined;
      if (code !== "ENOENT") {
        console.warn("Autopilot could not load productivity tasks.", error);
      }
      this.tasks = [];
    }

    return this.tasks;
  }

  private async ensureDraftsLoaded(): Promise<ProductivityDraft[]> {
    if (this.drafts) {
      return this.drafts;
    }

    try {
      const rawDrafts = await fs.readFile(this.getDraftsPath(), "utf8");
      this.drafts = sanitizeProductivityDrafts(JSON.parse(rawDrafts));
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? (error as NodeJS.ErrnoException).code : undefined;
      if (code !== "ENOENT") {
        console.warn("Autopilot could not load productivity drafts.", error);
      }
      this.drafts = [];
    }

    return this.drafts;
  }

  private async ensureWorkItemsLoaded(): Promise<WorkItem[]> {
    if (this.workItems) {
      return this.workItems;
    }

    try {
      const rawItems = await fs.readFile(this.getWorkItemsPath(), "utf8");
      this.workItems = sanitizeWorkItems(JSON.parse(rawItems));
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? (error as NodeJS.ErrnoException).code : undefined;
      if (code !== "ENOENT") {
        console.warn("Autopilot could not load work items.", error);
      }
      this.workItems = [];
    }

    return this.workItems;
  }

  private async ensureWorkAssignmentsLoaded(): Promise<WorkAssignment[]> {
    if (this.workAssignments) {
      return this.workAssignments;
    }

    try {
      const rawAssignments = await fs.readFile(this.getWorkAssignmentsPath(), "utf8");
      this.workAssignments = sanitizeWorkAssignments(JSON.parse(rawAssignments));
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? (error as NodeJS.ErrnoException).code : undefined;
      if (code !== "ENOENT") {
        console.warn("Autopilot could not load work assignments.", error);
      }
      this.workAssignments = [];
    }

    return this.workAssignments;
  }

  private async ensureWorkItemsFromTasks(): Promise<void> {
    const [tasks, workItems, workAssignments] = await Promise.all([
      this.ensureLoaded(),
      this.ensureWorkItemsLoaded(),
      this.ensureWorkAssignmentsLoaded()
    ]);
    const existingByTaskId = new Map(workItems.map((item) => [item.taskId, item]));
    const nextWorkItems = tasks.map((task) => createWorkItemFromTask(task, existingByTaskId.get(task.id)));
    this.workItems = sanitizeWorkItems(nextWorkItems).sort((leftItem, rightItem) => {
      if (leftItem.state !== rightItem.state) {
        return leftItem.state === "open" ? -1 : rightItem.state === "open" ? 1 : 0;
      }
      return rightItem.updatedAt - leftItem.updatedAt;
    });
    const workItemById = new Map(this.workItems.map((item) => [item.id, item]));
    this.workAssignments = workAssignments.filter((assignment) => {
      const workItem = workItemById.get(assignment.workItemId);
      return Boolean(workItem && workItem.source.provider !== "google-calendar" && workItem.assignedRoles.includes(assignment.role));
    });
    await Promise.all([this.saveWorkItems(), this.saveWorkAssignments()]);
  }

  private async save(): Promise<void> {
    if (!this.tasks) {
      return;
    }

    const tasksPath = this.getTasksPath();
    await fs.mkdir(path.dirname(tasksPath), { recursive: true });
    await fs.writeFile(tasksPath, JSON.stringify(this.tasks, null, 2), "utf8");
  }

  private async saveDrafts(): Promise<void> {
    if (!this.drafts) {
      return;
    }

    const draftsPath = this.getDraftsPath();
    await fs.mkdir(path.dirname(draftsPath), { recursive: true });
    await fs.writeFile(draftsPath, JSON.stringify(this.drafts, null, 2), "utf8");
  }

  private async saveWorkItems(): Promise<void> {
    if (!this.workItems) {
      return;
    }

    const itemsPath = this.getWorkItemsPath();
    await fs.mkdir(path.dirname(itemsPath), { recursive: true });
    await fs.writeFile(itemsPath, JSON.stringify(this.workItems, null, 2), "utf8");
  }

  private async saveWorkAssignments(): Promise<void> {
    if (!this.workAssignments) {
      return;
    }

    const assignmentsPath = this.getWorkAssignmentsPath();
    await fs.mkdir(path.dirname(assignmentsPath), { recursive: true });
    await fs.writeFile(assignmentsPath, JSON.stringify(this.workAssignments, null, 2), "utf8");
  }

  private getTasksPath(): string {
    return path.join(this.dataRoot, PRODUCTIVITY_TASKS_FILE);
  }

  private getDraftsPath(): string {
    return path.join(this.dataRoot, PRODUCTIVITY_DRAFTS_FILE);
  }

  private getWorkItemsPath(): string {
    return path.join(this.dataRoot, WORK_ITEMS_FILE);
  }

  private getWorkAssignmentsPath(): string {
    return path.join(this.dataRoot, WORK_ASSIGNMENTS_FILE);
  }

  private async logRun(input: CreateRunLogEventInput): Promise<void> {
    if (!this.observability) {
      return;
    }

    try {
      await this.observability.append(input);
    } catch (error) {
      console.warn("Autopilot could not write a run log event.", error);
    }
  }
}

export function createTaskFromEmailAction(action: EmailActionSuggestion, message: EmailMessageSummary | undefined, now = Date.now()): ProductivityTask {
  const context = action.summary || action.context || (message ? `${message.from} - ${message.subject}` : "Gmail inbox");
  const key = makeTaskKey(action.title, context, action.sourceMessageId ?? message?.id);
  const hash = createHash("sha256").update(key).digest("hex").slice(0, 18);

  return {
    id: `gmail:${hash}`,
    title: action.title.replace(/\s+/g, " ").trim().slice(0, 180),
    context: context.replace(/\s+/g, " ").trim().slice(0, 220),
    state: "todo",
    priority: action.priority ?? "medium",
    source: {
      provider: "gmail",
      label: message ? `${message.from} - ${message.subject}`.slice(0, 120) : "Gmail inbox",
      messageId: action.sourceMessageId ?? message?.id,
      url: message?.url,
      from: message?.from,
      subject: message?.subject,
      actionSummary: action.summary,
      actionConfidence: typeof action.confidence === "number" ? Math.round(action.confidence * 100) : undefined,
      requestedOutput: action.requestedOutput,
      recommendedAssistant: action.recommendedAssistant,
      routeReason: action.reason,
      draftSuggested: action.draftSuggested
    },
    createdAt: now,
    updatedAt: now
  };
}

function isQueueReadyEmailAction(action: EmailActionSuggestion): boolean {
  if (!action.sourceMessageId) {
    return false;
  }
  const confidence = typeof action.confidence === "number" && Number.isFinite(action.confidence) ? action.confidence : 0.72;
  if (confidence < 0.55) {
    return false;
  }
  const text = `${action.title} ${action.context} ${action.summary ?? ""}`.toLowerCase();
  return /\b(reply|respond|follow up|follow-up|send|schedule|prepare|draft|review|fix|build|create|submit|due|deadline|please|can you|could you|urgent|failed|failure)\b/u.test(
    text
  );
}

export function createTaskFromCalendarEvent(event: GoogleCalendarEventSummary, now = Date.now()): ProductivityTask {
  const hash = createHash("sha256").update(`${event.calendarId}:${event.id}`).digest("hex").slice(0, 18);
  const startsInMs = event.startAt - now;
  const eventEndAt = event.endAt ?? event.startAt;
  const isPast = eventEndAt < now;
  const isSoon = startsInMs >= 0 && startsInMs <= 24 * 60 * 60 * 1000;
  const titlePrefix = event.allDay ? "Track deadline" : "Prepare for";
  const startLabel = formatCalendarStart(event.startAt, event.allDay);
  const details = [startLabel, event.location ? `Location: ${event.location}` : "", event.organizer ? `Organizer: ${event.organizer}` : ""]
    .filter(Boolean)
    .join(" - ");

  return {
    id: `calendar:${hash}`,
    title: `${titlePrefix}: ${event.title}`.replace(/\s+/g, " ").trim().slice(0, 180),
    context: `${details || event.calendarName}${event.description ? ` - ${event.description}` : ""}`.replace(/\s+/g, " ").trim().slice(0, 220),
    state: isPast ? "done" : "todo",
    priority: isPast ? "low" : isSoon ? "high" : "medium",
    source: {
      provider: "google-calendar",
      label: `${event.calendarName} - ${event.title}`.slice(0, 120),
      messageId: event.id,
      url: event.htmlLink,
      from: event.organizer,
      subject: event.title,
      calendarId: event.calendarId,
      calendarName: event.calendarName,
      eventStartAt: event.startAt,
      eventEndAt: event.endAt,
      eventAllDay: event.allDay,
      eventRecurringId: event.recurringEventId,
      eventRecurrence: event.recurrence,
      eventRecurrenceLabel: event.recurrenceLabel,
      eventRecurrenceInterval: event.recurrenceInterval,
      eventRecurrenceWeekdays: event.recurrenceWeekdays
    },
    createdAt: now,
    updatedAt: now
  };
}

export function createTaskFromSlackMessage(message: SlackMessageSummary, now = Date.now()): ProductivityTask | null {
  const text = message.text.replace(/\s+/g, " ").trim();
  if (!text || !/\b(please|can you|could you|need|todo|follow up|deadline|due|ship|write|build|debug|review|send|schedule)\b/iu.test(text)) {
    return null;
  }

  const hash = createHash("sha256").update(`${message.channelId}:${message.id}:${text}`).digest("hex").slice(0, 18);
  const requestedOutput = inferSlackRequestedOutput(text);
  const recommendedAssistant = inferSlackAssistant(text);
  const confidence = inferSlackActionConfidence(text);
  return {
    id: `slack:${hash}`,
    title: text.slice(0, 140),
    context: `Slack #${message.channelName}${message.user ? ` - ${message.user}` : ""}`.slice(0, 220),
    state: "todo",
    priority: /\b(urgent|asap|today|tomorrow|deadline|due|by friday|by monday|this week)\b/iu.test(text) ? "high" : "medium",
    source: {
      provider: "slack",
      label: `#${message.channelName}`.slice(0, 120),
      messageId: message.id,
      url: message.url,
      from: message.user,
      subject: text.slice(0, 180),
      actionSummary: text.slice(0, 220),
      actionConfidence: confidence,
      requestedOutput,
      recommendedAssistant,
      routeReason: `Slack message in #${message.channelName} asks for ${requestedOutput}; route to ${recommendedAssistant}.`
    },
    createdAt: now,
    updatedAt: now
  };
}

function inferSlackRequestedOutput(text: string): string {
  const normalized = text.toLowerCase();
  if (/\b(slide|slides|deck|presentation|pitch)\b/u.test(normalized)) {
    return "slide deck";
  }
  if (/\b(document|doc|report|memo|writeup|write up|proposal)\b/u.test(normalized)) {
    return "document";
  }
  if (/\b(code|repo|repository|github|bug|debug|build|compile|test|deploy|api|pull request)\b/u.test(normalized)) {
    return "coding plan or patch";
  }
  if (/\b(daily|weekly|recurring|monitor|research|brief|competitor|industry)\b/u.test(normalized)) {
    return "automation or research brief";
  }
  if (/\b(reply|respond|follow up|follow-up|send|schedule|meeting|calendar)\b/u.test(normalized)) {
    return "reply or scheduling prep";
  }
  return "work item";
}

function inferSlackAssistant(text: string): string {
  const normalized = text.toLowerCase();
  if (/\b(code|repo|repository|github|bug|debug|build|compile|test|deploy|api|pull request)\b/u.test(normalized)) {
    return "coding";
  }
  if (/\b(slide|slides|deck|presentation|pitch|document|doc|report|memo|proposal|website|design|figma)\b/u.test(normalized)) {
    return "design";
  }
  if (/\b(daily|weekly|recurring|monitor|research|brief|competitor|industry)\b/u.test(normalized)) {
    return "automation";
  }
  return "productivity";
}

function inferSlackActionConfidence(text: string): number {
  const normalized = text.toLowerCase();
  let score = 68;
  if (/\b(please|can you|could you|need|todo|follow up|deadline|due|ship|write|build|debug|review|send|schedule)\b/u.test(normalized)) {
    score += 10;
  }
  if (/\b(today|tomorrow|asap|urgent|deadline|due|by friday|by monday|this week)\b/u.test(normalized)) {
    score += 8;
  }
  if (/\b(slide|deck|document|report|code|repo|bug|draft|reply|research|automation)\b/u.test(normalized)) {
    score += 7;
  }
  if (/\b(fyi|newsletter|announcement|release notes)\b/u.test(normalized)) {
    score -= 12;
  }
  return Math.max(55, Math.min(96, score));
}

function makeProductivityDraftId(input: DraftInput): string {
  const messageId = input.source.messageId ?? input.source.url ?? input.source.label;
  const key = `${messageId}:${input.artifactKind}:${input.artifactId ?? input.title}`;
  return `draft:${createHash("sha256").update(key).digest("hex").slice(0, 18)}`;
}

function formatCalendarStart(timestamp: number, allDay: boolean): string {
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(allDay
      ? {}
      : {
          hour: "numeric",
          minute: "2-digit"
        })
  }).format(date);
}

import { app } from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

import type { EmailActionAnalysisResult, EmailActionSuggestion, EmailMessageSummary } from "../shared/email.js";
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

const PRODUCTIVITY_TASKS_FILE = "productivity-tasks.json";
const PRODUCTIVITY_DRAFTS_FILE = "productivity-drafts.json";

type TaskPatch = Partial<Pick<ProductivityTask, "state" | "priority" | "title" | "context" | "snoozedUntil" | "completedAt">>;
type DraftInput = Partial<ProductivityDraft> & Pick<ProductivityDraft, "title" | "body" | "artifactKind" | "source">;

export class ProductivityTaskStore {
  private tasks: ProductivityTask[] | null = null;
  private drafts: ProductivityDraft[] | null = null;

  constructor(private readonly dataRoot = app.getPath("userData")) {}

  async listTasks(): Promise<ProductivityTask[]> {
    const tasks = await this.ensureLoaded();
    return structuredClone(tasks);
  }

  async listDrafts(): Promise<ProductivityDraft[]> {
    const drafts = await this.ensureDraftsLoaded();
    return structuredClone(drafts);
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

    for (const action of analysis.actions) {
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
    return {
      success: true,
      tasks: structuredClone(this.tasks),
      addedCount,
      updatedCount,
      model: analysis.model
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

  private getTasksPath(): string {
    return path.join(this.dataRoot, PRODUCTIVITY_TASKS_FILE);
  }

  private getDraftsPath(): string {
    return path.join(this.dataRoot, PRODUCTIVITY_DRAFTS_FILE);
  }
}

export function createTaskFromEmailAction(action: EmailActionSuggestion, message: EmailMessageSummary | undefined, now = Date.now()): ProductivityTask {
  const context = action.context || (message ? `${message.from} - ${message.subject}` : "Gmail inbox");
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
      subject: message?.subject
    },
    createdAt: now,
    updatedAt: now
  };
}

function makeProductivityDraftId(input: DraftInput): string {
  const messageId = input.source.messageId ?? input.source.url ?? input.source.label;
  const key = `${messageId}:${input.artifactKind}:${input.artifactId ?? input.title}`;
  return `draft:${createHash("sha256").update(key).digest("hex").slice(0, 18)}`;
}

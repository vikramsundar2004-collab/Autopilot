import { app, BrowserWindow, ipcMain, session, shell, type Rectangle } from "electron";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  addAutopilotBookmark,
  addAutopilotBookmarkFolder,
  deleteBookmarkTarget,
  listAvailableBookmarkSources,
  readImportedBookmarks,
  readSelectedBookmarkSources,
  updateSelectedBookmarkSources
} from "./bookmarks.js";
import { EmailService } from "./email.js";
import { GoogleCalendarService } from "./calendar.js";
import { loadAutopilotEnv } from "./env.js";
import { PasswordStore } from "./passwords.js";
import { ProductivityTaskStore } from "./productivityTasks.js";
import { ObservabilityStore } from "./observability.js";
import { TabController } from "./tabs.js";
import { WorkspaceStore } from "./workspaces.js";
import { AssistantService } from "./assistant.js";
import { AgentService } from "./agent.js";
import { ArtifactStore } from "./artifacts.js";
import { AutomationService } from "./automation.js";
import { SlackService } from "./slack.js";
import type { AddBookmarkFolderInput, AddBookmarkInput, BookmarkNodeTarget } from "../shared/bookmarks.js";
import type { AgentPlanFromEmailRequest, AgentStartRunRequest } from "../shared/agent.js";
import type { ArtifactCreateInput, ArtifactUpdateInput } from "../shared/artifacts.js";
import type { CodingAccessMode, CodingCommandRequest, CodingDownloadEntry, CodingTerminalInputRequest, CodingTerminalOpenRequest, CodingTreeNode } from "../shared/coding.js";
import type { PasswordCaptureInput } from "../shared/passwords.js";
import {
  DEFAULT_ASSISTANT_CONTEXT_SOURCES,
  sanitizeAssistantRequest,
  type AssistantContextItem,
  type AssistantContextSource
} from "../shared/assistant.js";
import { sanitizeProductivitySyncSourceIds, type ProductivityTaskState } from "../shared/productivity.js";
import type { ProductivitySourceSyncResult } from "../shared/productivity.js";
import { getMostRecentWorkspaceTabId, type WorkspaceProfile } from "../shared/workspaces.js";
import { detectAutomationIntent, type AutomationCreateRecipeInput, type AutomationRunResult, type AutomationSourceWorkspace, type AutomationUpdateRecipeInput } from "../shared/automation.js";
import { evaluateDocumentQuality } from "../shared/artifactQuality.js";
import { buildProactiveWorkPlan } from "../shared/proactiveWork.js";
import { buildTodaysCallPlan } from "../shared/todaysCall.js";
import { getRouteReviewReason, getWorkItemOwnership, getWorkItemPermissionLevel, needsRouteReview } from "../shared/workItems.js";
import type { WorkAssignment, WorkItem } from "../shared/workItems.js";
import { CodingWorkspace } from "./coding.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);

let tabs: TabController | null = null;
loadAutopilotEnv();
const passwordStore = new PasswordStore();
const emailService = new EmailService();
const googleCalendarService = new GoogleCalendarService(emailService);
const codingWorkspace = new CodingWorkspace();
const workspaceStore = new WorkspaceStore();
const observabilityStore = new ObservabilityStore();
const productivityTaskStore = new ProductivityTaskStore(undefined, observabilityStore);
const assistantService = new AssistantService();
const slackService = new SlackService();
const artifactStore = new ArtifactStore(
  () => app.getPath("userData"),
  () => path.join(app.getPath("documents"), "Autopilot Artifacts")
);
const agentService = new AgentService(artifactStore, emailService, () => app.getPath("userData"));
const automationService = new AutomationService(() => app.getPath("userData"), codingWorkspace, artifactStore);
const downloadEntries: CodingDownloadEntry[] = [];
const MAX_DOWNLOAD_ENTRIES = 40;
const DOWNLOAD_HISTORY_FILE = "download-history.json";
let downloadTrackingRegistered = false;
let downloadHistoryLoaded = false;
let downloadHistorySaveTimer: NodeJS.Timeout | null = null;

function getAppIconPath(): string {
  return isDev
    ? path.join(__dirname, "../../public/autopilot-logo.ico")
    : path.join(__dirname, "../renderer/autopilot-logo.ico");
}

function denyPermissions(): void {
  for (const currentSession of [session.defaultSession, session.fromPartition("persist:autopilot")]) {
    currentSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
      callback(false);
    });
  }
}

function getDownloadHistoryPath(): string {
  return path.join(app.getPath("userData"), DOWNLOAD_HISTORY_FILE);
}

function isDownloadEntry(value: unknown): value is CodingDownloadEntry {
  if (!value || typeof value !== "object") {
    return false;
  }

  const entry = value as Partial<CodingDownloadEntry>;
  return (
    typeof entry.id === "string" &&
    typeof entry.filename === "string" &&
    typeof entry.url === "string" &&
    typeof entry.path === "string" &&
    (entry.state === "progressing" || entry.state === "completed" || entry.state === "cancelled" || entry.state === "interrupted") &&
    typeof entry.receivedBytes === "number" &&
    typeof entry.totalBytes === "number" &&
    typeof entry.startedAt === "number" &&
    typeof entry.updatedAt === "number"
  );
}

function normalizeDownloadHistory(entries: CodingDownloadEntry[]): CodingDownloadEntry[] {
  return entries
    .map((entry) =>
      entry.state === "progressing"
        ? {
            ...entry,
            state: "interrupted" as const,
            reason: "Autopilot closed before this download finished."
          }
        : entry
    )
    .sort((leftEntry, rightEntry) => rightEntry.updatedAt - leftEntry.updatedAt)
    .slice(0, MAX_DOWNLOAD_ENTRIES);
}

async function ensureDownloadHistoryLoaded(): Promise<void> {
  if (downloadHistoryLoaded) {
    return;
  }

  downloadHistoryLoaded = true;
  try {
    const rawHistory = await fs.readFile(getDownloadHistoryPath(), "utf8");
    const parsedHistory: unknown = JSON.parse(rawHistory);
    const persistedEntries = Array.isArray(parsedHistory) ? parsedHistory.filter(isDownloadEntry) : [];
    downloadEntries.splice(0, downloadEntries.length, ...normalizeDownloadHistory(persistedEntries));
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? (error as NodeJS.ErrnoException).code : undefined;
    if (code !== "ENOENT") {
      console.warn("Autopilot could not load download history.", error);
    }
  }
}

async function saveDownloadHistory(): Promise<void> {
  try {
    const historyPath = getDownloadHistoryPath();
    await fs.mkdir(path.dirname(historyPath), { recursive: true });
    await fs.writeFile(historyPath, JSON.stringify(normalizeDownloadHistory(downloadEntries), null, 2), "utf8");
  } catch (error) {
    console.warn("Autopilot could not save download history.", error);
  }
}

function scheduleDownloadHistorySave(): void {
  if (!downloadHistoryLoaded) {
    return;
  }

  if (downloadHistorySaveTimer) {
    clearTimeout(downloadHistorySaveTimer);
  }

  downloadHistorySaveTimer = setTimeout(() => {
    downloadHistorySaveTimer = null;
    void saveDownloadHistory();
  }, 200);
}

function updateDownloadEntry(id: string, patch: Partial<CodingDownloadEntry>): void {
  const index = downloadEntries.findIndex((entry) => entry.id === id);
  if (index === -1) {
    return;
  }

  downloadEntries[index] = {
    ...downloadEntries[index],
    ...patch,
    updatedAt: Date.now()
  };
  scheduleDownloadHistorySave();
}

function registerDownloadTracking(): void {
  if (downloadTrackingRegistered) {
    return;
  }

  downloadTrackingRegistered = true;
  for (const currentSession of [session.defaultSession, session.fromPartition("persist:autopilot")]) {
    currentSession.on("will-download", (_event, item) => {
      const id = `download:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`;
      const startedAt = Date.now();
      const entry: CodingDownloadEntry = {
        id,
        filename: item.getFilename() || "download",
        url: item.getURL(),
        path: item.getSavePath(),
        state: "progressing",
        receivedBytes: item.getReceivedBytes(),
        totalBytes: item.getTotalBytes(),
        startedAt,
        updatedAt: startedAt
      };
      downloadEntries.unshift(entry);
      downloadEntries.splice(MAX_DOWNLOAD_ENTRIES);
      scheduleDownloadHistorySave();

      item.on("updated", (_downloadEvent, state) => {
        updateDownloadEntry(id, {
          filename: item.getFilename() || entry.filename,
          path: item.getSavePath() || entry.path,
          state: state === "interrupted" ? "interrupted" : "progressing",
          receivedBytes: item.getReceivedBytes(),
          totalBytes: item.getTotalBytes(),
          reason: state === "interrupted" ? "Download was interrupted." : undefined
        });
      });

      item.once("done", (_downloadEvent, state) => {
        updateDownloadEntry(id, {
          filename: item.getFilename() || entry.filename,
          path: item.getSavePath() || entry.path,
          state,
          receivedBytes: item.getReceivedBytes(),
          totalBytes: item.getTotalBytes(),
          reason:
            state === "completed"
              ? undefined
              : state === "cancelled"
                ? "Download was cancelled."
                : "Download was interrupted."
        });
      });
    });
  }
}

function flushPersistentBrowserStorage(): void {
  for (const currentSession of [session.defaultSession, session.fromPartition("persist:autopilot")]) {
    try {
      currentSession.flushStorageData();
    } catch (error) {
      console.warn("Autopilot could not flush browser session storage.", error);
    }
  }
}

async function persistActiveBrowserSnapshot(controller: TabController): Promise<void> {
  const workspaceState = await workspaceStore.getState();
  const activeWorkspace = workspaceState.profiles.find((profile) => profile.id === workspaceState.activeWorkspaceId);
  if (activeWorkspace?.view !== "browser") {
    return;
  }

  await workspaceStore.persistBrowserSnapshot(activeWorkspace.id, controller.getSnapshot());
}

async function restoreInitialBrowserWorkspace(controller: TabController): Promise<void> {
  const workspaceState = await workspaceStore.getState();
  const activeBrowserWorkspace = workspaceState.profiles.find(
    (profile) => profile.id === workspaceState.activeWorkspaceId && profile.view === "browser"
  );
  const fallbackBrowserWorkspace = workspaceState.profiles.find((profile) => profile.id === "browsing" && profile.view === "browser");
  const workspaceToRestore = activeBrowserWorkspace ?? fallbackBrowserWorkspace ?? workspaceState.profiles.find((profile) => profile.view === "browser");
  if (!workspaceToRestore) {
    controller.restoreSnapshot();
    return;
  }

  controller.restoreSnapshot(workspaceToRestore.savedTabs, getMostRecentWorkspaceTabId(workspaceToRestore.savedTabs));
  await workspaceStore.persistBrowserSnapshot(workspaceToRestore.id, controller.getSnapshot());
}

async function switchWorkspaceAndRestoreBrowser(controller: TabController, workspaceId: string): Promise<Awaited<ReturnType<WorkspaceStore["getState"]>>> {
  const currentState = await workspaceStore.getState();
  const currentWorkspace = currentState.profiles.find((profile) => profile.id === currentState.activeWorkspaceId);
  if (currentWorkspace?.view === "browser") {
    await workspaceStore.persistBrowserSnapshot(currentWorkspace.id, controller.getSnapshot());
  }

  const nextState = await workspaceStore.setActiveWorkspace(workspaceId);
  const nextWorkspace = nextState.profiles.find((profile) => profile.id === nextState.activeWorkspaceId);
  if (nextWorkspace?.view !== "browser") {
    return nextState;
  }

  controller.restoreSnapshot(nextWorkspace.savedTabs, getMostRecentWorkspaceTabId(nextWorkspace.savedTabs));
  return workspaceStore.persistBrowserSnapshot(nextWorkspace.id, controller.getSnapshot());
}

async function getAssistantContextSources(controller: TabController): Promise<AssistantContextSource[]> {
  const snapshot = controller.getSnapshot();
  const emailMessages = emailService.listCachedMessages();
  const codingSnapshot = await codingWorkspace.getSnapshot();

  return DEFAULT_ASSISTANT_CONTEXT_SOURCES.map((source) => {
    switch (source.id) {
      case "current-tab":
        return {
          ...source,
          available: Boolean(snapshot.activeTabId),
          detail: snapshot.activeTabId ? "Share text from the active browser tab." : "Open a browser tab before sharing this source."
        };
      case "selected-tabs":
        return {
          ...source,
          available: snapshot.tabs.length > 0,
          detail: `${snapshot.tabs.length} open ${snapshot.tabs.length === 1 ? "tab" : "tabs"} available.`
        };
      case "gmail":
        return {
          ...source,
          available: emailMessages.length > 0,
          detail: emailMessages.length > 0 ? `${emailMessages.length} cached Gmail messages available.` : "Sync Gmail to share inbox summaries."
        };
      case "downloads":
        return {
          ...source,
          available: downloadEntries.length > 0,
          detail: downloadEntries.length > 0 ? `${downloadEntries.length} recent downloads available.` : "Downloaded files will show here."
        };
      case "coding-project":
        return {
          ...source,
          available: Boolean(codingSnapshot.activeProject),
          detail: codingSnapshot.activeProject ? `Share ${codingSnapshot.activeProject.name}.` : "Open a coding project to share this source."
        };
    }
  });
}

async function buildAssistantContextItems(controller: TabController, rawRequest: unknown): Promise<AssistantContextItem[]> {
  const request = sanitizeAssistantRequest(rawRequest);
  const items: AssistantContextItem[] = [];
  const snapshot = controller.getSnapshot();

  if (request.sources.includes("current-tab")) {
    const tabId = request.activeTabId || snapshot.activeTabId;
    const tab = snapshot.tabs.find((candidate) => candidate.id === tabId);
    if (tabId && tab) {
      const pageText = await controller.readPageText(tabId);
      items.push({
        sourceId: "current-tab",
        title: pageText.success ? pageText.title : tab.title,
        url: tab.url,
        text: pageText.success ? pageText.text : pageText.reason
      });
    }
  }

  if (request.sources.includes("selected-tabs")) {
    items.push({
      sourceId: "selected-tabs",
      title: "Open browser tabs",
      text: snapshot.tabs.map((tab, index) => `${index + 1}. ${tab.title} - ${tab.url}`).join("\n")
    });
  }

  if (request.sources.includes("gmail")) {
    const messages = emailService.listCachedMessages().slice(0, 12);
    if (messages.length > 0) {
      items.push({
        sourceId: "gmail",
        title: "Cached Gmail messages",
        text: messages
          .map((message, index) =>
            [
              `${index + 1}. ${message.subject}`,
              `from: ${message.from}${message.fromEmail ? ` <${message.fromEmail}>` : ""}`,
              `received: ${new Date(message.receivedAt).toISOString()}`,
              `snippet: ${message.snippet}`,
              message.actionText ? `body: ${message.actionText.slice(0, 1800)}` : ""
            ]
              .filter(Boolean)
              .join("\n")
          )
          .join("\n\n")
      });
    }
  }

  if (request.sources.includes("downloads")) {
    await ensureDownloadHistoryLoaded();
    const downloads = normalizeDownloadHistory(downloadEntries).slice(0, 12);
    if (downloads.length > 0) {
      items.push({
        sourceId: "downloads",
        title: "Recent downloads",
        text: downloads
          .map((download, index) => `${index + 1}. ${download.filename} - ${download.state} - ${download.url} - ${download.path}`)
          .join("\n")
      });
    }
  }

  if (request.sources.includes("coding-project")) {
    const codingSnapshot = await codingWorkspace.getSnapshot();
    if (codingSnapshot.activeProject) {
      items.push({
        sourceId: "coding-project",
        title: codingSnapshot.activeProject.name,
        text: [
          `project: ${codingSnapshot.activeProject.name}`,
          `root: ${codingSnapshot.activeProject.rootPath}`,
          `access mode: ${codingSnapshot.accessMode}`,
          `files:\n${summarizeCodingTree(codingSnapshot.tree)}`
        ].join("\n")
      });
    }
  }

  return items;
}

function summarizeCodingTree(tree: CodingTreeNode | null, depth = 0): string {
  if (!tree || depth > 2) {
    return "";
  }

  const prefix = "  ".repeat(depth);
  if (tree.kind === "file") {
    return `${prefix}- ${tree.relativePath || tree.name}`;
  }

  const children = (tree.children ?? []).slice(0, depth === 0 ? 40 : 16);
  const childSummary = children.map((child) => summarizeCodingTree(child, depth + 1)).filter(Boolean).join("\n");
  return `${prefix}- ${tree.relativePath || tree.name}/\n${childSummary}`;
}

function buildProductivityDraftBody(workItem: WorkItem): string {
  const source = [workItem.source.from, workItem.source.subject].filter(Boolean).join(" - ") || workItem.source.label;
  const actionVerb = /\b(reply|respond|follow up|follow-up)\b/iu.test(`${workItem.title} ${workItem.context}`)
    ? "send a clear response"
    : /\b(schedule|reschedule|meeting|calendar)\b/iu.test(`${workItem.title} ${workItem.context}`)
      ? "prepare the scheduling step"
      : "prepare the requested work";

  return [
    `# ${workItem.title}`,
    "",
    "## Draft",
    `Hi,`,
    "",
    `Thanks for the note. I can ${actionVerb}. Here is what I have captured so far: ${workItem.context}`,
    "",
    "Before anything is sent or submitted, please review this draft and confirm the final wording.",
    "",
    "## Next Steps",
    "- Confirm whether the draft has the right tone and details.",
    "- Add any missing date, recipient, attachment, or deadline.",
    "- Approve the final external action only when it is ready to send, share, submit, or publish.",
    "",
    "## Source",
    `- ${source}`,
    workItem.source.url ? `- ${workItem.source.url}` : ""
  ]
    .filter((line) => line !== "")
    .join("\n");
}

function getArtifactQualityScore(summary: string): number | undefined {
  const match = summary.match(/\b(?:Quality score|quality score|Quality checked at)\D+(\d{1,3})\/100/u);
  if (!match?.[1]) {
    return undefined;
  }
  return Math.max(0, Math.min(100, Number.parseInt(match[1], 10)));
}

function getAutomationSourcesForWorkItem(workItem: WorkItem): Array<"web" | "gmail" | "calendar" | "slack" | "coding"> {
  switch (workItem.source.provider) {
    case "gmail":
      return ["gmail", "web"];
    case "google-calendar":
      return ["calendar", "web"];
    case "slack":
      return ["slack", "web"];
    case "coding":
      return ["coding", "web"];
    default:
      return ["web"];
  }
}

function getAutomationOutputKind(workItem: WorkItem): "brief" | "document" | "draft" | "research_report" {
  const text = `${workItem.title} ${workItem.context}`.toLowerCase();
  if (/\b(reply|email|draft)\b/u.test(text)) {
    return "draft";
  }
  if (/\b(research|competitor|industry|market|latest|trend)\b/u.test(text)) {
    return "research_report";
  }
  if (/\b(document|report|memo|proposal|writeup|write up)\b/u.test(text)) {
    return "document";
  }
  return "brief";
}

function buildAutomationOutputRefs(result: AutomationRunResult): WorkAssignment["outputRefs"] {
  const run = result.run;
  const refs: WorkAssignment["outputRefs"] = [];
  if (run?.id) {
    refs.push({ kind: "automation", id: run.id, label: "Automation run" });
  }
  if (run?.artifactId) {
    refs.push({ kind: "artifact", id: run.artifactId, label: "Design artifact" });
  }
  return refs;
}

function registerIpc(controller: TabController, mainWindow: BrowserWindow): void {
  function sendPasswordEntries(): void {
    if (!mainWindow.webContents.isDestroyed()) {
      mainWindow.webContents.send("passwords:changed", passwordStore.list());
    }
  }

  async function startRoutedWorkItem(workItemId: string) {
    const currentWorkItems = await productivityTaskStore.listWorkItems();
    const candidate = currentWorkItems.find((item) => item.id === workItemId);
    if (candidate?.source.provider === "google-calendar") {
      return {
        success: false,
        reason: "Calendar events are user-owned commitments. Autopilot can prepare separate context, but it will not assign the event itself as AI work.",
        workItems: currentWorkItems,
        allAssignments: await productivityTaskStore.listWorkAssignments()
      };
    }
    if (candidate && needsRouteReview(candidate)) {
      return {
        success: false,
        reason: getRouteReviewReason(candidate),
        workItems: currentWorkItems,
        allAssignments: await productivityTaskStore.listWorkAssignments()
      };
    }

    const route = await productivityTaskStore.routeWorkItem(workItemId);
    if (!route) {
      return {
        success: false,
        reason: "Work item was not found.",
        workItems: await productivityTaskStore.listWorkItems(),
        allAssignments: await productivityTaskStore.listWorkAssignments()
      };
    }

    for (const assignment of route.assignments) {
      await productivityTaskStore.updateWorkAssignment(assignment.id, {
        state: "running",
        runState: "running",
        lastRunSummary: "Autopilot started safe local work from Productivity."
      });

      if (assignment.role === "design") {
        const result =
          route.workItem.source.provider === "gmail" && route.workItem.source.messageId
            ? await agentService.planFromEmail({ messageId: route.workItem.source.messageId })
            : await agentService.startRun({
                prompt: `${route.workItem.title}\n\nContext: ${route.workItem.context}\n\nSource: ${route.workItem.source.label}`
              });
        await productivityTaskStore.updateWorkAssignment(assignment.id, {
          state: result.success ? (result.plan.finalApproval.required ? "waiting_for_user" : "completed") : "failed",
          runState: result.success ? (result.plan.finalApproval.required ? "waiting_for_approval" : "done") : "failed",
          linkedArtifactId: result.success ? result.artifact.id : undefined,
          runLogId: result.success ? result.run.id : undefined,
          qualityScore: result.success ? getArtifactQualityScore(result.artifact.summary) : undefined,
          approvalState: result.success && result.plan.finalApproval.required ? "needs_review" : result.success ? "not_required" : "rejected",
          outputRefs: result.success ? [{ kind: "artifact", id: result.artifact.id, label: "Design artifact" }] : [],
          failureReason: result.success ? undefined : result.reason,
          lastRunSummary: result.success ? "Generated a reviewable Design artifact from the routed work item." : result.reason,
          reason: result.success ? "Generated a Design artifact and action plan from the routed work item." : result.reason
        });
      }

      if (assignment.role === "productivity") {
        const body = buildProductivityDraftBody(route.workItem);
        const quality = evaluateDocumentQuality(body, `${route.workItem.title}\n${route.workItem.context}`, { minWords: 70 });
        const drafts = await productivityTaskStore.upsertDraft({
          title: `Draft: ${route.workItem.title}`,
          body,
          preview: body,
          status: quality.passed ? "needs_review" : "draft",
          artifactKind: "document",
          source: route.workItem.source
        });
        const draft = drafts[0];
        await productivityTaskStore.updateWorkAssignment(assignment.id, {
          state: "waiting_for_user",
          runState: "waiting_for_approval",
          linkedDraftId: draft?.id,
          qualityScore: quality.score,
          approvalState: "needs_review",
          outputRefs: draft?.id ? [{ kind: "draft", id: draft.id, label: "Productivity draft" }] : [],
          failureReason: quality.passed ? undefined : quality.summary,
          lastRunSummary: draft ? `Prepared a draft with quality ${quality.score}/100.` : "Productivity draft could not be saved.",
          reason: draft
            ? "Prepared a Productivity draft for review. Final sending, sharing, submitting, or publishing still needs approval."
            : "Productivity draft could not be saved; review the source item manually."
        });
      }

      if (assignment.role === "coding") {
        const planResult = await codingWorkspace.createAgentPlan(`${route.workItem.title}\n\n${route.workItem.context}`);
        await productivityTaskStore.updateWorkAssignment(assignment.id, {
          state: "waiting_for_user",
          runState: planResult.success ? "waiting_for_approval" : "failed",
          linkedCodingProjectPath: planResult.success ? planResult.plan.projectRootPath : undefined,
          approvalState: "needs_review",
          outputRefs: planResult.success ? [{ kind: "coding", id: planResult.plan.projectRootPath, label: "Coding plan" }] : [],
          failureReason: planResult.success ? undefined : planResult.reason,
          lastRunSummary: planResult.success ? planResult.plan.summary : planResult.reason,
          reason: planResult.success
            ? `Coding plan ready in ${planResult.plan.projectName}: ${planResult.plan.summary}`
            : `${planResult.reason} Open a local project in Coding, then reroute this item to create the plan, changed-file review, tests, and approval trail.`
        });
      }

      if (assignment.role === "automation") {
        const result = await automationService.createAndRunAdHoc({
          name: route.workItem.title,
          goal: `${route.workItem.title}\n\nContext: ${route.workItem.context}`,
          schedule: "manual",
          sources: getAutomationSourcesForWorkItem(route.workItem),
          outputKind: getAutomationOutputKind(route.workItem),
          artifactKind: "document",
          sourceWorkspace: "productivity",
          qualityBar: 84,
          requiresApproval: true
        });
        await productivityTaskStore.updateWorkAssignment(assignment.id, {
          state: result.success ? "completed" : "waiting_for_user",
          runState: result.success ? "done" : "waiting_for_approval",
          linkedAutomationRunId: result.success ? result.run.id : result.run?.id,
          linkedArtifactId: result.success ? result.run.artifactId : result.run?.artifactId,
          runLogId: result.success ? result.run.id : result.run?.id,
          qualityScore: result.success ? result.run.qualityScore : result.run?.qualityScore,
          approvalState: result.success ? "not_required" : "needs_review",
          outputRefs: buildAutomationOutputRefs(result),
          failureReason: result.success ? undefined : result.reason,
          lastRunSummary: result.success ? result.run.outputSummary : result.reason,
          reason: result.success ? "Automation produced a quality-checked run." : result.reason
        });
      }
    }

    return {
      success: true,
      workItem: route.workItem,
      assignments: route.assignments,
      workItems: await productivityTaskStore.listWorkItems(),
      allAssignments: await productivityTaskStore.listWorkAssignments()
    };
  }

  codingWorkspace.onTerminalOutput((event) => {
    if (!mainWindow.webContents.isDestroyed()) {
      mainWindow.webContents.send("coding:terminal-output", event);
    }
  });

  ipcMain.handle("tabs:snapshot", () => controller.getSnapshot());
  ipcMain.handle("tabs:create", async (_event, url?: string) => {
    const snapshot = controller.createTab(url);
    await persistActiveBrowserSnapshot(controller);
    return snapshot;
  });
  ipcMain.handle("tabs:close", async (_event, tabId: string) => {
    const snapshot = controller.closeTab(tabId);
    await persistActiveBrowserSnapshot(controller);
    return snapshot;
  });
  ipcMain.handle("tabs:activate", async (_event, tabId: string) => {
    const snapshot = controller.activateTab(tabId);
    await persistActiveBrowserSnapshot(controller);
    return snapshot;
  });
  ipcMain.handle("tabs:navigate", async (_event, tabId: string, input: string) => {
    const snapshot = controller.navigate(tabId, input);
    await persistActiveBrowserSnapshot(controller);
    return snapshot;
  });
  ipcMain.handle("tabs:home", async (_event, tabId: string) => {
    const snapshot = controller.goHome(tabId);
    await persistActiveBrowserSnapshot(controller);
    return snapshot;
  });
  ipcMain.handle("tabs:back", async (_event, tabId: string) => {
    const snapshot = controller.goBack(tabId);
    await persistActiveBrowserSnapshot(controller);
    return snapshot;
  });
  ipcMain.handle("tabs:forward", async (_event, tabId: string) => {
    const snapshot = controller.goForward(tabId);
    await persistActiveBrowserSnapshot(controller);
    return snapshot;
  });
  ipcMain.handle("tabs:reload", async (_event, tabId: string) => {
    const snapshot = controller.reload(tabId);
    await persistActiveBrowserSnapshot(controller);
    return snapshot;
  });
  ipcMain.handle("tabs:read-page-text", (_event, tabId: string) => controller.readPageText(tabId));
  ipcMain.handle("tabs:read-dom", (_event, tabId: string) => controller.readDOM(tabId));
  ipcMain.handle("tabs:click-by-selector", (_event, tabId: string, selector: string) => controller.clickBySelector(tabId, selector));
  ipcMain.handle("tabs:fill-by-selector", (_event, tabId: string, selector: string, value: unknown) => controller.fillBySelector(tabId, selector, value));
  ipcMain.handle("tabs:scroll-to", (_event, tabId: string, target: string | number) => controller.scrollTo(tabId, target));
  ipcMain.handle("tabs:print", (_event, tabId: string) => controller.print(tabId));
  ipcMain.handle("tabs:web-area", (_event, bounds: Rectangle, visible: boolean) => controller.setWebArea(bounds, visible));
  ipcMain.handle("tabs:set-group", async (_event, tabId: string, groupId: string | null) => {
    const snapshot = controller.setTabGroup(tabId, groupId);
    await persistActiveBrowserSnapshot(controller);
    return snapshot;
  });
  ipcMain.handle("tabs:set-pinned", async (_event, tabId: string, pinned: boolean) => {
    const snapshot = controller.setTabPinned(tabId, pinned);
    await persistActiveBrowserSnapshot(controller);
    return snapshot;
  });
  ipcMain.handle("tabs:hibernate", async (_event, tabId: string) => {
    const snapshot = controller.hibernateTab(tabId);
    await persistActiveBrowserSnapshot(controller);
    return snapshot;
  });
  ipcMain.handle("tabs:wake", async (_event, tabId: string) => {
    const snapshot = controller.wakeTab(tabId);
    await persistActiveBrowserSnapshot(controller);
    return snapshot;
  });
  ipcMain.handle("print-preview:print", (_event, options) => controller.printFromPreview(options));
  ipcMain.handle("workspaces:state", () => workspaceStore.getState());
  ipcMain.handle("workspaces:switch", async (_event, workspaceId: string) => switchWorkspaceAndRestoreBrowser(controller, workspaceId));
  ipcMain.handle("workspaces:update", async (_event, profile: WorkspaceProfile) => workspaceStore.updateWorkspace(profile));
  ipcMain.handle("workspaces:persist-browser-snapshot", async (_event, workspaceId: string) =>
    workspaceStore.persistBrowserSnapshot(workspaceId, controller.getSnapshot())
  );
  ipcMain.handle("bookmarks:list", () => readImportedBookmarks());
  ipcMain.handle("bookmarks:add", (_event, input: AddBookmarkInput) => addAutopilotBookmark(input));
  ipcMain.handle("bookmarks:add-folder", (_event, input: AddBookmarkFolderInput) => addAutopilotBookmarkFolder(input));
  ipcMain.handle("bookmarks:delete", (_event, target: BookmarkNodeTarget) => deleteBookmarkTarget(target));
  ipcMain.handle("bookmarks:sources", () => listAvailableBookmarkSources());
  ipcMain.handle("bookmarks:selected-sources", () => readSelectedBookmarkSources());
  ipcMain.handle("bookmarks:set-sources", (_event, sources: string[]) => updateSelectedBookmarkSources(sources));
  ipcMain.handle("email:status", () => emailService.getStatus());
  ipcMain.handle("email:list", () => emailService.listCachedMessages());
  ipcMain.handle("email:connect-gmail", () => {
    let authTabId: string | null = null;
    let authTabWatcher: NodeJS.Timeout | null = null;

    return emailService
      .connectGmail((authUrl, controls) => {
        const snapshot = controller.createTab(authUrl);
        authTabId = snapshot.activeTabId;
        mainWindow.focus();

        authTabWatcher = setInterval(() => {
          if (!authTabId || controls.signal.aborted) {
            return;
          }

          const authTabStillOpen = controller.getSnapshot().tabs.some((tab) => tab.id === authTabId);
          if (!authTabStillOpen) {
            controls.cancel("Google sign-in tab was closed. Click Connect Google to try again.");
          }
        }, 500);
      })
      .finally(() => {
        if (authTabWatcher) {
          clearInterval(authTabWatcher);
        }
      });
  });
  ipcMain.handle("email:connect-gmail-external", () => emailService.connectGmail());
  ipcMain.handle("email:sync", () => emailService.syncInbox());
  ipcMain.handle("email:analyze-actions", (_event, messages) => emailService.analyzeActionItems(messages));
  ipcMain.handle("email:disconnect", () => emailService.disconnect());
  ipcMain.handle("productivity:list-tasks", () => productivityTaskStore.listTasks());
  ipcMain.handle("productivity:list-drafts", () => productivityTaskStore.listDrafts());
  ipcMain.handle("productivity:list-work-items", () => productivityTaskStore.listWorkItems());
  ipcMain.handle("productivity:list-work-assignments", () => productivityTaskStore.listWorkAssignments());
  ipcMain.handle("productivity:build-todays-call", async () =>
    buildTodaysCallPlan({
      workItems: await productivityTaskStore.listWorkItems(),
      assignments: await productivityTaskStore.listWorkAssignments()
    })
  );
  ipcMain.handle("productivity:start-safe-work", async (_event, limit?: unknown) => {
    const workItems = await productivityTaskStore.listWorkItems();
    const assignments = await productivityTaskStore.listWorkAssignments();
    const plan = buildProactiveWorkPlan({ workItems, assignments });
    const maxToStart = typeof limit === "number" && Number.isFinite(limit) ? Math.max(1, Math.min(8, Math.round(limit))) : 3;
    const selectedItems = plan.startableItems.slice(0, maxToStart);
    const results = [];

    for (const item of selectedItems) {
      results.push(await startRoutedWorkItem(item.workItemId));
    }

    return {
      success: results.some((result) => result.success),
      startedCount: results.filter((result) => result.success).length,
      consideredCount: plan.startableItems.length,
      reason:
        selectedItems.length > 0
          ? undefined
          : "No safe AI-handleable work is ready to start. Review low-confidence items or connect sources.",
      plan,
      results,
      workItems: await productivityTaskStore.listWorkItems(),
      allAssignments: await productivityTaskStore.listWorkAssignments()
    };
  });
  ipcMain.handle("productivity:upsert-draft", (_event, input) => productivityTaskStore.upsertDraft(input));
  ipcMain.handle("productivity:delete-draft", (_event, draftId: string) => productivityTaskStore.deleteDraft(draftId));
  ipcMain.handle("productivity:update-task", (_event, taskId: string, patch) => productivityTaskStore.updateTask(taskId, patch));
  ipcMain.handle("productivity:set-task-state", (_event, taskId: string, state: ProductivityTaskState) =>
    productivityTaskStore.setTaskState(taskId, state)
  );
  ipcMain.handle("productivity:update-work-assignment", async (_event, assignmentId: string, patch: Partial<WorkAssignment>) => {
    const safePatch: Partial<WorkAssignment> = {};
    if (patch.state === "queued" || patch.state === "running" || patch.state === "waiting_for_user" || patch.state === "completed" || patch.state === "failed") {
      safePatch.state = patch.state;
    }
    if (typeof patch.reason === "string") {
      safePatch.reason = patch.reason.slice(0, 320);
    }
    if (typeof patch.linkedDraftId === "string") {
      safePatch.linkedDraftId = patch.linkedDraftId.slice(0, 180);
    }
    if (typeof patch.linkedArtifactId === "string") {
      safePatch.linkedArtifactId = patch.linkedArtifactId.slice(0, 180);
    }
    if (typeof patch.linkedAutomationRunId === "string") {
      safePatch.linkedAutomationRunId = patch.linkedAutomationRunId.slice(0, 180);
    }
    if (typeof patch.linkedCodingProjectPath === "string") {
      safePatch.linkedCodingProjectPath = patch.linkedCodingProjectPath.slice(0, 2048);
    }
    if (typeof patch.runLogId === "string") {
      safePatch.runLogId = patch.runLogId.slice(0, 180);
    }
    if (
      patch.runState === "not_started" ||
      patch.runState === "planning" ||
      patch.runState === "running" ||
      patch.runState === "quality_check" ||
      patch.runState === "waiting_for_approval" ||
      patch.runState === "done" ||
      patch.runState === "failed"
    ) {
      safePatch.runState = patch.runState;
    }
    if (typeof patch.lastRunSummary === "string") {
      safePatch.lastRunSummary = patch.lastRunSummary.slice(0, 360);
    }
    if (typeof patch.approvalRequiredReason === "string") {
      safePatch.approvalRequiredReason = patch.approvalRequiredReason.slice(0, 360);
    }
    if (typeof patch.qualityScore === "number" && Number.isFinite(patch.qualityScore)) {
      safePatch.qualityScore = Math.max(0, Math.min(100, Math.round(patch.qualityScore)));
    }
    if (typeof patch.failureReason === "string") {
      safePatch.failureReason = patch.failureReason.slice(0, 800);
    }
    if (patch.approvalState === "not_required" || patch.approvalState === "needs_review" || patch.approvalState === "approved" || patch.approvalState === "rejected") {
      safePatch.approvalState = patch.approvalState;
    }
    if (Array.isArray(patch.outputRefs)) {
      safePatch.outputRefs = patch.outputRefs
        .filter((ref) => ref.kind === "draft" || ref.kind === "artifact" || ref.kind === "automation" || ref.kind === "coding")
        .map((ref) => ({
          kind: ref.kind,
          id: String(ref.id ?? "").slice(0, 2048),
          label: String(ref.label ?? "").slice(0, 120)
        }))
        .filter((ref) => ref.id && ref.label)
        .slice(0, 8);
    }
    return productivityTaskStore.updateWorkAssignment(assignmentId, safePatch);
  });
  ipcMain.handle("productivity:route-work-item", async (_event, workItemId: string) => {
    const currentWorkItems = await productivityTaskStore.listWorkItems();
    const candidate = currentWorkItems.find((item) => item.id === workItemId);
    if (candidate?.source.provider === "google-calendar") {
      return {
        success: false,
        reason: "Calendar events are user-owned commitments. Autopilot can prepare separate context, but it will not assign the event itself as AI work.",
        workItems: currentWorkItems,
        allAssignments: await productivityTaskStore.listWorkAssignments()
      };
    }
    if (candidate && needsRouteReview(candidate)) {
      return {
        success: false,
        reason: getRouteReviewReason(candidate),
        workItems: currentWorkItems,
        allAssignments: await productivityTaskStore.listWorkAssignments()
      };
    }

    const route = await productivityTaskStore.routeWorkItem(workItemId);
    if (!route) {
      return {
        success: false,
        reason: "Work item was not found.",
        workItems: await productivityTaskStore.listWorkItems(),
        allAssignments: await productivityTaskStore.listWorkAssignments()
      };
    }

    for (const assignment of route.assignments) {
      if (assignment.role === "design") {
        await productivityTaskStore.updateWorkAssignment(assignment.id, { state: "running" });
        const result =
          route.workItem.source.provider === "gmail" && route.workItem.source.messageId
            ? await agentService.planFromEmail({ messageId: route.workItem.source.messageId })
            : await agentService.startRun({
                prompt: `${route.workItem.title}\n\nContext: ${route.workItem.context}\n\nSource: ${route.workItem.source.label}`
              });
        await productivityTaskStore.updateWorkAssignment(assignment.id, {
          state: result.success ? (result.plan.finalApproval.required ? "waiting_for_user" : "completed") : "failed",
          linkedArtifactId: result.success ? result.artifact.id : undefined,
          runLogId: result.success ? result.run.id : undefined,
          qualityScore: result.success ? getArtifactQualityScore(result.artifact.summary) : undefined,
          approvalState: result.success && result.plan.finalApproval.required ? "needs_review" : result.success ? "not_required" : "rejected",
          outputRefs: result.success ? [{ kind: "artifact", id: result.artifact.id, label: "Design artifact" }] : [],
          failureReason: result.success ? undefined : result.reason,
          reason: result.success ? "Generated a Design artifact and action plan from the routed work item." : result.reason
        });
      }

      if (assignment.role === "productivity") {
        await productivityTaskStore.updateWorkAssignment(assignment.id, { state: "running" });
        const body = buildProductivityDraftBody(route.workItem);
        const drafts = await productivityTaskStore.upsertDraft({
          title: `Draft: ${route.workItem.title}`,
          body,
          preview: body,
          status: "needs_review",
          artifactKind: "document",
          source: route.workItem.source
        });
        const draft = drafts[0];
        await productivityTaskStore.updateWorkAssignment(assignment.id, {
          state: "waiting_for_user",
          linkedDraftId: draft?.id,
          approvalState: "needs_review",
          outputRefs: draft?.id ? [{ kind: "draft", id: draft.id, label: "Productivity draft" }] : [],
          reason: draft
            ? "Prepared a Productivity draft for review. Final sending, sharing, submitting, or publishing still needs approval."
            : "Productivity draft could not be saved; review the source item manually."
        });
      }

      if (assignment.role === "coding") {
        await productivityTaskStore.updateWorkAssignment(assignment.id, { state: "running" });
        const planResult = await codingWorkspace.createAgentPlan(`${route.workItem.title}\n\n${route.workItem.context}`);
        await productivityTaskStore.updateWorkAssignment(assignment.id, {
          state: planResult.success ? "waiting_for_user" : "waiting_for_user",
          linkedCodingProjectPath: planResult.success ? planResult.plan.projectRootPath : undefined,
          approvalState: "needs_review",
          outputRefs: planResult.success ? [{ kind: "coding", id: planResult.plan.projectRootPath, label: "Coding plan" }] : [],
          failureReason: planResult.success ? undefined : planResult.reason,
          reason: planResult.success
            ? `Coding plan ready in ${planResult.plan.projectName}: ${planResult.plan.summary}`
            : `${planResult.reason} Open a local project in Coding, then reroute this item to create the plan, changed-file review, tests, and approval trail.`
        });
      }

      if (assignment.role === "automation") {
        await productivityTaskStore.updateWorkAssignment(assignment.id, { state: "running" });
        const result = await automationService.createAndRunAdHoc({
          name: route.workItem.title,
          goal: `${route.workItem.title}\n\nContext: ${route.workItem.context}`,
          schedule: "manual",
          sources: getAutomationSourcesForWorkItem(route.workItem),
          outputKind: getAutomationOutputKind(route.workItem),
          artifactKind: "document",
          sourceWorkspace: "productivity",
          qualityBar: 84,
          requiresApproval: true
        });
        await productivityTaskStore.updateWorkAssignment(assignment.id, {
          state: result.success ? "completed" : "waiting_for_user",
          linkedAutomationRunId: result.success ? result.run.id : result.run?.id,
          linkedArtifactId: result.success ? result.run.artifactId : result.run?.artifactId,
          runLogId: result.success ? result.run.id : result.run?.id,
          qualityScore: result.success ? result.run.qualityScore : result.run?.qualityScore,
          approvalState: result.success ? "not_required" : "needs_review",
          outputRefs: buildAutomationOutputRefs(result),
          failureReason: result.success ? undefined : result.reason,
          reason: result.success ? "Automation produced a quality-checked run." : result.reason
        });
      }
    }

    return {
      success: true,
      workItem: route.workItem,
      assignments: route.assignments,
      workItems: await productivityTaskStore.listWorkItems(),
      allAssignments: await productivityTaskStore.listWorkAssignments()
    };
  });
  ipcMain.handle("productivity:sync", async (_event, requestedSourceIds?: unknown) => {
    let addedCount = 0;
    let updatedCount = 0;
    let model: string | undefined;
    let syncedAtLeastOneSource = false;
    const reasons: string[] = [];
    const sourceResults: ProductivitySourceSyncResult[] = [];
    const selectedSourceIds = new Set(sanitizeProductivitySyncSourceIds(requestedSourceIds));

    if (selectedSourceIds.has("gmail")) {
      const inboxResult = await emailService.syncInbox();
      if (inboxResult.success) {
        const analysisResult = await emailService.analyzeActionItems(inboxResult.messages);
        const emailTasksResult = await productivityTaskStore.syncFromEmailActions(inboxResult.messages, analysisResult);
        if (emailTasksResult.success) {
          syncedAtLeastOneSource = true;
          addedCount += emailTasksResult.addedCount;
          updatedCount += emailTasksResult.updatedCount;
        } else if (emailTasksResult.reason) {
          reasons.push(emailTasksResult.reason);
        }
        model = emailTasksResult.model;
        sourceResults.push({
          id: "gmail",
          label: "Gmail",
          success: emailTasksResult.success,
          connected: inboxResult.status.connected,
          configured: inboxResult.status.configured,
          addedCount: emailTasksResult.addedCount,
          updatedCount: emailTasksResult.updatedCount,
          itemCount: inboxResult.messages.length,
          reason: emailTasksResult.reason,
          accountEmail: inboxResult.status.accountEmail ?? undefined,
          lastSyncedAt: Date.now()
        });
      } else {
        reasons.push(inboxResult.reason ?? inboxResult.status.reason ?? "Gmail sync failed.");
        sourceResults.push({
          id: "gmail",
          label: "Gmail",
          success: false,
          connected: inboxResult.status.connected,
          configured: inboxResult.status.configured,
          addedCount: 0,
          updatedCount: 0,
          itemCount: 0,
          reason: inboxResult.reason ?? inboxResult.status.reason ?? "Gmail sync failed.",
          accountEmail: inboxResult.status.accountEmail ?? undefined
        });
      }
    }

    if (selectedSourceIds.has("google-calendar")) {
      const calendarResult = await googleCalendarService.syncUpcomingEvents();
      if (calendarResult.success) {
        const calendarTasksResult = await productivityTaskStore.syncFromCalendarEvents(calendarResult.events);
        syncedAtLeastOneSource = true;
        addedCount += calendarTasksResult.addedCount;
        updatedCount += calendarTasksResult.updatedCount;
        sourceResults.push({
          id: "google-calendar",
          label: "Google Calendar",
          success: true,
          connected: true,
          configured: true,
          addedCount: calendarTasksResult.addedCount,
          updatedCount: calendarTasksResult.updatedCount,
          itemCount: calendarResult.events.length,
          accountEmail: calendarResult.accountEmail,
          lastSyncedAt: Date.now()
        });
      } else {
        const googleStatus = emailService.getStatus();
        const reason =
          googleStatus.connected && googleStatus.capabilities?.calendar === false
            ? "Reconnect Google to enable Calendar. Gmail is connected, but the stored token is missing Calendar permission."
            : calendarResult.reason;
        reasons.push(reason);
        sourceResults.push({
          id: "google-calendar",
          label: "Google Calendar",
          success: false,
          connected: googleStatus.connected,
          configured: googleStatus.configured,
          addedCount: 0,
          updatedCount: 0,
          itemCount: 0,
          reason,
          accountEmail: googleStatus.accountEmail ?? undefined
        });
      }
    }

    if (selectedSourceIds.has("slack")) {
      const slackResult = await slackService.syncMessages();
      if (slackResult.success) {
        const slackTasksResult = await productivityTaskStore.syncFromSlackMessages(slackResult.messages);
        syncedAtLeastOneSource = true;
        addedCount += slackTasksResult.addedCount;
        updatedCount += slackTasksResult.updatedCount;
        sourceResults.push({
          id: "slack",
          label: "Slack",
          success: true,
          connected: true,
          configured: true,
          addedCount: slackTasksResult.addedCount,
          updatedCount: slackTasksResult.updatedCount,
          itemCount: slackResult.messages.length,
          lastSyncedAt: Date.now()
        });
      } else {
        if (slackResult.status.configured) {
          reasons.push(slackResult.reason);
        }
        sourceResults.push({
          id: "slack",
          label: "Slack",
          success: false,
          connected: slackResult.status.connected,
          configured: slackResult.status.configured,
          addedCount: 0,
          updatedCount: 0,
          itemCount: slackResult.messages.length,
          reason: slackResult.reason
        });
      }
    }

    if (selectedSourceIds.has("outlook")) {
      sourceResults.push({
        id: "outlook",
        label: "Outlook",
        success: false,
        connected: false,
        configured: false,
        addedCount: 0,
        updatedCount: 0,
        itemCount: 0,
        reason: "Outlook sync is not configured yet."
      });
    }

    return {
      success: syncedAtLeastOneSource,
      tasks: await productivityTaskStore.listTasks(),
      addedCount,
      updatedCount,
      model,
      reason: reasons.filter(Boolean).join(" ") || (syncedAtLeastOneSource ? undefined : "No selected sources synced. Connect or configure the selected source, then try again."),
      sourceResults
    };
  });
  ipcMain.handle("automation:list-recipes", () => automationService.listRecipes());
  ipcMain.handle("automation:create-recipe", (_event, input: AutomationCreateRecipeInput) => automationService.createRecipe(input));
  ipcMain.handle("automation:update-recipe", (_event, input: AutomationUpdateRecipeInput) => automationService.updateRecipe(input));
  ipcMain.handle("automation:delete-recipe", (_event, recipeId: string) => automationService.deleteRecipe(recipeId));
  ipcMain.handle("automation:run-now", (_event, recipeId: string) => automationService.runNow(recipeId));
  ipcMain.handle("automation:list-runs", () => automationService.listRuns());
  ipcMain.handle("automation:detect-from-prompt", (_event, prompt: string, sourceWorkspace?: AutomationSourceWorkspace) =>
    detectAutomationIntent(String(prompt ?? ""), sourceWorkspace ?? "automation")
  );
  ipcMain.handle("observability:list-run-log", (_event, limit?: number) => observabilityStore.list(limit));
  ipcMain.handle("assistant:sources", () => getAssistantContextSources(controller));
  ipcMain.handle("assistant:ask", async (_event, request) => {
    const contextItems = await buildAssistantContextItems(controller, request);
    return assistantService.ask(request, contextItems);
  });
  ipcMain.handle("assistant:generate-prompts", (_event, request) => assistantService.generateDesignPrompts(request));
  ipcMain.handle("artifacts:list", () => artifactStore.listArtifacts());
  ipcMain.handle("artifacts:create", (_event, input: ArtifactCreateInput) => artifactStore.createArtifact(input));
  ipcMain.handle("artifacts:update", (_event, input: ArtifactUpdateInput) => artifactStore.updateArtifact(input));
  ipcMain.handle("artifacts:export", (_event, artifactId: string) => artifactStore.exportArtifact(artifactId));
  ipcMain.handle("artifacts:export-to-coding", async (_event, artifactId: string) => {
    const result = await artifactStore.exportArtifactToCoding(artifactId);
    if (!result.success) {
      return result;
    }

    const codingSnapshot = await codingWorkspace.addProjectFromPath(result.projectRootPath);
    return {
      ...result,
      codingSnapshot
    };
  });
  ipcMain.handle("agent:plan-from-email", (_event, input: AgentPlanFromEmailRequest) => agentService.planFromEmail(input));
  ipcMain.handle("agent:start-run", (_event, input: AgentStartRunRequest) => agentService.startRun(input));
  ipcMain.handle("agent:list-plans", () => agentService.listPlans());
  ipcMain.handle("agent:list-runs", () => agentService.listRuns());
  ipcMain.handle("agent:approve-final-step", (_event, planId: string) => agentService.approveFinalStep(planId));
  ipcMain.handle("agent:classify-work-item", async (_event, workItemId: string) => {
    const workItems = await productivityTaskStore.listWorkItems();
    const workItem = workItems.find((item) => item.id === workItemId);
    if (!workItem) {
      return {
        success: false,
        reason: "Work item was not found."
      };
    }

    return {
      success: true,
      workItem,
      ownership: getWorkItemOwnership(workItem),
      permissionLevel: getWorkItemPermissionLevel(workItem),
      needsReview: needsRouteReview(workItem),
      routeReason: workItem.routeReason,
      routeConfidence: workItem.routeConfidence
    };
  });
  ipcMain.handle("agent:quality-check-output", (_event, output: string, sourceText: string, options?: unknown) => {
    const qualityOptions =
      options && typeof options === "object"
        ? {
            minWords:
              typeof (options as { minWords?: unknown }).minWords === "number"
                ? Math.max(30, Math.min(1200, Math.round((options as { minWords: number }).minWords)))
                : undefined,
            requireSources: (options as { requireSources?: unknown }).requireSources === true
          }
        : {};
    return evaluateDocumentQuality(String(output ?? ""), String(sourceText ?? ""), qualityOptions);
  });
  ipcMain.handle("coding:snapshot", () => codingWorkspace.getSnapshot());
  ipcMain.handle("coding:open-project", () => codingWorkspace.openProject(mainWindow));
  ipcMain.handle("coding:open-files", () => codingWorkspace.openFiles(mainWindow));
  ipcMain.handle("coding:create-project", () => codingWorkspace.createProject(mainWindow));
  ipcMain.handle("coding:select-project", (_event, rootPath: string) => codingWorkspace.selectProject(rootPath));
  ipcMain.handle("coding:read-path", (_event, targetPath: string) => codingWorkspace.readPath(targetPath));
  ipcMain.handle("coding:write-file", (_event, targetPath: string, content: string) => codingWorkspace.writeFile(targetPath, content));
  ipcMain.handle("coding:delete-path", (_event, targetPath: string) => codingWorkspace.deletePath(targetPath));
  ipcMain.handle("coding:set-access-mode", (_event, mode: CodingAccessMode) => codingWorkspace.setAccessMode(mode));
  ipcMain.handle("coding:search", (_event, query: string) => codingWorkspace.searchProject(query));
  ipcMain.handle("coding:open-terminal", (_event, input?: CodingTerminalOpenRequest) => codingWorkspace.openTerminal(input));
  ipcMain.handle("coding:terminal-input", (_event, input: CodingTerminalInputRequest) => codingWorkspace.sendTerminalInput(input));
  ipcMain.handle("coding:run-command", (_event, input: CodingCommandRequest) => codingWorkspace.runCommand(input));
  ipcMain.handle("coding:repo-overview", () => codingWorkspace.getRepoOverview());
  ipcMain.handle("coding:language-tool-statuses", () => codingWorkspace.getLanguageToolStatuses());
  ipcMain.handle("coding:create-agent-plan", (_event, goal: string) => codingWorkspace.createAgentPlan(goal));
  ipcMain.handle("coding:start-agent-run", async (_event, goal: string) => {
    const planResult = await codingWorkspace.createAgentPlan(goal);
    if (!planResult.success) {
      return planResult;
    }

    const status = await codingWorkspace.getGitStatus();
    const run = {
      id: `coding-run:${randomUUID()}`,
      planId: planResult.plan.id,
      phase: planResult.plan.phase,
      understanding: planResult.plan.summary,
      schema: planResult.plan.schema,
      plan: planResult.plan.steps,
      commands: [],
      changedFiles: status.success ? status.changedFiles : [],
      testResults: [],
      approvalState: "needs_review" as const,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    return {
      success: true,
      plan: planResult.plan,
      run
    };
  });
  ipcMain.handle("coding:git-status", () => codingWorkspace.getGitStatus());
  ipcMain.handle("coding:git-diff", (_event, filePath?: string) => codingWorkspace.getGitDiff(filePath));
  ipcMain.handle("coding:browse", (_event, input: string) => codingWorkspace.browse(input));
  ipcMain.handle("coding:research", (_event, input: string) => codingWorkspace.research(input));
  ipcMain.handle("coding:plugin-statuses", () => codingWorkspace.getPluginStatuses());
  ipcMain.handle("coding:install-plugin", (_event, pluginId: string) => codingWorkspace.installPlugin(pluginId));
  ipcMain.handle("coding:cancel-plugin-install", (_event, pluginId: string) => codingWorkspace.cancelPluginInstall(pluginId));
  ipcMain.handle("downloads:list", async () => {
    await ensureDownloadHistoryLoaded();
    return normalizeDownloadHistory(downloadEntries);
  });
  ipcMain.handle("downloads:open", async (_event, id: string) => {
    await ensureDownloadHistoryLoaded();
    const entry = downloadEntries.find((download) => download.id === id);
    if (!entry?.path) {
      return { success: false, reason: "Download path is not available yet." };
    }

    const result = await shell.openPath(entry.path);
    return result ? { success: false, reason: result } : { success: true };
  });
  ipcMain.handle("passwords:stage", (event, input: PasswordCaptureInput) =>
    passwordStore.stage({
      ...input,
      title: input?.title || event.sender.getTitle(),
      url: input?.url || event.sender.getURL()
    })
  );
  ipcMain.handle("passwords:availability", () => passwordStore.getAvailability());
  ipcMain.handle("passwords:list", () => passwordStore.list());
  ipcMain.handle("passwords:save-pending", (_event, pendingId: string) => {
    const result = passwordStore.savePending(pendingId);
    if (result.success) {
      sendPasswordEntries();
    }
    return result;
  });
  ipcMain.handle("passwords:dismiss-pending", (_event, pendingId: string) => passwordStore.dismissPending(pendingId));
  ipcMain.handle("passwords:reveal", (_event, id: string) => passwordStore.reveal(id));
  ipcMain.handle("passwords:remove", (_event, id: string) => {
    const entries = passwordStore.remove(id);
    sendPasswordEntries();
    return entries;
  });
}

async function createMainWindow(): Promise<void> {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 920,
    minHeight: 620,
    title: "Autopilot Browser",
    icon: getAppIconPath(),
    backgroundColor: "#f4ebdd",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    }
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));

  tabs = new TabController(mainWindow);
  registerIpc(tabs, mainWindow);
  mainWindow.on("close", () => {
    if (tabs) {
      void persistActiveBrowserSnapshot(tabs);
    }
    flushPersistentBrowserStorage();
  });

  try {
    if (isDev && process.env.VITE_DEV_SERVER_URL) {
      await mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    } else {
      await mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
    }
  } catch (error) {
    console.warn("Autopilot Browser host failed to finish loading before tab restore.", error);
  }

  await restoreInitialBrowserWorkspace(tabs);
}

app.whenReady().then(async () => {
  app.setName("Autopilot Browser");
  app.setAppUserModelId("Autopilot.Browser");
  await ensureDownloadHistoryLoaded();
  denyPermissions();
  registerDownloadTracking();
  await createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  if (downloadHistorySaveTimer) {
    clearTimeout(downloadHistorySaveTimer);
    downloadHistorySaveTimer = null;
  }
  void saveDownloadHistory();
  flushPersistentBrowserStorage();
});

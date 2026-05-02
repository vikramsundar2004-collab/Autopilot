import { app, BrowserWindow, ipcMain, session, shell, type Rectangle } from "electron";
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
import { loadAutopilotEnv } from "./env.js";
import { PasswordStore } from "./passwords.js";
import { ProductivityTaskStore } from "./productivityTasks.js";
import { TabController } from "./tabs.js";
import { WorkspaceStore } from "./workspaces.js";
import { AssistantService } from "./assistant.js";
import { AgentService } from "./agent.js";
import { ArtifactStore } from "./artifacts.js";
import type { AddBookmarkFolderInput, AddBookmarkInput, BookmarkNodeTarget } from "../shared/bookmarks.js";
import type { AgentPlanFromEmailRequest, AgentStartRunRequest } from "../shared/agent.js";
import type { ArtifactCreateInput, ArtifactUpdateInput } from "../shared/artifacts.js";
import type { CodingAccessMode, CodingCommandRequest, CodingDownloadEntry, CodingTreeNode } from "../shared/coding.js";
import type { PasswordCaptureInput } from "../shared/passwords.js";
import {
  DEFAULT_ASSISTANT_CONTEXT_SOURCES,
  sanitizeAssistantRequest,
  type AssistantContextItem,
  type AssistantContextSource
} from "../shared/assistant.js";
import type { ProductivityTaskState } from "../shared/productivity.js";
import type { WorkspaceProfile } from "../shared/workspaces.js";
import { CodingWorkspace } from "./coding.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);

let tabs: TabController | null = null;
loadAutopilotEnv();
const passwordStore = new PasswordStore();
const emailService = new EmailService();
const codingWorkspace = new CodingWorkspace();
const workspaceStore = new WorkspaceStore();
const productivityTaskStore = new ProductivityTaskStore();
const assistantService = new AssistantService();
const artifactStore = new ArtifactStore(
  () => app.getPath("userData"),
  () => path.join(app.getPath("documents"), "Autopilot Artifacts")
);
const agentService = new AgentService(artifactStore, emailService, () => app.getPath("userData"));
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

async function persistActiveBrowserSnapshot(controller: TabController): Promise<void> {
  const workspaceState = await workspaceStore.getState();
  const activeWorkspace = workspaceState.profiles.find((profile) => profile.id === workspaceState.activeWorkspaceId);
  if (activeWorkspace?.view !== "browser") {
    return;
  }

  await workspaceStore.persistBrowserSnapshot(activeWorkspace.id, controller.getSnapshot());
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

function registerIpc(controller: TabController, mainWindow: BrowserWindow): void {
  function sendPasswordEntries(): void {
    if (!mainWindow.webContents.isDestroyed()) {
      mainWindow.webContents.send("passwords:changed", passwordStore.list());
    }
  }

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
  ipcMain.handle("workspaces:switch", async (_event, workspaceId: string) => workspaceStore.setActiveWorkspace(workspaceId));
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
  ipcMain.handle("email:connect-gmail", () =>
    emailService.connectGmail((authUrl) => {
      controller.createTab(authUrl);
      mainWindow.focus();
    })
  );
  ipcMain.handle("email:connect-gmail-external", () => emailService.connectGmail());
  ipcMain.handle("email:sync", () => emailService.syncInbox());
  ipcMain.handle("email:analyze-actions", (_event, messages) => emailService.analyzeActionItems(messages));
  ipcMain.handle("email:disconnect", () => emailService.disconnect());
  ipcMain.handle("productivity:list-tasks", () => productivityTaskStore.listTasks());
  ipcMain.handle("productivity:list-drafts", () => productivityTaskStore.listDrafts());
  ipcMain.handle("productivity:upsert-draft", (_event, input) => productivityTaskStore.upsertDraft(input));
  ipcMain.handle("productivity:delete-draft", (_event, draftId: string) => productivityTaskStore.deleteDraft(draftId));
  ipcMain.handle("productivity:update-task", (_event, taskId: string, patch) => productivityTaskStore.updateTask(taskId, patch));
  ipcMain.handle("productivity:set-task-state", (_event, taskId: string, state: ProductivityTaskState) =>
    productivityTaskStore.setTaskState(taskId, state)
  );
  ipcMain.handle("productivity:sync", async () => {
    const inboxResult = await emailService.syncInbox();
    if (!inboxResult.success) {
      return {
        success: false,
        tasks: await productivityTaskStore.listTasks(),
        addedCount: 0,
        updatedCount: 0,
        reason: inboxResult.reason ?? inboxResult.status.reason ?? "Gmail sync failed."
      };
    }

    const analysisResult = await emailService.analyzeActionItems(inboxResult.messages);
    return productivityTaskStore.syncFromEmailActions(inboxResult.messages, analysisResult);
  });
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
  ipcMain.handle("coding:snapshot", () => codingWorkspace.getSnapshot());
  ipcMain.handle("coding:open-project", () => codingWorkspace.openProject(mainWindow));
  ipcMain.handle("coding:create-project", () => codingWorkspace.createProject(mainWindow));
  ipcMain.handle("coding:select-project", (_event, rootPath: string) => codingWorkspace.selectProject(rootPath));
  ipcMain.handle("coding:read-path", (_event, targetPath: string) => codingWorkspace.readPath(targetPath));
  ipcMain.handle("coding:write-file", (_event, targetPath: string, content: string) => codingWorkspace.writeFile(targetPath, content));
  ipcMain.handle("coding:delete-path", (_event, targetPath: string) => codingWorkspace.deletePath(targetPath));
  ipcMain.handle("coding:set-access-mode", (_event, mode: CodingAccessMode) => codingWorkspace.setAccessMode(mode));
  ipcMain.handle("coding:search", (_event, query: string) => codingWorkspace.searchProject(query));
  ipcMain.handle("coding:run-command", (_event, input: CodingCommandRequest) => codingWorkspace.runCommand(input));
  ipcMain.handle("coding:browse", (_event, input: string) => codingWorkspace.browse(input));
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

function createMainWindow(): void {
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

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    void mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    void mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  tabs.createTab();
}

app.whenReady().then(async () => {
  app.setName("Autopilot Browser");
  app.setAppUserModelId("Autopilot.Browser");
  await ensureDownloadHistoryLoaded();
  denyPermissions();
  registerDownloadTracking();
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
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
});

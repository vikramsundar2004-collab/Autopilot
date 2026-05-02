import { contextBridge, ipcRenderer, type IpcRendererEvent, type Rectangle } from "electron";

import type {
  AddBookmarkFolderInput,
  AddBookmarkInput,
  BookmarkNodeTarget,
  BrowserBookmarkNode,
  BrowserBookmarkSourceOption
} from "../shared/bookmarks.js";
import type { BrowserSnapshot } from "../shared/browserModel.js";
import type {
  CodingAccessMode,
  CodingCommandRequest,
  CodingCommandResult,
  CodingDeleteResult,
  CodingDownloadEntry,
  CodingFileReadResult,
  CodingPluginInstallResult,
  CodingPluginStatus,
  CodingResearchResult,
  CodingSearchResult,
  CodingSnapshot,
  CodingWriteResult
} from "../shared/coding.js";
import type {
  EmailActionAnalysisResult,
  EmailConnectResult,
  EmailConnectionStatus,
  EmailMessageSummary,
  EmailSyncResult
} from "../shared/email.js";
import type {
  PasswordAvailability,
  PasswordCredentialSummary,
  PasswordRevealResult,
  PasswordSaveResult,
  PendingPasswordSave
} from "../shared/passwords.js";
import type {
  PageTextCaptureResult,
  ProductivityDraft,
  ProductivityTask,
  ProductivityTaskState,
  ProductivityTaskSyncResult
} from "../shared/productivity.js";
import type {
  AssistantContextSource,
  AssistantRequest,
  AssistantResponse,
  DesignPromptSuggestionRequest,
  DesignPromptSuggestionResponse
} from "../shared/assistant.js";
import type { ActionPlan, AgentPlanFromEmailRequest, AgentPlanResult, AgentRun, AgentStartRunRequest } from "../shared/agent.js";
import type { Artifact, ArtifactCreateInput, ArtifactExportResult, ArtifactExportToCodingResult, ArtifactUpdateInput } from "../shared/artifacts.js";
import type { WorkspaceProfile, WorkspaceState } from "../shared/workspaces.js";

const tabsApi = {
  getSnapshot: () => ipcRenderer.invoke("tabs:snapshot") as Promise<BrowserSnapshot>,
  create: (url?: string) => ipcRenderer.invoke("tabs:create", url) as Promise<BrowserSnapshot>,
  close: (tabId: string) => ipcRenderer.invoke("tabs:close", tabId) as Promise<BrowserSnapshot>,
  activate: (tabId: string) => ipcRenderer.invoke("tabs:activate", tabId) as Promise<BrowserSnapshot>,
  navigate: (tabId: string, input: string) => ipcRenderer.invoke("tabs:navigate", tabId, input) as Promise<BrowserSnapshot>,
  home: (tabId: string) => ipcRenderer.invoke("tabs:home", tabId) as Promise<BrowserSnapshot>,
  back: (tabId: string) => ipcRenderer.invoke("tabs:back", tabId) as Promise<BrowserSnapshot>,
  forward: (tabId: string) => ipcRenderer.invoke("tabs:forward", tabId) as Promise<BrowserSnapshot>,
  reload: (tabId: string) => ipcRenderer.invoke("tabs:reload", tabId) as Promise<BrowserSnapshot>,
  readPageText: (tabId: string) => ipcRenderer.invoke("tabs:read-page-text", tabId) as Promise<PageTextCaptureResult>,
  print: (tabId: string) => ipcRenderer.invoke("tabs:print", tabId) as Promise<{ success: boolean; reason?: string }>,
  setWebArea: (bounds: Rectangle, visible: boolean) =>
    ipcRenderer.invoke("tabs:web-area", bounds, visible) as Promise<BrowserSnapshot>,
  setGroup: (tabId: string, groupId: string | null) => ipcRenderer.invoke("tabs:set-group", tabId, groupId) as Promise<BrowserSnapshot>,
  setPinned: (tabId: string, pinned: boolean) => ipcRenderer.invoke("tabs:set-pinned", tabId, pinned) as Promise<BrowserSnapshot>,
  hibernate: (tabId: string) => ipcRenderer.invoke("tabs:hibernate", tabId) as Promise<BrowserSnapshot>,
  wake: (tabId: string) => ipcRenderer.invoke("tabs:wake", tabId) as Promise<BrowserSnapshot>,
  subscribe: (listener: (snapshot: BrowserSnapshot) => void) => {
    const handler = (_event: IpcRendererEvent, snapshot: BrowserSnapshot) => listener(snapshot);
    ipcRenderer.on("tabs:changed", handler);
    return () => ipcRenderer.removeListener("tabs:changed", handler);
  }
};

const passwordsApi = {
  availability: () => ipcRenderer.invoke("passwords:availability") as Promise<PasswordAvailability>,
  list: () => ipcRenderer.invoke("passwords:list") as Promise<PasswordCredentialSummary[]>,
  savePending: (pendingId: string) => ipcRenderer.invoke("passwords:save-pending", pendingId) as Promise<PasswordSaveResult>,
  dismissPending: (pendingId: string) => ipcRenderer.invoke("passwords:dismiss-pending", pendingId) as Promise<void>,
  reveal: (id: string) => ipcRenderer.invoke("passwords:reveal", id) as Promise<PasswordRevealResult>,
  remove: (id: string) => ipcRenderer.invoke("passwords:remove", id) as Promise<PasswordCredentialSummary[]>,
  subscribeChanges: (listener: (entries: PasswordCredentialSummary[]) => void) => {
    const handler = (_event: IpcRendererEvent, entries: PasswordCredentialSummary[]) => listener(entries);
    ipcRenderer.on("passwords:changed", handler);
    return () => ipcRenderer.removeListener("passwords:changed", handler);
  },
  subscribeSavePrompts: (listener: (pending: PendingPasswordSave) => void) => {
    const handler = (_event: IpcRendererEvent, pending: PendingPasswordSave) => listener(pending);
    ipcRenderer.on("passwords:save-prompt", handler);
    return () => ipcRenderer.removeListener("passwords:save-prompt", handler);
  }
};

contextBridge.exposeInMainWorld("autopilot", {
  runtime: "electron",
  platform: process.platform,
  versions: {
    chrome: process.versions.chrome,
    electron: process.versions.electron
  },
  tabs: tabsApi,
  bookmarks: {
    list: () => ipcRenderer.invoke("bookmarks:list") as Promise<BrowserBookmarkNode[]>,
    add: (input: AddBookmarkInput) => ipcRenderer.invoke("bookmarks:add", input) as Promise<BrowserBookmarkNode[]>,
    addFolder: (input: AddBookmarkFolderInput) => ipcRenderer.invoke("bookmarks:add-folder", input) as Promise<BrowserBookmarkNode[]>,
    delete: (target: BookmarkNodeTarget) => ipcRenderer.invoke("bookmarks:delete", target) as Promise<BrowserBookmarkNode[]>,
    sources: () => ipcRenderer.invoke("bookmarks:sources") as Promise<BrowserBookmarkSourceOption[]>,
    selectedSources: () => ipcRenderer.invoke("bookmarks:selected-sources") as Promise<string[]>,
    setSources: (sources: string[]) => ipcRenderer.invoke("bookmarks:set-sources", sources) as Promise<BrowserBookmarkNode[]>
  },
  workspaces: {
    state: () => ipcRenderer.invoke("workspaces:state") as Promise<WorkspaceState>,
    switch: (workspaceId: string) => ipcRenderer.invoke("workspaces:switch", workspaceId) as Promise<WorkspaceState>,
    update: (profile: WorkspaceProfile) => ipcRenderer.invoke("workspaces:update", profile) as Promise<WorkspaceState>,
    persistBrowserSnapshot: (workspaceId: string) =>
      ipcRenderer.invoke("workspaces:persist-browser-snapshot", workspaceId) as Promise<WorkspaceState>
  },
  email: {
    status: () => ipcRenderer.invoke("email:status") as Promise<EmailConnectionStatus>,
    list: () => ipcRenderer.invoke("email:list") as Promise<EmailMessageSummary[]>,
    connectGmail: () => ipcRenderer.invoke("email:connect-gmail") as Promise<EmailConnectResult>,
    connectGmailExternal: () => ipcRenderer.invoke("email:connect-gmail-external") as Promise<EmailConnectResult>,
    sync: () => ipcRenderer.invoke("email:sync") as Promise<EmailSyncResult>,
    analyzeActions: (messages: EmailMessageSummary[]) =>
      ipcRenderer.invoke("email:analyze-actions", messages) as Promise<EmailActionAnalysisResult>,
    disconnect: () => ipcRenderer.invoke("email:disconnect") as Promise<EmailConnectionStatus>
  },
  productivity: {
    listTasks: () => ipcRenderer.invoke("productivity:list-tasks") as Promise<ProductivityTask[]>,
    listDrafts: () => ipcRenderer.invoke("productivity:list-drafts") as Promise<ProductivityDraft[]>,
    upsertDraft: (draft: Partial<ProductivityDraft> & Pick<ProductivityDraft, "title" | "body" | "artifactKind" | "source">) =>
      ipcRenderer.invoke("productivity:upsert-draft", draft) as Promise<ProductivityDraft[]>,
    deleteDraft: (draftId: string) => ipcRenderer.invoke("productivity:delete-draft", draftId) as Promise<ProductivityDraft[]>,
    updateTask: (taskId: string, patch: Partial<ProductivityTask>) =>
      ipcRenderer.invoke("productivity:update-task", taskId, patch) as Promise<ProductivityTask[]>,
    setTaskState: (taskId: string, state: ProductivityTaskState) =>
      ipcRenderer.invoke("productivity:set-task-state", taskId, state) as Promise<ProductivityTask[]>,
    sync: () => ipcRenderer.invoke("productivity:sync") as Promise<ProductivityTaskSyncResult>
  },
  assistant: {
    sources: () => ipcRenderer.invoke("assistant:sources") as Promise<AssistantContextSource[]>,
    ask: (request: AssistantRequest) => ipcRenderer.invoke("assistant:ask", request) as Promise<AssistantResponse>,
    generatePrompts: (request: DesignPromptSuggestionRequest) =>
      ipcRenderer.invoke("assistant:generate-prompts", request) as Promise<DesignPromptSuggestionResponse>
  },
  artifacts: {
    list: () => ipcRenderer.invoke("artifacts:list") as Promise<Artifact[]>,
    create: (input: ArtifactCreateInput) => ipcRenderer.invoke("artifacts:create", input) as Promise<Artifact>,
    update: (input: ArtifactUpdateInput) => ipcRenderer.invoke("artifacts:update", input) as Promise<Artifact[]>,
    export: (artifactId: string) => ipcRenderer.invoke("artifacts:export", artifactId) as Promise<ArtifactExportResult>,
    exportToCoding: (artifactId: string) => ipcRenderer.invoke("artifacts:export-to-coding", artifactId) as Promise<ArtifactExportToCodingResult>
  },
  agent: {
    planFromEmail: (input: AgentPlanFromEmailRequest) => ipcRenderer.invoke("agent:plan-from-email", input) as Promise<AgentPlanResult>,
    startRun: (input: AgentStartRunRequest) => ipcRenderer.invoke("agent:start-run", input) as Promise<AgentPlanResult>,
    listPlans: () => ipcRenderer.invoke("agent:list-plans") as Promise<ActionPlan[]>,
    listRuns: () => ipcRenderer.invoke("agent:list-runs") as Promise<AgentRun[]>,
    approveFinalStep: (planId: string) => ipcRenderer.invoke("agent:approve-final-step", planId) as Promise<AgentRun[]>
  },
  coding: {
    getSnapshot: () => ipcRenderer.invoke("coding:snapshot") as Promise<CodingSnapshot>,
    openProject: () => ipcRenderer.invoke("coding:open-project") as Promise<CodingSnapshot>,
    createProject: () => ipcRenderer.invoke("coding:create-project") as Promise<CodingSnapshot>,
    selectProject: (rootPath: string) => ipcRenderer.invoke("coding:select-project", rootPath) as Promise<CodingSnapshot>,
    readPath: (targetPath: string) => ipcRenderer.invoke("coding:read-path", targetPath) as Promise<CodingFileReadResult>,
    writeFile: (targetPath: string, content: string) =>
      ipcRenderer.invoke("coding:write-file", targetPath, content) as Promise<CodingWriteResult>,
    deletePath: (targetPath: string) => ipcRenderer.invoke("coding:delete-path", targetPath) as Promise<CodingDeleteResult>,
    setAccessMode: (mode: CodingAccessMode) => ipcRenderer.invoke("coding:set-access-mode", mode) as Promise<CodingSnapshot>,
    search: (query: string) => ipcRenderer.invoke("coding:search", query) as Promise<CodingSearchResult[]>,
    runCommand: (input: CodingCommandRequest) => ipcRenderer.invoke("coding:run-command", input) as Promise<CodingCommandResult>,
    browse: (input: string) => ipcRenderer.invoke("coding:browse", input) as Promise<CodingResearchResult>,
    pluginStatuses: () => ipcRenderer.invoke("coding:plugin-statuses") as Promise<CodingPluginStatus[]>,
    installPlugin: (pluginId: string) => ipcRenderer.invoke("coding:install-plugin", pluginId) as Promise<CodingPluginInstallResult>,
    cancelPluginInstall: (pluginId: string) =>
      ipcRenderer.invoke("coding:cancel-plugin-install", pluginId) as Promise<CodingPluginInstallResult>,
    listDownloads: () => ipcRenderer.invoke("downloads:list") as Promise<CodingDownloadEntry[]>,
    openDownload: (id: string) => ipcRenderer.invoke("downloads:open", id) as Promise<{ success: boolean; reason?: string }>
  },
  downloads: {
    list: () => ipcRenderer.invoke("downloads:list") as Promise<CodingDownloadEntry[]>,
    open: (id: string) => ipcRenderer.invoke("downloads:open", id) as Promise<{ success: boolean; reason?: string }>
  },
  passwords: passwordsApi
});

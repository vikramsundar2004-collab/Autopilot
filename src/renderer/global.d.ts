import type {
  AddBookmarkFolderInput,
  AddBookmarkInput,
  BookmarkNodeTarget,
  BrowserBookmarkNode,
  BrowserBookmarkSourceOption
} from "../shared/bookmarks";
import type { BrowserSnapshot } from "../shared/browserModel";
import type {
  CodingAgentPlanResult,
  CodingAgentRun,
  CodingAccessMode,
  CodingCommandRequest,
  CodingCommandResult,
  CodingDeleteResult,
  CodingDownloadEntry,
  CodingFileReadResult,
  CodingGitDiffResult,
  CodingGitStatusResult,
  CodingLanguageToolStatus,
  CodingOpenFileResult,
  CodingPluginInstallResult,
  CodingPluginStatus,
  CodingRepoOverviewResult,
  CodingResearchReportResult,
  CodingResearchResult,
  CodingSearchResult,
  CodingSnapshot,
  CodingTerminalInputRequest,
  CodingTerminalInputResult,
  CodingTerminalOpenRequest,
  CodingTerminalOpenResult,
  CodingTerminalOutputEvent,
  CodingWriteResult
} from "../shared/coding";
import type {
  EmailActionAnalysisResult,
  EmailConnectResult,
  EmailConnectionStatus,
  EmailMessageSummary,
  EmailSyncResult
} from "../shared/email";
import type {
  PasswordAvailability,
  PasswordCredentialSummary,
  PasswordRevealResult,
  PasswordSaveResult,
  PendingPasswordSave
} from "../shared/passwords";
import type {
  PageDomActionResult,
  PageDomSnapshotResult,
  PageTextCaptureResult,
  ProductivityDraft,
  ProductivityTask,
  ProductivityTaskState,
  ProductivityTaskSyncResult
} from "../shared/productivity";
import type { AutopilotRunLogEvent } from "../shared/observability";
import type {
  AssistantContextSource,
  AssistantRequest,
  AssistantResponse,
  DesignPromptSuggestionRequest,
  DesignPromptSuggestionResponse
} from "../shared/assistant";
import type { ActionPlan, AgentPlanFromEmailRequest, AgentPlanResult, AgentRun, AgentStartRunRequest } from "../shared/agent";
import type { Artifact, ArtifactCreateInput, ArtifactExportResult, ArtifactExportToCodingResult, ArtifactUpdateInput } from "../shared/artifacts";
import type {
  AutomationCreateRecipeInput,
  AutomationIntent,
  AutomationRecipe,
  AutomationRun,
  AutomationRunResult,
  AutomationSourceWorkspace,
  AutomationUpdateRecipeInput
} from "../shared/automation";
import type { ArtifactQualityReport } from "../shared/artifactQuality";
import type { ProactiveWorkPlan } from "../shared/proactiveWork";
import type { TodaysCallPlan } from "../shared/todaysCall";
import type { ProductivityRouteWorkItemResult, WorkAssignment, WorkItem } from "../shared/workItems";
import type { WorkspaceProfile, WorkspaceState } from "../shared/workspaces";

type ViewBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type TabsApi = {
  getSnapshot: () => Promise<BrowserSnapshot>;
  create: (url?: string) => Promise<BrowserSnapshot>;
  close: (tabId: string) => Promise<BrowserSnapshot>;
  activate: (tabId: string) => Promise<BrowserSnapshot>;
  navigate: (tabId: string, input: string) => Promise<BrowserSnapshot>;
  home: (tabId: string) => Promise<BrowserSnapshot>;
  back: (tabId: string) => Promise<BrowserSnapshot>;
  forward: (tabId: string) => Promise<BrowserSnapshot>;
  reload: (tabId: string) => Promise<BrowserSnapshot>;
  readPageText: (tabId: string) => Promise<PageTextCaptureResult>;
  readDOM: (tabId: string) => Promise<PageDomSnapshotResult>;
  clickBySelector: (tabId: string, selector: string) => Promise<PageDomActionResult>;
  fillBySelector: (tabId: string, selector: string, value: unknown) => Promise<PageDomActionResult>;
  scrollTo: (tabId: string, target: string | number) => Promise<PageDomActionResult>;
  print: (tabId: string) => Promise<{ success: boolean; reason?: string }>;
  setWebArea: (bounds: ViewBounds, visible: boolean) => Promise<BrowserSnapshot>;
  setGroup: (tabId: string, groupId: string | null) => Promise<BrowserSnapshot>;
  setPinned: (tabId: string, pinned: boolean) => Promise<BrowserSnapshot>;
  hibernate: (tabId: string) => Promise<BrowserSnapshot>;
  wake: (tabId: string) => Promise<BrowserSnapshot>;
  subscribe: (listener: (snapshot: BrowserSnapshot) => void) => () => void;
};

type WorkspacesApi = {
  state: () => Promise<WorkspaceState>;
  switch: (workspaceId: string) => Promise<WorkspaceState>;
  update: (profile: WorkspaceProfile) => Promise<WorkspaceState>;
  persistBrowserSnapshot: (workspaceId: string) => Promise<WorkspaceState>;
};

type PasswordsApi = {
  availability: () => Promise<PasswordAvailability>;
  list: () => Promise<PasswordCredentialSummary[]>;
  savePending: (pendingId: string) => Promise<PasswordSaveResult>;
  dismissPending: (pendingId: string) => Promise<void>;
  reveal: (id: string) => Promise<PasswordRevealResult>;
  remove: (id: string) => Promise<PasswordCredentialSummary[]>;
  subscribeChanges: (listener: (entries: PasswordCredentialSummary[]) => void) => () => void;
  subscribeSavePrompts: (listener: (pending: PendingPasswordSave) => void) => () => void;
};

type EmailApi = {
  status: () => Promise<EmailConnectionStatus>;
  list: () => Promise<EmailMessageSummary[]>;
  connectGmail: () => Promise<EmailConnectResult>;
  connectGmailExternal: () => Promise<EmailConnectResult>;
  sync: () => Promise<EmailSyncResult>;
  analyzeActions: (messages: EmailMessageSummary[]) => Promise<EmailActionAnalysisResult>;
  disconnect: () => Promise<EmailConnectionStatus>;
};

type CodingApi = {
  getSnapshot: () => Promise<CodingSnapshot>;
  openProject: () => Promise<CodingSnapshot>;
  openFiles: () => Promise<CodingOpenFileResult>;
  createProject: () => Promise<CodingSnapshot>;
  selectProject: (rootPath: string) => Promise<CodingSnapshot>;
  readPath: (targetPath: string) => Promise<CodingFileReadResult>;
  writeFile: (targetPath: string, content: string) => Promise<CodingWriteResult>;
  deletePath: (targetPath: string) => Promise<CodingDeleteResult>;
  setAccessMode: (mode: CodingAccessMode) => Promise<CodingSnapshot>;
  search: (query: string) => Promise<CodingSearchResult[]>;
  openTerminal: (input?: CodingTerminalOpenRequest) => Promise<CodingTerminalOpenResult>;
  sendTerminalInput: (input: CodingTerminalInputRequest) => Promise<CodingTerminalInputResult>;
  subscribeTerminalOutput: (listener: (event: CodingTerminalOutputEvent) => void) => () => void;
  runCommand: (input: CodingCommandRequest) => Promise<CodingCommandResult>;
  repoOverview: () => Promise<CodingRepoOverviewResult>;
  languageToolStatuses: () => Promise<CodingLanguageToolStatus[]>;
  createAgentPlan: (goal: string) => Promise<CodingAgentPlanResult>;
  startAgentRun: (goal: string) => Promise<CodingAgentPlanResult | { success: true; plan: Extract<CodingAgentPlanResult, { success: true }>["plan"]; run: CodingAgentRun }>;
  gitStatus: () => Promise<CodingGitStatusResult>;
  gitDiff: (filePath?: string) => Promise<CodingGitDiffResult>;
  browse: (input: string) => Promise<CodingResearchResult>;
  research: (input: string) => Promise<CodingResearchReportResult>;
  pluginStatuses: () => Promise<CodingPluginStatus[]>;
  installPlugin: (pluginId: string) => Promise<CodingPluginInstallResult>;
  cancelPluginInstall: (pluginId: string) => Promise<CodingPluginInstallResult>;
  listDownloads: () => Promise<CodingDownloadEntry[]>;
  openDownload: (id: string) => Promise<{ success: boolean; reason?: string }>;
};

type DownloadsApi = {
  list: () => Promise<CodingDownloadEntry[]>;
  open: (id: string) => Promise<{ success: boolean; reason?: string }>;
};

type ProductivityApi = {
  listTasks: () => Promise<ProductivityTask[]>;
  listDrafts: () => Promise<ProductivityDraft[]>;
  listWorkItems: () => Promise<WorkItem[]>;
  listWorkAssignments: () => Promise<WorkAssignment[]>;
  buildTodaysCall: () => Promise<TodaysCallPlan>;
  startSafeWork: (limit?: number) => Promise<{
    success: boolean;
    startedCount: number;
    consideredCount: number;
    reason?: string;
    plan: ProactiveWorkPlan;
    results: ProductivityRouteWorkItemResult[];
    workItems: WorkItem[];
    allAssignments: WorkAssignment[];
  }>;
  upsertDraft: (draft: Partial<ProductivityDraft> & Pick<ProductivityDraft, "title" | "body" | "artifactKind" | "source">) => Promise<ProductivityDraft[]>;
  deleteDraft: (draftId: string) => Promise<ProductivityDraft[]>;
  updateTask: (taskId: string, patch: Partial<ProductivityTask>) => Promise<ProductivityTask[]>;
  setTaskState: (taskId: string, state: ProductivityTaskState) => Promise<ProductivityTask[]>;
  updateWorkAssignment: (assignmentId: string, patch: Partial<WorkAssignment>) => Promise<WorkAssignment[]>;
  routeWorkItem: (workItemId: string) => Promise<ProductivityRouteWorkItemResult>;
  sync: (sourceIds?: string[]) => Promise<ProductivityTaskSyncResult>;
};

type AutomationApi = {
  listRecipes: () => Promise<AutomationRecipe[]>;
  createRecipe: (input: AutomationCreateRecipeInput) => Promise<AutomationRecipe[]>;
  updateRecipe: (input: AutomationUpdateRecipeInput) => Promise<AutomationRecipe[]>;
  deleteRecipe: (recipeId: string) => Promise<AutomationRecipe[]>;
  runNow: (recipeId: string) => Promise<AutomationRunResult>;
  listRuns: () => Promise<AutomationRun[]>;
  detectFromPrompt: (prompt: string, sourceWorkspace?: AutomationSourceWorkspace) => Promise<AutomationIntent>;
};

type ObservabilityApi = {
  listRunLog: (limit?: number) => Promise<AutopilotRunLogEvent[]>;
};

type AssistantApi = {
  sources: () => Promise<AssistantContextSource[]>;
  ask: (request: AssistantRequest) => Promise<AssistantResponse>;
  generatePrompts: (request: DesignPromptSuggestionRequest) => Promise<DesignPromptSuggestionResponse>;
};

type ArtifactsApi = {
  list: () => Promise<Artifact[]>;
  create: (input: ArtifactCreateInput) => Promise<Artifact>;
  update: (input: ArtifactUpdateInput) => Promise<Artifact[]>;
  export: (artifactId: string) => Promise<ArtifactExportResult>;
  exportToCoding: (artifactId: string) => Promise<ArtifactExportToCodingResult>;
};

type AgentApi = {
  planFromEmail: (input: AgentPlanFromEmailRequest) => Promise<AgentPlanResult>;
  startRun: (input: AgentStartRunRequest) => Promise<AgentPlanResult>;
  listPlans: () => Promise<ActionPlan[]>;
  listRuns: () => Promise<AgentRun[]>;
  approveFinalStep: (planId: string) => Promise<AgentRun[]>;
  classifyWorkItem: (workItemId: string) => Promise<unknown>;
  qualityCheckOutput: (output: string, sourceText: string, options?: { minWords?: number; requireSources?: boolean }) => Promise<ArtifactQualityReport>;
};

declare global {
  interface Window {
    autopilot?: {
      runtime: "electron";
      platform: string;
      versions: {
        chrome: string;
        electron: string;
      };
      tabs: TabsApi;
      workspaces: WorkspacesApi;
      bookmarks: {
        list: () => Promise<BrowserBookmarkNode[]>;
        add: (input: AddBookmarkInput) => Promise<BrowserBookmarkNode[]>;
        addFolder: (input: AddBookmarkFolderInput) => Promise<BrowserBookmarkNode[]>;
        delete: (target: BookmarkNodeTarget) => Promise<BrowserBookmarkNode[]>;
        sources: () => Promise<BrowserBookmarkSourceOption[]>;
        selectedSources: () => Promise<string[]>;
        setSources: (sources: string[]) => Promise<BrowserBookmarkNode[]>;
      };
      passwords: PasswordsApi;
      email: EmailApi;
      productivity: ProductivityApi;
      automation: AutomationApi;
      observability: ObservabilityApi;
      assistant: AssistantApi;
      artifacts: ArtifactsApi;
      agent: AgentApi;
      coding: CodingApi;
      downloads: DownloadsApi;
    };
  }
}

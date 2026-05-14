import {
  closeTab,
  createHomeUrl,
  createTab,
  normalizeAddressInput,
  readableTitle,
  updateTab,
  type BrowserSnapshot
} from "../shared/browserModel";
import {
  DEFAULT_BOOKMARKS,
  createBookmarkNodeKey,
  type AddBookmarkFolderInput,
  type AddBookmarkInput,
  type BookmarkNodeTarget,
  type BrowserBookmarkNode,
  type BrowserBookmarkSourceOption
} from "../shared/bookmarks";
import type { CalendarWriteRequest, CalendarWriteResult } from "../shared/calendar";
import type {
  EmailActionAnalysisResult,
  EmailConnectResult,
  EmailConnectionStatus,
  EmailOrganizationAction,
  EmailMessageSummary,
  GmailOrganizationResult,
  EmailSyncResult
} from "../shared/email";
import {
  createCodingAgentPlanFromOverview,
  parseGitPorcelainStatus,
  type CodingAgentPlanResult,
  type CodingAgentRunResult,
  type CodingAccessMode,
  type CodingCommandLogResult,
  type CodingCommandPlan,
  type CodingCommandRequest,
  type CodingCommandResult,
  type CodingDeepQaBenchmarkResult,
  type CodingDeleteResult,
  type CodingDownloadEntry,
  type CodingFileReadResult,
  type CodingGitDiffResult,
  type CodingGitStatusResult,
  type GitCommitProposalResult,
  type GitCommitRequest,
  type GitCommitResult,
  type GitPushRequest,
  type GitPushResult,
  type CodingOpenFileResult,
  type CodingPatchSetResult,
  type CodingPluginInstallResult,
  type CodingPluginStatus,
  type CodingPreviewValidationRequest,
  type CodingPreviewValidationResult,
  type CodingRepoOverviewResult,
  type CodingRenameProjectResult,
  type CodingResearchReportResult,
  type CodingResearchResult,
  type CodingSearchResult,
  type CodingSnapshot,
  type CodingTerminalInputRequest,
  type CodingTerminalInputResult,
  type CodingTerminalOpenRequest,
  type CodingTerminalOpenResult,
  type CodingTerminalOutputEvent,
  type CodingWriteResult
} from "../shared/coding";
import { CODING_PLUGIN_CATALOG } from "../shared/codingPlugins";
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
  ProductivityTaskInput,
  ProductivityTask,
  ProductivityTaskState,
  ProductivityTaskSyncRequest,
  ProductivityTaskSyncResult
} from "../shared/productivity";
import type {
  AssistantContextSource,
  AssistantRequest,
  AssistantResponse,
  CodingPromptTranslationRequest,
  CodingPromptTranslationResponse,
  DesignPromptTranslationRequest,
  DesignPromptTranslationResponse,
  DesignPromptSuggestionRequest,
  DesignPromptSuggestionResponse
} from "../shared/assistant";
import type { ActionPlan, AgentPlanFromEmailRequest, AgentPlanResult, AgentRun, AgentStartRunRequest } from "../shared/agent";
import {
  buildAgentTrace,
  createCoreToolRegistry,
  createDefaultConnectors,
  createDefaultHooks,
  createDefaultSubagents,
  createInitialWorkspaceMemory,
  updateWorkspaceMemory,
  type AgentRunRequest,
  type AgentTrace,
  type ConnectorDescriptor,
  type HookDefinition,
  type SubagentDefinition,
  type ToolDescriptor,
  type WorkspaceMemory
} from "../shared/agentRuntime";
import {
  detectAutomationIntent,
  type AutomationCreateRecipeInput,
  type AutomationIntent,
  type AutomationRecipe,
  type AutomationRun,
  type AutomationRunResult,
  type AutomationSourceWorkspace,
  type AutomationUpdateRecipeInput
} from "../shared/automation";
import { evaluateDocumentQuality, type ArtifactQualityReport } from "../shared/artifactQuality";
import { buildProactiveWorkPlan, type ProactiveWorkPlan } from "../shared/proactiveWork";
import { buildTodaysCallPlan, type TodaysCallPlan } from "../shared/todaysCall";
import {
  defaultArtifactContent,
  type Artifact,
  type ArtifactContent,
  type ArtifactCreateInput,
  type ArtifactExportResult,
  type ArtifactExportToCodingResult,
  type ArtifactUpdateInput
} from "../shared/artifacts";
import { createWorkItemFromTask, type ProductivityRouteWorkItemResult, type WorkAssignment, type WorkItem } from "../shared/workItems";
import { DEFAULT_WORKSPACE_PROFILES, type WorkspaceProfile, type WorkspaceState } from "../shared/workspaces";
import type { AccountSignInRequest, AccountSignInResult, AccountStatus, BackendConfigStatus } from "../shared/account";
import {
  DEFAULT_AUTOPILOT_OPENAI_MODEL,
  DEFAULT_AUTOPILOT_SUPABASE_PROJECT_REF,
  DEFAULT_AUTOPILOT_SUPABASE_URL
} from "../shared/backendConfig";
import type { AutopilotRunLogEvent } from "../shared/observability";
import type { CreateDiagnosticLogInput, DiagnosticExportResult, DiagnosticLogEntry } from "../shared/diagnostics";
import {
  buildWorkTwinReplay,
  buildProofModeReport,
  getWorkGraphCounts,
  type ProofModeReport,
  type ShadowModeRule,
  type ShadowModeRun,
  type WorkGraphActionResult,
  type WorkGraphApproval,
  type WorkGraphItem,
  type WorkGraphMakeRuleResult,
  type WorkGraphSnapshot,
  type WorkTwinReplayStep
} from "../shared/workGraph";
import type {
  HostedApprovalResult,
  InvoiceCandidate,
  InvoiceVerificationReport,
  MoneyMovementActionResult,
  MoneyMovementSettings,
  MoneyMovementVerification,
  PaymentDestination,
  PaymentApproval,
  PaymentExecutionResult,
  PaymentMode,
  PaymentProviderKind,
  PaymentProposal,
  PaymentProposalInput,
  PaymentQuoteResult,
  PaymentReceipt,
  PaymentReceiptVerificationResult,
  ProviderReadinessChecklist,
  VendorVerificationReport
} from "../shared/highImpactActions";

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

type BookmarksApi = {
  list: () => Promise<BrowserBookmarkNode[]>;
  add: (input: AddBookmarkInput) => Promise<BrowserBookmarkNode[]>;
  addFolder: (input: AddBookmarkFolderInput) => Promise<BrowserBookmarkNode[]>;
  delete: (target: BookmarkNodeTarget) => Promise<BrowserBookmarkNode[]>;
  sources: () => Promise<BrowserBookmarkSourceOption[]>;
  selectedSources: () => Promise<string[]>;
  setSources: (sources: string[]) => Promise<BrowserBookmarkNode[]>;
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
  organize: (actions: EmailOrganizationAction[]) => Promise<GmailOrganizationResult>;
  disconnect: () => Promise<EmailConnectionStatus>;
};

type CalendarApi = {
  write: (request: CalendarWriteRequest) => Promise<CalendarWriteResult>;
};

type CodingApi = {
  getSnapshot: () => Promise<CodingSnapshot>;
  openProject: () => Promise<CodingSnapshot>;
  openFiles: () => Promise<CodingOpenFileResult>;
  createProject: () => Promise<CodingSnapshot>;
  selectProject: (rootPath: string) => Promise<CodingSnapshot>;
  renameProject: (rootPath: string, name: string) => Promise<CodingRenameProjectResult>;
  readPath: (targetPath: string) => Promise<CodingFileReadResult>;
  writeFile: (targetPath: string, content: string) => Promise<CodingWriteResult>;
  deletePath: (targetPath: string) => Promise<CodingDeleteResult>;
  setAccessMode: (mode: CodingAccessMode) => Promise<CodingSnapshot>;
  search: (query: string) => Promise<CodingSearchResult[]>;
  openTerminal: (input?: CodingTerminalOpenRequest) => Promise<CodingTerminalOpenResult>;
  sendTerminalInput: (input: CodingTerminalInputRequest) => Promise<CodingTerminalInputResult>;
  subscribeTerminalOutput: (listener: (event: CodingTerminalOutputEvent) => void) => () => void;
  planCommand: (input: CodingCommandRequest) => Promise<CodingCommandPlan>;
  approveCommand: (input: CodingCommandRequest) => Promise<CodingCommandResult>;
  runCommand: (input: CodingCommandRequest) => Promise<CodingCommandResult>;
  getCommandLog: () => Promise<CodingCommandLogResult>;
  createPatchSet: () => Promise<CodingPatchSetResult>;
  validatePreview: (input: CodingPreviewValidationRequest) => Promise<CodingPreviewValidationResult>;
  runDeepQaBenchmark: () => Promise<CodingDeepQaBenchmarkResult>;
  repoOverview: () => Promise<CodingRepoOverviewResult>;
  createAgentPlan: (goal: string) => Promise<CodingAgentPlanResult>;
  startAgentRun: (goal: string) => Promise<CodingAgentRunResult>;
  gitStatus: () => Promise<CodingGitStatusResult>;
  gitDiff: (filePath?: string) => Promise<CodingGitDiffResult>;
  gitCommitProposal: (message?: string, filePaths?: string[]) => Promise<GitCommitProposalResult>;
  gitCommit: (request: GitCommitRequest) => Promise<GitCommitResult>;
  gitPush: (request: GitPushRequest) => Promise<GitPushResult>;
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
  upsertTask: (task: ProductivityTaskInput) => Promise<ProductivityTask[]>;
  updateTask: (taskId: string, patch: Partial<ProductivityTask>) => Promise<ProductivityTask[]>;
  setTaskState: (taskId: string, state: ProductivityTaskState) => Promise<ProductivityTask[]>;
  updateWorkAssignment: (assignmentId: string, patch: Partial<WorkAssignment>) => Promise<WorkAssignment[]>;
  routeWorkItem: (workItemId: string) => Promise<ProductivityRouteWorkItemResult>;
  sync: (request?: string[] | ProductivityTaskSyncRequest) => Promise<ProductivityTaskSyncResult>;
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

type WorkGraphApi = {
  list: () => Promise<WorkGraphSnapshot>;
  get: (itemId: string) => Promise<WorkGraphItem | null>;
  replay: (itemId: string) => Promise<WorkTwinReplayStep[]>;
  startSafeWork: (itemId: string) => Promise<WorkGraphActionResult>;
  approve: (itemId: string) => Promise<WorkGraphActionResult>;
  reject: (itemId: string, reason?: string) => Promise<WorkGraphActionResult>;
  revise: (itemId: string, feedback?: string) => Promise<WorkGraphActionResult>;
  makeRule: (itemId: string) => Promise<WorkGraphMakeRuleResult>;
};

type WorkTwinApi = {
  getProof: (itemId: string) => Promise<ProofModeReport | null>;
};

type RuntimeAgentApi = {
  run: (input: AgentRunRequest) => Promise<AgentTrace>;
  listTools: (workspace?: string) => Promise<ToolDescriptor[]>;
  getTrace: (traceId: string) => Promise<AgentTrace | null>;
  approveTool: (traceId: string, toolName: string) => Promise<AgentTrace | null>;
};

type ConnectorsApi = {
  list: () => Promise<ConnectorDescriptor[]>;
  getStatus: (connectorId: string) => Promise<ConnectorDescriptor | null>;
  setEnabled: (connectorId: string, enabled: boolean) => Promise<ConnectorDescriptor | null>;
};

type MemoryApi = {
  get: () => Promise<WorkspaceMemory[]>;
  update: (input: Omit<WorkspaceMemory, "id" | "updatedAt"> & { id?: string }) => Promise<WorkspaceMemory[]>;
};

type HooksApi = {
  list: () => Promise<HookDefinition[]>;
  test: (input: { event: HookDefinition["event"]; workspace: string; value: string }) => Promise<{
    blocked: boolean;
    requiresApproval: boolean;
    matchedHooks: HookDefinition[];
  }>;
};

type SubagentsApi = {
  list: () => Promise<SubagentDefinition[]>;
  run: (subagentId: string, prompt: string) => Promise<AgentTrace | null>;
};

type ShadowModeApi = {
  listRuns: () => Promise<ShadowModeRun[]>;
  listRules: () => Promise<ShadowModeRule[]>;
  setRuleEnabled: (ruleId: string, enabled: boolean) => Promise<ShadowModeRule[]>;
};

type AssistantApi = {
  sources: () => Promise<AssistantContextSource[]>;
  ask: (request: AssistantRequest) => Promise<AssistantResponse>;
  translateDesignPrompt: (request: DesignPromptTranslationRequest) => Promise<DesignPromptTranslationResponse>;
  translateCodingPrompt: (request: CodingPromptTranslationRequest) => Promise<CodingPromptTranslationResponse>;
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

type AccountApi = {
  status: () => Promise<AccountStatus>;
  getConfig: () => Promise<BackendConfigStatus>;
  signIn: (request: AccountSignInRequest) => Promise<AccountSignInResult>;
  signUp: (request: AccountSignInRequest) => Promise<AccountSignInResult>;
  signOut: () => Promise<AccountStatus>;
  subscribe: (listener: (status: AccountStatus) => void) => () => void;
};

type SettingsApi = {
  getMoneyMovement: () => Promise<MoneyMovementSettings>;
  startMoneyVerification: (acknowledged: boolean) => Promise<MoneyMovementVerification>;
  confirmMoneyVerification: (code: string) => Promise<MoneyMovementVerification>;
  disableMoneyMovement: () => Promise<MoneyMovementActionResult>;
  startStripeConnect: () => Promise<MoneyMovementActionResult>;
  refreshStripeConnection: () => Promise<MoneyMovementActionResult>;
  disconnectStripeAccount: () => Promise<MoneyMovementActionResult>;
};

type PaymentsApi = {
  verifyInvoice: (input: InvoiceCandidate) => Promise<InvoiceVerificationReport>;
  verifyVendor: (input: {
    providerKind: PaymentProviderKind;
    payeeName: string;
    payeeEmail?: string;
    destination?: PaymentDestination;
    trustedDomains?: string[];
    userApprovedVendorRecord?: boolean;
  }) => Promise<VendorVerificationReport>;
  getProviderReadiness: () => Promise<ProviderReadinessChecklist[]>;
  listReceipts: () => Promise<PaymentReceipt[]>;
  verifyReceipt: (receiptId: string) => Promise<PaymentReceiptVerificationResult>;
  createHostedApproval: (proposalId: string) => Promise<HostedApprovalResult>;
  confirmProviderStatus: () => Promise<ProviderReadinessChecklist[]>;
  createProposal: (input: PaymentProposalInput) => Promise<{ success: true; proposal: PaymentProposal } | { success: false; reason: string; settings: MoneyMovementSettings }>;
  getQuote: (proposalId: string) => Promise<PaymentQuoteResult>;
  approve: (proposalId: string, stepUpConfirmed: boolean) => Promise<
    { success: true; approval: PaymentApproval; proposal: PaymentProposal } | { success: false; reason: string; proposal?: PaymentProposal; settings?: MoneyMovementSettings }
  >;
  execute: (proposalId: string, approvalId: string, mode?: PaymentMode) => Promise<PaymentExecutionResult>;
};

type SystemApi = {
  openExternalUrl: (url: string) => Promise<{ success: true } | { success: false; reason: string }>;
};

type DiagnosticsApi = {
  list: (limit?: number) => Promise<DiagnosticLogEntry[]>;
  record: (input: CreateDiagnosticLogInput) => Promise<DiagnosticLogEntry>;
  clear: () => Promise<DiagnosticLogEntry[]>;
  export: () => Promise<DiagnosticExportResult>;
  subscribe: (listener: (entries: DiagnosticLogEntry[]) => void) => () => void;
};

type ObservabilityApi = {
  listRunLog: (limit?: number) => Promise<AutopilotRunLogEvent[]>;
};

export type AutopilotApi = {
  runtime: "electron" | "browser-preview";
  platform: string;
  versions: {
    chrome: string;
    electron: string;
  };
  tabs: TabsApi;
  workspaces: WorkspacesApi;
  bookmarks: BookmarksApi;
  passwords: PasswordsApi;
  email: EmailApi;
  calendar: CalendarApi;
  productivity: ProductivityApi;
  workGraph: WorkGraphApi;
  workTwin: WorkTwinApi;
  runtimeAgent: RuntimeAgentApi;
  connectors: ConnectorsApi;
  memory: MemoryApi;
  hooks: HooksApi;
  subagents: SubagentsApi;
  shadowMode: ShadowModeApi;
  automation: AutomationApi;
  account: AccountApi;
  settings: SettingsApi;
  payments: PaymentsApi;
  system: SystemApi;
  diagnostics: DiagnosticsApi;
  observability: ObservabilityApi;
  assistant: AssistantApi;
  artifacts: ArtifactsApi;
  agent: AgentApi;
  coding: CodingApi;
  downloads: DownloadsApi;
};

let previewApi: AutopilotApi | null = null;

function cloneSnapshot(snapshot: BrowserSnapshot): BrowserSnapshot {
  return {
    activeTabId: snapshot.activeTabId,
    tabs: snapshot.tabs.map((tab) => ({ ...tab }))
  };
}

export function createPreviewAutopilotApi(): AutopilotApi {
  const firstTab = createTab(createHomeUrl(), "Preview tab");
  let snapshot: BrowserSnapshot = {
    tabs: [firstTab],
    activeTabId: firstTab.id
  };
  let previewBookmarks = structuredClone(DEFAULT_BOOKMARKS);
  let previewSelectedSources: string[] = [];
  let previewPasswords: PasswordCredentialSummary[] = [];
  let previewEmailMessages: EmailMessageSummary[] = [];
  let previewWorkspaceState: WorkspaceState = {
    activeWorkspaceId: "browsing",
    profiles: structuredClone(DEFAULT_WORKSPACE_PROFILES)
  };
  let previewProductivityTasks: ProductivityTask[] = [];
  let previewProductivityDrafts: ProductivityDraft[] = [];
  let previewWorkItems: WorkItem[] = [];
  let previewWorkAssignments: WorkAssignment[] = [];
  let previewAutomationRecipes: AutomationRecipe[] = [];
  let previewAutomationRuns: AutomationRun[] = [];
  let previewArtifacts: Artifact[] = [];
  let previewActionPlans: ActionPlan[] = [];
  let previewAgentRuns: AgentRun[] = [];
  let previewDiagnostics: DiagnosticLogEntry[] = [];
  let previewWorkGraphApprovals: Record<string, WorkGraphApproval> = {};
  let previewShadowModeRuns: ShadowModeRun[] = [];
  let previewShadowModeRules: ShadowModeRule[] = [];
  let previewCodingCommandExecutions: CodingCommandLogResult["executions"] = [];
  const previewTools = createCoreToolRegistry();
  let previewConnectors = createDefaultConnectors(previewTools);
  let previewMemory = createInitialWorkspaceMemory();
  const previewHooks = createDefaultHooks();
  const previewSubagents = createDefaultSubagents();
  let previewAgentTraces: AgentTrace[] = [];
  const previewProject = {
    name: "Autopilot preview",
    rootPath: "C:\\Projects\\autopilot-preview",
    openedAt: Date.now()
  };
  const previewTree: NonNullable<CodingSnapshot["tree"]> = {
    kind: "folder",
    name: "Autopilot preview",
    path: "C:\\Projects\\autopilot-preview",
    relativePath: ".",
    size: 0,
    modifiedAt: Date.now(),
    children: [
      {
        kind: "folder",
        name: "src",
        path: "C:\\Projects\\autopilot-preview\\src",
        relativePath: "src",
        size: 0,
        modifiedAt: Date.now(),
        children: [
          {
            kind: "file",
            name: "main.tsx",
            path: "C:\\Projects\\autopilot-preview\\src\\main.tsx",
            relativePath: "src\\main.tsx",
            size: 138,
            modifiedAt: Date.now()
          }
        ]
      },
      {
        kind: "file",
        name: "README.md",
        path: "C:\\Projects\\autopilot-preview\\README.md",
        relativePath: "README.md",
        size: 188,
        modifiedAt: Date.now()
      }
    ]
  };
  let previewCodingSnapshot: CodingSnapshot = {
    projects: [previewProject],
    activeProject: null,
    tree: null,
    accessMode: "ask"
  };
  const listeners = new Set<(snapshot: BrowserSnapshot) => void>();
  const previewEmailStatus: EmailConnectionStatus = {
    provider: "gmail",
    configured: false,
    connected: false,
    accountEmail: null,
    grantedScopes: [],
    capabilities: {
      gmail: false,
      calendar: false,
      gmailRead: false,
      gmailModify: false,
      gmailDrafts: false,
      gmailSend: false,
      calendarRead: false,
      calendarWrite: false,
      driveRead: false,
      docsRead: false,
      slidesRead: false,
      formsRead: false
    },
    reason: "Email sync is available in the desktop app when AUTOPILOT_GOOGLE_CLIENT_ID is configured."
  };

  function publish(nextSnapshot: BrowserSnapshot): BrowserSnapshot {
    snapshot = cloneSnapshot(nextSnapshot);
    const published = cloneSnapshot(snapshot);
    for (const listener of listeners) {
      listener(published);
    }
    return published;
  }

  function getActiveId(tabId?: string): string | null {
    return tabId ?? snapshot.activeTabId;
  }

  function activatePreviewCodingProject(): CodingSnapshot {
    previewCodingSnapshot = {
      ...previewCodingSnapshot,
      activeProject: previewProject,
      tree: previewTree
    };
    return structuredClone(previewCodingSnapshot);
  }

  function compactPreviewText(value: string, maxLength = 560): string {
    const text = value.replace(/\s+/g, " ").trim();
    if (text.length <= maxLength) {
      return text;
    }
    return `${text.slice(0, Math.max(0, maxLength - 1)).trim()}...`;
  }

  function escapePreviewHtml(value: string): string {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function toPreviewTitleCase(value: string): string {
    return value
      .split(/\s+/u)
      .filter(Boolean)
      .map((word) => {
        if (/^[A-Z0-9]{2,}$/u.test(word)) {
          return word;
        }
        return `${word.slice(0, 1).toUpperCase()}${word.slice(1).toLowerCase()}`;
      })
      .join(" ");
  }

  function derivePreviewSubject(prompt: string, fallbackTitle: string): string {
    const source = (prompt || fallbackTitle || "new design").replace(/\s+/gu, " ").trim();
    const explicitSubject = source.match(/\b(?:for|about)\s+(?:a|an|the)?\s*([^.;,]+?)(?:\s+(?:with|including|include)|[.;,]|$)/iu)?.[1];
    const candidate = (explicitSubject ?? source)
      .replace(/\b(?:create|build|make|design|draft|generate|polished|clean|client-ready|modern|responsive|website|web site|landing page|mockup|concept|artifact|presentation|deck|document)\b/giu, " ")
      .replace(/\b(?:include|including|with)\b[\s\S]*$/iu, " ")
      .replace(/[^A-Za-z0-9&\s-]/gu, " ")
      .replace(/\s+/gu, " ")
      .trim();

    return toPreviewTitleCase(candidate || fallbackTitle || "New Design").slice(0, 72);
  }

  function derivePreviewArtifactTitle(kind: Artifact["kind"], title: string, prompt: string): string {
    const subject = derivePreviewSubject(prompt, title);
    const suffix = kind === "slide_deck" ? "Deck" : kind === "website_design" ? "Website" : "Brief";
    return subject.toLowerCase().includes(suffix.toLowerCase()) ? subject : `${subject} ${suffix}`;
  }

  function extractPreviewRequestedSections(prompt: string): string[] {
    const requested = prompt.match(/\b(?:include|with)\s+(.+)$/iu)?.[1] ?? "";
    return requested
      .split(/,|\band\b|\+/iu)
      .map((section) => section.replace(/[^A-Za-z0-9\s-]/gu, " ").replace(/\s+/gu, " ").trim())
      .filter((section) => section.length > 1)
      .slice(0, 5);
  }

  function createPreviewArtifactContent(kind: Artifact["kind"], title: string, prompt: string): ArtifactContent {
    const cleanTitle = title.trim().slice(0, 120) || "Preview artifact";
    const sourceSummary = compactPreviewText(prompt || "No source context was provided.", 720);
    const bullets = [
      compactPreviewText(sourceSummary, 140),
      "Autopilot inferred the useful deliverable instead of showing the raw source first.",
      "Review the result, then approve, revise, export, or send it to Coding."
    ];

    if (kind === "slide_deck") {
      return {
        kind,
        slides: [
          {
            id: `preview-slide:${crypto.randomUUID()}`,
            title: cleanTitle,
            bullets: ["Client-ready story generated from the selected context.", "Open Sources to verify provenance."],
            speakerNotes: "Cover slide generated from the preview prompt."
          },
          {
            id: `preview-slide:${crypto.randomUUID()}`,
            title: "What matters",
            bullets,
            speakerNotes: "Autopilot pulled the key ask from the prompt/source context."
          },
          {
            id: `preview-slide:${crypto.randomUUID()}`,
            title: "Recommended next move",
            bullets: [
              "Confirm the intended audience and deadline.",
              "Use Revise to sharpen tone, scope, or section order.",
              "Approve only after the quality gate and source trail look right."
            ],
            speakerNotes: "Closing slide keeps the user in the approval loop."
          }
        ]
      };
    }

    if (kind === "website_design") {
      const subject = derivePreviewSubject(prompt, cleanTitle);
      const requestedSections = extractPreviewRequestedSections(prompt);
      const escapedSummary = escapePreviewHtml(
        `A polished landing page structure for ${subject.toLowerCase()} with crisp proof, simple offers, and a clear next step.`
      );
      const sectionOne = escapePreviewHtml(requestedSections[0] ?? "Hero");
      const sectionTwo = escapePreviewHtml(requestedSections[1] ?? "Pricing");
      const sectionThree = escapePreviewHtml(requestedSections[2] ?? "Testimonials");
      const headline = escapePreviewHtml(`${subject} that feels ready to trust.`);
      return {
        kind,
        html: `<main class="artifact-page"><section class="hero"><p>Autopilot Design Preview</p><h1>${headline}</h1><span>${escapedSummary}</span><div class="hero-actions"><a href="#signup">Start a session</a><a class="secondary" href="#proof">See outcomes</a></div></section><section id="proof" class="proof-strip"><span>${sectionOne}</span><span>${sectionTwo}</span><span>${sectionThree}</span></section><section class="sections"><article><h2>Hands-on progress</h2><p>Turn the first visit into a clear path: what the learner builds, how quickly they improve, and why the program feels safe to try.</p></article><article><h2>Simple plans</h2><p>Show two or three price points with plain outcomes, not vague package names. Keep the recommended plan visually obvious.</p></article><article><h2>Parent proof</h2><p>Use short testimonials, measurable wins, and a visible next step so the page feels ready for real review.</p></article></section><section id="signup" class="cta"><p>Ready for a better first session?</p><h2>Book a robotics tutoring consult this week.</h2><a href="mailto:hello@example.com">Request a time</a></section></main>`,
        css: ".artifact-page{min-height:100vh;padding:56px;font-family:Inter,system-ui,sans-serif;background:#fff8ed;color:#122318}.hero{max-width:900px}.hero p,.proof-strip span{text-transform:uppercase;letter-spacing:.08em;color:#0f6b50;font-weight:900}.hero h1{font-family:Fraunces,Georgia,serif;font-size:clamp(44px,7vw,82px);line-height:.95;max-width:880px;margin:0 0 18px}.hero span{display:block;max-width:700px;color:#53645a;font-size:18px;line-height:1.55}.hero-actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:30px}.hero a,.cta a{display:inline-flex;border-radius:999px;background:#0f4d36;color:#fff;padding:13px 18px;text-decoration:none;font-weight:900}.hero a.secondary{background:#eef3e8;color:#0f4d36}.proof-strip{display:flex;flex-wrap:wrap;gap:10px;margin:44px 0 10px}.proof-strip span{border:1px solid #cddbc8;border-radius:999px;background:#f7fbf0;padding:8px 11px;font-size:12px}.sections{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin-top:22px}.sections article,.cta{border:1px solid #d9c9b4;border-radius:18px;background:#fffdf8;padding:22px;box-shadow:0 18px 42px rgba(24,38,28,.08)}.sections h2,.cta h2{margin:0 0 8px}.sections p,.cta p{margin:0;color:#53645a;line-height:1.5}.cta{margin-top:18px;background:#123521;color:#fff}.cta p{color:#c9d8ce}.cta a{margin-top:18px;background:#f1c879;color:#17321f}@media(max-width:760px){.artifact-page{padding:28px}.sections{grid-template-columns:1fr}.hero h1{font-size:42px}}",
        sections: [
          {
            id: `preview-section:${crypto.randomUUID()}`,
            name: "Hero",
            summary: `${subject} intro with a clear primary call to action.`
          },
          {
            id: `preview-section:${crypto.randomUUID()}`,
            name: "Pricing",
            summary: "Simple package structure with one recommended path."
          },
          {
            id: `preview-section:${crypto.randomUUID()}`,
            name: "Testimonials",
            summary: "Trust-building proof and a closing conversion step."
          }
        ]
      };
    }

    return {
      kind: "document",
      markdown: [
        `# ${cleanTitle}`,
        "",
        "## Executive summary",
        sourceSummary,
        "",
        "## What Autopilot will produce",
        "- A result-first artifact based on the selected email, prompt, or source.",
        "- A source trail so the user can verify where the claims came from.",
        "- A quality-gated approval path before export or external action.",
        "",
        "## Recommended next steps",
        "1. Review the generated result beside the source.",
        "2. Ask Autopilot for a revision if the tone, structure, or audience is off.",
        "3. Approve only when the quality report and source trail are acceptable."
      ].join("\n")
    };
  }

  async function createPreviewAgentArtifact(
    title: string,
    prompt: string,
    kind: Artifact["kind"],
    source?: Partial<Artifact["source"]>
  ): Promise<AgentPlanResult> {
    const now = Date.now();
    const versionId = `preview-version:${crypto.randomUUID()}`;
    const artifactTitle = derivePreviewArtifactTitle(kind, title, prompt).slice(0, 96) || "Preview artifact";
    const artifact: Artifact = {
      id: `preview-artifact:${crypto.randomUUID()}`,
      kind,
      title: artifactTitle,
      summary: "Local preview draft generated from the prompt.",
      source: {
        provider: source?.provider === "gmail" ? "gmail" : "manual",
        label: source?.label ?? "Preview prompt",
        messageId: source?.messageId,
        threadId: source?.threadId,
        url: source?.url,
        from: source?.from,
        fromEmail: source?.fromEmail,
        subject: source?.subject
      },
      visibility: source?.provider === "gmail" ? "ai_generated" : "user_project",
      pinned: false,
      activeVersionId: versionId,
      versions: [
        {
          id: versionId,
          createdAt: now,
          prompt,
          summary: "Local preview draft generated from the prompt.",
          content: createPreviewArtifactContent(kind, artifactTitle, prompt)
        }
      ],
      createdAt: now,
      updatedAt: now
    };
    previewArtifacts = [artifact, ...previewArtifacts];

    const plan: ActionPlan = {
      id: `preview-plan:${crypto.randomUUID()}`,
      title: artifact.title,
      summary: artifact.summary,
      source: {
        provider: source?.provider === "gmail" ? "gmail" : "manual",
        label: source?.label ?? "Preview prompt",
        messageId: source?.messageId,
        url: source?.url
      },
      tool: kind,
      artifactId: artifact.id,
      steps: [
        {
          id: `preview-step:${crypto.randomUUID()}`,
          title: "Generate artifact in the Design tab",
          tool: kind,
          state: "completed" as const,
          risk: "local" as const,
          requiresFinalApproval: false,
          artifactId: artifact.id
        }
      ],
      finalApproval: { required: false, reason: "Preview artifact only." },
      createdAt: now,
      updatedAt: now
    };
    previewActionPlans = [plan, ...previewActionPlans];
    const run: AgentRun = {
      id: `preview-run:${crypto.randomUUID()}`,
      planId: plan.id,
      state: "completed",
      events: [
        {
          id: `preview-event:${crypto.randomUUID()}`,
          createdAt: now,
          level: "success",
          message: "Preview artifact generated."
        }
      ],
      createdAt: now,
      updatedAt: now
    };
    previewAgentRuns = [run, ...previewAgentRuns];
    return { success: true, plan, artifact, run, model: "preview", usedFallback: true };
  }

  function createPreviewExternalAction(label: string) {
    const requiresApproval = /\b(send|reply|forward|share|publish|submit|delete|pay|purchase|commit|push|unsubscribe)\b/iu.test(label);
    return {
      label,
      risk: requiresApproval ? ("red" as const) : ("green" as const),
      requiresApproval,
      disabledReason: requiresApproval ? "Approval required before external impact." : undefined
    };
  }

  function buildPreviewWorkGraphSnapshot(): WorkGraphSnapshot {
    const now = Date.now();
    const workItemsGraph: WorkGraphItem[] = previewWorkItems.slice(0, 10).map((workItem) => {
      const assignment = previewWorkAssignments.find((candidate) => candidate.workItemId === workItem.id);
      const id = `work-item:${workItem.id}`;
      const state = assignment?.state === "running" ? "ai_working" : assignment?.approvalState === "needs_review" ? "needs_approval" : assignment ? "handled_safely" : "ready_to_start";
      return {
        id,
        title: workItem.title,
        summary: workItem.context,
        source: {
          kind: workItem.source.provider === "gmail" ? "gmail" : workItem.source.provider === "google-calendar" ? "google-calendar" : "manual",
          id: workItem.source.messageId ?? workItem.source.url ?? workItem.id,
          label: workItem.source.label,
          provider: workItem.source.provider,
          url: workItem.source.url,
          excerpt: workItem.source.actionSummary ?? workItem.context,
          createdAt: workItem.createdAt
        },
        route: {
          workspace: assignment?.role ?? workItem.assignedRoles[0] ?? "productivity",
          confidence: workItem.routeConfidence,
          reason: workItem.routeReason
        },
        run: {
          state,
          safeActions: ["read source", "summarize", "draft or plan"],
          plan: workItem.aiSuggestedPrep ?? (workItem.extractedRequirements.join(" -> ") || "Prepare safe work and stop before external impact."),
          visibleRunLog: assignment?.lastRunSummary ? [assignment.lastRunSummary] : ["Preview item is ready for safe work."]
        },
        output: {
          kind: assignment?.outputRefs[0]?.kind === "artifact" ? "artifact" : assignment?.outputRefs[0]?.kind === "coding" ? "coding_plan" : assignment?.outputRefs[0]?.kind === "automation" ? "automation_run" : "none",
          title: assignment?.outputRefs[0]?.label ?? workItem.requestedOutput,
          summary: assignment?.lastRunSummary ?? "No output has been produced yet.",
          refId: assignment?.outputRefs[0]?.id,
          workspace: assignment?.role ?? workItem.assignedRoles[0] ?? "productivity"
        },
        quality: assignment?.qualityScore
          ? { score: assignment.qualityScore, passed: assignment.qualityScore >= 80, summary: assignment.failureReason ?? "Quality checked." }
          : undefined,
        approval: previewWorkGraphApprovals[id] ?? { state: assignment?.approvalState === "needs_review" ? "needs_approval" : "not_required" },
        externalAction: createPreviewExternalAction(workItem.permissionLevel === "approval" ? "Send or share final output" : "Review prepared work"),
        shadow: {
          eligible: workItem.source.provider !== "google-calendar",
          active: assignment?.state === "running",
          why:
            workItem.source.provider === "google-calendar"
              ? "Calendar events are user-owned commitments."
              : "Preview Shadow Mode can read, draft, summarize, prepare, or plan without external impact."
        },
        createdAt: workItem.createdAt,
        updatedAt: workItem.updatedAt
      };
    });

    const routedMessageIds = new Set(previewWorkItems.map((item) => item.source.messageId).filter(Boolean));
    const emailGraph: WorkGraphItem[] = previewEmailMessages
      .filter((message) => !routedMessageIds.has(message.id))
      .slice(0, 4)
      .map((message) => {
        const id = `email:${message.id}`;
        return {
          id,
          title: message.subject || "Email source",
          summary: message.snippet || "Ready for safe triage.",
          source: {
            kind: "gmail",
            id: message.id,
            label: [message.from, message.subject].filter(Boolean).join(" - ") || "Gmail message",
            provider: "gmail",
            url: message.url,
            excerpt: message.snippet,
            createdAt: message.receivedAt
          },
          route: { workspace: "productivity", confidence: 55, reason: "Inbox source needs classification before it can become queue work." },
          run: {
            state: "ready_to_start",
            safeActions: ["classify email", "draft reply", "suggest route"],
            plan: "Classify this email for real work. Keep low-confidence findings in the inbox.",
            visibleRunLog: ["Email is cached in preview.", "No reply or Gmail change will happen without approval."]
          },
          output: { kind: "source_review", title: "Email triage candidate", summary: "Ready for safe classification.", workspace: "productivity" },
          approval: previewWorkGraphApprovals[id] ?? { state: "not_required" },
          externalAction: createPreviewExternalAction("Classify only"),
          shadow: { eligible: true, active: false, why: "Safe to classify and draft without sending." },
          createdAt: message.receivedAt,
          updatedAt: message.receivedAt
        };
      });

    const artifactGraph: WorkGraphItem[] = previewArtifacts.slice(0, 4).map((artifact) => {
      const id = `artifact:${artifact.id}`;
      return {
        id,
        title: artifact.title,
        summary: artifact.summary,
        source: {
          kind: "design-artifact",
          id: artifact.id,
          label: "Design artifact",
          provider: "design",
          excerpt: artifact.summary,
          createdAt: artifact.createdAt
        },
        route: { workspace: "design", confidence: 90, reason: "Generated artifact is ready for Design review." },
        run: {
          state: "needs_approval",
          safeActions: ["quality check", "revise artifact", "prepare export"],
          plan: "Review artifact quality and export readiness.",
          visibleRunLog: ["Preview artifact generated.", "Export stays disabled in browser preview."]
        },
        output: { kind: "artifact", title: artifact.title, summary: artifact.summary, refId: artifact.id, workspace: "design" },
        approval: previewWorkGraphApprovals[id] ?? { state: "needs_approval", requiredReason: "Approve before sharing or exporting." },
        externalAction: createPreviewExternalAction("Export or share artifact"),
        shadow: { eligible: true, active: false, why: "Safe to revise and quality check locally." },
        createdAt: artifact.createdAt,
        updatedAt: artifact.updatedAt
      };
    });

    const browserTab = snapshot.tabs.find((tab) => tab.id === snapshot.activeTabId);
    const browserGraph: WorkGraphItem[] = browserTab
      ? [
          {
            id: `browser:${browserTab.id}`,
            title: browserTab.title || "Active browser tab",
            summary: browserTab.url,
            source: {
              kind: "browser-tab",
              id: browserTab.id,
              label: browserTab.title || browserTab.url,
              provider: "browser",
              url: browserTab.url,
              createdAt: now
            },
            route: { workspace: "browser", confidence: 82, reason: "Browser assistant can read the active tab and stop before external actions." },
            run: {
              state: "ready_to_start",
              safeActions: ["read page", "summarize page", "inspect DOM"],
              plan: "Read the current tab and prepare a grounded summary or safe action plan.",
              visibleRunLog: ["Preview tab is available for page-read."]
            },
            output: { kind: "browser_summary", title: "Page-read candidate", summary: "Ready to summarize safely.", refId: browserTab.id, workspace: "browser" },
            approval: previewWorkGraphApprovals[`browser:${browserTab.id}`] ?? { state: "not_required" },
            externalAction: createPreviewExternalAction("Read page only"),
            shadow: { eligible: true, active: false, why: "Safe to read and summarize the page." },
            createdAt: now,
            updatedAt: now
          }
        ]
      : [];

    const codingGraph: WorkGraphItem[] = previewCodingSnapshot.activeProject
      ? [
          {
            id: `coding:${previewCodingSnapshot.activeProject.rootPath}`,
            title: previewCodingSnapshot.activeProject.name,
            summary: `Coding project open at ${previewCodingSnapshot.activeProject.rootPath}.`,
            source: {
              kind: "coding-project",
              id: previewCodingSnapshot.activeProject.rootPath,
              label: previewCodingSnapshot.activeProject.name,
              provider: "coding",
              excerpt: previewCodingSnapshot.activeProject.rootPath,
              createdAt: previewCodingSnapshot.activeProject.openedAt
            },
            route: { workspace: "coding", confidence: 90, reason: "Active project can support inspect, edit, test, diff, approve." },
            run: {
              state: "ready_to_start",
              safeActions: ["inspect files", "prepare plan", "show diff"],
              plan: "Inspect the project and prepare a Codex-style coding plan.",
              visibleRunLog: ["Project is open in preview."]
            },
            output: { kind: "coding_plan", title: "Coding plan candidate", summary: "Ready for a reviewable coding run.", workspace: "coding" },
            approval: previewWorkGraphApprovals[`coding:${previewCodingSnapshot.activeProject.rootPath}`] ?? { state: "not_required" },
            externalAction: createPreviewExternalAction("Plan code changes"),
            shadow: { eligible: true, active: false, why: "Safe to inspect and plan without committing or pushing." },
            createdAt: previewCodingSnapshot.activeProject.openedAt,
            updatedAt: now
          }
        ]
      : [];

    const automationGraph: WorkGraphItem[] = previewAutomationRuns.slice(0, 4).map((run) => {
      const id = `automation:${run.id}`;
      return {
        id,
        title: run.outputTitle || run.recipeName,
        summary: run.outputSummary || run.failureReason || "Automation run is available for review.",
        source: {
          kind: "automation-run",
          id: run.id,
          label: run.recipeName,
          provider: "automation",
          excerpt: run.outputSummary,
          createdAt: run.startedAt
        },
        route: { workspace: "automation", confidence: 88, reason: "Automation run has output and run history." },
        run: {
          state: run.state === "running" ? "ai_working" : run.state === "failed" ? "blocked" : "handled_safely",
          safeActions: ["run recipe", "save output", "quality check"],
          plan: run.steps.join(" -> ") || "Review automation output.",
          visibleRunLog: run.visibleRunLog
        },
        output: { kind: "automation_run", title: run.outputTitle || run.recipeName, summary: run.outputSummary || "", refId: run.id, workspace: "automation" },
        quality: typeof run.qualityScore === "number" ? { score: run.qualityScore, passed: run.qualityScore >= 80, summary: run.qualityChecks.join(", ") || "Quality checked." } : undefined,
        approval: previewWorkGraphApprovals[id] ?? { state: "not_required" },
        externalAction: createPreviewExternalAction("Review automation output"),
        shadow: { eligible: true, active: run.state === "running", why: "Safe to review automation output before external actions." },
        createdAt: run.startedAt,
        updatedAt: run.completedAt ?? run.startedAt
      };
    });

    const items = [...workItemsGraph, ...emailGraph, ...artifactGraph, ...browserGraph, ...codingGraph, ...automationGraph].sort(
      (left, right) => right.updatedAt - left.updatedAt
    );
    return {
      items,
      shadowRuns: structuredClone(previewShadowModeRuns),
      rules: structuredClone(previewShadowModeRules),
      counts: getWorkGraphCounts(items, previewShadowModeRules),
      generatedAt: now
    };
  }

  function recordPreviewShadowRun(item: WorkGraphItem, state: ShadowModeRun["state"] = "needs_approval"): ShadowModeRun {
    const now = Date.now();
    const run: ShadowModeRun = {
      id: `preview-shadow-run:${crypto.randomUUID()}`,
      workGraphItemId: item.id,
      state,
      sourceLabel: item.source.label,
      plan: item.run.plan,
      outputSummary: item.output.summary || item.summary,
      approvalRequired: item.externalAction.requiresApproval,
      reason: item.shadow.why,
      visibleRunLog: [
        `Read source: ${item.source.label}`,
        `Routed to ${item.route.workspace}: ${item.route.reason}`,
        ...item.run.visibleRunLog,
        item.externalAction.requiresApproval ? `Stopped before external action: ${item.externalAction.label}` : "Completed safe local work."
      ].slice(0, 12),
      startedAt: now,
      completedAt: now
    };
    previewShadowModeRuns = [run, ...previewShadowModeRuns].slice(0, 80);
    return run;
  }

  return {
    runtime: "browser-preview",
    platform: "browser",
    versions: {
      chrome: "preview",
      electron: "not running"
    },
    workspaces: {
      state: async () => structuredClone(previewWorkspaceState),
      switch: async (workspaceId: string) => {
        if (previewWorkspaceState.profiles.some((profile) => profile.id === workspaceId)) {
          previewWorkspaceState = {
            ...previewWorkspaceState,
            activeWorkspaceId: workspaceId
          };
        }
        return structuredClone(previewWorkspaceState);
      },
      update: async (profile: WorkspaceProfile) => {
        previewWorkspaceState = {
          ...previewWorkspaceState,
          profiles: previewWorkspaceState.profiles.some((currentProfile) => currentProfile.id === profile.id)
            ? previewWorkspaceState.profiles.map((currentProfile) => (currentProfile.id === profile.id ? profile : currentProfile))
            : [...previewWorkspaceState.profiles, profile]
        };
        return structuredClone(previewWorkspaceState);
      },
      persistBrowserSnapshot: async (workspaceId: string) => {
        previewWorkspaceState = {
          ...previewWorkspaceState,
          profiles: previewWorkspaceState.profiles.map((profile) =>
            profile.id === workspaceId
              ? {
                  ...profile,
                  savedTabs: snapshot.tabs.map((tab) => ({
                    id: tab.id,
                    title: tab.title,
                    url: tab.url,
                    memoryBytes: tab.memoryBytes,
                    lastActiveAt: Date.now()
                  })),
                  updatedAt: Date.now()
                }
              : profile
          )
        };
        return structuredClone(previewWorkspaceState);
      }
    },
    bookmarks: {
      list: async () => structuredClone(previewBookmarks),
      add: async (input: AddBookmarkInput) => {
        const bookmark = {
          kind: "bookmark" as const,
          title: input.title.trim() || "Bookmark",
          url: input.url,
          source: "Autopilot"
        };

        previewBookmarks = [bookmark, ...previewBookmarks];
        return structuredClone(previewBookmarks);
      },
      addFolder: async (input: AddBookmarkFolderInput) => {
        const folder = {
          kind: "folder" as const,
          title: input.title.trim() || "New folder",
          source: "Autopilot",
          children: []
        };
        const parentKey =
          input.parent?.kind === "folder" && input.parent.source === "Autopilot" ? createBookmarkNodeKey(input.parent) : null;

        if (!parentKey) {
          previewBookmarks = [folder, ...previewBookmarks];
          return structuredClone(previewBookmarks);
        }

        function insertIntoParent(nodes: BrowserBookmarkNode[], path: string[] = []): BrowserBookmarkNode[] {
          return nodes.map((node) => {
            if (node.kind === "bookmark") {
              return node;
            }

            const key = createBookmarkNodeKey({
              kind: "folder",
              source: node.source,
              title: node.title,
              path
            });
            if (key === parentKey) {
              return {
                ...node,
                children: [folder, ...node.children]
              };
            }

            return {
              ...node,
              children: insertIntoParent(node.children, [...path, node.title])
            };
          });
        }

        previewBookmarks = insertIntoParent(previewBookmarks);
        return structuredClone(previewBookmarks);
      },
      delete: async (target: BookmarkNodeTarget) => {
        const targetKey = createBookmarkNodeKey(target);
        function removeNodes(nodes: BrowserBookmarkNode[], path: string[] = []): BrowserBookmarkNode[] {
          return nodes
            .map((node): BrowserBookmarkNode | null => {
              const key = createBookmarkNodeKey({
                kind: node.kind,
                source: node.source,
                title: node.title,
                url: node.kind === "bookmark" ? node.url : undefined,
                path
              });
              if (key === targetKey) {
                return null;
              }

              if (node.kind === "bookmark") {
                return node;
              }

              return {
                ...node,
                children: removeNodes(node.children, [...path, node.title])
              };
            })
            .filter((node): node is BrowserBookmarkNode => Boolean(node));
        }

        previewBookmarks = removeNodes(previewBookmarks);
        return structuredClone(previewBookmarks);
      },
      sources: async () => [
        { id: "Chrome", label: "Chrome", profileCount: 1 },
        { id: "Edge", label: "Edge", profileCount: 1 },
        { id: "Brave", label: "Brave", profileCount: 1 }
      ],
      selectedSources: async () => [...previewSelectedSources],
      setSources: async (sources: string[]) => {
        previewSelectedSources = [...new Set(sources)];
        return structuredClone(previewBookmarks);
      }
    },
    email: {
      status: async () => previewEmailStatus,
      list: async () => [...previewEmailMessages],
      connectGmail: async () => ({
        success: false,
        status: previewEmailStatus,
        messages: [...previewEmailMessages],
        reason: previewEmailStatus.reason
      }),
      connectGmailExternal: async () => ({
        success: false,
        status: previewEmailStatus,
        messages: [...previewEmailMessages],
        reason: previewEmailStatus.reason
      }),
      sync: async () => ({
        success: false,
        status: previewEmailStatus,
        messages: [...previewEmailMessages],
        reason: previewEmailStatus.reason
      }),
      analyzeActions: async () => ({
        success: false,
        configured: false,
        actions: [],
        reason: "OpenAI email action planning is available in the desktop app when AUTOPILOT_OPENAI_API_KEY is configured."
      }),
      organize: async (actions: EmailOrganizationAction[]) => ({
        success: false,
        appliedCount: 0,
        skippedCount: actions.length,
        reason: "Gmail organization is available in the desktop app after granting Gmail modify scope.",
        details: actions.map((action) => ({
          messageId: action.messageId,
          action: action.kind,
          success: false,
          reason: "Desktop Gmail modify scope required."
        }))
      }),
      disconnect: async () => {
        previewEmailMessages = [];
        return previewEmailStatus;
      }
    },
    calendar: {
      write: async (request: CalendarWriteRequest) => ({
        success: false,
        action: request.action,
        reason: "Google Calendar writeback is available in the desktop app after granting Calendar write scope.",
        syncState: {
          status: "sync_failed",
          reason: "Desktop Google Calendar write scope required."
        }
      })
    },
    productivity: {
      listTasks: async () => structuredClone(previewProductivityTasks),
      listDrafts: async () => structuredClone(previewProductivityDrafts),
      listWorkItems: async () => structuredClone(previewWorkItems),
      listWorkAssignments: async () => structuredClone(previewWorkAssignments),
      buildTodaysCall: async () =>
        buildTodaysCallPlan({
          workItems: previewWorkItems,
          assignments: previewWorkAssignments
        }),
      startSafeWork: async (limit?: number) => {
        const plan = buildProactiveWorkPlan({
          workItems: previewWorkItems,
          assignments: previewWorkAssignments
        });
        const maxToStart = typeof limit === "number" ? Math.max(1, Math.min(8, Math.round(limit))) : 3;
        const selectedItems = plan.startableItems.slice(0, maxToStart);
        const results: ProductivityRouteWorkItemResult[] = [];
        for (const item of selectedItems) {
          results.push(await previewApi!.productivity.routeWorkItem(item.workItemId));
        }
        return {
          success: results.some((result) => result.success),
          startedCount: results.filter((result) => result.success).length,
          consideredCount: plan.startableItems.length,
          reason: selectedItems.length > 0 ? undefined : "No preview work is ready to start.",
          plan,
          results,
          workItems: structuredClone(previewWorkItems),
          allAssignments: structuredClone(previewWorkAssignments)
        };
      },
      upsertDraft: async (draft: Partial<ProductivityDraft> & Pick<ProductivityDraft, "title" | "body" | "artifactKind" | "source">) => {
        const now = Date.now();
        const nextDraft: ProductivityDraft = {
          id: draft.id ?? `preview-draft:${now}`,
          title: draft.title,
          body: draft.body,
          preview: draft.preview ?? draft.body.replace(/\s+/g, " ").trim().slice(0, 260),
          status: draft.status ?? "draft",
          artifactId: draft.artifactId,
          artifactKind: draft.artifactKind,
          source: draft.source,
          createdAt: draft.createdAt ?? now,
          updatedAt: now
        };
        previewProductivityDrafts = [nextDraft, ...previewProductivityDrafts.filter((candidate) => candidate.id !== nextDraft.id)];
        return structuredClone(previewProductivityDrafts);
      },
      deleteDraft: async (draftId: string) => {
        previewProductivityDrafts = previewProductivityDrafts.filter((draft) => draft.id !== draftId);
        return structuredClone(previewProductivityDrafts);
      },
      upsertTask: async (task: ProductivityTaskInput) => {
        const now = Date.now();
        const nextTask: ProductivityTask = {
          id: task.id ?? `preview-task:${now}`,
          title: task.title,
          context: task.context,
          state: task.state ?? "todo",
          priority: task.priority ?? "medium",
          source: task.source,
          createdAt: task.createdAt ?? now,
          updatedAt: now,
          snoozedUntil: task.snoozedUntil,
          completedAt: task.completedAt
        };
        previewProductivityTasks = [nextTask, ...previewProductivityTasks.filter((candidate) => candidate.id !== nextTask.id)];
        previewWorkItems = [createWorkItemFromTask(nextTask), ...previewWorkItems.filter((candidate) => candidate.taskId !== nextTask.id)];
        return structuredClone(previewProductivityTasks);
      },
      updateTask: async (taskId: string, patch: Partial<ProductivityTask>) => {
        previewProductivityTasks = previewProductivityTasks.map((task) =>
          task.id === taskId ? { ...task, ...patch, updatedAt: Date.now() } : task
        );
        return structuredClone(previewProductivityTasks);
      },
      setTaskState: async (taskId: string, state: ProductivityTaskState) => {
        previewProductivityTasks = previewProductivityTasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                state,
                completedAt: state === "done" ? Date.now() : undefined,
                updatedAt: Date.now()
              }
            : task
        );
        return structuredClone(previewProductivityTasks);
      },
      updateWorkAssignment: async (assignmentId: string, patch: Partial<WorkAssignment>) => {
        previewWorkAssignments = previewWorkAssignments.map((assignment) =>
          assignment.id === assignmentId ? { ...assignment, ...patch, id: assignment.id, workItemId: assignment.workItemId, role: assignment.role, updatedAt: Date.now() } : assignment
        );
        return structuredClone(previewWorkAssignments);
      },
      routeWorkItem: async (workItemId: string) => {
        const workItem = previewWorkItems.find((item) => item.id === workItemId);
        if (!workItem) {
          return {
            success: false,
            reason: "Preview work item was not found.",
            workItems: structuredClone(previewWorkItems),
            allAssignments: structuredClone(previewWorkAssignments)
          };
        }
        const now = Date.now();
        const assignments = workItem.assignedRoles.map((role) => ({
          id: `preview-assignment:${workItem.id}:${role}`,
          workItemId: workItem.id,
          role,
          state: "queued" as const,
          title: `${role} work for ${workItem.title}`,
          reason: "Preview routing only.",
          outputRefs: [],
          approvalState: "not_required" as const,
          createdAt: now,
          updatedAt: now
        }));
        previewWorkAssignments = [...assignments, ...previewWorkAssignments.filter((assignment) => assignment.workItemId !== workItem.id)];
        previewWorkItems = previewWorkItems.map((item) => (item.id === workItem.id ? { ...item, state: "working" as const, updatedAt: now } : item));
        return {
          success: true,
          workItem: structuredClone(previewWorkItems.find((item) => item.id === workItem.id) ?? workItem),
          assignments: structuredClone(assignments),
          workItems: structuredClone(previewWorkItems),
          allAssignments: structuredClone(previewWorkAssignments)
        };
      },
      sync: async (_request?: string[] | ProductivityTaskSyncRequest) => ({
        success: false,
        tasks: structuredClone(previewProductivityTasks),
        addedCount: 0,
        updatedCount: 0,
        reason: "Productivity sync is available in the desktop app."
      })
    },
    workGraph: {
      list: async () => buildPreviewWorkGraphSnapshot(),
      get: async (itemId: string) => buildPreviewWorkGraphSnapshot().items.find((item) => item.id === itemId) ?? null,
      replay: async (itemId: string) => {
        const item = buildPreviewWorkGraphSnapshot().items.find((candidate) => candidate.id === itemId);
        return item ? buildWorkTwinReplay(item) : [];
      },
      startSafeWork: async (itemId: string) => {
        const snapshot = buildPreviewWorkGraphSnapshot();
        const item = snapshot.items.find((candidate) => candidate.id === itemId);
        if (!item) {
          return { success: false, reason: "Preview Work Twin item was not found.", snapshot };
        }
        if (!item.shadow.eligible) {
          return { success: false, item, reason: item.shadow.why, snapshot };
        }
        if (item.id.startsWith("work-item:")) {
          const routeResult = await previewApi!.productivity.routeWorkItem(item.id.replace(/^work-item:/u, ""));
          const updatedItem = buildPreviewWorkGraphSnapshot().items.find((candidate) => candidate.id === item.id) ?? item;
          recordPreviewShadowRun(updatedItem, routeResult.success ? "needs_approval" : "blocked");
          return {
            success: routeResult.success,
            item: updatedItem,
            reason: routeResult.success ? "Preview safe work started and stopped before external impact." : routeResult.reason,
            snapshot: buildPreviewWorkGraphSnapshot()
          };
        }
        const run = recordPreviewShadowRun(item, item.externalAction.requiresApproval ? "needs_approval" : "completed");
        return {
          success: true,
          item,
          run,
          reason: item.externalAction.requiresApproval ? "Prepared work and stopped before approval-gated action." : "Completed safe local work.",
          snapshot: buildPreviewWorkGraphSnapshot()
        };
      },
      approve: async (itemId: string) => {
        previewWorkGraphApprovals = {
          ...previewWorkGraphApprovals,
          [itemId]: { state: "approved", approvedAt: Date.now() }
        };
        const snapshot = buildPreviewWorkGraphSnapshot();
        return { success: true, item: snapshot.items.find((item) => item.id === itemId), snapshot };
      },
      reject: async (itemId: string, reason = "Rejected in preview.") => {
        previewWorkGraphApprovals = {
          ...previewWorkGraphApprovals,
          [itemId]: { state: "rejected", rejectedAt: Date.now(), rejectedReason: reason }
        };
        const snapshot = buildPreviewWorkGraphSnapshot();
        return { success: true, item: snapshot.items.find((item) => item.id === itemId), snapshot };
      },
      revise: async (itemId: string, feedback?: string) => {
        const snapshot = buildPreviewWorkGraphSnapshot();
        const item = snapshot.items.find((candidate) => candidate.id === itemId);
        if (!item) {
          return { success: false, reason: "Preview Work Twin item was not found.", snapshot };
        }
        const run = recordPreviewShadowRun(
          {
            ...item,
            run: {
              ...item.run,
              plan: feedback?.trim() ? `${item.run.plan}\nRevision request: ${feedback.trim()}` : `${item.run.plan}\nRevision requested.`
            }
          },
          "needs_approval"
        );
        return {
          success: true,
          item,
          run,
          reason: "Preview revision recorded in Shadow Mode.",
          snapshot: buildPreviewWorkGraphSnapshot()
        };
      },
      makeRule: async (itemId: string) => {
        const snapshot = buildPreviewWorkGraphSnapshot();
        const item = snapshot.items.find((candidate) => candidate.id === itemId);
        if (!item) {
          return { success: false, reason: "Preview Work Twin item was not found.", snapshot };
        }
        if (!item.shadow.eligible) {
          return { success: false, reason: item.shadow.why, snapshot };
        }
        const now = Date.now();
        const rule: ShadowModeRule = {
          id: `preview-shadow-rule:${crypto.randomUUID()}`,
          name: `When ${item.source.label}, prepare ${item.output.kind.replace(/_/gu, " ")}`,
          sourceKind: item.source.kind,
          routeWorkspace: item.route.workspace,
          safeActions: item.run.safeActions,
          enabled: true,
          createdFromItemId: item.id,
          createdAt: now,
          updatedAt: now
        };
        previewShadowModeRules = [rule, ...previewShadowModeRules];
        return { success: true, rule, snapshot: buildPreviewWorkGraphSnapshot() };
      }
    },
    workTwin: {
      getProof: async (itemId: string) => {
        const item = buildPreviewWorkGraphSnapshot().items.find((candidate) => candidate.id === itemId);
        return item ? buildProofModeReport(item) : null;
      }
    },
    runtimeAgent: {
      run: async (input: AgentRunRequest) => {
        const trace = buildAgentTrace(input, previewTools);
        previewAgentTraces = [trace, ...previewAgentTraces.filter((candidate) => candidate.id !== trace.id)].slice(0, 100);
        return structuredClone(trace);
      },
      listTools: async (workspace?: string) =>
        structuredClone(workspace ? previewTools.filter((toolDescriptor) => toolDescriptor.workspace === workspace) : previewTools),
      getTrace: async (traceId: string) => structuredClone(previewAgentTraces.find((trace) => trace.id === traceId) ?? null),
      approveTool: async (traceId: string, toolName: string) => {
        const existing = previewAgentTraces.find((trace) => trace.id === traceId);
        if (!existing) {
          return null;
        }
        const approvedToolNames = [
          ...existing.permissionDecisions.filter((decision) => decision.allowed).map((decision) => decision.toolName),
          toolName
        ];
        const nextTrace = buildAgentTrace(
          {
            workspace: existing.workspace,
            prompt: existing.prompt,
            intent: existing.intent,
            sourceId: existing.sourceId,
            approvedToolNames
          },
          previewTools
        );
        const updatedTrace = { ...nextTrace, id: existing.id, createdAt: existing.createdAt };
        previewAgentTraces = [updatedTrace, ...previewAgentTraces.filter((trace) => trace.id !== traceId)].slice(0, 100);
        return structuredClone(updatedTrace);
      }
    },
    connectors: {
      list: async () => structuredClone(previewConnectors),
      getStatus: async (connectorId: string) => structuredClone(previewConnectors.find((connector) => connector.id === connectorId) ?? null),
      setEnabled: async (connectorId: string, enabled: boolean) => {
        previewConnectors = previewConnectors.map((connector) => {
          if (connector.id !== connectorId) {
            return connector;
          }
          const nextState = enabled ? (connector.auth.missingScopes.length > 0 ? "missing_auth" : "connected") : "disabled";
          return {
            ...connector,
            auth: {
              ...connector.auth,
              state: nextState
            },
            tools: connector.tools.map((toolDescriptor) => ({ ...toolDescriptor, enabled }))
          };
        });
        return structuredClone(previewConnectors.find((connector) => connector.id === connectorId) ?? null);
      }
    },
    memory: {
      get: async () => structuredClone(previewMemory),
      update: async (input: Omit<WorkspaceMemory, "id" | "updatedAt"> & { id?: string }) => {
        previewMemory = updateWorkspaceMemory(previewMemory, input);
        return structuredClone(previewMemory);
      }
    },
    hooks: {
      list: async () => structuredClone(previewHooks),
      test: async (input: { event: HookDefinition["event"]; workspace: string; value: string }) => {
        const matchedHooks = previewHooks.filter((hookDefinition) => {
          if (
            !hookDefinition.enabled ||
            hookDefinition.event !== input.event ||
            (hookDefinition.workspace !== input.workspace && hookDefinition.workspace !== "home")
          ) {
            return false;
          }
          return hookDefinition.pattern ? new RegExp(hookDefinition.pattern, "iu").test(input.value) : true;
        });
        return {
          blocked: matchedHooks.some((hookDefinition) => hookDefinition.action === "block"),
          requiresApproval: matchedHooks.some((hookDefinition) => hookDefinition.action === "require_approval"),
          matchedHooks: structuredClone(matchedHooks)
        };
      }
    },
    subagents: {
      list: async () => structuredClone(previewSubagents),
      run: async (subagentId: string, prompt: string) => {
        const subagent = previewSubagents.find((candidate) => candidate.id === subagentId);
        if (!subagent) {
          return null;
        }
        const trace = buildAgentTrace(
          {
            workspace: subagent.workspace,
            prompt,
            intent: `${subagent.name}: ${subagent.description}`
          },
          previewTools
        );
        previewAgentTraces = [trace, ...previewAgentTraces].slice(0, 100);
        return structuredClone(trace);
      }
    },
    shadowMode: {
      listRuns: async () => structuredClone(previewShadowModeRuns),
      listRules: async () => structuredClone(previewShadowModeRules),
      setRuleEnabled: async (ruleId: string, enabled: boolean) => {
        previewShadowModeRules = previewShadowModeRules.map((rule) => (rule.id === ruleId ? { ...rule, enabled, updatedAt: Date.now() } : rule));
        return structuredClone(previewShadowModeRules);
      }
    },
    automation: {
      listRecipes: async () => structuredClone(previewAutomationRecipes),
      createRecipe: async (input: AutomationCreateRecipeInput) => {
        const now = Date.now();
        previewAutomationRecipes = [
          {
            id: `preview-recipe:${crypto.randomUUID()}`,
            name: input.name,
            goal: input.goal,
            schedule: input.schedule ?? "manual",
            sources: input.sources ?? ["web"],
            outputKind: input.outputKind ?? "brief",
            artifactKind: input.artifactKind ?? "document",
            sourceWorkspace: input.sourceWorkspace,
            qualityBar: input.qualityBar ?? 82,
            requiresApproval: input.requiresApproval ?? true,
            enabled: input.enabled ?? true,
            createdAt: now,
            updatedAt: now
          },
          ...previewAutomationRecipes
        ];
        return structuredClone(previewAutomationRecipes);
      },
      updateRecipe: async (input: AutomationUpdateRecipeInput) => {
        previewAutomationRecipes = previewAutomationRecipes.map((recipe) =>
          recipe.id === input.id
            ? {
                ...recipe,
                ...input,
                updatedAt: Date.now()
              }
            : recipe
        );
        return structuredClone(previewAutomationRecipes);
      },
      deleteRecipe: async (recipeId: string) => {
        previewAutomationRecipes = previewAutomationRecipes.filter((recipe) => recipe.id !== recipeId);
        return structuredClone(previewAutomationRecipes);
      },
      runNow: async (recipeId: string): Promise<AutomationRunResult> => {
        const recipe = previewAutomationRecipes.find((candidate) => candidate.id === recipeId);
        if (!recipe) {
          return { success: false, reason: "Preview recipe was not found." };
        }
        const now = Date.now();
        const run: AutomationRun = {
          id: `preview-run:${crypto.randomUUID()}`,
          recipeId: recipe.id,
          recipeName: recipe.name,
          state: "completed",
          startedAt: now,
          completedAt: now,
          steps: ["Preview automation created a run.", "Desktop mode performs live research and saves artifacts."],
          sources: [],
          outputTitle: recipe.name,
          outputSummary: "Preview automation run.",
          outputMarkdown: `# ${recipe.name}\n\n${recipe.goal}`,
          qualityScore: 82,
          visibleRunLog: ["Preview automation created a run.", "Desktop mode performs live research and saves artifacts."],
          qualityChecks: ["pass: preview"]
        };
        previewAutomationRuns = [run, ...previewAutomationRuns];
        return { success: true, recipe, run };
      },
      listRuns: async () => structuredClone(previewAutomationRuns),
      detectFromPrompt: async (prompt: string, sourceWorkspace?: AutomationSourceWorkspace) =>
        detectAutomationIntent(prompt, sourceWorkspace ?? "automation")
    },
    account: {
      status: async () => ({
        configured: true,
        signedIn: true,
        userEmail: "preview@autopilot.local",
        userId: "preview-user",
        backend: {
          supabaseUrl: DEFAULT_AUTOPILOT_SUPABASE_URL,
          supabaseProjectRef: DEFAULT_AUTOPILOT_SUPABASE_PROJECT_REF,
          hasSupabaseAnonKey: true,
          aiProxyUrl: null,
          hasOpenAiKeyInProcess: false,
          aiProxyReady: false,
          aiProxyHealth: "unconfigured",
          localDevelopmentMode: true,
          model: DEFAULT_AUTOPILOT_OPENAI_MODEL
        },
        reason: "Browser preview uses a local signed-in test account. Packaged builds still require real Supabase sign-in."
      }),
      getConfig: async () => ({
        supabaseUrl: DEFAULT_AUTOPILOT_SUPABASE_URL,
        supabaseProjectRef: DEFAULT_AUTOPILOT_SUPABASE_PROJECT_REF,
        hasSupabaseAnonKey: true,
        aiProxyUrl: null,
        hasOpenAiKeyInProcess: false,
        aiProxyReady: false,
        aiProxyHealth: "unconfigured",
        localDevelopmentMode: true,
        model: DEFAULT_AUTOPILOT_OPENAI_MODEL
      }),
      signIn: async () => ({
        success: false,
        status: await previewApi!.account.status(),
        reason: "Sign in is available in the desktop app."
      }),
      signUp: async () => ({
        success: false,
        status: await previewApi!.account.status(),
        reason: "Sign up is available in the desktop app."
      }),
      signOut: async () => previewApi!.account.status(),
      subscribe: () => () => undefined
    },
    settings: {
      getMoneyMovement: async () => ({
        enabled: false,
        status: "disabled",
        provider: "stripe",
        accountEmail: "preview@autopilot.local",
        verifiedEmail: null,
        moneyMovementEnabled: false,
        emailVerifiedForPayments: false,
        enabledAt: null,
        disabledAt: null,
        lastVerificationAt: null,
        verificationExpiresAt: null,
        verificationMethod: null,
        verificationEmailTransport: null,
        verificationEmailReady: false,
        verificationEmailLastSentAt: null,
        testModeOnly: true,
        liveModeEnabled: false,
        requiresConnectedStripeAccount: true,
        fundingSource: "user_connected_stripe_account",
        stripeConnection: {
          status: "not_connected",
          connectedAccountId: null,
          accountEmail: null,
          chargesEnabled: false,
          payoutsEnabled: false,
          detailsSubmitted: false,
          connectedAt: null,
          lastCheckedAt: null,
          disabledReason: "Connect your own Stripe account in Settings before Autopilot can prepare or execute payments."
        },
        receiptsCount: 0,
        providerReadiness: [
          {
            providerKind: "stripe_hosted",
            label: "Stripe hosted approval",
            safetyStatus: "disabled",
            readinessPercent: 0,
            currentStep: "Connect provider",
            nextAction: "Open the desktop app",
            liveAvailable: false,
            lastSuccessfulTestAt: null,
            technicalDetails: "Preview mode does not connect payment providers.",
            steps: [
              { id: "email_verified", label: "Verify account email", complete: false, actionLabel: "Verify email" },
              { id: "provider_connected", label: "Connect Stripe", complete: false, actionLabel: "Connect provider" }
            ]
          },
          {
            providerKind: "paypal_hosted",
            label: "PayPal hosted approval",
            safetyStatus: "not_implemented",
            readinessPercent: 0,
            currentStep: "Setup needed",
            nextAction: "Planned provider",
            liveAvailable: false,
            lastSuccessfulTestAt: null,
            steps: [{ id: "provider_planned", label: "PayPal provider planned", complete: false, actionLabel: "Setup needed" }]
          },
          {
            providerKind: "card_checkout",
            label: "Card checkout",
            safetyStatus: "not_implemented",
            readinessPercent: 0,
            currentStep: "Tokenized card entry needed",
            nextAction: "Setup needed",
            liveAvailable: false,
            lastSuccessfulTestAt: null,
            steps: [{ id: "tokenized_card_required", label: "Tokenized/provider-hosted card entry required", complete: false, actionLabel: "Setup needed" }]
          }
        ],
        paymentMethodReadiness: [
          {
            kind: "card",
            label: "Card",
            detail: "Provider-hosted card confirmation. Autopilot never stores raw card numbers.",
            providerKind: "stripe_hosted",
            providerLabel: "Stripe hosted approval",
            readinessPercent: 0,
            safetyStatus: "disabled",
            currentStep: "Open desktop app",
            nextAction: "Verify email and connect Stripe",
            providerHosted: true,
            receiptRequired: true,
            liveAvailable: false,
            technicalDetails: "Preview mode does not execute payments."
          },
          {
            kind: "bank_account",
            label: "Bank",
            detail: "Provider-hosted bank debit or instant bank payment with bank verification handled by the provider.",
            providerKind: "stripe_hosted",
            providerLabel: "Stripe hosted approval",
            readinessPercent: 0,
            safetyStatus: "disabled",
            currentStep: "Open desktop app",
            nextAction: "Verify email and connect Stripe",
            providerHosted: true,
            receiptRequired: true,
            liveAvailable: false
          },
          {
            kind: "cash_app_pay",
            label: "Cash App Pay",
            detail: "Provider-hosted Cash App Pay, available only when the connected account and buyer are eligible.",
            providerKind: "stripe_hosted",
            providerLabel: "Stripe hosted approval",
            readinessPercent: 0,
            safetyStatus: "disabled",
            currentStep: "Open desktop app",
            nextAction: "Verify email and connect Stripe",
            providerHosted: true,
            receiptRequired: true,
            liveAvailable: false
          },
          {
            kind: "klarna",
            label: "Klarna",
            detail: "Provider-hosted Klarna; eligibility depends on amount, currency, buyer location, and provider capability.",
            providerKind: "stripe_hosted",
            providerLabel: "Stripe hosted approval",
            readinessPercent: 0,
            safetyStatus: "disabled",
            currentStep: "Open desktop app",
            nextAction: "Verify email and connect Stripe",
            providerHosted: true,
            receiptRequired: true,
            liveAvailable: false
          },
          {
            kind: "wallet",
            label: "Wallet",
            detail: "Provider-hosted wallet checkout such as Apple Pay, Google Pay, or Link when eligible.",
            providerKind: "stripe_hosted",
            providerLabel: "Stripe hosted approval",
            readinessPercent: 0,
            safetyStatus: "disabled",
            currentStep: "Open desktop app",
            nextAction: "Verify email and connect Stripe",
            providerHosted: true,
            receiptRequired: true,
            liveAvailable: false
          }
        ],
        disabledReason: "Connect your own Stripe account in Settings before Autopilot can prepare or execute payments.",
        nextStep: "Open the desktop app to verify payments and connect Stripe."
      }),
      startMoneyVerification: async () => ({
        success: false,
        status: "disabled",
        reason: "Money movement verification is available in the desktop app.",
        nextStep: "Use Settings in the desktop app.",
        settings: await previewApi!.settings.getMoneyMovement()
      }),
      confirmMoneyVerification: async () => ({
        success: false,
        status: "disabled",
        reason: "Money movement verification is available in the desktop app.",
        settings: await previewApi!.settings.getMoneyMovement()
      }),
      disableMoneyMovement: async () => ({
        success: true,
        settings: await previewApi!.settings.getMoneyMovement(),
        reason: "Money movement is disabled in preview."
      }),
      startStripeConnect: async () => ({
        success: false,
        settings: await previewApi!.settings.getMoneyMovement(),
        reason: "Stripe Connect setup is available in the desktop app.",
        nextStep: "Open Settings in the desktop app and connect your own Stripe account."
      }),
      refreshStripeConnection: async () => ({
        success: false,
        settings: await previewApi!.settings.getMoneyMovement(),
        reason: "Stripe connection refresh is available in the desktop app."
      }),
      disconnectStripeAccount: async () => ({
        success: true,
        settings: await previewApi!.settings.getMoneyMovement(),
        reason: "No Stripe account is connected in preview."
      })
    },
    payments: {
      verifyInvoice: async (input: InvoiceCandidate) => ({
        id: `preview-invoice-verification:${crypto.randomUUID()}`,
        candidate: input,
        status: "needs_user_review",
        confidence: 0,
        checks: [
          {
            id: "preview_only",
            label: "Desktop verification required",
            passed: false,
            severity: "warning",
            detail: "Invoice verification runs in the desktop app."
          }
        ],
        missingEvidence: ["Desktop invoice verification"],
        scamSignals: [],
        createdAt: Date.now()
      }),
      verifyVendor: async (input) => ({
        id: `preview-vendor-verification:${crypto.randomUUID()}`,
        providerKind: input.providerKind,
        payeeName: input.payeeName,
        payeeEmail: input.payeeEmail,
        status: "needs_user_review",
        confidence: 0,
        destination: input.destination,
        trustedSignals: [],
        blockers: [],
        warnings: ["Vendor verification runs in the desktop app."],
        createdAt: Date.now()
      }),
      getProviderReadiness: async () => (await previewApi!.settings.getMoneyMovement()).providerReadiness,
      listReceipts: async () => [],
      verifyReceipt: async () => ({
        success: false,
        verifiedAt: Date.now(),
        providerConfirmed: false,
        reason: "Receipt verification is available in the desktop app after a provider-confirmed payment.",
        nextStep: "Open the desktop app and refresh Home after payment execution."
      }),
      createHostedApproval: async () => ({
        success: false,
        reason: "Hosted payment approval is available in the desktop app. No money moved.",
        nextStep: "Open the desktop app and complete provider setup."
      }),
      confirmProviderStatus: async () => (await previewApi!.settings.getMoneyMovement()).providerReadiness,
      createProposal: async (input: PaymentProposalInput) => ({
        success: true,
        proposal: {
          id: `preview-payment-proposal:${crypto.randomUUID()}`,
          mode: "test",
          provider: "stripe",
          providerKind: input.providerKind ?? "stripe_hosted",
          paymentMethodKind: input.paymentMethodKind ?? "card",
          paymentMethodLabel:
            input.paymentMethodKind === "bank_account"
              ? "Bank"
              : input.paymentMethodKind === "cash_app_pay"
                ? "Cash App Pay"
                : input.paymentMethodKind === "klarna"
                  ? "Klarna"
                  : input.paymentMethodKind === "wallet"
                    ? "Wallet"
                    : "Card",
          payeeName: input.payeeName,
          payeeEmail: input.payeeEmail,
          amountCents: input.amountCents,
          currency: input.currency || "USD",
          feesCents: 0,
          totalCents: input.amountCents,
          fundingSource: "user_connected_stripe_account",
          connectedStripeAccountId: null,
          destination: input.destination,
          invoiceVerificationId: input.invoiceVerificationId ?? "preview-unverified-invoice",
          vendorVerificationId: input.vendorVerificationId ?? "preview-unverified-vendor",
          reason: input.reason,
          sourceEvidence: input.sourceEvidence,
          sourceUrl: input.sourceUrl,
          idempotencyKey: input.idempotencyKey || `preview-payment:${crypto.randomUUID()}`,
          risk: {
            level: "blocked",
            flags: [],
            warnings: [],
            blockedReasons: ["Connect your own Stripe account in Settings before Autopilot can prepare or execute payments."],
            requiresStepUp: true
          },
          approvalFingerprint: "preview",
          status: "blocked",
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      }),
      getQuote: async () => ({ success: false, reason: "Payment quotes are available in the desktop app." }),
      approve: async () => ({ success: false, reason: "Payment approval is available in the desktop app." }),
      execute: async () => ({ success: false, reason: "Payment execution is disabled in preview." })
      },
      system: {
        openExternalUrl: async (url: string) => {
          try {
            const parsedUrl = new URL(url);
            if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
              return { success: false, reason: "Preview only opens http and https URLs." };
            }
            if (typeof window !== "undefined" && typeof window.open === "function") {
              try {
                window.open(parsedUrl.toString(), "_blank", "noopener,noreferrer");
              } catch {
                // Browser-preview environments such as jsdom expose window.open but do not implement it.
                // The desktop shell performs the real open; preview mode only needs a safe success path.
              }
            }
            return { success: true };
          } catch {
            return { success: false, reason: "Preview could not open that external URL." };
          }
        }
      },
    diagnostics: {
      list: async (limit = 300) => structuredClone(previewDiagnostics.slice(0, Math.max(1, Math.min(2000, Math.round(limit))))),
      record: async (input: CreateDiagnosticLogInput) => {
        const entry: DiagnosticLogEntry = {
          id: input.id ?? `preview-diagnostic:${crypto.randomUUID()}`,
          severity: input.severity ?? "error",
          workspace: input.workspace ?? "system",
          source: input.source ?? "Preview",
          message: input.message,
          details: input.details,
          suggestedAction: input.suggestedAction,
          relatedEntity: input.relatedEntity,
          createdAt: input.createdAt ?? Date.now(),
          resolvedAt: input.resolvedAt
        };
        previewDiagnostics = [entry, ...previewDiagnostics];
        return structuredClone(entry);
      },
      clear: async () => {
        previewDiagnostics = [];
        return [];
      },
      export: async () => ({ success: false, reason: "Diagnostics export is available in the desktop app." }),
      subscribe: () => () => undefined
    },
    observability: {
      listRunLog: async () => []
    },
    assistant: {
      sources: async () => [
        {
          id: "current-tab",
          label: "Current tab",
          detail: "Preview page text is available.",
          available: true,
          enabled: true
        },
        {
          id: "selected-tabs",
          label: "Open tabs",
          detail: `${snapshot.tabs.length} preview tabs available.`,
          available: true,
          enabled: false
        },
        {
          id: "gmail",
          label: "Gmail inbox",
          detail: "Connect Gmail in the desktop app.",
          available: false,
          enabled: false
        },
        {
          id: "downloads",
          label: "Downloads",
          detail: "Downloads are available in the desktop app.",
          available: false,
          enabled: false
        },
        {
          id: "coding-project",
          label: "Coding project",
          detail: "Open a project in the desktop app.",
          available: Boolean(previewCodingSnapshot.activeProject),
          enabled: false
        }
      ],
      ask: async (request: AssistantRequest) => ({
        success: false,
        answer: "",
        model: "preview",
        sources: [
          {
            sourceId: "current-tab",
            title: "Preview tab",
            text: request.prompt
          }
        ],
        reason: "Autopilot Assistant needs the desktop app with a signed-in Supabase account and AI proxy, or a local development OpenAI key."
      }),
      generatePrompts: async () => ({
        success: false,
        suggestions: [],
        model: "preview",
        reason: "Prompt suggestions need the desktop app and AUTOPILOT_OPENAI_API_KEY."
      }),
      translateDesignPrompt: async (request: DesignPromptTranslationRequest) => ({
        success: true,
        refinedPrompt: request.prompt,
        inferredArtifactKind: request.currentArtifactKind,
        options: [],
        model: "preview",
        reason: "Design prompt translation needs the desktop app and AI proxy."
      }),
      translateCodingPrompt: async (request: CodingPromptTranslationRequest) => ({
        success: true,
        refinedPrompt: request.prompt,
        implementationIntent: "Preview mode uses the original coding request.",
        targetFiles: request.activeFilePath ? [request.activeFilePath] : [],
        options: [],
        model: "preview",
        reason: "Coding prompt translation needs the desktop app and AI proxy."
      })
    },
    artifacts: {
      list: async () => structuredClone(previewArtifacts),
      create: async (input: ArtifactCreateInput) => {
        const now = Date.now();
        const artifact: Artifact = {
          id: `preview-artifact:${crypto.randomUUID()}`,
          kind: input.kind,
          title: input.title,
          summary: input.summary ?? "Preview artifact.",
          source: {
            provider: input.source?.provider === "gmail" ? "gmail" : "manual",
            label: input.source?.label ?? "Preview prompt"
          },
          visibility: input.visibility ?? (input.source?.provider === "gmail" ? "ai_generated" : "user_project"),
          pinned: Boolean(input.pinned),
          activeVersionId: `preview-version:${crypto.randomUUID()}`,
          versions: [
            {
              id: `preview-version:${crypto.randomUUID()}`,
              createdAt: now,
              prompt: input.prompt ?? "Preview prompt",
              summary: input.summary ?? "Preview version.",
              content: input.content.kind === input.kind ? input.content : defaultArtifactContent(input.kind)
            }
          ],
          createdAt: now,
          updatedAt: now
        };
        artifact.activeVersionId = artifact.versions[0].id;
        previewArtifacts = [artifact, ...previewArtifacts];
        return structuredClone(artifact);
      },
      update: async (input: ArtifactUpdateInput) => {
        const now = Date.now();
        previewArtifacts = previewArtifacts.map((artifact) => {
          if (artifact.id !== input.artifactId) {
            return artifact;
          }

          const version = {
            id: `preview-version:${crypto.randomUUID()}`,
            createdAt: now,
            prompt: input.prompt,
            summary: input.summary ?? "Preview edit.",
            content: input.content
          };
          return {
            ...artifact,
            summary: input.summary ?? artifact.summary,
            activeVersionId: version.id,
            versions: [...artifact.versions, version],
            updatedAt: now
          };
        });
        return structuredClone(previewArtifacts);
      },
      export: async (artifactId: string) => {
        const artifact = previewArtifacts.find((candidate) => candidate.id === artifactId);
        if (!artifact) {
          return { success: false, artifactId, reason: "Preview artifact was not found." };
        }

        return {
          success: false,
          artifactId,
          kind: artifact.kind,
          reason: "Export is available in the desktop app."
        };
      },
      exportToCoding: async (artifactId: string) => {
        const artifact = previewArtifacts.find((candidate) => candidate.id === artifactId);
        return {
          success: false,
          artifactId,
          kind: artifact?.kind,
          reason: "Export to Coding is available in the desktop app."
        };
      }
    },
    agent: {
      planFromEmail: async (input: AgentPlanFromEmailRequest) => {
        const message = previewEmailMessages.find((candidate) => candidate.id === input.messageId);
        if (!message) {
          return { success: false, reason: "No preview email is selected." };
        }

        const sourceText = [
          `From: ${message.from}${message.fromEmail ? ` <${message.fromEmail}>` : ""}`,
          `Subject: ${message.subject}`,
          `Body: ${message.actionText || message.snippet}`
        ].join("\n");
        return createPreviewAgentArtifact(message.subject, sourceText, input.preferredKind ?? "document", {
          provider: "gmail",
          label: `${message.from} - ${message.subject}`.slice(0, 160),
          messageId: message.id,
          threadId: message.threadId,
          url: message.url,
          from: message.from,
          fromEmail: message.fromEmail,
          subject: message.subject
        });
      },
      startRun: async (input: AgentStartRunRequest) => createPreviewAgentArtifact(input.prompt, input.prompt, input.preferredKind ?? "website_design"),
      listPlans: async () => structuredClone(previewActionPlans),
      listRuns: async () => structuredClone(previewAgentRuns),
      approveFinalStep: async (planId: string) => {
        const now = Date.now();
        previewActionPlans = previewActionPlans.map((plan) =>
          plan.id === planId
            ? {
                ...plan,
                finalApproval: {
                  ...plan.finalApproval,
                  approvedAt: now
                },
                steps: plan.steps.map((step) => (step.requiresFinalApproval ? { ...step, state: "completed" } : step)),
                updatedAt: now
              }
            : plan
        );
        previewAgentRuns = previewAgentRuns.map((run) =>
          run.planId === planId
            ? {
                ...run,
                state: "completed",
                updatedAt: now,
                events: [
                  ...run.events,
                  {
                    id: `preview-event:${crypto.randomUUID()}`,
                    createdAt: now,
                    level: "success",
                    message: "Final approval recorded."
                  }
                ]
              }
            : run
        );
        return structuredClone(previewAgentRuns);
      },
      classifyWorkItem: async (workItemId: string) => {
        const workItem = previewWorkItems.find((item) => item.id === workItemId);
        if (!workItem) {
          return { success: false, reason: "Preview work item was not found." };
        }
        return {
          success: true,
          workItem,
          ownership: workItem.source.provider === "google-calendar" ? "user" : "ai",
          permissionLevel: workItem.permissionLevel,
          needsReview: workItem.routeConfidence < 70,
          routeReason: workItem.routeReason,
          routeConfidence: workItem.routeConfidence
        };
      },
      qualityCheckOutput: async (output: string, sourceText: string, options?: { minWords?: number; requireSources?: boolean }) =>
        evaluateDocumentQuality(output, sourceText, options)
    },
    coding: {
      getSnapshot: async () => structuredClone(previewCodingSnapshot),
      openProject: async () => activatePreviewCodingProject(),
      openFiles: async () => {
        const snapshot = activatePreviewCodingProject();
        return {
          success: true,
          snapshot,
          files: [
            {
              success: true,
              kind: "text",
              name: "README.md",
              path: "C:/Preview/Autopilot/README.md",
              relativePath: "README.md",
              language: "markdown",
              content: "# Autopilot preview\n\nOpen the desktop app to edit real files on your computer.\n",
              size: 96,
              modifiedAt: Date.now()
            }
          ]
        };
      },
      createProject: async () => activatePreviewCodingProject(),
      selectProject: async () => activatePreviewCodingProject(),
      renameProject: async (_rootPath: string, name: string) => {
        const trimmedName = name.trim().replace(/\s+/g, " ").slice(0, 80);
        if (!trimmedName) {
          return {
            success: false,
            reason: "Project name cannot be empty.",
            snapshot: structuredClone(previewCodingSnapshot)
          };
        }

        previewCodingSnapshot = {
          ...previewCodingSnapshot,
          projects: previewCodingSnapshot.projects.map((project) =>
            project.rootPath === previewProject.rootPath
              ? {
                  ...project,
                  name: trimmedName
                }
              : project
          ),
          activeProject: previewCodingSnapshot.activeProject
            ? {
                ...previewCodingSnapshot.activeProject,
                name: trimmedName
              }
            : previewCodingSnapshot.activeProject,
          tree: previewCodingSnapshot.tree
            ? {
                ...previewCodingSnapshot.tree,
                name: trimmedName
              }
            : previewCodingSnapshot.tree
        };
        return {
          success: true,
          snapshot: structuredClone(previewCodingSnapshot)
        };
      },
      readPath: async (targetPath: string) => {
        if (!previewCodingSnapshot.tree) {
          return { success: false, reason: "Open a project before reading files." };
        }

        const name = targetPath.split(/[\\/]/).pop() || "README.md";
        const isDirectory = targetPath === previewTree.path || targetPath.endsWith("src") || targetPath.endsWith("preview");
        if (isDirectory) {
          const entries = targetPath.endsWith("src") ? previewTree.children?.[0]?.children ?? [] : previewTree.children ?? [];
          return {
            success: true,
            kind: "directory",
            name,
            path: targetPath,
            relativePath: name,
            entries
          };
        }

        return {
          success: true,
          kind: "text",
          name,
          path: targetPath,
          relativePath: name,
          language: name.endsWith(".md") ? "markdown" : "typescript",
          content: name.endsWith(".md")
            ? "# Autopilot preview\n\nOpen the desktop app to edit real files on your computer.\n"
            : "export function App() {\n  return <main>Autopilot coding preview</main>;\n}\n",
          size: 96,
          modifiedAt: Date.now()
        };
      },
      writeFile: async (_targetPath: string, content: string) => ({
        success: true,
        savedAt: Date.now(),
        size: new TextEncoder().encode(content).length
      }),
      deletePath: async (targetPath: string) => ({
        success: true,
        deletedPath: targetPath,
        snapshot: structuredClone(previewCodingSnapshot)
      }),
      setAccessMode: async (mode: CodingAccessMode) => {
        previewCodingSnapshot = {
          ...previewCodingSnapshot,
          accessMode: mode
        };
        return structuredClone(previewCodingSnapshot);
      },
      search: async (query: string) => {
        const normalizedQuery = query.trim().toLowerCase();
        const results: CodingSearchResult[] = [];
        function visit(node: NonNullable<CodingSnapshot["tree"]>): void {
          if (node.name.toLowerCase().includes(normalizedQuery) || node.relativePath.toLowerCase().includes(normalizedQuery)) {
            results.push({
              kind: node.kind,
              name: node.name,
              path: node.path,
              relativePath: node.relativePath,
              size: node.size,
              modifiedAt: node.modifiedAt,
              match: node.name.toLowerCase().includes(normalizedQuery) ? "name" : "path"
            });
          }
          for (const child of node.children ?? []) {
            visit(child);
          }
        }
        if (previewCodingSnapshot.tree && normalizedQuery) {
          visit(previewCodingSnapshot.tree);
        }
        return results;
      },
      openTerminal: async (input?: CodingTerminalOpenRequest) => ({
        success: false,
        cwd: input?.cwd ?? previewCodingSnapshot.activeProject?.rootPath ?? previewProject.rootPath,
        shell: "powershell.exe",
        shellName: "Windows PowerShell",
        reason: "Open the desktop app to launch a real PowerShell terminal."
      }),
      sendTerminalInput: async (input: CodingTerminalInputRequest) => ({
        success: false,
        reason: "Open the desktop app to run PowerShell commands.",
        output: `Preview command: ${input.input}`,
        running: false
      }),
      subscribeTerminalOutput: () => () => undefined,
      planCommand: async (input: CodingCommandRequest) => ({
        id: `preview-command-plan:${crypto.randomUUID()}`,
        command: input.command,
        cwd: input.cwd ?? previewCodingSnapshot.activeProject?.rootPath ?? previewProject.rootPath,
        purpose: /\b(test|build|check|lint)\b/iu.test(input.command)
          ? "Verify generated code before review."
          : "Plan an active-project command with safety review.",
        safety: {
          allowed: !/\bgit\s+push\b.*\s--force(?:-with-lease)?\b/iu.test(input.command),
          requiresApproval: !/^(git\s+(status|diff)|npm\s+run\s+(test|check|build|lint)|npm\s+test)\b/iu.test(input.command),
          risk: /\b(rm\s+-rf|Remove-Item|git\s+reset\s+--hard)\b/iu.test(input.command)
            ? "destructive"
            : /\b(git\s+push|publish|deploy)\b/iu.test(input.command)
              ? "external"
              : /\b(npm\s+(install|i)|git\s+(add|commit))\b/iu.test(input.command)
                ? "write"
                : "safe",
          reason: "Preview mode classifies commands, but the desktop app runs them from the real project."
        },
        createdAt: Date.now()
      }),
      approveCommand: async (input: CodingCommandRequest) => previewApi?.coding.runCommand({ ...input, approved: true }) ?? {
        success: false,
        command: input.command,
        cwd: input.cwd ?? "preview",
        reason: "Preview command runner is not ready."
      },
      runCommand: async (input: CodingCommandRequest) => {
        if (previewCodingSnapshot.accessMode !== "full" && !input.approved) {
          const result = {
            success: false,
            command: input.command,
            cwd: previewCodingSnapshot.activeProject?.rootPath,
            reason: "Approve this command before Autopilot runs it.",
            requiresApproval: true
          } as CodingCommandResult;
          previewCodingCommandExecutions.unshift({
            id: `preview-command:${crypto.randomUUID()}`,
            planId: `preview-command-plan:${crypto.randomUUID()}`,
            startedAt: Date.now(),
            finishedAt: Date.now(),
            result
          });
          return result;
        }

        const result = {
          success: true,
          command: input.command,
          cwd: previewCodingSnapshot.activeProject?.rootPath ?? "preview",
          stdout: `Preview command: ${input.command}\nOpen the desktop app to run this on your computer.`,
          stderr: "",
          exitCode: 0,
          durationMs: 12
        } as CodingCommandResult;
        previewCodingCommandExecutions.unshift({
          id: `preview-command:${crypto.randomUUID()}`,
          planId: `preview-command-plan:${crypto.randomUUID()}`,
          startedAt: Date.now() - 12,
          finishedAt: Date.now(),
          result
        });
        previewCodingCommandExecutions = previewCodingCommandExecutions.slice(0, 50);
        return result;
      },
      getCommandLog: async () => ({
        success: true,
        executions: [...previewCodingCommandExecutions]
      }),
      createPatchSet: async () => ({
        success: true,
        patchSet: {
          id: `preview-patchset:${crypto.randomUUID()}`,
          summary: "Preview patchset with 2 changed files.",
          files: [
            { path: "src/renderer/App.tsx", status: "modified", additions: 12, deletions: 4 },
            { path: "tests/codingAgentPlan.test.ts", status: "created", additions: 42, deletions: 0 }
          ],
          createdAt: Date.now()
        }
      }),
      validatePreview: async (input: CodingPreviewValidationRequest) => {
        const consoleMessages = input.consoleMessages?.filter(Boolean) ?? [];
        const hasConsoleError = consoleMessages.some((message) => /\b(error|failed|exception|uncaught)\b/iu.test(message));
        const hasVisibleEvidence = Boolean(input.screenshotPresent || input.domText?.trim() || input.html?.trim() || (input.canvasPixelCount ?? 0) > 0);
        if (!hasVisibleEvidence || hasConsoleError) {
          return {
            success: false,
            reason: hasConsoleError ? `Preview console error: ${consoleMessages[0]}` : "No preview evidence was provided.",
            validation: {
              id: `preview-validation:${crypto.randomUUID()}`,
              url: input.url ?? "preview",
              status: hasConsoleError ? "failed" : "blocked",
              checks: consoleMessages.length > 0 ? ["console"] : [],
              summary: hasConsoleError ? `Preview console error: ${consoleMessages[0]}` : "No preview evidence was provided.",
              createdAt: Date.now()
            }
          };
        }

        return {
          success: true,
          validation: {
            id: `preview-validation:${crypto.randomUUID()}`,
            url: input.url ?? "preview",
            status: "passed",
            checks: ["dom"],
            summary: "Preview has visible evidence and no blocking console errors.",
            createdAt: Date.now()
          }
        };
      },
      runDeepQaBenchmark: async () => ({
        success: true,
        generatedAt: Date.now(),
        cases: [
          {
            scenario: "tetris",
            prompt: "Build a playable Tetris game with tests and preview validation.",
            requiredEvidence: ["multi_file_patch", "diff", "command", "preview", "repair_loop", "approval_gate"],
            status: previewCodingSnapshot.activeProject ? "ready" : "blocked",
            reason: previewCodingSnapshot.activeProject ? undefined : "Open a project before running generated-game QA."
          },
          {
            scenario: "snake",
            prompt: "Build a playable Snake game and verify the canvas is not blank.",
            requiredEvidence: ["multi_file_patch", "diff", "command", "preview", "repair_loop", "approval_gate"],
            status: previewCodingSnapshot.activeProject ? "ready" : "blocked",
            reason: previewCodingSnapshot.activeProject ? undefined : "Open a project before running generated-game QA."
          },
          {
            scenario: "agent",
            prompt: "Implement a scoped agent with trace output and tests.",
            requiredEvidence: ["multi_file_patch", "diff", "command", "approval_gate"],
            status: previewCodingSnapshot.activeProject ? "ready" : "blocked",
            reason: previewCodingSnapshot.activeProject ? undefined : "Open a project before running agent QA."
          }
        ]
      }),
      repoOverview: async () => {
        const snapshot = activatePreviewCodingProject();
        const changedFiles = parseGitPorcelainStatus(" M src/renderer/App.tsx\n?? tests/codingAgentPlan.test.ts");
        return {
          success: true,
          overview: {
            projectName: snapshot.activeProject?.name ?? "Autopilot preview",
            rootPath: snapshot.activeProject?.rootPath ?? previewProject.rootPath,
            generatedAt: Date.now(),
            packageManager: "npm",
            scripts: [
              { name: "check", command: "npm run check" },
              { name: "test", command: "npm test" },
              { name: "build", command: "npm run build" }
            ],
            frameworkHints: ["Electron", "React", "Vite", "TypeScript"],
            keyFiles: ["src/main/main.ts", "src/main/coding.ts", "src/renderer/App.tsx", "src/shared/coding.ts"],
            gitBranch: "preview",
            changedFiles,
            summary:
              "Autopilot preview looks like an Electron React project with check, test, and build scripts. The desktop app reads this from the real project on disk."
          }
        };
      },
      createAgentPlan: async (goal: string) => {
        const overviewResult = await previewApi?.coding.repoOverview();
        if (!overviewResult?.success) {
          return {
            success: false,
            reason: "Open the desktop app to create a project plan.",
            generatedAt: Date.now()
          };
        }

        const now = Date.now();
        return {
          success: true,
          plan: createCodingAgentPlanFromOverview({
            id: `preview-plan-${now}`,
            goal,
            overview: overviewResult.overview,
            now
          })
        };
      },
      startAgentRun: async (goal: string) => {
        const planResult = await previewApi?.coding.createAgentPlan(goal);
        if (!planResult?.success) {
          return planResult ?? { success: false, reason: "Open the desktop app to start an agent run.", generatedAt: Date.now() };
        }

        return {
          success: true,
          plan: planResult.plan,
          run: {
            id: `preview-coding-run:${crypto.randomUUID()}`,
            planId: planResult.plan.id,
            phase: planResult.plan.phase,
            understanding: planResult.plan.summary,
            schema: planResult.plan.schema,
            plan: planResult.plan.steps,
            commands: [],
            changedFiles: parseGitPorcelainStatus(" M src/renderer/App.tsx\n?? tests/codingAgentPlan.test.ts"),
            testResults: [],
            approvalState: "needs_review" as const,
            createdAt: Date.now(),
            updatedAt: Date.now()
          }
        };
      },
      gitStatus: async () => ({
        success: true,
        rootPath: previewCodingSnapshot.activeProject?.rootPath ?? previewProject.rootPath,
        branch: "preview",
        changedFiles: parseGitPorcelainStatus(" M src/renderer/App.tsx\n?? tests/codingAgentPlan.test.ts"),
        generatedAt: Date.now()
      }),
      gitDiff: async (filePath?: string) => ({
        success: true,
        rootPath: previewCodingSnapshot.activeProject?.rootPath ?? previewProject.rootPath,
        filePath,
        diff: "diff --git a/src/renderer/App.tsx b/src/renderer/App.tsx\n+Preview diff appears here in the desktop app.\n",
        generatedAt: Date.now()
      }),
      gitCommitProposal: async (message?: string, filePaths?: string[]) => ({
        success: true,
        id: `preview-git-commit-proposal:${crypto.randomUUID()}`,
        rootPath: previewCodingSnapshot.activeProject?.rootPath ?? previewProject.rootPath,
        branch: "preview",
        remote: "origin",
        changedFiles: parseGitPorcelainStatus(" M src/renderer/App.tsx\n?? tests/codingAgentPlan.test.ts"),
        selectedFiles: filePaths?.length ? filePaths : [],
        proposedMessage: message?.trim() || "Preview commit proposal",
        diffPreview: "diff --git a/src/renderer/App.tsx b/src/renderer/App.tsx\n+Preview diff appears here in the desktop app.\n",
        testsStatus: "not_run" as const,
        warnings: filePaths?.length
          ? []
          : [{ code: "no_selected_files" as const, message: "Select exact files before committing.", blocking: true }],
        blocked: !filePaths?.length,
        approvalRequired: true as const,
        generatedAt: Date.now()
      }),
      gitCommit: async (request: GitCommitRequest) => ({
        success: false,
        reason: request.approved
          ? "Open the desktop app to create a real git commit after review."
          : "Git commit requires explicit approval after reviewing status, diff, warnings, and tests."
      }),
      gitPush: async (request: GitPushRequest) => ({
        success: false,
        reason: request.approved
          ? "Open the desktop app to push to a real remote."
          : "Git push requires explicit approval after reviewing branch, remote, and warnings."
      }),
      browse: async (input: string) => ({
        success: true,
        input,
        url: input.startsWith("http") ? input : `https://www.google.com/search?q=${encodeURIComponent(input)}`,
        title: "Autopilot coding research preview",
        snippet: "The desktop app can browse from the coding workspace and summarize the page response here.",
        status: 200
      }),
      research: async (input: string) => {
        const generatedAt = Date.now();
        const sourceUrl = `https://news.google.com/search?q=${encodeURIComponent(input)}`;
        return {
          success: true,
          input,
          answer: `I ran a preview recursive research pass for "${input}". The desktop app uses Google News/search routes to collect current sources, then keeps the conversation open for follow-up research loops.`,
          generatedAt,
          iterations: [
            {
              query: input,
              url: sourceUrl,
              status: "searched",
              summary: "Preview research pass completed.",
              sources: [
                {
                  title: "Preview source for coding research",
                  url: sourceUrl,
                  snippet: "Open the desktop app to run live Google-backed research.",
                  provider: "google-news",
                  sourceName: "Google News",
                  status: 200
                }
              ]
            }
          ],
          sources: [
            {
              title: "Preview source for coding research",
              url: sourceUrl,
              snippet: "Open the desktop app to run live Google-backed research.",
              provider: "google-news",
              sourceName: "Google News",
              status: 200
            }
          ]
        };
      },
      pluginStatuses: async () =>
        CODING_PLUGIN_CATALOG.map((plugin, index) => ({
          id: plugin.id,
          name: plugin.name,
          command: plugin.command,
          status: index === 0 ? ("installed" as const) : ("missing" as const),
          installed: index === 0,
          version: index === 0 ? "preview" : undefined,
          reason: index === 0 ? undefined : "Desktop app checks your computer for installed tools."
        })) satisfies CodingPluginStatus[],
      installPlugin: async (pluginId: string) => {
        const plugin = CODING_PLUGIN_CATALOG.find((candidate) => candidate.id === pluginId);
        return {
          success: true,
          status: {
            id: pluginId,
            name: plugin?.name ?? pluginId,
            command: plugin?.command ?? "preview install",
            status: "installing" as const,
            installed: false,
            startedAt: Date.now(),
            estimatedSeconds: 30,
            elapsedMs: 0
          }
        };
      },
      cancelPluginInstall: async (pluginId: string) => ({
        success: true,
        status: {
          id: pluginId,
          name: pluginId,
          command: "preview install",
          status: "cancelled",
          installed: false,
          reason: "Preview install cancelled."
        }
      }),
      listDownloads: async () => [],
      openDownload: async () => ({ success: false, reason: "Downloads are available in the desktop app." })
    },
    downloads: {
      list: async () => [],
      open: async () => ({ success: false, reason: "Downloads are available in the desktop app." })
    },
    passwords: {
      availability: async () => ({
        secureStorage: false,
        backend: "Browser preview",
        reason: "Password storage is available in the desktop app."
      }),
      list: async () => [...previewPasswords],
      savePending: async () => ({
        success: false,
        reason: "Password saving is available in the desktop app.",
        entries: [...previewPasswords]
      }),
      dismissPending: async () => undefined,
      reveal: async () => ({
        success: false,
        reason: "Password reveal is available in the desktop app."
      }),
      remove: async (id: string) => {
        previewPasswords = previewPasswords.filter((entry) => entry.id !== id);
        return [...previewPasswords];
      },
      subscribeChanges: () => () => undefined,
      subscribeSavePrompts: () => () => undefined
    },
    tabs: {
      getSnapshot: async () => cloneSnapshot(snapshot),
      create: async (url = createHomeUrl()) => {
        const normalizedUrl = normalizeAddressInput(url, createHomeUrl());
        const nextTab = createTab(normalizedUrl, readableTitle("", normalizedUrl));
        return publish({
          tabs: [...snapshot.tabs, nextTab],
          activeTabId: nextTab.id
        });
      },
      close: async (tabId: string) => {
        const next = closeTab(snapshot.tabs, tabId, createTab(createHomeUrl(), "Preview tab"));
        return publish({
          tabs: next.tabs,
          activeTabId: next.activeId
        });
      },
      activate: async (tabId: string) => {
        if (!snapshot.tabs.some((tab) => tab.id === tabId)) {
          return cloneSnapshot(snapshot);
        }

        return publish({ ...snapshot, activeTabId: tabId });
      },
      navigate: async (tabId: string, input: string) => {
        const url = normalizeAddressInput(input, createHomeUrl());
        return publish({
          ...snapshot,
          tabs: updateTab(snapshot.tabs, tabId, {
            url,
            title: readableTitle("", url),
            isLoading: false,
            canGoBack: false,
            canGoForward: false
          })
        });
      },
      home: async (tabId: string) => {
        const activeId = getActiveId(tabId);
        if (!activeId) {
          return cloneSnapshot(snapshot);
        }

        const url = createHomeUrl();
        return publish({
          ...snapshot,
          tabs: updateTab(snapshot.tabs, activeId, {
            url,
            title: "Preview tab",
            isLoading: false,
            canGoBack: false,
            canGoForward: false
          })
        });
      },
      back: async () => cloneSnapshot(snapshot),
      forward: async () => cloneSnapshot(snapshot),
      reload: async () => cloneSnapshot(snapshot),
      readPageText: async (tabId: string) => {
        const tab = snapshot.tabs.find((entry) => entry.id === tabId);
        if (!tab) {
          return { success: false, reason: "No active page to read." };
        }

        return {
          success: true,
          title: tab.title,
          url: tab.url,
          text: "Please turn this preview page into an action item before Friday."
        };
      },
      readDOM: async (tabId: string) => {
        const tab = snapshot.tabs.find((entry) => entry.id === tabId);
        if (!tab) {
          return { success: false, reason: "No active page to inspect." };
        }

        return {
          success: true,
          title: tab.title,
          url: tab.url,
          text: "Preview pages expose a safe DOM summary only in the desktop app.",
          elements: [
            {
              selector: "button:nth-of-type(1)",
              kind: "button",
              label: "Preview action",
              tagName: "button",
              text: "Preview action",
              disabled: false,
              visible: true,
              approvalRequired: false
            }
          ]
        };
      },
      clickBySelector: async (_tabId: string, selector: string) => ({
        success: false,
        action: "click",
        selector,
        reason: "Page clicking is available in the desktop app."
      }),
      fillBySelector: async (_tabId: string, selector: string) => ({
        success: false,
        action: "fill",
        selector,
        reason: "Page filling is available in the desktop app."
      }),
      scrollTo: async (_tabId: string, target: string | number) => ({
        success: false,
        action: "scroll",
        selector: typeof target === "string" ? target : undefined,
        value: typeof target === "number" ? String(target) : undefined,
        reason: "Page scrolling is available in the desktop app."
      }),
      print: async () => ({ success: false, reason: "Printing is available in the desktop app." }),
      setWebArea: async () => cloneSnapshot(snapshot),
      setGroup: async (tabId: string, groupId: string | null) =>
        publish({
          ...snapshot,
          tabs: updateTab(snapshot.tabs, tabId, {
            groupId: groupId ?? undefined
          })
        }),
      setPinned: async (tabId: string, pinned: boolean) =>
        publish({
          ...snapshot,
          tabs: updateTab(snapshot.tabs, tabId, {
            pinned
          })
        }),
      hibernate: async (tabId: string) =>
        publish({
          ...snapshot,
          tabs: updateTab(snapshot.tabs, tabId, {
            hibernated: true,
            memoryBytes: 0
          })
        }),
      wake: async (tabId: string) =>
        publish({
          ...snapshot,
          activeTabId: tabId,
          tabs: updateTab(snapshot.tabs, tabId, {
            hibernated: false
          })
        }),
      subscribe: (listener: (snapshot: BrowserSnapshot) => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      }
    }
  };
}

function withCompatibilityFallback(rawApi: Partial<AutopilotApi>): AutopilotApi {
  const fallbackApi = createPreviewAutopilotApi();
  return {
    runtime: rawApi.runtime ?? fallbackApi.runtime,
    platform: rawApi.platform ?? fallbackApi.platform,
    versions: {
      ...fallbackApi.versions,
      ...rawApi.versions
    },
    tabs: {
      ...fallbackApi.tabs,
      ...rawApi.tabs
    },
    workspaces: {
      ...fallbackApi.workspaces,
      ...rawApi.workspaces
    },
    bookmarks: {
      ...fallbackApi.bookmarks,
      ...rawApi.bookmarks
    },
    passwords: {
      ...fallbackApi.passwords,
      ...rawApi.passwords
    },
    email: {
      ...fallbackApi.email,
      ...rawApi.email
    },
    calendar: {
      ...fallbackApi.calendar,
      ...rawApi.calendar
    },
    productivity: {
      ...fallbackApi.productivity,
      ...rawApi.productivity
    },
    workGraph: {
      ...fallbackApi.workGraph,
      ...rawApi.workGraph
    },
    workTwin: {
      ...fallbackApi.workTwin,
      ...rawApi.workTwin
    },
    runtimeAgent: {
      ...fallbackApi.runtimeAgent,
      ...rawApi.runtimeAgent
    },
    connectors: {
      ...fallbackApi.connectors,
      ...rawApi.connectors
    },
    memory: {
      ...fallbackApi.memory,
      ...rawApi.memory
    },
    hooks: {
      ...fallbackApi.hooks,
      ...rawApi.hooks
    },
    subagents: {
      ...fallbackApi.subagents,
      ...rawApi.subagents
    },
    shadowMode: {
      ...fallbackApi.shadowMode,
      ...rawApi.shadowMode
    },
    automation: {
      ...fallbackApi.automation,
      ...rawApi.automation
    },
    account: {
      ...fallbackApi.account,
      ...rawApi.account
    },
    settings: {
      ...fallbackApi.settings,
      ...rawApi.settings
    },
    payments: {
      ...fallbackApi.payments,
      ...rawApi.payments
    },
    system: {
      ...fallbackApi.system,
      ...rawApi.system
    },
    diagnostics: {
      ...fallbackApi.diagnostics,
      ...rawApi.diagnostics
    },
    observability: {
      ...fallbackApi.observability,
      ...rawApi.observability
    },
    assistant: {
      ...fallbackApi.assistant,
      ...rawApi.assistant
    },
    artifacts: {
      ...fallbackApi.artifacts,
      ...rawApi.artifacts
    },
    agent: {
      ...fallbackApi.agent,
      ...rawApi.agent
    },
    coding: {
      ...fallbackApi.coding,
      ...rawApi.coding
    },
    downloads: {
      ...fallbackApi.downloads,
      ...rawApi.downloads
    }
  };
}

export function getAutopilotApi(): AutopilotApi {
  if (window.autopilot) {
    return withCompatibilityFallback(window.autopilot);
  }

  previewApi ??= createPreviewAutopilotApi();
  return previewApi;
}

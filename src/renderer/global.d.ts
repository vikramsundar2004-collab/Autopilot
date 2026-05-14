import type {
  AddBookmarkFolderInput,
  AddBookmarkInput,
  BookmarkNodeTarget,
  BrowserBookmarkNode,
  BrowserBookmarkSourceOption
} from "../shared/bookmarks";
import type { BrowserSnapshot } from "../shared/browserModel";
import type { CalendarWriteRequest, CalendarWriteResult } from "../shared/calendar";
import type {
  CodingAgentPlanResult,
  CodingAgentRunResult,
  CodingAccessMode,
  CodingCommandLogResult,
  CodingCommandPlan,
  CodingCommandRequest,
  CodingCommandResult,
  CodingDeepQaBenchmarkResult,
  CodingDeleteResult,
  CodingDownloadEntry,
  CodingFileReadResult,
  CodingGitDiffResult,
  CodingGitStatusResult,
  GitCommitProposalResult,
  GitCommitRequest,
  GitCommitResult,
  GitPushRequest,
  GitPushResult,
  CodingLanguageToolStatus,
  CodingOpenFileResult,
  CodingPatchSetResult,
  CodingPluginInstallResult,
  CodingPluginStatus,
  CodingPreviewValidationRequest,
  CodingPreviewValidationResult,
  CodingRepoOverviewResult,
  CodingRenameProjectResult,
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
  EmailOrganizationAction,
  EmailMessageSummary,
  GmailOrganizationResult,
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
  ProductivityTaskInput,
  ProductivityTask,
  ProductivityTaskState,
  ProductivityTaskSyncRequest,
  ProductivityTaskSyncResult
} from "../shared/productivity";
import type { AutopilotRunLogEvent } from "../shared/observability";
import type { AccountSignInRequest, AccountSignInResult, AccountStatus, BackendConfigStatus } from "../shared/account";
import type { CreateDiagnosticLogInput, DiagnosticExportResult, DiagnosticLogEntry } from "../shared/diagnostics";
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
import type {
  AgentRunRequest,
  AgentTrace,
  ConnectorDescriptor,
  HookDefinition,
  SubagentDefinition,
  ToolDescriptor,
  WorkspaceMemory
} from "../shared/agentRuntime";
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
import type {
  ShadowModeRule,
  ShadowModeRun,
  ProofModeReport,
  WorkGraphActionResult,
  WorkGraphItem,
  WorkGraphMakeRuleResult,
  WorkGraphSnapshot,
  WorkTwinReplayStep
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

declare module "monaco-editor/esm/vs/editor/editor.api.js" {
  export * from "monaco-editor";
}

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
  languageToolStatuses: () => Promise<CodingLanguageToolStatus[]>;
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

type ShadowModeApi = {
  listRuns: () => Promise<ShadowModeRun[]>;
  listRules: () => Promise<ShadowModeRule[]>;
  setRuleEnabled: (ruleId: string, enabled: boolean) => Promise<ShadowModeRule[]>;
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

type ObservabilityApi = {
  listRunLog: (limit?: number) => Promise<AutopilotRunLogEvent[]>;
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
  }
}

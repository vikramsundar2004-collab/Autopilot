import { contextBridge, ipcRenderer, type IpcRendererEvent, type Rectangle } from "electron";

import type {
  AddBookmarkFolderInput,
  AddBookmarkInput,
  BookmarkNodeTarget,
  BrowserBookmarkNode,
  BrowserBookmarkSourceOption
} from "../shared/bookmarks.js";
import type { BrowserSnapshot } from "../shared/browserModel.js";
import type { CalendarWriteRequest, CalendarWriteResult } from "../shared/calendar.js";
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
} from "../shared/coding.js";
import type {
  EmailActionAnalysisResult,
  EmailConnectResult,
  EmailConnectionStatus,
  EmailOrganizationAction,
  EmailMessageSummary,
  GmailOrganizationResult,
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
  PageDomActionResult,
  PageDomSnapshotResult,
  PageTextCaptureResult,
  ProductivityDraft,
  ProductivityTaskInput,
  ProductivityTask,
  ProductivityTaskState,
  ProductivityTaskSyncRequest,
  ProductivityTaskSyncResult
} from "../shared/productivity.js";
import type { AutopilotRunLogEvent } from "../shared/observability.js";
import type { AccountSignInRequest, AccountSignInResult, AccountStatus, BackendConfigStatus } from "../shared/account.js";
import type { CreateDiagnosticLogInput, DiagnosticExportResult, DiagnosticLogEntry } from "../shared/diagnostics.js";
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
} from "../shared/assistant.js";
import type { ActionPlan, AgentPlanFromEmailRequest, AgentPlanResult, AgentRun, AgentStartRunRequest } from "../shared/agent.js";
import type {
  AgentRunRequest,
  AgentTrace,
  ConnectorDescriptor,
  HookDefinition,
  SubagentDefinition,
  ToolDescriptor,
  WorkspaceMemory
} from "../shared/agentRuntime.js";
import type { Artifact, ArtifactCreateInput, ArtifactExportResult, ArtifactExportToCodingResult, ArtifactUpdateInput } from "../shared/artifacts.js";
import type { AutomationCreateRecipeInput, AutomationRecipe, AutomationRun, AutomationRunResult, AutomationUpdateRecipeInput } from "../shared/automation.js";
import type { ProductivityRouteWorkItemResult, WorkAssignment, WorkItem } from "../shared/workItems.js";
import type { WorkspaceProfile, WorkspaceState } from "../shared/workspaces.js";
import type {
  ShadowModeRule,
  ShadowModeRun,
  ProofModeReport,
  WorkGraphActionResult,
  WorkGraphItem,
  WorkGraphMakeRuleResult,
  WorkGraphSnapshot,
  WorkTwinReplayStep
} from "../shared/workGraph.js";
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
} from "../shared/highImpactActions.js";

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
  readDOM: (tabId: string) => ipcRenderer.invoke("tabs:read-dom", tabId) as Promise<PageDomSnapshotResult>,
  clickBySelector: (tabId: string, selector: string) =>
    ipcRenderer.invoke("tabs:click-by-selector", tabId, selector) as Promise<PageDomActionResult>,
  fillBySelector: (tabId: string, selector: string, value: unknown) =>
    ipcRenderer.invoke("tabs:fill-by-selector", tabId, selector, value) as Promise<PageDomActionResult>,
  scrollTo: (tabId: string, target: string | number) =>
    ipcRenderer.invoke("tabs:scroll-to", tabId, target) as Promise<PageDomActionResult>,
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
    organize: (actions: EmailOrganizationAction[]) =>
      ipcRenderer.invoke("email:organize", actions) as Promise<GmailOrganizationResult>,
    disconnect: () => ipcRenderer.invoke("email:disconnect") as Promise<EmailConnectionStatus>
  },
  calendar: {
    write: (request: CalendarWriteRequest) => ipcRenderer.invoke("calendar:write", request) as Promise<CalendarWriteResult>
  },
  productivity: {
    listTasks: () => ipcRenderer.invoke("productivity:list-tasks") as Promise<ProductivityTask[]>,
    listDrafts: () => ipcRenderer.invoke("productivity:list-drafts") as Promise<ProductivityDraft[]>,
    listWorkItems: () => ipcRenderer.invoke("productivity:list-work-items") as Promise<WorkItem[]>,
    listWorkAssignments: () => ipcRenderer.invoke("productivity:list-work-assignments") as Promise<WorkAssignment[]>,
    buildTodaysCall: () => ipcRenderer.invoke("productivity:build-todays-call"),
    startSafeWork: (limit?: number) => ipcRenderer.invoke("productivity:start-safe-work", limit),
    upsertDraft: (draft: Partial<ProductivityDraft> & Pick<ProductivityDraft, "title" | "body" | "artifactKind" | "source">) =>
      ipcRenderer.invoke("productivity:upsert-draft", draft) as Promise<ProductivityDraft[]>,
    deleteDraft: (draftId: string) => ipcRenderer.invoke("productivity:delete-draft", draftId) as Promise<ProductivityDraft[]>,
    upsertTask: (task: ProductivityTaskInput) => ipcRenderer.invoke("productivity:upsert-task", task) as Promise<ProductivityTask[]>,
    updateTask: (taskId: string, patch: Partial<ProductivityTask>) =>
      ipcRenderer.invoke("productivity:update-task", taskId, patch) as Promise<ProductivityTask[]>,
    setTaskState: (taskId: string, state: ProductivityTaskState) =>
      ipcRenderer.invoke("productivity:set-task-state", taskId, state) as Promise<ProductivityTask[]>,
    updateWorkAssignment: (assignmentId: string, patch: Partial<WorkAssignment>) =>
      ipcRenderer.invoke("productivity:update-work-assignment", assignmentId, patch) as Promise<WorkAssignment[]>,
    routeWorkItem: (workItemId: string) => ipcRenderer.invoke("productivity:route-work-item", workItemId) as Promise<ProductivityRouteWorkItemResult>,
    sync: (request?: string[] | ProductivityTaskSyncRequest) => ipcRenderer.invoke("productivity:sync", request) as Promise<ProductivityTaskSyncResult>
  },
  workGraph: {
    list: () => ipcRenderer.invoke("work-graph:list") as Promise<WorkGraphSnapshot>,
    get: (itemId: string) => ipcRenderer.invoke("work-graph:get", itemId) as Promise<WorkGraphItem | null>,
    replay: (itemId: string) => ipcRenderer.invoke("work-graph:replay", itemId) as Promise<WorkTwinReplayStep[]>,
    startSafeWork: (itemId: string) => ipcRenderer.invoke("work-graph:start-safe-work", itemId) as Promise<WorkGraphActionResult>,
    approve: (itemId: string) => ipcRenderer.invoke("work-graph:approve", itemId) as Promise<WorkGraphActionResult>,
    reject: (itemId: string, reason?: string) => ipcRenderer.invoke("work-graph:reject", itemId, reason) as Promise<WorkGraphActionResult>,
    revise: (itemId: string, feedback?: string) => ipcRenderer.invoke("work-graph:revise", itemId, feedback) as Promise<WorkGraphActionResult>,
    makeRule: (itemId: string) => ipcRenderer.invoke("work-graph:make-rule", itemId) as Promise<WorkGraphMakeRuleResult>
  },
  workTwin: {
    getProof: (itemId: string) => ipcRenderer.invoke("work-twin:get-proof", itemId) as Promise<ProofModeReport | null>
  },
  runtimeAgent: {
    run: (input: AgentRunRequest) => ipcRenderer.invoke("agent:run", input) as Promise<AgentTrace>,
    listTools: (workspace?: string) => ipcRenderer.invoke("agent:list-tools", workspace) as Promise<ToolDescriptor[]>,
    getTrace: (traceId: string) => ipcRenderer.invoke("agent:get-trace", traceId) as Promise<AgentTrace | null>,
    approveTool: (traceId: string, toolName: string) => ipcRenderer.invoke("agent:approve-tool", traceId, toolName) as Promise<AgentTrace | null>
  },
  connectors: {
    list: () => ipcRenderer.invoke("connectors:list") as Promise<ConnectorDescriptor[]>,
    getStatus: (connectorId: string) => ipcRenderer.invoke("connectors:get-status", connectorId) as Promise<ConnectorDescriptor | null>,
    setEnabled: (connectorId: string, enabled: boolean) => ipcRenderer.invoke("connectors:set-enabled", connectorId, enabled) as Promise<ConnectorDescriptor | null>
  },
  memory: {
    get: () => ipcRenderer.invoke("memory:get") as Promise<WorkspaceMemory[]>,
    update: (input: Omit<WorkspaceMemory, "id" | "updatedAt"> & { id?: string }) => ipcRenderer.invoke("memory:update", input) as Promise<WorkspaceMemory[]>
  },
  hooks: {
    list: () => ipcRenderer.invoke("hooks:list") as Promise<HookDefinition[]>,
    test: (input: { event: HookDefinition["event"]; workspace: string; value: string }) =>
      ipcRenderer.invoke("hooks:test", input) as Promise<{ blocked: boolean; requiresApproval: boolean; matchedHooks: HookDefinition[] }>
  },
  subagents: {
    list: () => ipcRenderer.invoke("subagents:list") as Promise<SubagentDefinition[]>,
    run: (subagentId: string, prompt: string) => ipcRenderer.invoke("subagents:run", subagentId, prompt) as Promise<AgentTrace | null>
  },
  shadowMode: {
    listRuns: () => ipcRenderer.invoke("shadow-mode:list-runs") as Promise<ShadowModeRun[]>,
    listRules: () => ipcRenderer.invoke("shadow-mode:list-rules") as Promise<ShadowModeRule[]>,
    setRuleEnabled: (ruleId: string, enabled: boolean) =>
      ipcRenderer.invoke("shadow-mode:set-rule-enabled", ruleId, enabled) as Promise<ShadowModeRule[]>
  },
  automation: {
    listRecipes: () => ipcRenderer.invoke("automation:list-recipes") as Promise<AutomationRecipe[]>,
    createRecipe: (input: AutomationCreateRecipeInput) => ipcRenderer.invoke("automation:create-recipe", input) as Promise<AutomationRecipe[]>,
    updateRecipe: (input: AutomationUpdateRecipeInput) => ipcRenderer.invoke("automation:update-recipe", input) as Promise<AutomationRecipe[]>,
    deleteRecipe: (recipeId: string) => ipcRenderer.invoke("automation:delete-recipe", recipeId) as Promise<AutomationRecipe[]>,
    runNow: (recipeId: string) => ipcRenderer.invoke("automation:run-now", recipeId) as Promise<AutomationRunResult>,
    listRuns: () => ipcRenderer.invoke("automation:list-runs") as Promise<AutomationRun[]>,
    detectFromPrompt: (prompt: string, sourceWorkspace?: string) => ipcRenderer.invoke("automation:detect-from-prompt", prompt, sourceWorkspace)
  },
  account: {
    status: () => ipcRenderer.invoke("account:status") as Promise<AccountStatus>,
    getConfig: () => ipcRenderer.invoke("account:get-config") as Promise<BackendConfigStatus>,
    signIn: (request: AccountSignInRequest) => ipcRenderer.invoke("account:sign-in", request) as Promise<AccountSignInResult>,
    signUp: (request: AccountSignInRequest) => ipcRenderer.invoke("account:sign-up", request) as Promise<AccountSignInResult>,
    signOut: () => ipcRenderer.invoke("account:sign-out") as Promise<AccountStatus>,
    subscribe: (listener: (status: AccountStatus) => void) => {
      const handler = (_event: IpcRendererEvent, status: AccountStatus) => listener(status);
      ipcRenderer.on("account:changed", handler);
      return () => ipcRenderer.removeListener("account:changed", handler);
    }
  },
  settings: {
    getMoneyMovement: () => ipcRenderer.invoke("settings:get-money-movement") as Promise<MoneyMovementSettings>,
    startMoneyVerification: (acknowledged: boolean) =>
      ipcRenderer.invoke("settings:start-money-verification", acknowledged) as Promise<MoneyMovementVerification>,
    confirmMoneyVerification: (code: string) =>
      ipcRenderer.invoke("settings:confirm-money-verification", code) as Promise<MoneyMovementVerification>,
    disableMoneyMovement: () => ipcRenderer.invoke("settings:disable-money-movement") as Promise<MoneyMovementActionResult>,
    startStripeConnect: () => ipcRenderer.invoke("settings:start-stripe-connect") as Promise<MoneyMovementActionResult>,
    refreshStripeConnection: () => ipcRenderer.invoke("settings:refresh-stripe-connection") as Promise<MoneyMovementActionResult>,
    disconnectStripeAccount: () => ipcRenderer.invoke("settings:disconnect-stripe-account") as Promise<MoneyMovementActionResult>
  },
  payments: {
    verifyInvoice: (input: InvoiceCandidate) => ipcRenderer.invoke("payments:verify-invoice", input) as Promise<InvoiceVerificationReport>,
    verifyVendor: (input: {
      providerKind: PaymentProviderKind;
      payeeName: string;
      payeeEmail?: string;
      destination?: PaymentDestination;
      trustedDomains?: string[];
      userApprovedVendorRecord?: boolean;
    }) => ipcRenderer.invoke("payments:verify-vendor", input) as Promise<VendorVerificationReport>,
    getProviderReadiness: () => ipcRenderer.invoke("payments:get-provider-readiness") as Promise<ProviderReadinessChecklist[]>,
    listReceipts: () => ipcRenderer.invoke("payments:list-receipts") as Promise<PaymentReceipt[]>,
    verifyReceipt: (receiptId: string) => ipcRenderer.invoke("payments:verify-receipt", receiptId) as Promise<PaymentReceiptVerificationResult>,
    createHostedApproval: (proposalId: string) => ipcRenderer.invoke("payments:create-hosted-approval", proposalId) as Promise<HostedApprovalResult>,
    confirmProviderStatus: () => ipcRenderer.invoke("payments:confirm-provider-status") as Promise<ProviderReadinessChecklist[]>,
    createProposal: (input: PaymentProposalInput) =>
      ipcRenderer.invoke("payments:create-proposal", input) as Promise<{ success: true; proposal: PaymentProposal } | { success: false; reason: string; settings: MoneyMovementSettings }>,
    getQuote: (proposalId: string) => ipcRenderer.invoke("payments:get-quote", proposalId) as Promise<PaymentQuoteResult>,
    approve: (proposalId: string, stepUpConfirmed: boolean) =>
      ipcRenderer.invoke("payments:approve", proposalId, stepUpConfirmed) as Promise<
        { success: true; approval: PaymentApproval; proposal: PaymentProposal } | { success: false; reason: string; proposal?: PaymentProposal; settings?: MoneyMovementSettings }
      >,
    execute: (proposalId: string, approvalId: string, mode?: PaymentMode) =>
      ipcRenderer.invoke("payments:execute", proposalId, approvalId, mode) as Promise<PaymentExecutionResult>
  },
  system: {
    openExternalUrl: (url: string) => ipcRenderer.invoke("system:open-external-url", url) as Promise<{ success: true } | { success: false; reason: string }>
  },
  diagnostics: {
    list: (limit?: number) => ipcRenderer.invoke("diagnostics:list", limit) as Promise<DiagnosticLogEntry[]>,
    record: (input: CreateDiagnosticLogInput) => ipcRenderer.invoke("diagnostics:record", input) as Promise<DiagnosticLogEntry>,
    clear: () => ipcRenderer.invoke("diagnostics:clear") as Promise<DiagnosticLogEntry[]>,
    export: () => ipcRenderer.invoke("diagnostics:export") as Promise<DiagnosticExportResult>,
    subscribe: (listener: (entries: DiagnosticLogEntry[]) => void) => {
      const handler = (_event: IpcRendererEvent, entries: DiagnosticLogEntry[]) => listener(entries);
      ipcRenderer.on("diagnostics:changed", handler);
      return () => ipcRenderer.removeListener("diagnostics:changed", handler);
    }
  },
  observability: {
    listRunLog: (limit?: number) => ipcRenderer.invoke("observability:list-run-log", limit) as Promise<AutopilotRunLogEvent[]>
  },
  assistant: {
    sources: () => ipcRenderer.invoke("assistant:sources") as Promise<AssistantContextSource[]>,
    ask: (request: AssistantRequest) => ipcRenderer.invoke("assistant:ask", request) as Promise<AssistantResponse>,
    translateDesignPrompt: (request: DesignPromptTranslationRequest) =>
      ipcRenderer.invoke("assistant:translate-design-prompt", request) as Promise<DesignPromptTranslationResponse>,
    translateCodingPrompt: (request: CodingPromptTranslationRequest) =>
      ipcRenderer.invoke("assistant:translate-coding-prompt", request) as Promise<CodingPromptTranslationResponse>,
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
    approveFinalStep: (planId: string) => ipcRenderer.invoke("agent:approve-final-step", planId) as Promise<AgentRun[]>,
    classifyWorkItem: (workItemId: string) => ipcRenderer.invoke("agent:classify-work-item", workItemId),
    qualityCheckOutput: (output: string, sourceText: string, options?: { minWords?: number; requireSources?: boolean }) =>
      ipcRenderer.invoke("agent:quality-check-output", output, sourceText, options)
  },
  coding: {
    getSnapshot: () => ipcRenderer.invoke("coding:snapshot") as Promise<CodingSnapshot>,
    openProject: () => ipcRenderer.invoke("coding:open-project") as Promise<CodingSnapshot>,
    openFiles: () => ipcRenderer.invoke("coding:open-files") as Promise<CodingOpenFileResult>,
    createProject: () => ipcRenderer.invoke("coding:create-project") as Promise<CodingSnapshot>,
    selectProject: (rootPath: string) => ipcRenderer.invoke("coding:select-project", rootPath) as Promise<CodingSnapshot>,
    renameProject: (rootPath: string, name: string) =>
      ipcRenderer.invoke("coding:rename-project", rootPath, name) as Promise<CodingRenameProjectResult>,
    readPath: (targetPath: string) => ipcRenderer.invoke("coding:read-path", targetPath) as Promise<CodingFileReadResult>,
    writeFile: (targetPath: string, content: string) =>
      ipcRenderer.invoke("coding:write-file", targetPath, content) as Promise<CodingWriteResult>,
    deletePath: (targetPath: string) => ipcRenderer.invoke("coding:delete-path", targetPath) as Promise<CodingDeleteResult>,
    setAccessMode: (mode: CodingAccessMode) => ipcRenderer.invoke("coding:set-access-mode", mode) as Promise<CodingSnapshot>,
    search: (query: string) => ipcRenderer.invoke("coding:search", query) as Promise<CodingSearchResult[]>,
    openTerminal: (input?: CodingTerminalOpenRequest) =>
      ipcRenderer.invoke("coding:open-terminal", input) as Promise<CodingTerminalOpenResult>,
    sendTerminalInput: (input: CodingTerminalInputRequest) =>
      ipcRenderer.invoke("coding:terminal-input", input) as Promise<CodingTerminalInputResult>,
    subscribeTerminalOutput: (listener: (event: CodingTerminalOutputEvent) => void) => {
      const handler = (_event: IpcRendererEvent, outputEvent: CodingTerminalOutputEvent) => listener(outputEvent);
      ipcRenderer.on("coding:terminal-output", handler);
      return () => ipcRenderer.removeListener("coding:terminal-output", handler);
    },
    planCommand: (input: CodingCommandRequest) => ipcRenderer.invoke("coding:plan-command", input) as Promise<CodingCommandPlan>,
    approveCommand: (input: CodingCommandRequest) => ipcRenderer.invoke("coding:approve-command", input) as Promise<CodingCommandResult>,
    runCommand: (input: CodingCommandRequest) => ipcRenderer.invoke("coding:run-command", input) as Promise<CodingCommandResult>,
    getCommandLog: () => ipcRenderer.invoke("coding:get-command-log") as Promise<CodingCommandLogResult>,
    createPatchSet: () => ipcRenderer.invoke("coding:create-patchset") as Promise<CodingPatchSetResult>,
    validatePreview: (input: CodingPreviewValidationRequest) =>
      ipcRenderer.invoke("coding:validate-preview", input) as Promise<CodingPreviewValidationResult>,
    runDeepQaBenchmark: () => ipcRenderer.invoke("coding:run-deep-qa-benchmark") as Promise<CodingDeepQaBenchmarkResult>,
    repoOverview: () => ipcRenderer.invoke("coding:repo-overview") as Promise<CodingRepoOverviewResult>,
    languageToolStatuses: () => ipcRenderer.invoke("coding:language-tool-statuses") as Promise<CodingLanguageToolStatus[]>,
    createAgentPlan: (goal: string) => ipcRenderer.invoke("coding:create-agent-plan", goal) as Promise<CodingAgentPlanResult>,
    startAgentRun: (goal: string) => ipcRenderer.invoke("coding:start-agent-run", goal) as Promise<CodingAgentRunResult>,
    gitStatus: () => ipcRenderer.invoke("coding:git-status") as Promise<CodingGitStatusResult>,
    gitDiff: (filePath?: string) => ipcRenderer.invoke("coding:git-diff", filePath) as Promise<CodingGitDiffResult>,
    gitCommitProposal: (message?: string, filePaths?: string[]) =>
      ipcRenderer.invoke("coding:git-commit-proposal", message, filePaths) as Promise<GitCommitProposalResult>,
    gitCommit: (request: GitCommitRequest) => ipcRenderer.invoke("coding:git-commit", request) as Promise<GitCommitResult>,
    gitPush: (request: GitPushRequest) => ipcRenderer.invoke("coding:git-push", request) as Promise<GitPushResult>,
    browse: (input: string) => ipcRenderer.invoke("coding:browse", input) as Promise<CodingResearchResult>,
    research: (input: string) => ipcRenderer.invoke("coding:research", input) as Promise<CodingResearchReportResult>,
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

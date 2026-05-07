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
import type {
  EmailActionAnalysisResult,
  EmailConnectResult,
  EmailConnectionStatus,
  EmailMessageSummary,
  EmailSyncResult
} from "../shared/email";
import {
  createCodingAgentPlanFromOverview,
  parseGitPorcelainStatus,
  type CodingAgentPlanResult,
  type CodingAgentRun,
  type CodingAccessMode,
  type CodingCommandRequest,
  type CodingCommandResult,
  type CodingDeleteResult,
  type CodingDownloadEntry,
  type CodingFileReadResult,
  type CodingGitDiffResult,
  type CodingGitStatusResult,
  type CodingOpenFileResult,
  type CodingPluginInstallResult,
  type CodingPluginStatus,
  type CodingRepoOverviewResult,
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
  ProductivityTask,
  ProductivityTaskState,
  ProductivityTaskSyncResult
} from "../shared/productivity";
import type {
  AssistantContextSource,
  AssistantRequest,
  AssistantResponse,
  DesignPromptSuggestionRequest,
  DesignPromptSuggestionResponse
} from "../shared/assistant";
import type { ActionPlan, AgentPlanFromEmailRequest, AgentPlanResult, AgentRun, AgentStartRunRequest } from "../shared/agent";
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
  type ArtifactCreateInput,
  type ArtifactExportResult,
  type ArtifactExportToCodingResult,
  type ArtifactUpdateInput
} from "../shared/artifacts";
import type { ProductivityRouteWorkItemResult, WorkAssignment, WorkItem } from "../shared/workItems";
import { DEFAULT_WORKSPACE_PROFILES, type WorkspaceProfile, type WorkspaceState } from "../shared/workspaces";

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
  productivity: ProductivityApi;
  automation: AutomationApi;
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
      calendar: false
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

  async function createPreviewAgentArtifact(title: string, prompt: string, kind: Artifact["kind"]): Promise<AgentPlanResult> {
    const now = Date.now();
    const versionId = `preview-version:${crypto.randomUUID()}`;
    const artifact: Artifact = {
      id: `preview-artifact:${crypto.randomUUID()}`,
      kind,
      title: title.trim().slice(0, 120) || "Preview artifact",
      summary: "Generated by the preview agent.",
      source: { provider: "manual", label: "Preview prompt" },
      visibility: "user_project",
      pinned: false,
      activeVersionId: versionId,
      versions: [
        {
          id: versionId,
          createdAt: now,
          prompt,
          summary: "Generated by the preview agent.",
          content: defaultArtifactContent(kind, title.trim().slice(0, 120) || "Preview artifact")
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
      source: { provider: "manual" as const, label: "Preview prompt" },
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
      disconnect: async () => {
        previewEmailMessages = [];
        return previewEmailStatus;
      }
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
      sync: async (_sourceIds?: string[]) => ({
        success: false,
        tasks: structuredClone(previewProductivityTasks),
        addedCount: 0,
        updatedCount: 0,
        reason: "Productivity sync is available in the desktop app."
      })
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
        reason: "Autopilot Assistant needs the desktop app and AUTOPILOT_OPENAI_API_KEY."
      }),
      generatePrompts: async () => ({
        success: false,
        suggestions: [],
        model: "preview",
        reason: "Prompt suggestions need the desktop app and AUTOPILOT_OPENAI_API_KEY."
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

        return createPreviewAgentArtifact(message.subject, message.snippet, input.preferredKind ?? "document");
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
      runCommand: async (input: CodingCommandRequest) => {
        if (previewCodingSnapshot.accessMode !== "full" && !input.approved) {
          return {
            success: false,
            command: input.command,
            cwd: previewCodingSnapshot.activeProject?.rootPath,
            reason: "Approve this command before Autopilot runs it.",
            requiresApproval: true
          };
        }

        return {
          success: true,
          command: input.command,
          cwd: previewCodingSnapshot.activeProject?.rootPath ?? "preview",
          stdout: `Preview command: ${input.command}\nOpen the desktop app to run this on your computer.`,
          stderr: "",
          exitCode: 0,
          durationMs: 12
        };
      },
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
    productivity: {
      ...fallbackApi.productivity,
      ...rawApi.productivity
    },
    automation: {
      ...fallbackApi.automation,
      ...rawApi.automation
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

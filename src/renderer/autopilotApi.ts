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
} from "../shared/coding";
import type {
  PasswordAvailability,
  PasswordCredentialSummary,
  PasswordRevealResult,
  PasswordSaveResult,
  PendingPasswordSave
} from "../shared/passwords";
import type {
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
  defaultArtifactContent,
  type Artifact,
  type ArtifactCreateInput,
  type ArtifactExportResult,
  type ArtifactExportToCodingResult,
  type ArtifactUpdateInput
} from "../shared/artifacts";
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
  createProject: () => Promise<CodingSnapshot>;
  selectProject: (rootPath: string) => Promise<CodingSnapshot>;
  readPath: (targetPath: string) => Promise<CodingFileReadResult>;
  writeFile: (targetPath: string, content: string) => Promise<CodingWriteResult>;
  deletePath: (targetPath: string) => Promise<CodingDeleteResult>;
  setAccessMode: (mode: CodingAccessMode) => Promise<CodingSnapshot>;
  search: (query: string) => Promise<CodingSearchResult[]>;
  runCommand: (input: CodingCommandRequest) => Promise<CodingCommandResult>;
  browse: (input: string) => Promise<CodingResearchResult>;
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
  upsertDraft: (draft: Partial<ProductivityDraft> & Pick<ProductivityDraft, "title" | "body" | "artifactKind" | "source">) => Promise<ProductivityDraft[]>;
  deleteDraft: (draftId: string) => Promise<ProductivityDraft[]>;
  updateTask: (taskId: string, patch: Partial<ProductivityTask>) => Promise<ProductivityTask[]>;
  setTaskState: (taskId: string, state: ProductivityTaskState) => Promise<ProductivityTask[]>;
  sync: () => Promise<ProductivityTaskSyncResult>;
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
      sync: async () => ({
        success: false,
        tasks: structuredClone(previewProductivityTasks),
        addedCount: 0,
        updatedCount: 0,
        reason: "Productivity sync is available in the desktop app."
      })
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
      }
    },
    coding: {
      getSnapshot: async () => structuredClone(previewCodingSnapshot),
      openProject: async () => activatePreviewCodingProject(),
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
      browse: async (input: string) => ({
        success: true,
        input,
        url: input.startsWith("http") ? input : `https://www.google.com/search?q=${encodeURIComponent(input)}`,
        title: "Autopilot coding research preview",
        snippet: "The desktop app can browse from the coding workspace and summarize the page response here.",
        status: 200
      }),
      pluginStatuses: async () =>
        [
          {
            id: "node",
            name: "Node.js CLI",
            command: "winget install OpenJS.NodeJS.LTS",
            status: "installed",
            installed: true,
            version: "preview"
          },
          {
            id: "git",
            name: "Git",
            command: "winget install Git.Git",
            status: "missing",
            installed: false,
            reason: "Desktop app checks your computer for installed tools."
          }
        ] satisfies CodingPluginStatus[],
      installPlugin: async (pluginId: string) => ({
        success: true,
        status: {
          id: pluginId,
          name: pluginId,
          command: "preview install",
          status: "installing",
          installed: false,
          startedAt: Date.now(),
          estimatedSeconds: 30,
          elapsedMs: 0
        }
      }),
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

import { lazy, Suspense, type CSSProperties, type Dispatch, type FormEvent, type ReactNode, type SetStateAction, useEffect, useMemo, useRef, useState } from "react";
import { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api.js";
import {
  Bot,
  Check,
  ChevronDown,
  ChevronRight,
  Code2,
  Columns3,
  FileText,
  FolderOpen,
  GitBranch,
  Info,
  LayoutDashboard,
  Maximize2,
  MessageCircle,
  Minimize2,
  Play,
  Plus,
  Search,
  Settings,
  SplitSquareHorizontal,
  Square,
  Terminal,
  TestTube2,
  X,
  Zap
} from "lucide-react";

import type {
  CodingAccessMode,
  CodingAgentPlan,
  CodingAgentRun,
  CodingClarificationAnswer,
  CodingClarificationQuestion,
  CodingCommandRequest,
  CodingCommandResult,
  CodingFileReadResult,
  CodingProject,
  CodingRunHeartbeat,
  CodingRunStatus,
  CodingRunTimeoutState,
  CodingSnapshot,
  CodingTreeNode
} from "../../shared/coding";
import type { CodingDiffResult } from "../codingDiff";
import { CodingTree } from "./CodingTree";

loader.config({ monaco });

const MonacoEditor = lazy(() => import("@monaco-editor/react"));
const MonacoDiffEditor = lazy(() =>
  import("@monaco-editor/react").then((module) => ({
    default: module.DiffEditor
  }))
);

type CodingSection = "files" | "search" | "plugins" | "skills" | "board" | "terminal" | "browser";
type CodingAssistantPanelMode = "normal" | "wide" | "focus";
type CodingProjectSection = "chats" | "code";
type CodingProjectBoardAction = "plan" | "openProject" | "reviewDiff" | "runTests" | "newChat";

type CodingChatMessage = {
  id: string;
  role: "user" | "agent";
  content: string;
  createdAt: number;
};

export type CodingChatThreadView = {
  id: string;
  projectRootPath: string | null;
  projectName: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: CodingChatMessage[];
};

export type CodingWorkbenchTabView = {
  id: string;
  kind: "chat" | "project" | "file" | "folder" | "picker" | "plugins" | "board" | "terminal" | "browser";
  title: string;
  chatId?: string;
  projectRootPath?: string | null;
  path?: string;
  file?: Extract<CodingFileReadResult, { success: true }>;
  content?: string;
  baseContent?: string;
  dirty?: boolean;
  savedAt?: number;
};

export type CodingTextWorkbenchTabView = CodingWorkbenchTabView & {
  file: Extract<CodingFileReadResult, { success: true; kind: "text" }>;
};

export type CodingRecentCodeItemView = {
  id: string;
  title: string;
  detail: string;
  path: string;
  kind: CodingTreeNode["kind"];
  openedTabId?: string;
  modifiedAt?: number;
  dirty?: boolean;
};

export type CodingAiFilePatchView = {
  id: string;
  tabId: string;
  path: string;
  relativePath: string;
  explanation: string;
  originalContent: string;
  nextContent: string;
  status: "pending" | "applied" | "dismissed";
  createdAt: number;
};

export type CodingProjectBoardItemView = {
  id: string;
  title: string;
  detail: string;
  meta: string;
  status: "draft" | "active" | "ready" | "done";
  agent: string;
  branch: string;
  action: CodingProjectBoardAction;
  actionLabel: string;
  prompt?: string;
};

export type CodingProjectBoardColumnView = {
  id: "drafts" | "active" | "ready" | "done";
  title: string;
  description: string;
  items: CodingProjectBoardItemView[];
};

type CodingWorkspaceRebuildProps = {
  assistantUserName: string;
  snapshot: CodingSnapshot;
  activeProject: CodingProject | null;
  activeTab: CodingWorkbenchTabView;
  activeTextTab: CodingTextWorkbenchTabView | null;
  tabs: CodingWorkbenchTabView[];
  textTabs: CodingTextWorkbenchTabView[];
  visibleProjects: CodingProject[];
  orderedProjects: CodingProject[];
  chatsByProject: Map<string, CodingChatThreadView[]>;
  activeChat: CodingChatThreadView | null;
  projectSearch: string;
  setProjectSearch: Dispatch<SetStateAction<string>>;
  openFolders: Record<string, boolean>;
  collapsedProjects: Record<string, boolean>;
  collapsedProjectSections: Record<string, Partial<Record<CodingProjectSection, boolean>>>;
  recentCodeItems: CodingRecentCodeItemView[];
  boardColumns: CodingProjectBoardColumnView[];
  codingSection: CodingSection;
  setCodingSection: Dispatch<SetStateAction<CodingSection>>;
  assistantPanelMode: CodingAssistantPanelMode;
  setAssistantPanelMode: Dispatch<SetStateAction<CodingAssistantPanelMode>>;
  busy: boolean;
  status: string;
  runStatus: CodingRunStatus;
  runHeartbeat: CodingRunHeartbeat | null;
  runTimeout: CodingRunTimeoutState | null;
  lastRunPrompt: string;
  commandDraft: string;
  setCommandDraft: Dispatch<SetStateAction<string>>;
  terminalOpening: boolean;
  terminalText: string;
  pendingCommand: CodingCommandRequest | null;
  commandHistory: CodingCommandResult[];
  reviewChangedCount: number;
  reviewAddedCount: number;
  reviewRemovedCount: number;
  branchLabel: string;
  testsLabel: string;
  agentPlan: CodingAgentPlan | null;
  agentRun: CodingAgentRun | null;
  clarificationQuestion: CodingClarificationQuestion | null;
  draftMessage: string;
  setDraftMessage: Dispatch<SetStateAction<string>>;
  browserFeedbackDraft: string;
  setBrowserFeedbackDraft: Dispatch<SetStateAction<string>>;
  clickSuggestMode: boolean;
  setClickSuggestMode: Dispatch<SetStateAction<boolean>>;
  activeDiff: CodingDiffResult | null;
  aiPatch: CodingAiFilePatchView | null;
  onOpenProject: () => void;
  onCreateProject: () => void;
  onOpenPicker: () => void;
  onOpenNode: (node: CodingTreeNode) => void;
  onOpenPath: (path: string) => void;
  onSelectProject: (rootPath: string) => void;
  onStartNewChat: (project: CodingProject | null) => void;
  onOpenExistingChat: (chat: CodingChatThreadView) => void;
  onArchiveChat: (chatId: string) => void;
  onToggleProject: (rootPath: string) => void;
  onToggleProjectSection: (rootPath: string, section: CodingProjectSection) => void;
  onOpenSearch: () => void;
  onOpenBoard: () => void;
  onRunBoardAction: (action: CodingProjectBoardAction, item?: CodingProjectBoardItemView) => void;
  onOpenTerminal: () => void;
  onOpenTerminalFresh: () => void;
  onRunTests: () => void;
  onOpenReview: (tabId?: string) => void;
  onApplyAiPatch: () => void;
  onDismissAiPatch: () => void;
  onSetAccessMode: (mode: CodingAccessMode) => void;
  onApprovePendingCommand: () => void;
  onCancelPendingCommand: () => void;
  onRunCommand: () => void;
  onSendChat: () => void;
  onAnswerClarification: (answer: CodingClarificationAnswer) => void;
  onDismissClarification: (question: CodingClarificationQuestion) => void;
  onStopRun: () => void;
  onRetryRun: () => void;
  onUseShorterPrompt: () => void;
  onCheckAiSetup: () => void;
  onOpenBrowserTestWorkspace: () => void;
  onSubmitBrowserFeedback: () => void;
  onSetActiveTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onUpdateFileContent: (tabId: string, content: string) => void;
  onRefreshRepo: () => void;
  onOpenSettings: () => void;
};

type ProgressState = "idle" | "running" | "done" | "blocked";
type WorkTraceEntry =
  | {
      id: string;
      kind: "note";
      text: string;
    }
  | {
      id: string;
      kind: "meta";
      text: string;
      detail: string;
      icon: "command" | "edit" | "check";
      state: ProgressState;
    };

export function CodingWorkspaceRebuild({
  assistantUserName,
  snapshot,
  activeProject,
  activeTab,
  activeTextTab,
  tabs,
  textTabs,
  visibleProjects,
  orderedProjects,
  chatsByProject,
  activeChat,
  projectSearch,
  setProjectSearch,
  openFolders,
  collapsedProjects,
  collapsedProjectSections,
  recentCodeItems,
  boardColumns,
  codingSection,
  setCodingSection,
  assistantPanelMode,
  setAssistantPanelMode,
  busy,
  status,
  runStatus,
  runHeartbeat,
  runTimeout,
  lastRunPrompt,
  commandDraft,
  setCommandDraft,
  terminalOpening,
  terminalText,
  pendingCommand,
  commandHistory,
  reviewChangedCount,
  reviewAddedCount,
  reviewRemovedCount,
  branchLabel,
  testsLabel,
  agentPlan,
  agentRun,
  clarificationQuestion,
  draftMessage,
  setDraftMessage,
  browserFeedbackDraft,
  setBrowserFeedbackDraft,
  clickSuggestMode,
  setClickSuggestMode,
  activeDiff,
  aiPatch,
  onOpenProject,
  onCreateProject,
  onOpenPicker,
  onOpenNode,
  onOpenPath,
  onSelectProject,
  onStartNewChat,
  onOpenExistingChat,
  onArchiveChat,
  onToggleProject,
  onToggleProjectSection,
  onOpenSearch,
  onOpenBoard,
  onRunBoardAction,
  onOpenTerminal,
  onOpenTerminalFresh,
  onRunTests,
  onOpenReview,
  onApplyAiPatch,
  onDismissAiPatch,
  onSetAccessMode,
  onApprovePendingCommand,
  onCancelPendingCommand,
  onRunCommand,
  onSendChat,
  onAnswerClarification,
  onDismissClarification,
  onStopRun,
  onRetryRun,
  onUseShorterPrompt,
  onCheckAiSetup,
  onOpenBrowserTestWorkspace,
  onSubmitBrowserFeedback,
  onSetActiveTab,
  onCloseTab,
  onUpdateFileContent,
  onRefreshRepo,
  onOpenSettings
}: CodingWorkspaceRebuildProps): JSX.Element {
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const isDarkTheme = typeof document !== "undefined" && document.documentElement.dataset.theme === "dark";
  const monacoTheme = isDarkTheme ? "vs-dark" : "light";
  const hasDiff = Boolean(activeDiff?.changed || aiPatch?.status === "pending" || reviewChangedCount > 0);
  const activeContent = activeTextTab ? activeTextTab.content ?? activeTextTab.file.content : "";
  const activeBaseline = activeTextTab ? activeTextTab.baseContent ?? activeTextTab.file.content : "";
  const activeLanguage = getMonacoLanguage(activeTextTab?.file.language || activeTextTab?.title || activeTab.title);
  const projectCount = Math.max(orderedProjects.length, visibleProjects.length);
  const visibleChats = activeProject ? chatsByProject.get(activeProject.rootPath) ?? [] : [];
  const query = projectSearch.trim().toLowerCase();
  const progressSteps = useMemo(
    () => buildProgressSteps({ busy, runStatus, runHeartbeat, runTimeout, agentPlan, agentRun, activeDiff, aiPatch, commandHistory, pendingCommand }),
    [activeDiff, agentPlan, agentRun, aiPatch, busy, commandHistory, pendingCommand, runHeartbeat, runStatus, runTimeout]
  );
  const compactProgressRows = useMemo(() => buildCompactProgressRows(progressSteps), [progressSteps]);
  const workTraceEntries = useMemo(
    () =>
      buildWorkTraceEntries({
        activeProject,
        activeTextTab,
        progressRows: compactProgressRows,
        busy,
        runStatus,
        runHeartbeat,
        runTimeout,
        agentPlan,
        agentRun,
        activeDiff,
        aiPatch,
        commandHistory,
        pendingCommand,
        reviewChangedCount,
        reviewAddedCount,
        reviewRemovedCount
      }),
    [
      activeDiff,
      activeProject,
      activeTextTab,
      agentPlan,
      agentRun,
      aiPatch,
      busy,
      commandHistory,
      compactProgressRows,
      pendingCommand,
      reviewAddedCount,
      reviewChangedCount,
      reviewRemovedCount,
      runHeartbeat,
      runStatus,
      runTimeout
    ]
  );

  function runCommandSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    onRunCommand();
  }

  function sendChatSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    onSendChat();
  }

  function openSearch(): void {
    setCodingSection("search");
    onOpenSearch();
    window.requestAnimationFrame(() => searchInputRef.current?.focus());
  }

  return (
    <section className={`coding-rebuild-page coding-assistant-${assistantPanelMode}`} aria-labelledby="coding-rebuild-heading">
      <nav className="coding-rebuild-rail" aria-label="Coding workspace tools">
        <button
          className={codingSection === "files" ? "active" : ""}
          type="button"
          aria-label="Show projects and files"
          title="Projects"
          onClick={() => setCodingSection("files")}
        >
          <FolderOpen size={18} aria-hidden="true" />
          <span>Projects</span>
        </button>
        <button
          className={codingSection === "search" ? "active" : ""}
          type="button"
          aria-label="Search files, chats, symbols, and board tasks"
          title="Search"
          onClick={openSearch}
        >
          <Search size={18} aria-hidden="true" />
          <span>Search</span>
        </button>
        <button
          className={codingSection === "board" ? "active" : ""}
          type="button"
          aria-label="Open project board"
          title="Project Board"
          onClick={onOpenBoard}
        >
          <LayoutDashboard size={18} aria-hidden="true" />
          <span>Board</span>
        </button>
        <button
          className={codingSection === "terminal" ? "active" : ""}
          type="button"
          aria-label="Open terminal"
          title="Terminal"
          onClick={onOpenTerminal}
        >
          <Terminal size={18} aria-hidden="true" />
          <span>Terminal</span>
        </button>
        <button
          className={codingSection === "browser" ? "active" : ""}
          type="button"
          aria-label="Open Browser Test"
          title={activeProject ? "Open Browser Test" : "Open a project before Browser Test"}
          disabled={!activeProject}
          onClick={onOpenBrowserTestWorkspace}
        >
          <Play size={18} aria-hidden="true" />
          <span>Browser</span>
        </button>
        <button type="button" aria-label="Coding settings" title="Settings" onClick={onOpenSettings}>
          <Settings size={18} aria-hidden="true" />
          <span>Settings</span>
        </button>
      </nav>

      <aside className="coding-rebuild-project-pane" aria-label="Coding projects, chats, and files">
        <header className="coding-rebuild-pane-header">
          <div>
            <p className="panel-kicker">Coding</p>
            <h2 id="coding-rebuild-heading">Projects</h2>
          </div>
          <div className="coding-rebuild-header-actions">
            <button type="button" aria-label="Open local project" title="Open project" disabled={busy} onClick={onOpenProject}>
              <FolderOpen size={15} aria-hidden="true" />
            </button>
            <button type="button" aria-label="Create new coding project" title="New project" disabled={busy} onClick={onCreateProject}>
              <Plus size={15} aria-hidden="true" />
            </button>
          </div>
        </header>

        <label className="coding-rebuild-search">
          <Search size={14} aria-hidden="true" />
          <input
            ref={searchInputRef}
            value={projectSearch}
            onChange={(event) => setProjectSearch(event.target.value)}
            placeholder="Search files, chats, symbols..."
            aria-label="Search files, chats, symbols, and board tasks"
          />
          {projectSearch && (
            <button type="button" aria-label="Clear coding search" onClick={() => setProjectSearch("")}>
              <X size={13} aria-hidden="true" />
            </button>
          )}
        </label>

        <div className="coding-rebuild-pane-tabs" role="tablist" aria-label="Project pane sections">
          <button className={codingSection === "files" ? "active" : ""} type="button" role="tab" aria-selected={codingSection === "files"} onClick={() => setCodingSection("files")}>
            Files
          </button>
          <button className={codingSection === "search" ? "active" : ""} type="button" role="tab" aria-selected={codingSection === "search"} onClick={openSearch}>
            Search
          </button>
          <button className={codingSection === "board" ? "active" : ""} type="button" role="tab" aria-selected={codingSection === "board"} onClick={onOpenBoard}>
            Board
          </button>
        </div>

        {codingSection === "search" ? (
          <SearchPanel
            query={query}
            projects={orderedProjects}
            chats={visibleChats}
            recentCodeItems={recentCodeItems}
            boardColumns={boardColumns}
            onOpenPath={onOpenPath}
            onOpenChat={onOpenExistingChat}
            onOpenBoard={onOpenBoard}
          />
        ) : (
          <div className="coding-rebuild-project-list" aria-label={`${projectCount} coding projects`}>
            {orderedProjects.length === 0 ? (
              <div className="coding-rebuild-empty-card">
                <FolderOpen size={20} aria-hidden="true" />
                <strong>No project open</strong>
                <p>Open a local folder so Autopilot can inspect files, generate patches, run approved commands, and show diffs.</p>
                <button type="button" onClick={onOpenProject}>Open project</button>
              </div>
            ) : (
              orderedProjects.map((project, index) => {
                const isActive = activeProject?.rootPath === project.rootPath;
                const isCollapsed = collapsedProjects[project.rootPath] ?? !isActive;
                const projectChats = chatsByProject.get(project.rootPath) ?? [];
                const chatCollapsed = Boolean(collapsedProjectSections[project.rootPath]?.chats);
                const filesCollapsed = Boolean(collapsedProjectSections[project.rootPath]?.code);
                const fileCount = isActive && snapshot.tree ? countTreeFiles(snapshot.tree) : 0;
                const projectMatches = !query || project.name.toLowerCase().includes(query) || project.rootPath.toLowerCase().includes(query);
                if (!projectMatches && query && !projectChats.some((chat) => chat.title.toLowerCase().includes(query))) {
                  return null;
                }

                return (
                  <article className={`coding-rebuild-project-card ${isActive ? "active" : ""} ${isCollapsed ? "collapsed" : "expanded"}`} key={project.rootPath}>
                    <header className="coding-rebuild-project-row">
                      <button
                        className="coding-rebuild-project-caret"
                        type="button"
                        onClick={() => onToggleProject(project.rootPath)}
                        aria-label={`${isCollapsed ? "Expand" : "Collapse"} ${project.name}`}
                      >
                        {isCollapsed ? <ChevronRight size={15} aria-hidden="true" /> : <ChevronDown size={15} aria-hidden="true" />}
                      </button>
                      <button
                        className="coding-rebuild-project-main"
                        type="button"
                        onClick={() => onSelectProject(project.rootPath)}
                        aria-label={`Select ${project.name}`}
                      >
                        <span className="coding-rebuild-project-dot" style={{ "--project-accent": getProjectAccent(index) } as CSSProperties} />
                        <span>
                          <strong>{project.name}</strong>
                          <small className="coding-rebuild-project-meta">
                            <span>{isActive ? "active" : "recent"}</span>
                            <span>{projectChats.length} chat{projectChats.length === 1 ? "" : "s"}</span>
                            {isActive && <span>{fileCount} file{fileCount === 1 ? "" : "s"}</span>}
                            {isActive && <span>{snapshot.accessMode === "full" ? "full access" : "asks first"}</span>}
                          </small>
                        </span>
                      </button>
                      <button type="button" aria-label={`Start chat in ${project.name}`} title="New chat" onClick={() => onStartNewChat(project)}>
                        <MessageCircle size={14} aria-hidden="true" />
                      </button>
                    </header>

                    {!isCollapsed && (
                      <div className="coding-rebuild-project-sections">
                        <ProjectSectionHeader
                          title="Chats"
                          count={projectChats.length}
                          collapsed={chatCollapsed}
                          onToggle={() => onToggleProjectSection(project.rootPath, "chats")}
                          onAdd={() => onStartNewChat(project)}
                        />
                        {!chatCollapsed && (
                          <div className="coding-rebuild-chat-list">
                            {projectChats.length === 0 ? (
                              <p className="coding-rebuild-muted-line">No chats in this project.</p>
                            ) : (
                              projectChats.slice(0, 6).map((chat) => (
                                <div className={`coding-rebuild-chat-row ${activeChat?.id === chat.id ? "active" : ""}`} key={chat.id}>
                                  <button type="button" onClick={() => onOpenExistingChat(chat)} title={chat.title}>
                                    <MessageCircle size={13} aria-hidden="true" />
                                    <span>{chat.title}</span>
                                    <small>{formatRelativeTime(chat.updatedAt)}</small>
                                  </button>
                                  <button type="button" aria-label={`Archive ${chat.title}`} title="Archive chat" onClick={() => onArchiveChat(chat.id)}>
                                    <X size={12} aria-hidden="true" />
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                        )}

                        <ProjectSectionHeader
                          title="Files"
                          count={fileCount}
                          collapsed={filesCollapsed}
                          onToggle={() => onToggleProjectSection(project.rootPath, "code")}
                          onAdd={onOpenPicker}
                        />
                        {!filesCollapsed && (
                          <div className="coding-rebuild-tree-shell">
                            {isActive && snapshot.tree ? (
                              <CodingTree
                                activePath={activeTextTab?.file.path ?? activeTab.path ?? null}
                                node={snapshot.tree}
                                openFolders={openFolders}
                                onOpen={onOpenNode}
                              />
                            ) : (
                              <button className="coding-rebuild-open-project-row" type="button" onClick={() => onSelectProject(project.rootPath)}>
                                Open project to load files
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                );
              })
            )}
          </div>
        )}
      </aside>

      <main className="coding-rebuild-center" aria-label="Coding editor and review workspace">
        {codingSection === "board" ? (
          <ProjectBoard
            columns={boardColumns}
            onRunBoardAction={onRunBoardAction}
            onOpenProject={onOpenProject}
          />
        ) : (
          <>
            <header className="coding-rebuild-editor-toolbar">
              <div className="coding-rebuild-breadcrumbs">
                {activeProject ? (
                  <>
                    <span>{activeProject.name}</span>
                    <ChevronRight size={13} aria-hidden="true" />
                    <strong>{activeTextTab?.file.relativePath ?? activeTab.title}</strong>
                  </>
                ) : null}
              </div>
              <div className="coding-rebuild-editor-actions">
                <span className="coding-rebuild-status-pill"><GitBranch size={13} aria-hidden="true" />{branchLabel}</span>
                <span className={`coding-rebuild-status-pill ${testsLabel === "Tests passing" ? "good" : ""}`}><Check size={13} aria-hidden="true" />{testsLabel}</span>
                <button type="button" disabled={!activeProject} title={activeProject ? "Run test command" : "Open a project before running tests"} onClick={onRunTests}>
                  <TestTube2 size={14} aria-hidden="true" /> Run test
                </button>
                <button type="button" disabled={!activeProject} title={activeProject ? "Open Browser Test in Autopilot Browser" : "Open a project before Browser Test"} onClick={onOpenBrowserTestWorkspace}>
                  <Play size={14} aria-hidden="true" /> Browser Test
                </button>
                <button type="button" onClick={onOpenTerminal}>
                  <Terminal size={14} aria-hidden="true" /> Terminal
                </button>
                <button type="button" disabled={!hasDiff} title={hasDiff ? "Review current diff" : "No diff is ready yet"} onClick={() => onOpenReview(activeTextTab?.id)}>
                  <SplitSquareHorizontal size={14} aria-hidden="true" /> Review diff
                </button>
              </div>
            </header>

            <div className="coding-rebuild-tabs" role="tablist" aria-label="Open files">
              {textTabs.length === 0 ? (
                <button className="active" type="button" role="tab" aria-selected="true" onClick={onOpenPicker}>
                  <FileText size={14} aria-hidden="true" />
                  welcome.ts
                </button>
              ) : (
                textTabs.slice(-8).map((tab) => (
                  <button
                    className={tab.id === activeTab.id ? "active" : ""}
                    type="button"
                    role="tab"
                    aria-selected={tab.id === activeTab.id}
                    key={tab.id}
                    onClick={() => onSetActiveTab(tab.id)}
                    title={tab.file.relativePath}
                  >
                    <FileText size={14} aria-hidden="true" />
                    <span>{tab.title}</span>
                    {tab.dirty && <b aria-label="Unsaved changes" />}
                    {tabs.length > 1 && (
                      <span
                        role="button"
                        tabIndex={0}
                        aria-label={`Close ${tab.title}`}
                        className="coding-rebuild-tab-close"
                        onClick={(event) => {
                          event.stopPropagation();
                          onCloseTab(tab.id);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            event.stopPropagation();
                            onCloseTab(tab.id);
                          }
                        }}
                      >
                        <X size={12} aria-hidden="true" />
                      </span>
                    )}
                  </button>
                ))
              )}
              <button type="button" aria-label="Open file" title="Open file" onClick={onOpenPicker}>
                <Plus size={15} aria-hidden="true" />
              </button>
            </div>

            <section className="coding-rebuild-editor-shell" aria-label="Code editor">
              {activeTextTab ? (
                <Suspense fallback={<EditorLoading label="Loading Monaco editor..." />}>
                  <MonacoEditor
                    height="100%"
                    language={activeLanguage}
                    path={activeTextTab.file.path}
                    theme={monacoTheme}
                    value={activeContent}
                    onChange={(value) => onUpdateFileContent(activeTextTab.id, value ?? "")}
                    options={{
                      automaticLayout: true,
                      fontSize: 13,
                      lineHeight: 21,
                      minimap: { enabled: true },
                      scrollBeyondLastLine: false,
                      wordWrap: "on",
                      tabSize: 2,
                      padding: { top: 18, bottom: 18 }
                    }}
                  />
                </Suspense>
              ) : (
                <EditorEmptyState
                  activeProject={activeProject}
                  recentCodeItems={recentCodeItems}
                  onOpenProject={onOpenProject}
                  onOpenPicker={onOpenPicker}
                  onOpenPath={onOpenPath}
                />
              )}
            </section>

            <footer className="coding-rebuild-editor-footer">
              <span className={activeTextTab?.dirty ? "saving" : "saved"}>
                {activeTextTab ? (activeTextTab.dirty ? "Saving..." : `Autosaved ${formatRelativeTime(activeTextTab.savedAt ?? activeTextTab.file.modifiedAt)}`) : "Autosave ready"}
              </span>
              <span>{activeTextTab ? activeTextTab.file.relativePath : "Open a file to edit"}</span>
              <span>{activeLanguage}</span>
              <button type="button" onClick={onRefreshRepo}>Refresh repo</button>
            </footer>

            {activeDiff?.changed && activeTextTab && (
              <section className="coding-rebuild-diff-panel" aria-label="Diff preview">
                <header>
                  <div>
                    <p className="panel-kicker">Diff preview</p>
                    <h3>{activeTextTab.file.relativePath}</h3>
                  </div>
                  <span>+{activeDiff.added} -{activeDiff.removed}</span>
                </header>
                <Suspense fallback={<EditorLoading label="Loading diff..." />}>
                  <MonacoDiffEditor
                    height="260px"
                    language={activeLanguage}
                    original={activeBaseline}
                    modified={activeContent}
                    theme={monacoTheme}
                    options={{
                      automaticLayout: true,
                      readOnly: true,
                      renderSideBySide: false,
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false
                    }}
                  />
                </Suspense>
              </section>
            )}
          </>
        )}

        {codingSection === "terminal" && (
          <TerminalDrawer
            activeProject={activeProject}
            opening={terminalOpening}
            terminalText={terminalText}
            commandDraft={commandDraft}
            setCommandDraft={setCommandDraft}
            pendingCommand={pendingCommand}
            commandHistory={commandHistory}
            onClose={() => setCodingSection("files")}
            onOpenFresh={onOpenTerminalFresh}
            onRunCommandSubmit={runCommandSubmit}
            onApprovePendingCommand={onApprovePendingCommand}
            onCancelPendingCommand={onCancelPendingCommand}
          />
        )}
      </main>

      <aside className="coding-rebuild-ai-panel" aria-label="AI coding assistant">
        <header className="coding-rebuild-ai-header">
          <div>
            <p className="panel-kicker">AI Assistant</p>
            <h2>Ready when you are, {assistantUserName}</h2>
          </div>
          <div className="coding-rebuild-ai-mode-actions">
            <button
              type="button"
              aria-label="Normal AI panel"
              title="Normal panel"
              className={assistantPanelMode === "normal" ? "active" : ""}
              onClick={() => setAssistantPanelMode("normal")}
            >
              <Columns3 size={14} aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Wide AI panel"
              title="Wide panel"
              className={assistantPanelMode === "wide" ? "active" : ""}
              onClick={() => setAssistantPanelMode((mode) => (mode === "wide" ? "normal" : "wide"))}
            >
              <Maximize2 size={14} aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Full screen AI focus"
              title="Focus panel"
              className={assistantPanelMode === "focus" ? "active" : ""}
              onClick={() => setAssistantPanelMode((mode) => (mode === "focus" ? "normal" : "focus"))}
            >
              {assistantPanelMode === "focus" ? <Minimize2 size={14} aria-hidden="true" /> : <Bot size={14} aria-hidden="true" />}
            </button>
          </div>
        </header>

        <div className="coding-rebuild-context-chips" aria-label="Coding context">
          <span>{activeProject?.name ?? "No project"}</span>
          <span>{activeTextTab?.file.relativePath ?? "No file open"}</span>
          <span>Leader GPT-5.5</span>
          <button type="button" className={snapshot.accessMode === "full" ? "active" : ""} onClick={() => onSetAccessMode(snapshot.accessMode === "full" ? "ask" : "full")}>
            {snapshot.accessMode === "full" ? "Full access" : "Ask before commands"}
          </button>
        </div>

        <section className="coding-rebuild-work-trace" aria-label="Agent work trace" aria-live="polite">
          <header>
            <div>
              <strong>Work trace</strong>
              <small>{formatRunStatusLabel(runStatus)}{runHeartbeat ? ` - ${formatRelativeTime(runHeartbeat.updatedAt)}` : ""}</small>
            </div>
            {busy ? (
              <button className="danger" type="button" onClick={onStopRun}>
                <Square size={13} aria-hidden="true" /> Stop
              </button>
            ) : (
              <span>{formatRunStatusLabel(runStatus)}</span>
            )}
          </header>
          <div className="coding-rebuild-work-trace-feed">
            {workTraceEntries.map((entry) =>
              entry.kind === "note" ? (
                <p className="coding-rebuild-work-trace-note" key={entry.id}>{entry.text}</p>
              ) : (
                <div className={`coding-rebuild-work-trace-meta ${entry.state}`} key={entry.id} title={entry.detail}>
                  {entry.icon === "edit" ? (
                    <Code2 size={13} aria-hidden="true" />
                  ) : entry.icon === "check" ? (
                    <Check size={13} aria-hidden="true" />
                  ) : (
                    <Terminal size={13} aria-hidden="true" />
                  )}
                  <span>{entry.text}</span>
                </div>
              )
            )}
          </div>
          {runTimeout && (
            <div className="coding-rebuild-run-recovery" role="group" aria-label="Coding run recovery actions">
              <p>{runTimeout.reason}</p>
              <div>
                <button type="button" disabled={!lastRunPrompt.trim()} title={lastRunPrompt.trim() ? "Retry the previous coding prompt" : "No previous prompt to retry"} onClick={onRetryRun}>
                  Retry
                </button>
                <button type="button" disabled={!lastRunPrompt.trim()} title={lastRunPrompt.trim() ? "Prepare a smaller version of the previous prompt" : "No previous prompt to shorten"} onClick={onUseShorterPrompt}>
                  Send shorter prompt
                </button>
                <button type="button" onClick={onCheckAiSetup}>
                  Check AI setup
                </button>
              </div>
            </div>
          )}
        </section>

        <details className="coding-rebuild-model-card" aria-label="Multi-model workflow">
          <summary>
            <strong>Models</strong>
            <span>AiGateway</span>
          </summary>
          <header>
            <strong>Multi-model workflow</strong>
            <span>AiGateway</span>
          </header>
          <div>
            <b>Translator</b><span>GPT-5.4 mini</span>
            <b>Leader</b><span>GPT-5.5</span>
            <b>Builder</b><span>GPT-5.5</span>
            <b>Reviewer</b><span>GPT-5.4 to GPT-5.5</span>
          </div>
        </details>

        <section className="coding-rebuild-ai-chat" aria-label="AI conversation">
          {activeChat?.messages.length ? (
            activeChat.messages.slice(-8).map((message) => (
              <article className={`coding-rebuild-chat-message ${message.role === "agent" ? "agent openai-response" : "user"}`} key={message.id}>
                <header>
                  <span>{message.role === "agent" ? "Autopilot" : "You"}</span>
                  <time>{formatRelativeTime(message.createdAt)}</time>
                </header>
                <OpenAiStyleContent content={message.content} />
              </article>
            ))
          ) : (
            <div className="coding-rebuild-ai-empty">
              <Zap size={28} aria-hidden="true" />
              <strong>Hello, {assistantUserName}</strong>
              <p>I can inspect files, generate code, run approved commands, test, and show diffs before anything is applied.</p>
              <div>
                <button type="button" onClick={() => setDraftMessage("Build a small feature, inspect the files first, then show me the diff.")}>
                  Build a feature
                </button>
                <button type="button" onClick={() => setDraftMessage("Review this project and tell me the safest next coding task.")}>
                  Review project
                </button>
              </div>
            </div>
          )}
        </section>

        {aiPatch && aiPatch.status !== "dismissed" && (
          <section className={`coding-rebuild-patch-card ${aiPatch.status}`} aria-label="AI patch proposal">
            <header>
              <div>
                <p className="panel-kicker">Generated patch</p>
                <h3>{aiPatch.relativePath}</h3>
              </div>
              <span>+ pending</span>
            </header>
            <p>{aiPatch.explanation}</p>
            <div>
              <button type="button" disabled={aiPatch.status !== "pending"} title={aiPatch.status === "pending" ? "Apply generated edit to the editor" : "Patch already applied"} onClick={onApplyAiPatch}>
                Apply edits
              </button>
              <button type="button" onClick={() => onOpenReview(aiPatch.tabId)}>Review diff</button>
              <button type="button" onClick={onDismissAiPatch}>Reject</button>
            </div>
          </section>
        )}

        {hasDiff && (
          <section className="coding-rebuild-review-card" aria-label="Review controls">
            <header>
              <strong>Review</strong>
              <span>{reviewChangedCount} changed</span>
            </header>
            <p>+{reviewAddedCount} / -{reviewRemovedCount}. Edits stay reviewable until you apply or reject them.</p>
            <div>
              <button type="button" title="Review changed files" onClick={() => onOpenReview(activeTextTab?.id)}>
                Review diff
              </button>
              <button type="button" disabled={aiPatch?.status !== "pending"} title={aiPatch?.status === "pending" ? "Apply pending AI patch" : "No pending AI patch"} onClick={onApplyAiPatch}>
                Apply edits
              </button>
            </div>
          </section>
        )}

        {codingSection === "browser" && (
          <section className="coding-rebuild-browser-feedback" aria-label="Browser Test feedback">
            <header>
              <strong>Browser Test feedback</strong>
              <button type="button" className={clickSuggestMode ? "active" : ""} onClick={() => setClickSuggestMode((enabled) => !enabled)}>
                Click-to-suggest
              </button>
            </header>
            <textarea
              value={browserFeedbackDraft}
              onChange={(event) => setBrowserFeedbackDraft(event.target.value)}
              placeholder="What should the coding agent revise after you test the app?"
              aria-label="Browser Test feedback"
            />
            <button type="button" onClick={onSubmitBrowserFeedback}>Send to Coding</button>
          </section>
        )}

        {clarificationQuestion && (
          <CodingClarificationCard
            question={clarificationQuestion}
            onAnswer={onAnswerClarification}
            onDismiss={onDismissClarification}
          />
        )}

        <form className="coding-rebuild-ai-composer" onSubmit={sendChatSubmit}>
          <textarea
            value={draftMessage}
            onChange={(event) => setDraftMessage(event.target.value)}
            placeholder="Ask Autopilot to inspect, edit, test, automate, or explain this project..."
            aria-label="Ask the coding assistant"
            rows={4}
          />
          <div>
            <span>{status}</span>
            <button type="submit" disabled={busy || !draftMessage.trim()} title={!activeProject ? "Open a project before code edits. General chat still records context." : "Send to the coding agent"}>
              {busy ? <Square size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}
              {busy ? "Working" : "Send"}
            </button>
          </div>
        </form>
      </aside>
    </section>
  );
}

type CodingClarificationCardProps = {
  question: CodingClarificationQuestion;
  onAnswer: (answer: CodingClarificationAnswer) => void;
  onDismiss: (question: CodingClarificationQuestion) => void;
};

function CodingClarificationCard({ question, onAnswer, onDismiss }: CodingClarificationCardProps): JSX.Element {
  const initialOptionId = question.defaultOptionId || question.options[0]?.id || "";
  const [selectedOptionId, setSelectedOptionId] = useState(initialOptionId);
  const [customText, setCustomText] = useState("");
  const selectedOption = question.options.find((option) => option.id === selectedOptionId) ?? question.options[0];
  const customSelected = Boolean(selectedOption?.custom);
  const canContinue = Boolean(selectedOption && (!customSelected || customText.trim()));

  useEffect(() => {
    setSelectedOptionId(question.defaultOptionId || question.options[0]?.id || "");
    setCustomText("");
  }, [question.defaultOptionId, question.id, question.options]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        if (event.key !== "Escape") {
          return;
        }
      }

      const selectedIndex = Math.max(0, question.options.findIndex((option) => option.id === selectedOptionId));
      if (/^[1-9]$/u.test(event.key)) {
        const option = question.options[Number(event.key) - 1];
        if (option) {
          event.preventDefault();
          setSelectedOptionId(option.id);
        }
        return;
      }

      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const direction = event.key === "ArrowDown" ? 1 : -1;
        const nextIndex = (selectedIndex + direction + question.options.length) % question.options.length;
        setSelectedOptionId(question.options[nextIndex]?.id ?? selectedOptionId);
        return;
      }

      if (event.key === "Enter" && canContinue) {
        event.preventDefault();
        submitAnswer();
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        onDismiss(question);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canContinue, onDismiss, question, selectedOptionId]);

  function submitAnswer(optionOverride?: CodingClarificationQuestion["options"][number]): void {
    const option = optionOverride ?? selectedOption;
    if (!option) {
      return;
    }
    const answerText = option.custom ? customText.trim() : option.label;
    if (!answerText) {
      return;
    }
    onAnswer({
      questionId: question.id,
      optionId: option.id,
      answerText,
      customText: option.custom ? customText.trim() : undefined,
      answeredAt: Date.now()
    });
  }

  return (
    <section className="coding-clarification-card" aria-label="Coding clarification question">
      <header>
        <strong>{question.prompt}</strong>
        <span>{question.currentIndex} of {question.total}</span>
      </header>
      <div className="coding-clarification-options" role="radiogroup" aria-label="Clarification answers">
        {question.options.map((option, index) => {
          const selected = option.id === selectedOptionId;
          return (
            <button
              type="button"
              role="radio"
              aria-checked={selected}
              className={`coding-clarification-option ${selected ? "selected" : ""}`}
              key={option.id}
              title={option.detail}
              onClick={() => setSelectedOptionId(option.id)}
              onDoubleClick={() => submitAnswer(option)}
            >
              <span className="coding-clarification-number">{index + 1}.</span>
              <span className="coding-clarification-label">
                <strong>{option.label}</strong>
                {option.recommended && <em>Recommended</em>}
              </span>
              <Info size={13} aria-hidden="true" />
            </button>
          );
        })}
      </div>
      {customSelected && (
        <label className="coding-clarification-custom">
          <span>Tell Autopilot what to do differently</span>
          <textarea
            value={customText}
            onChange={(event) => setCustomText(event.target.value)}
            placeholder="Example: use React + Vite, keep it single-page, and make the UI bright."
            rows={3}
          />
        </label>
      )}
      <footer>
        <button type="button" onClick={() => onDismiss(question)}>Dismiss <kbd>Esc</kbd></button>
        <button type="button" className="primary" disabled={!canContinue} onClick={() => submitAnswer()}>
          Continue
        </button>
      </footer>
    </section>
  );
}

type ProjectSectionHeaderProps = {
  title: string;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
  onAdd: () => void;
};

function ProjectSectionHeader({ title, count, collapsed, onToggle, onAdd }: ProjectSectionHeaderProps): JSX.Element {
  return (
    <header className="coding-rebuild-section-header">
      <button type="button" onClick={onToggle} aria-label={`${collapsed ? "Expand" : "Collapse"} ${title}`}>
        {collapsed ? <ChevronRight size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
        <span>{title}</span>
        <b>{count}</b>
      </button>
      <button type="button" onClick={onAdd} aria-label={`Add ${title.toLowerCase()}`}>
        <Plus size={13} aria-hidden="true" />
      </button>
    </header>
  );
}

type SearchPanelProps = {
  query: string;
  projects: CodingProject[];
  chats: CodingChatThreadView[];
  recentCodeItems: CodingRecentCodeItemView[];
  boardColumns: CodingProjectBoardColumnView[];
  onOpenPath: (path: string) => void;
  onOpenChat: (chat: CodingChatThreadView) => void;
  onOpenBoard: () => void;
};

function SearchPanel({ query, projects, chats, recentCodeItems, boardColumns, onOpenPath, onOpenChat, onOpenBoard }: SearchPanelProps): JSX.Element {
  const fileResults = recentCodeItems.filter((item) => matchesQuery(query, `${item.title} ${item.detail} ${item.path}`)).slice(0, 8);
  const chatResults = chats.filter((chat) => matchesQuery(query, `${chat.title} ${chat.messages.map((message) => message.content).join(" ")}`)).slice(0, 6);
  const boardResults = boardColumns.flatMap((column) => column.items.map((item) => ({ ...item, column: column.title }))).filter((item) => matchesQuery(query, `${item.title} ${item.detail} ${item.meta}`)).slice(0, 6);
  const projectResults = projects.filter((project) => matchesQuery(query, `${project.name} ${project.rootPath}`)).slice(0, 6);
  const hasQuery = query.length > 0;

  if (!hasQuery) {
    return (
      <div className="coding-rebuild-empty-card">
        <Search size={20} aria-hidden="true" />
        <strong>Search across this coding workspace</strong>
        <p>Find files, chats, symbols, and board tasks without opening extra panels.</p>
      </div>
    );
  }

  return (
    <div className="coding-rebuild-search-results">
      <SearchResultGroup title="Files" emptyText="No matching files.">
        {fileResults.map((item) => (
          <button type="button" key={item.id} onClick={() => onOpenPath(item.path)}>
            <FileText size={14} aria-hidden="true" />
            <span>{item.title}<small>{item.detail}</small></span>
          </button>
        ))}
      </SearchResultGroup>
      <SearchResultGroup title="Chats" emptyText="No matching chats.">
        {chatResults.map((chat) => (
          <button type="button" key={chat.id} onClick={() => onOpenChat(chat)}>
            <MessageCircle size={14} aria-hidden="true" />
            <span>{chat.title}<small>{formatRelativeTime(chat.updatedAt)}</small></span>
          </button>
        ))}
      </SearchResultGroup>
      <SearchResultGroup title="Board" emptyText="No matching tasks.">
        {boardResults.map((item) => (
          <button type="button" key={item.id} onClick={onOpenBoard}>
            <LayoutDashboard size={14} aria-hidden="true" />
            <span>{item.title}<small>{item.column} - {item.meta}</small></span>
          </button>
        ))}
      </SearchResultGroup>
      <SearchResultGroup title="Projects" emptyText="No matching projects.">
        {projectResults.map((project) => (
          <button type="button" key={project.rootPath} onClick={() => undefined} disabled title="Open projects from the Projects list">
            <FolderOpen size={14} aria-hidden="true" />
            <span>{project.name}<small>{project.rootPath}</small></span>
          </button>
        ))}
      </SearchResultGroup>
    </div>
  );
}

type SearchResultGroupProps = {
  title: string;
  emptyText: string;
  children: ReactNode;
};

function SearchResultGroup({ title, emptyText, children }: SearchResultGroupProps): JSX.Element {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <section className="coding-rebuild-result-group">
      <h3>{title}</h3>
      {hasChildren ? children : <p>{emptyText}</p>}
    </section>
  );
}

type ProjectBoardProps = {
  columns: CodingProjectBoardColumnView[];
  onRunBoardAction: (action: CodingProjectBoardAction, item?: CodingProjectBoardItemView) => void;
  onOpenProject: () => void;
};

function ProjectBoard({ columns, onRunBoardAction, onOpenProject }: ProjectBoardProps): JSX.Element {
  const tasks = columns.flatMap((column) =>
    column.items.map((item) => ({
      ...item,
      columnTitle: column.title
    }))
  );

  return (
    <section className="coding-rebuild-board" aria-label="Agent queue">
      <header className="coding-rebuild-board-header">
        <div>
          <p className="panel-kicker">Agent Queue</p>
          <h2>Tasks Autopilot can work on</h2>
          <p>Compact coding work queue. Start, review, or apply only after the diff and proof are ready.</p>
        </div>
        <button type="button" onClick={onOpenProject}>Open project</button>
      </header>
      <div className="coding-rebuild-agent-queue">
        {tasks.map((item) => (
          <article className={`coding-rebuild-agent-queue-row ${item.status}`} key={item.id}>
            <span className="coding-rebuild-agent-status-dot" aria-hidden="true" />
            <div>
              <strong>{item.title}</strong>
              <small>{item.detail}</small>
            </div>
            <span>{item.columnTitle}</span>
            <span>{item.branch}</span>
            <span>{item.meta}</span>
            <div className="coding-rebuild-agent-chips" aria-label="Model roles">
              <span>Lead</span>
              <span>Build</span>
              <span>Test</span>
              <span>Review</span>
            </div>
            <button type="button" onClick={() => onRunBoardAction(item.action, item)}>
              {item.actionLabel}
            </button>
          </article>
        ))}
        {tasks.length === 0 && (
          <div className="coding-rebuild-empty-card">
            <LayoutDashboard size={20} aria-hidden="true" />
            <strong>No agent tasks yet</strong>
            <p>Ask Autopilot for a code change, route a Productivity item to Coding, or create a manual task.</p>
          </div>
        )}
      </div>
    </section>
  );
}

type EditorEmptyStateProps = {
  activeProject: CodingProject | null;
  recentCodeItems: CodingRecentCodeItemView[];
  onOpenProject: () => void;
  onOpenPicker: () => void;
  onOpenPath: (path: string) => void;
};

function EditorEmptyState({ activeProject, recentCodeItems, onOpenProject, onOpenPicker, onOpenPath }: EditorEmptyStateProps): JSX.Element {
  return (
    <div className="coding-rebuild-editor-empty">
      <Code2 size={36} aria-hidden="true" />
      <strong>{activeProject ? "Open code from this project" : "Open a project to start"}</strong>
      <p>The editor is ready for real files, syntax highlighting, autosave, diffs, terminal output, and browser testing.</p>
      <div className="coding-rebuild-empty-actions">
        <button type="button" onClick={activeProject ? onOpenPicker : onOpenProject}>
          {activeProject ? "Open file" : "Open project"}
        </button>
      </div>
      {recentCodeItems.length > 0 && (
        <section className="coding-rebuild-recent-files">
          <h3>Recent code</h3>
          {recentCodeItems.slice(0, 6).map((item) => (
            <button type="button" key={item.id} onClick={() => onOpenPath(item.path)}>
              <FileText size={14} aria-hidden="true" />
              <span>{item.title}<small>{item.detail}</small></span>
            </button>
          ))}
        </section>
      )}
    </div>
  );
}

function EditorLoading({ label }: { label: string }): JSX.Element {
  return (
    <div className="coding-rebuild-editor-loading">
      <span />
      <strong>{label}</strong>
    </div>
  );
}

type TerminalDrawerProps = {
  activeProject: CodingProject | null;
  opening: boolean;
  terminalText: string;
  commandDraft: string;
  setCommandDraft: Dispatch<SetStateAction<string>>;
  pendingCommand: CodingCommandRequest | null;
  commandHistory: CodingCommandResult[];
  onClose: () => void;
  onOpenFresh: () => void;
  onRunCommandSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onApprovePendingCommand: () => void;
  onCancelPendingCommand: () => void;
};

function TerminalDrawer({
  activeProject,
  opening,
  terminalText,
  commandDraft,
  setCommandDraft,
  pendingCommand,
  commandHistory,
  onClose,
  onOpenFresh,
  onRunCommandSubmit,
  onApprovePendingCommand,
  onCancelPendingCommand
}: TerminalDrawerProps): JSX.Element {
  const lastResult = commandHistory[0];
  return (
    <section className="coding-rebuild-terminal-drawer" aria-label="Terminal drawer">
      <header>
        <div>
          <strong>Terminal</strong>
          <small>{activeProject?.rootPath ?? "Open a project to set the working directory."}</small>
        </div>
        <div>
          <button type="button" onClick={onOpenFresh}>{opening ? "Opening..." : "Open shell"}</button>
          <button type="button" aria-label="Close terminal drawer" onClick={onClose}><X size={15} aria-hidden="true" /></button>
        </div>
      </header>
      {pendingCommand && (
        <div className="coding-rebuild-command-approval">
          <div>
            <strong>Command approval required</strong>
            <code>{pendingCommand.command}</code>
          </div>
          <button type="button" onClick={onApprovePendingCommand}>Approve</button>
          <button type="button" onClick={onCancelPendingCommand}>Cancel</button>
        </div>
      )}
      <pre>{terminalText || formatCommandResult(lastResult) || "Terminal output will appear here."}</pre>
      <form onSubmit={onRunCommandSubmit}>
        <Terminal size={15} aria-hidden="true" />
        <input
          value={commandDraft}
          onChange={(event) => setCommandDraft(event.target.value)}
          placeholder="npm test"
          aria-label="Command to run"
        />
        <button type="submit" disabled={!commandDraft.trim()}>Run with approval</button>
      </form>
    </section>
  );
}

function OpenAiStyleContent({ content }: { content: string }): JSX.Element {
  const blocks = content
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/u)
    .map((block) => block.trim())
    .filter(Boolean);

  if (blocks.length === 0) {
    return <p>No content yet.</p>;
  }

  return (
    <div className="coding-rebuild-openai-content">
      {blocks.map((block, index) => {
        if (/^#{1,4}\s+/u.test(block)) {
          return <h3 key={`${block}-${index}`}>{block.replace(/^#{1,4}\s+/u, "")}</h3>;
        }

        const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
        if (lines.length > 1 && lines.every((line) => /^[-*]\s+/u.test(line) || /^\d+\.\s+/u.test(line))) {
          return (
            <ul key={`${block}-${index}`}>
              {lines.map((line) => (
                <li key={line}>{line.replace(/^[-*]\s+/u, "").replace(/^\d+\.\s+/u, "")}</li>
              ))}
            </ul>
          );
        }

        if (/^```/u.test(block)) {
          return <pre key={`${block}-${index}`}>{block.replace(/^```[a-z]*\n?/iu, "").replace(/\n?```$/u, "")}</pre>;
        }

        return <p key={`${block}-${index}`}>{block}</p>;
      })}
    </div>
  );
}

function buildProgressSteps(input: {
  busy: boolean;
  runStatus: CodingRunStatus;
  runHeartbeat: CodingRunHeartbeat | null;
  runTimeout: CodingRunTimeoutState | null;
  agentPlan: CodingAgentPlan | null;
  agentRun: CodingAgentRun | null;
  activeDiff: CodingDiffResult | null;
  aiPatch: CodingAiFilePatchView | null;
  commandHistory: CodingCommandResult[];
  pendingCommand: CodingCommandRequest | null;
}): Array<{ label: string; detail: string; state: ProgressState }> {
  const hasPlan = Boolean(input.agentPlan);
  const hasRun = Boolean(input.agentRun);
  const hasPatch = Boolean(input.aiPatch?.status === "pending" || input.aiPatch?.status === "applied");
  const hasDiff = Boolean(input.activeDiff?.changed || input.aiPatch?.status === "pending");
  const hasCommand = input.commandHistory.length > 0 || Boolean(input.pendingCommand);
  const waiting = hasDiff || input.agentRun?.approvalState === "needs_review";
  const blocked = input.runStatus === "blocked" || Boolean(input.runTimeout);
  const stopped = input.runStatus === "stopped";
  const heartbeatDetail = input.runHeartbeat?.message;

  return [
    {
      label: "Queued",
      detail: heartbeatDetail && input.runStatus === "queued" ? heartbeatDetail : "Every prompt gets an immediate visible run state.",
      state: input.runStatus === "queued" ? "running" : hasPlan || hasRun || input.runStatus !== "idle" ? "done" : "idle"
    },
    {
      label: "Understanding request",
      detail: heartbeatDetail && input.runStatus === "understanding" ? heartbeatDetail : "Prompt translator uses GPT-5.4 mini before GPT-5.5 builds.",
      state: hasPlan || hasRun || hasPatch ? "done" : input.runStatus === "understanding" ? "running" : blocked || stopped ? "blocked" : "idle"
    },
    {
      label: "Reading files",
      detail: heartbeatDetail && input.runStatus === "reading_files" ? heartbeatDetail : hasRun ? input.agentRun?.understanding ?? "Project context is attached." : "Explorer reads only relevant project files.",
      state: hasRun || hasPlan ? "done" : input.runStatus === "reading_files" ? "running" : "idle"
    },
    {
      label: "Planning",
      detail: heartbeatDetail && input.runStatus === "planning" ? heartbeatDetail : input.agentPlan?.summary ?? "Leader produces a short plan before edits.",
      state: hasPlan ? "done" : input.runStatus === "planning" ? "running" : "idle"
    },
    {
      label: "Editing",
      detail: heartbeatDetail && input.runStatus === "editing" ? heartbeatDetail : hasPatch ? "Builder generated a reviewable patch." : "No file edits are applied without review unless full access is enabled.",
      state: hasPatch ? "done" : input.runStatus === "editing" ? "running" : blocked ? "blocked" : "idle"
    },
    {
      label: "Testing",
      detail: heartbeatDetail && input.runStatus === "testing" ? heartbeatDetail : input.pendingCommand ? "A command is waiting for approval." : hasCommand ? "Latest command result is attached to the run log." : "Run tests when the plan is ready.",
      state: input.pendingCommand ? "blocked" : hasCommand ? "done" : input.runStatus === "testing" ? "running" : "idle"
    },
    {
      label: input.runStatus === "previewing" ? "Previewing" : "Diff ready",
      detail: heartbeatDetail && input.runStatus === "previewing" ? heartbeatDetail : hasDiff ? "Review the red/green diff before applying." : "Changed files will appear here first.",
      state: hasDiff ? "done" : input.runStatus === "previewing" ? "running" : "idle"
    },
    {
      label: "Waiting for approval",
      detail: blocked ? input.runTimeout?.reason ?? "The run is blocked and needs a retry or setup check." : waiting ? "Approve, reject, or revise the output." : stopped ? "Stopped by the user before new work was applied." : "No approval needed yet.",
      state: blocked ? "blocked" : waiting || input.runStatus === "ready_for_review" ? "running" : stopped ? "blocked" : "idle"
    }
  ];
}

function buildCompactProgressRows(steps: Array<{ label: string; detail: string; state: ProgressState }>): Array<{ label: string; detail: string; state: ProgressState }> {
  const groups: Array<{ label: string; sourceLabels: string[] }> = [
    { label: "Reading", sourceLabels: ["Queued", "Understanding request", "Reading files"] },
    { label: "Planning", sourceLabels: ["Planning"] },
    { label: "Editing", sourceLabels: ["Editing"] },
    { label: "Testing", sourceLabels: ["Testing", "Previewing"] },
    { label: "Review", sourceLabels: ["Diff ready", "Waiting for approval"] }
  ];

  return groups.map((group) => {
    const matchingSteps = steps.filter((step) => group.sourceLabels.includes(step.label));
    const state: ProgressState = matchingSteps.some((step) => step.state === "blocked")
      ? "blocked"
      : matchingSteps.some((step) => step.state === "running")
        ? "running"
        : matchingSteps.some((step) => step.state === "done")
          ? "done"
          : "idle";
    const detail = matchingSteps
      .map((step) => `${step.label}: ${step.detail}`)
      .filter(Boolean)
      .join(" | ");
    return {
      label: group.label,
      detail,
      state
    };
  });
}

function buildWorkTraceEntries(input: {
  activeProject: CodingProject | null;
  activeTextTab: CodingTextWorkbenchTabView | null;
  progressRows: Array<{ label: string; detail: string; state: ProgressState }>;
  busy: boolean;
  runStatus: CodingRunStatus;
  runHeartbeat: CodingRunHeartbeat | null;
  runTimeout: CodingRunTimeoutState | null;
  agentPlan: CodingAgentPlan | null;
  agentRun: CodingAgentRun | null;
  activeDiff: CodingDiffResult | null;
  aiPatch: CodingAiFilePatchView | null;
  commandHistory: CodingCommandResult[];
  pendingCommand: CodingCommandRequest | null;
  reviewChangedCount: number;
  reviewAddedCount: number;
  reviewRemovedCount: number;
}): WorkTraceEntry[] {
  const commandCount = input.commandHistory.length;
  const changedFiles = Math.max(
    input.reviewChangedCount,
    input.agentRun?.changedFiles.length ?? 0,
    input.aiPatch ? 1 : 0,
    input.activeDiff?.changed ? 1 : 0
  );
  const runningPhase = input.progressRows.find((row) => row.state === "running")?.label ?? formatRunStatusLabel(input.runStatus);
  const projectLabel = input.activeProject?.name ?? "Coding";
  const goal = trimTraceText(input.agentPlan?.summary || input.agentPlan?.goal || input.agentRun?.understanding || input.runHeartbeat?.message || "");
  const phaseSummary = input.progressRows
    .map((row) => `${row.label}${row.state === "running" ? " now" : row.state === "done" ? " done" : row.state === "blocked" ? " blocked" : ""}`)
    .join(" · ");

  if (!input.busy && input.runStatus === "idle" && !input.agentPlan && !input.agentRun && !input.aiPatch && commandCount === 0) {
    return [
      {
        id: "ready-note",
        kind: "note",
        text: input.activeProject
          ? `I’m ready in ${projectLabel}. Ask me what to build, which files to inspect, or which command to run, and I’ll keep the work tied to files, commands, diffs, and preview proof.`
          : "Open a project first. Once a project is attached, this trace will show short updates, command evidence, file edits, tests, and review state."
      },
      {
        id: "ready-commands",
        kind: "meta",
        icon: "command",
        text: input.activeProject ? "No commands run yet" : "Waiting for a project",
        detail: input.activeProject ? "Command evidence appears here after an approved run." : "Open a local folder to attach command, file, and preview context.",
        state: input.activeProject ? "idle" : "blocked"
      },
      {
        id: "ready-review",
        kind: "note",
        text: "When work starts, I’ll keep this readable: a few narrative checkpoints, muted tool summaries, and no giant checklist wall."
      }
    ];
  }

  const entries: WorkTraceEntry[] = [
    {
      id: "pickup",
      kind: "note",
      text: goal
        ? `I’m picking this up: ${goal}. I’ll hold the agent to real evidence before calling it done.`
        : `I’m picking this up in ${projectLabel}. I’ll hold the agent to files, commands, diffs, preview checks, and approval state.`
    },
    {
      id: "commands",
      kind: "meta",
      icon: "command",
      text: input.pendingCommand
        ? `1 command waiting for approval${commandCount ? `, ${commandCount} already run` : ""}`
        : commandCount
          ? `Ran ${formatTraceCount(commandCount, "command")}`
          : "No commands run yet",
      detail: input.pendingCommand?.command ?? input.commandHistory.at(-1)?.command ?? "Approved command history is empty for this run.",
      state: input.pendingCommand ? "blocked" : commandCount ? "done" : input.runStatus === "testing" ? "running" : "idle"
    },
    {
      id: "plan",
      kind: "note",
      text: input.agentPlan
        ? `I’ve got the plan pinned now. The practical slice is ${trimTraceText(input.agentPlan.summary || input.agentPlan.goal)}`
        : input.runHeartbeat?.message
          ? trimTraceText(input.runHeartbeat.message)
          : "I’m turning the request into the smallest safe implementation path before touching files."
    },
    {
      id: "edits",
      kind: "meta",
      icon: "edit",
      text: changedFiles
        ? `Edited ${formatTraceCount(changedFiles, "file")}${input.aiPatch?.status === "pending" ? ", editing 1 file" : ""}${input.reviewAddedCount || input.reviewRemovedCount ? `, +${input.reviewAddedCount} -${input.reviewRemovedCount}` : ""}`
        : "No file edits staged yet",
      detail: input.activeTextTab?.file.relativePath ?? input.aiPatch?.relativePath ?? "Changed files and patch proof appear here before Apply.",
      state: changedFiles ? "done" : input.runStatus === "editing" ? "running" : "idle"
    }
  ];

  if (input.runTimeout || input.runStatus === "blocked") {
    entries.push({
      id: "blocked",
      kind: "note",
      text: `This is blocked instead of pretending it is finished. ${input.runTimeout?.reason ?? "Use retry, a shorter prompt, or AI setup to recover cleanly."}`
    });
  } else if (input.runStatus === "ready_for_review") {
    entries.push({
      id: "review-note",
      kind: "note",
      text: "The work is ready for review. I’m waiting for Review diff, Apply edits, or Reject so nothing lands silently."
    });
  } else if (input.busy) {
    entries.push({
      id: "running-note",
      kind: "note",
      text: `Current phase: ${runningPhase}. ${input.runHeartbeat?.message ? trimTraceText(input.runHeartbeat.message) : "I’ll keep updating this trace as evidence appears."}`
    });
  } else {
    entries.push({
      id: "idle-note",
      kind: "note",
      text: "The agent is idle. Ask for the next edit, test, or explanation and the trace will keep the proof compact."
    });
  }

  entries.push({
    id: "phase-summary",
    kind: "meta",
    icon: "check",
    text: phaseSummary,
    detail: input.progressRows.map((row) => `${row.label}: ${row.detail}`).join(" | "),
    state: input.progressRows.some((row) => row.state === "blocked")
      ? "blocked"
      : input.progressRows.some((row) => row.state === "running")
        ? "running"
        : input.progressRows.some((row) => row.state === "done")
          ? "done"
          : "idle"
  });

  return entries;
}

function trimTraceText(value: string, maxLength = 170): string {
  const normalized = value.replace(/\s+/gu, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function formatTraceCount(value: number, noun: string): string {
  return `${value} ${noun}${value === 1 ? "" : "s"}`;
}

function formatRunStatusLabel(status: CodingRunStatus): string {
  switch (status) {
    case "idle":
      return "Idle";
    case "queued":
      return "Queued";
    case "understanding":
      return "Understanding";
    case "reading_files":
      return "Reading files";
    case "planning":
      return "Planning";
    case "editing":
      return "Editing";
    case "testing":
      return "Testing";
    case "previewing":
      return "Previewing";
    case "ready_for_review":
      return "Ready for review";
    case "blocked":
      return "Blocked";
    case "stopped":
      return "Stopped";
    default:
      return "Idle";
  }
}

function getProjectAccent(index: number): string {
  const accents = ["#0f8f6d", "#c79623", "#2f74d0", "#a76ad6", "#d46b48", "#4fa66c"];
  return accents[index % accents.length];
}

function countTreeFiles(node: CodingTreeNode): number {
  if (node.kind === "file") {
    return 1;
  }
  return (node.children ?? []).reduce((total, child) => total + countTreeFiles(child), 0);
}

function matchesQuery(query: string, value: string): boolean {
  return !query || value.toLowerCase().includes(query);
}

function formatRelativeTime(value: number | undefined): string {
  if (!value) {
    return "just now";
  }
  const diffMs = Math.max(0, Date.now() - value);
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getMonacoLanguage(pathOrLanguage: string): string {
  const value = pathOrLanguage.toLowerCase();
  if (value === "typescript" || /\.(ts|tsx)$/u.test(value)) return "typescript";
  if (value === "javascript" || /\.(js|jsx|mjs|cjs)$/u.test(value)) return "javascript";
  if (value === "python" || /\.py$/u.test(value)) return "python";
  if (value === "json" || /\.jsonc?$/u.test(value)) return "json";
  if (value === "css" || /\.(css|scss|sass|less)$/u.test(value)) return "css";
  if (value === "html" || /\.html?$/u.test(value)) return "html";
  if (value === "markdown" || /\.(md|mdx)$/u.test(value)) return "markdown";
  if (/\.(ps1|sh|bash|zsh|bat|cmd)$/u.test(value)) return "shell";
  return "plaintext";
}

function formatCommandResult(result: CodingCommandResult | undefined): string {
  if (!result) {
    return "";
  }
  if (result.success) {
    return [`> ${result.command}`, result.stdout, result.stderr, `exit ${result.exitCode} in ${result.durationMs}ms`].filter(Boolean).join("\n");
  }
  return [`> ${result.command ?? "command"}`, result.stdout, result.stderr, result.reason].filter(Boolean).join("\n");
}

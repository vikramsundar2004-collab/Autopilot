import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const appSource = readFileSync(new URL("../src/renderer/App.tsx", import.meta.url), "utf8");
const cssSource = readFileSync(new URL("../src/renderer/styles.css", import.meta.url), "utf8");
const codingComponentSource = readFileSync(new URL("../src/renderer/components/CodingWorkspaceRebuild.tsx", import.meta.url), "utf8");
const codingSharedSource = readFileSync(new URL("../src/shared/coding.ts", import.meta.url), "utf8");

describe("coding workspace UI polish", () => {
  it("shows recent code on the coding home instead of only the workbench prompt", () => {
    expect(appSource).toContain("type CodingRecentCodeItem");
    expect(appSource).toContain("activeProjectRecentCodeItems");
    expect(appSource).toContain('aria-label="Recent code in active project"');
    expect(appSource).toContain('aria-label="Recent project code"');
    expect(appSource).toContain("Keep working where you left off.");
    expect(appSource).toContain("Open editors appear first, followed by recently changed project files.");
    expect(appSource).toContain("Open editors and recently modified code files in this project");
    expect(appSource).toContain("collectCodingCodeNodes(codingSnapshot.tree?.children");
  });

  it("uses real open handlers for recent code items", () => {
    expect(appSource).toContain("setActiveCodingTabId(item.openedTabId)");
    expect(appSource).toContain("void openCodingPath(item.path)");
    expect(appSource).toContain("Browse all");
  });

  it("styles the recent code lane as part of the Codex/Cursor-style workspace", () => {
    expect(cssSource).toContain(".coding-recent-code-panel");
    expect(cssSource).toContain(".coding-recent-code-list");
    expect(cssSource).toContain(".coding-recent-code-empty");
    expect(cssSource).toContain(".coding-project-overview-panel.recent-code");
  });

  it("adds Cursor-style agent/editor mode controls with real context actions", () => {
    expect(appSource).toContain('className="coding-mode-switch"');
    expect(appSource).toContain('aria-label="Agent and editor mode"');
    expect(appSource).toContain("renderCodingPromptContextPills");
    expect(appSource).toContain('aria-label="Coding prompt context"');
    expect(appSource).toContain("@changes");
    expect(appSource).toContain('setCodingRightPanel("code")');
    expect(appSource).toContain('setCodingRightPanel("access")');
    expect(appSource).toContain("Cursor-style agent workspace");
  });

  it("styles Coding as a theme-aware Cursor-like IDE instead of a generic dashboard", () => {
    expect(cssSource).toContain("--cursor-code-bg");
    expect(cssSource).toContain(":root[data-theme=\"dark\"] .coding-page");
    expect(cssSource).toContain(":root[data-theme=\"blue\"] .coding-page");
    expect(cssSource).toContain(".coding-mode-switch");
    expect(cssSource).toContain(".coding-prompt-context-pills");
    expect(cssSource).toContain(".coding-agent-mode-pills");
  });

  it("keeps coding chat readable in dark mode", () => {
    expect(cssSource).toContain(".coding-center-chat-thread .coding-chat-message p");
    expect(cssSource).toContain("color: var(--cursor-code-text) !important");
    expect(cssSource).toContain("white-space: pre-wrap !important");
  });

  it("lets build/create/generate prompts trigger real code patches", () => {
    expect(appSource).toContain("build|create|generate|code|scaffold|write");
    expect(appSource).toContain("getCodingEditTargetScore");
    expect(appSource).toContain("getCodingGeneratedFileRelativePath");
    expect(appSource).toContain('responseFormat: "json_object"');
    expect(appSource).toContain("Generated a code patch for");
    expect(appSource).toContain("I created a new editable file target");
    expect(appSource).toContain("I opened the most likely app file automatically");
  });

  it("blocks unavailable production code generation instead of showing fake starter-template success", () => {
    expect(appSource).toContain("function shouldUseLocalCodingStarterTemplates()");
    expect(appSource).toContain("return isBrowserPreview;");
    expect(appSource).toContain("Code generation blocked");
    expect(appSource).toContain("No code was generated or applied");
    expect(appSource).toContain("Use Retry, send a shorter prompt, or check AI setup.");
  });

  it("shows user-facing progress instead of only technical model reasoning", () => {
    expect(appSource).toContain("Queued. I’m turning this into a coding run now.");
    expect(appSource).toContain("Autopilot is generating the actual file patch or a clear blocker.");
    expect(appSource).toContain("Implementation notes:");
    expect(appSource).not.toContain("Model reasoning:");
  });

  it("starts the assistant like Cursor with a resizable right panel", () => {
    expect(appSource).toContain("type CodingAssistantPanelMode");
    expect(appSource).toContain("Ready when you are, {codingAssistantUserName}");
    expect(appSource).toContain("coding-assistant-size-toggle");
    expect(cssSource).toContain(".coding-page.coding-assistant-wide");
    expect(cssSource).toContain(".coding-page.coding-assistant-focus");
  });

  it("switches an active coding chat into a Cursor/Gemini-style editor plus assistant", () => {
    expect(appSource).toContain("cursor-desktop-mode");
    expect(appSource).toContain("coding-cursor-ide-layout");
    expect(appSource).toContain("coding-cursor-editor-stage");
    expect(appSource).toContain("coding-cursor-ai-sidebar");
    expect(appSource).toContain("coding-cursor-code-line");
    expect(appSource).toContain("coding-cursor-minimap");
    expect(appSource).toContain("Hello, {codingAssistantUserName}");
    expect(appSource).toContain("How can I help you code today?");
    expect(appSource).toContain("Ask Autopilot to inspect, edit, test, or explain this project...");
    expect(appSource).toContain("Search files, chats, symbols...");
    expect(appSource).toContain("codingAssistantDisplayChat");
    expect(appSource).toContain("coding-project-search-shell");
    expect(appSource).toContain("coding-cursor-ai-diff-card");
    expect(appSource).toContain("GPT-5.5");
    expect(appSource).toContain("openCodingSourceControl");
    expect(appSource).toContain("openCodingRunPanel");
    expect(appSource).toContain("openCodingTestsPanel");
    expect(cssSource).toContain("Cursor app + Gemini assistant inspired IDE shell");
    expect(cssSource).toContain("Forge screenshot fidelity pass");
    expect(cssSource).toContain(".coding-page.cursor-desktop-mode");
    expect(cssSource).toContain("grid-template-columns: var(--workspace-rail-width) 0 minmax(0, 1fr) !important");
    expect(cssSource).toContain(".app-shell:has(.coding-page.cursor-desktop-mode) .workspace-rail");
    expect(cssSource).toContain(".coding-cursor-ide-layout");
    expect(cssSource).toContain(".coding-cursor-ai-hello");
    expect(cssSource).toContain(".coding-cursor-code-line");
    expect(cssSource).toContain(".coding-cursor-ai-diff-card");
    expect(cssSource).toContain(".coding-project-dot");
  });

  it("groups every project into collapsible chats and code like an agentic IDE", () => {
    expect(appSource).toContain("type CodingProjectSection");
    expect(appSource).toContain("collapsedCodingProjectSections");
    expect(appSource).toContain("toggleCodingProjectSection");
    expect(appSource).toContain("Open project to load files");
    expect(appSource).toContain("coding-project-inline-tree");
    expect(appSource).toContain("coding-project-card");
    expect(appSource).toContain("CODING_PROJECT_ACCENTS");
    expect(cssSource).toContain(".coding-project-section-header");
    expect(cssSource).toContain(".coding-project-inline-tree");
    expect(cssSource).toContain(".coding-project-load-code");
  });

  it("opens Board, Plugins, and Skills as full Coding work modes with real actions", () => {
    expect(appSource).toContain('type CodingSection = "files" | "search" | "plugins" | "skills" | "board" | "terminal" | "browser"');
    expect(appSource).toContain("type CodingProjectBoardItem");
    expect(appSource).toContain("codingProjectBoardColumns");
    expect(appSource).toContain("function openCodingProjectBoard()");
    expect(appSource).toContain("function openCodingSkills()");
    expect(appSource).toContain("function runCodingProjectBoardAction");
    expect(appSource).toContain('aria-label="Project Board"');
    expect(appSource).toContain("coding-project-board-workspace");
    expect(appSource).toContain('codingSection === "plugins" || codingSection === "skills"');
    expect(appSource).toContain("openCodingSkillTemplateChat(template)");
    expect(appSource).toContain("installCodingPlugin(plugin)");
    expect(cssSource).toContain(".coding-project-board-workspace");
    expect(cssSource).toContain(".coding-project-board-columns");
    expect(cssSource).toContain(".coding-project-board-card");
    expect(cssSource).toContain(".coding-plugin-market");
  });

  it("keeps Coding plugin cards readable and surfaces autosave in the editor footer", () => {
    expect(appSource).toContain("Autosaving...");
    expect(appSource).toContain("Autosaved ${formatSaveTime(activeTextCodingTab.savedAt)}");
    expect(appSource).toContain("Autosave ready");
    expect(cssSource).toContain("grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)) !important");
    expect(cssSource).toContain(".coding-page.cursor-desktop-mode .coding-plugin-card");
    expect(cssSource).toContain(".coding-page.cursor-desktop-mode .coding-cursor-status-bar .saved");
    expect(cssSource).toContain(".coding-page.cursor-desktop-mode .coding-cursor-status-bar .saving");
  });

  it("keeps automations in the AI sidebar and gives terminal a real close control", () => {
    expect(appSource).toContain("function openCodingAutomationChat()");
    expect(appSource).toContain("Automation chat is ready in the AI sidebar");
    expect(appSource).toContain("openCodingChatTab(chat, { focus: true })");
    expect(appSource).toContain("Create a project automation. Ask me for trigger");
    expect(appSource).toContain('aria-label="Close terminal"');
    expect(appSource).toContain("Terminal closed. Your project and chats are still open.");
    expect(appSource).toContain('setCodingRightSidebarOpen(false);');
    expect(cssSource).toContain(".coding-close-terminal-button");
    expect(cssSource).toContain(".coding-terminal-panel");
  });

  it("adds a search-first sidebar mode switch above files, chats, and board", () => {
    expect(appSource).toContain('placeholder="Search files, chats, board..."');
    expect(appSource).toContain('className="coding-sidebar-mode-tabs"');
    expect(appSource).toContain("Files");
    expect(appSource).toContain("Chats");
    expect(appSource).toContain("Board");
    expect(cssSource).toContain(".coding-sidebar-mode-tabs");
  });

  it("keeps agentic editor buttons tied to real actions", () => {
    expect(appSource).toContain("coding-cursor-edits-ready");
    expect(appSource).toContain("applyCodingAiFilePatch()");
    expect(appSource).toContain("createCodingAgentPlan(undefined, activeCodingAssistantChat)");
    expect(appSource).toContain('runCodingProjectTool("npm test -- --run", "Running project tests.")');
    expect(appSource).toContain("openCodingProjectCode");
    expect(cssSource).toContain(".coding-cursor-agent-card");
    expect(cssSource).toContain(".coding-cursor-code-shell.has-agentic-edits");
  });

  it("color codes Coding file tree entries by file type", () => {
    const treeSource = readFileSync(new URL("../src/renderer/components/CodingTree.tsx", import.meta.url), "utf8");
    expect(treeSource).toContain("getCodingFileTone");
    expect(treeSource).toContain("coding-file-tone-${tone}");
    expect(cssSource).toContain(".coding-file-tone-typescript");
    expect(cssSource).toContain(".coding-file-tone-javascript");
    expect(cssSource).toContain(".coding-file-tone-json");
  });

  it("keeps the non-active coding states styled as an IDE instead of the app dashboard", () => {
    expect(cssSource).toContain("Final visible Coding override");
    expect(cssSource).toContain(".coding-editor-empty-state");
    expect(cssSource).toContain(".coding-workbench-content");
    expect(cssSource).toContain("background: var(--cursor-code-bg) !important");
  });

  it("keeps Coding dark and agentic while inheriting the app accent colors", () => {
    expect(cssSource).toContain("Theme-aligned Coding palette");
    expect(cssSource).toContain("--cursor-code-accent: var(--primary) !important");
    expect(cssSource).toContain("--forge-teal: var(--primary) !important");
    expect(cssSource).toContain("--forge-green: var(--success) !important");
  });

  it("surfaces Productivity-routed code work as AI-started coding projects", () => {
    expect(appSource).toContain("codingRoutedWorkItems");
    expect(appSource).toContain("openCodingAiProjectFromWorkItem");
    expect(appSource).toContain('aria-label="AI-started coding projects"');
    expect(appSource).toContain("Real code tasks will appear here before credits go to the coding agent");
    expect(appSource).toContain("Productivity routed this as an AI-started coding project");
    expect(cssSource).toContain(".coding-ai-projects");
  });

  it("adds Browser Test feedback that returns context to Coding", () => {
    expect(appSource).toContain("Open in Browser Test");
    expect(appSource).toContain("Browser Test feedback");
    expect(appSource).toContain("submitCodingBrowserFeedback");
    expect(appSource).toContain("Click-to-suggest feedback");
    expect(appSource).toContain("I will not change files until you ask me to apply a patch.");
    expect(cssSource).toContain(".coding-browser-test-card");
  });

  it("adds researched builder guides for agents, plugins, and skills in Coding", () => {
    expect(appSource).toContain("codingBuilderGuides");
    expect(appSource).toContain("Build an agent");
    expect(appSource).toContain("Create a plugin");
    expect(appSource).toContain("Build a skill");
    expect(appSource).toContain("instructions, model choice, scoped tools, state, guardrails");
    expect(appSource).toContain("auth, scopes, tools, and disabled states");
    expect(appSource).toContain("SKILL.md trigger and workflow");
    expect(appSource).toContain("function openCodingBuilderGuideChat");
    expect(appSource).toContain('aria-label="Agent plugin and skill builder guides"');
    expect(appSource).toContain("Start guide");
    expect(cssSource).toContain(".coding-builder-guides");
    expect(cssSource).toContain(".coding-builder-guide-card");
  });

  it("routes coding assistant calls through the coding agent task", () => {
    expect(appSource).toContain("translateCodingPrompt");
    expect(appSource).toContain("concrete coding brief");
    expect(appSource).toContain('task: "coding_agent"');
    expect(appSource).toContain("timeoutMs: 110_000");
  });

  it("adds a strict visible run lifecycle with watchdog, stop invalidation, and retry recovery", () => {
    expect(codingSharedSource).toContain("export type CodingRunStatus");
    expect(codingSharedSource).toContain('"queued"');
    expect(codingSharedSource).toContain('"ready_for_review"');
    expect(codingSharedSource).toContain("export type CodingRunTimeoutState");
    expect(appSource).toContain("CODING_RUN_WATCHDOG_MS");
    expect(appSource).toContain("beginCodingVisibleRun");
    expect(appSource).toContain("codingRunInFlightRef");
    expect(appSource).toContain("codingRunTokenRef.current = stoppedToken + 1");
    expect(appSource).toContain("retryLastCodingRun");
    expect(codingComponentSource).toContain("coding-rebuild-run-recovery");
    expect(codingComponentSource).toContain("Retry");
    expect(codingComponentSource).toContain("Send shorter prompt");
    expect(codingComponentSource).toContain("Check AI setup");
  });

  it("keeps the rebuilt explorer compact by separating select from expand", () => {
    expect(codingComponentSource).toContain("coding-rebuild-project-caret");
    expect(codingComponentSource).toContain("onClick={() => onToggleProject(project.rootPath)}");
    expect(codingComponentSource).toContain("onClick={() => onSelectProject(project.rootPath)}");
    expect(codingComponentSource).toContain("const isCollapsed = collapsedProjects[project.rootPath] ?? !isActive;");
    expect(cssSource).toContain(".coding-rebuild-project-caret");
    expect(cssSource).toContain("border-color: transparent");
  });

  it("keeps the right AI panel calm until there is something to review", () => {
    expect(codingComponentSource).toContain("<details className=\"coding-rebuild-model-card\"");
    expect(codingComponentSource).toContain("{hasDiff && (");
    expect(codingComponentSource).toContain("formatRunStatusLabel(runStatus)");
    expect(cssSource).toContain(".coding-rebuild-model-card summary");
    expect(cssSource).toContain(".coding-rebuild-run-recovery");
  });

  it("adds Codex-style clickable clarification questions for ambiguous coding prompts", () => {
    expect(codingSharedSource).toContain("export type CodingClarificationQuestion");
    expect(codingSharedSource).toContain("export type CodingClarificationAnswer");
    expect(appSource).toContain("createCodingClarificationQuestion");
    expect(appSource).toContain("answerCodingClarification");
    expect(appSource).toContain("dismissCodingClarification");
    expect(codingComponentSource).toContain("function CodingClarificationCard");
    expect(codingComponentSource).toContain("role=\"radiogroup\"");
    expect(codingComponentSource).toContain("onDoubleClick={() => submitAnswer(option)}");
    expect(codingComponentSource).toContain("event.key === \"Enter\"");
    expect(codingComponentSource).toContain("event.key === \"Escape\"");
    expect(codingComponentSource).toContain("customText.trim()");
    expect(cssSource).toContain(".coding-clarification-card");
    expect(cssSource).toContain(".coding-clarification-option.selected");
  });

  it("turns the verbose coding dashboard into compact agent-console pieces", () => {
    expect(codingComponentSource).toContain("buildCompactProgressRows");
    expect(codingComponentSource).toContain("buildWorkTraceEntries");
    expect(codingComponentSource).toContain("coding-rebuild-work-trace");
    expect(codingComponentSource).toContain("coding-rebuild-work-trace-meta");
    expect(codingComponentSource).toContain("Agent Queue");
    expect(codingComponentSource).toContain("coding-rebuild-agent-queue-row");
    expect(cssSource).toContain(".coding-rebuild-agent-queue-row");
    expect(cssSource).toContain(".coding-rebuild-work-trace-note");
    expect(cssSource).toContain(".coding-rebuild-work-trace-meta");
    expect(cssSource).toContain("resize: vertical");
  });
});

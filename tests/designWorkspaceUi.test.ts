import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const appSource = readFileSync(new URL("../src/renderer/App.tsx", import.meta.url), "utf8");
const designFilesLibrarySource = readFileSync(
  new URL("../src/renderer/components/DesignFilesLibrary.tsx", import.meta.url),
  "utf8"
);
const cssSource = readFileSync(new URL("../src/renderer/styles.css", import.meta.url), "utf8");
const promptSource = readFileSync(new URL("../src/shared/artifactPrompts.ts", import.meta.url), "utf8");

describe("design workspace UI consolidation", () => {
  it("opens projects by default and keeps canvas guides off by default", () => {
    expect(appSource).toContain("const [designProjectDrawerOpen, setDesignProjectDrawerOpen] = useState(true)");
    expect(appSource).toContain("const [designSourcePanelOpen, setDesignSourcePanelOpen] = useState(false)");
    expect(appSource).toContain("const [designGuidesVisible, setDesignGuidesVisible] = useState(false)");
    expect(appSource).toContain('const [designProjectTab, setDesignProjectTab] = useState<DesignProjectTab>("mine")');
  });

  it("makes the artifact result the primary canvas label instead of the source", () => {
    expect(appSource).toContain("{getArtifactKindLabel(activeArtifact.kind)} result");
    expect(appSource).toContain("design-v2-context-stack");
    expect(appSource).toContain("Original email");
    expect(appSource).toContain("Draft");
  });

  it("matches the foldable built-items/source/assistant studio layout", () => {
    expect(appSource).toContain("design-workspace-v2 design-flow-studio");
    expect(appSource).toContain("design-v2-local-rail");
    expect(appSource).toContain('aria-label="Design workspace"');
    expect(appSource).toContain('aria-label="Design files"');
    expect(appSource).toContain('aria-label="Design settings"');
    expect(appSource).toContain("Built items");
    expect(appSource).toContain("Source preview");
    expect(appSource).toContain("Workspace is open. Built items are available on the left, and the result canvas is back in focus.");
    expect(appSource).toContain('aria-label="Design preview"');
    expect(appSource).toContain('aria-label="Run design preview"');
    expect(appSource).toContain('aria-label="Share design artifact"');
    expect(appSource).toContain('aria-label="Export design artifact"');
    expect(appSource).toContain("Focus view is on");
    expect(appSource).toContain("renderDesignBuiltItem");
    expect(appSource).toContain("designSourcePanelOpen");
    expect(cssSource).toContain(".design-flow-studio.built-open.source-open.ai-open");
    expect(cssSource).toContain(".design-v2-local-rail");
    expect(cssSource).toContain(".design-built-item");
    expect(cssSource).toContain(".design-v2-source-panel");
    expect(cssSource).toContain("grid-template-rows: auto auto auto minmax(0, 1fr) auto !important;");
    expect(cssSource).toContain("grid-auto-rows: max-content;");
  });

  it("keeps the AI panel simple with advanced tools collapsed", () => {
    expect(appSource).toContain("Hello, {codingAssistantUserName}");
    expect(appSource).toContain("Artifact-first studio");
    expect(appSource).toContain("What should change?");
    expect(appSource).toContain("What do you want to make?");
    expect(appSource).toContain("<summary>More tools</summary>");
    expect(appSource).not.toContain("<span>Prompt ideas</span>");
  });

  it("adds Claude-style canvas selection without making a shell button", () => {
    expect(appSource).toContain("const [designCanvasEditMode, setDesignCanvasEditMode] = useState(false)");
    expect(appSource).toContain("function toggleDesignCanvasEditMode()");
    expect(appSource).toContain("function requestCanvasEdit(targetLabel: string)");
    expect(appSource).toContain("Edit this result with AI");
    expect(appSource).toContain("onClick={() => requestCanvasEdit(getArtifactKindLabel(activeArtifact.kind))}");
    expect(cssSource).toContain(".design-canvas-edit-target");
    expect(cssSource).toContain(".design-atlas-studio.canvas-editing .design-v2-artboard");
  });

  it("backs the top toolbar actions with real behavior instead of status-only shells", () => {
    expect(appSource).toContain("async function shareActiveArtifact()");
    expect(appSource).toContain("artifactContentToShareText(activeArtifact, designCanvasVersion.content)");
    expect(appSource).toContain("onClick={() => void shareActiveArtifact()}");
    expect(appSource).toContain("onClick={() => void exportActiveArtifactToCoding()}");
    expect(appSource).not.toContain("Share is prepared behind final approval");
  });

  it("keeps the quality gate compact by showing failed checks or a short passed subset", () => {
    expect(appSource).toContain("design-quality-checks compact");
    expect(appSource).toContain("activeGeneratedArtifactReview.qualityReport.failedChecks.length > 0");
    expect(appSource).toContain("activeGeneratedArtifactReview.qualityReport.passedChecks.slice(0, 4)");
    expect(cssSource).toContain(".design-quality-checks.compact");
  });

  it("does not draw gridlines on the default design stage", () => {
    const stageMatch = cssSource.match(/\.design-v2-stage\s*\{(?<body>[\s\S]*?)\n\}/u);
    expect(stageMatch?.groups?.body).toBeTruthy();
    expect(stageMatch?.groups?.body).not.toContain("background-image");
    expect(stageMatch?.groups?.body).not.toContain("background-size");
    expect(stageMatch?.groups?.body).not.toContain("linear-gradient");
  });

  it("turns Files into a generated work library instead of showing the main canvas", () => {
    expect(appSource).toContain("<DesignFilesLibrary");
    expect(designFilesLibrarySource).toContain("DESIGN_FILE_LIBRARY_SECTIONS");
    expect(designFilesLibrarySource).toContain("ARTIFACT_TYPE_LABELS");
    expect(designFilesLibrarySource).toContain('origin: "user" | "ai"');
    expect(designFilesLibrarySource).toContain("All artifacts");
    expect(designFilesLibrarySource).toContain("User files");
    expect(designFilesLibrarySource).toContain("AI-generated files");
    expect(designFilesLibrarySource).toContain("Code handoffs");
    expect(designFilesLibrarySource).toContain('title: "Drafts"');
    expect(designFilesLibrarySource).toContain('title: "Documents"');
    expect(designFilesLibrarySource).toContain('title: "Slides"');
    expect(designFilesLibrarySource).toContain('title: "Other"');
    expect(appSource).toContain("Artifacts is open. User files and AI-generated files are separated");
    expect(appSource).toContain('designToolSection === "pages" ? (');
    expect(appSource).toContain("renderDesignFilesLibrary()");
    expect(cssSource).toContain(".design-files-library");
    expect(cssSource).toContain(".design-files-origin-section");
    expect(cssSource).toContain(".design-artifact-type-strip");
    expect(cssSource).toContain(".design-file-card");
  });

  it("opens Design as a named project studio with AI-started work separated", () => {
    expect(appSource).toContain("function createNewDesignArtifactFromRail()");
    expect(appSource).toContain('window.prompt("What do you want to name the project?"');
    expect(appSource).toContain("DESIGN_PROJECT_RECORDS_STORAGE_KEY");
    expect(appSource).toContain("loadDesignProjectRecords");
    expect(appSource).toContain("saveDesignProjectRecords");
    expect(appSource).toContain("createBlankDesignProjectRecord");
    expect(appSource).toContain("activeDesignProjectRecordId");
    expect(appSource).toContain("function selectDesignProjectRecord(record: DesignProjectRecord)");
    expect(appSource).toContain("function renderDesignProjectRecord(record: DesignProjectRecord)");
    expect(appSource).toContain("blankDesignProjectName");
    expect(appSource).toContain("New Project");
    expect(appSource).toContain("AI-started projects");
    expect(appSource).toContain("Artifacts in this project");
    expect(appSource).toContain("design-project-spine");
    expect(appSource).toContain("design-ai-artifacts-panel");
    expect(appSource).toContain("design-artifact-progress");
    expect(appSource).toContain("When Productivity routes real design work from an email");
    expect(appSource).toContain('setDesignToolSection("projects");');
    expect(appSource).toContain("setDesignFileDraftId(null);");
    expect(appSource).toContain("generated artifacts will appear on the canvas");
    expect(appSource).toContain("was saved as a blank project");
    expect(appSource).toContain("Project <b aria-hidden=\"true\">/</b>");
    expect(cssSource).toContain(".design-project-spine");
    expect(cssSource).toContain(".design-ai-artifacts-panel");
    expect(cssSource).toContain(".design-artifact-progress.running");
    expect(cssSource).toContain(".design-new-button");
  });

  it("opens with useful starter projects when the user has not generated design work yet", () => {
    expect(appSource).toContain("DESIGN_STARTER_PROJECTS");
    expect(appSource).toContain("Launch Week - homepage");
    expect(appSource).toContain("Q2 Investor Review");
    expect(appSource).toContain("function selectDesignStarterProject(project: DesignStarterProject)");
    expect(appSource).toContain("renderDesignStarterProject(project)");
    expect(appSource).toContain("filteredVisibleDesignProjects.length === 0 && filteredVisibleDesignProjectRecords.length === 0 && !blankDesignProjectName && filteredDesignStarterProjects.map");
    expect(cssSource).toContain(".design-atlas-studio .design-starter-project");
  });

  it("opens draft-only generated files into a readable draft detail view", () => {
    expect(appSource).toContain("selectedDesignFileDraft");
    expect(designFilesLibrarySource).toContain("Selected generated draft body");
    expect(designFilesLibrarySource).toContain("Use with AI");
    expect(designFilesLibrarySource).toContain("Show full email");
    expect(cssSource).toContain(".design-draft-detail");
  });

  it("turns History and Settings into real focused Design pages", () => {
    expect(appSource).toContain("function renderDesignHistoryPanel()");
    expect(appSource).toContain("function renderDesignSettingsPanel()");
    expect(appSource).toContain('aria-label="Design version history"');
    expect(appSource).toContain('aria-label="Design studio settings"');
    expect(appSource).toContain('designToolSection === "history" ? (');
    expect(appSource).toContain("renderDesignHistoryPanel()");
    expect(appSource).toContain("renderDesignSettingsPanel()");
    expect(appSource).toContain('className={designToolSection === "settings" ? "active" : ""}');
    expect(cssSource).toContain(".design-history-panel");
    expect(cssSource).toContain(".design-settings-panel");
    expect(cssSource).toContain(".design-history-layout");
    expect(cssSource).toContain(".design-settings-grid");
  });

  it("runs a mini prompt translator before frontier Design generation", () => {
    expect(appSource).toContain("translateDesignPrompt");
    expect(appSource).toContain("Prompt translated by");
    expect(appSource).toContain("Autopilot needs one design detail");
  });

  it("requires design-studio quality in artifact prompts", () => {
    expect(promptSource).toContain("DESIGN_STUDIO_SPEC_V1");
    expect(promptSource).toContain("Treat the output as a real artifact on a canvas");
    expect(promptSource).toContain("Generated websites need responsive behavior, hover/focus states, empty/loading/error states, and production copy.");
    expect(promptSource).toContain("${DESIGN_STUDIO_SPEC_V1}");
  });
});

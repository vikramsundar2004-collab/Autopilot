import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const electronMock = vi.hoisted(() => ({
  paths: {
    appPath: "",
    documents: "",
    home: "",
    userData: ""
  },
  showOpenDialog: vi.fn(),
  showSaveDialog: vi.fn()
}));

vi.mock("electron", () => ({
  app: {
    getAppPath: () => electronMock.paths.appPath,
    getPath: (name: "documents" | "home" | "userData") => electronMock.paths[name]
  },
  dialog: {
    showOpenDialog: electronMock.showOpenDialog,
    showSaveDialog: electronMock.showSaveDialog
  }
}));

const { CodingWorkspace } = await import("../src/main/coding");
const execFileAsync = promisify(execFile);

const tempRoots: string[] = [];

async function makeTempRoot(label: string): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), `autopilot-${label}-`));
  tempRoots.push(root);
  return root;
}

describe("CodingWorkspace file explorer", () => {
  beforeEach(async () => {
    const userData = await makeTempRoot("user-data");
    const home = await makeTempRoot("home");
    const documents = await makeTempRoot("documents");
    const appPath = await makeTempRoot("app");

    electronMock.paths.userData = userData;
    electronMock.paths.home = home;
    electronMock.paths.documents = documents;
    electronMock.paths.appPath = appPath;
    electronMock.showOpenDialog.mockReset();
    electronMock.showSaveDialog.mockReset();
  });

  afterEach(async () => {
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) {
        await rm(root, { recursive: true, force: true });
      }
    }
  });

  it("keeps recent projects without automatically reopening one after restart", async () => {
    const projectRoot = await makeTempRoot("project");
    await writeFile(path.join(projectRoot, "README.md"), "# Project\n", "utf8");
    electronMock.showOpenDialog.mockResolvedValueOnce({ canceled: false, filePaths: [projectRoot] });

    const firstWorkspace = new CodingWorkspace();
    const opened = await firstWorkspace.openProject({} as never);
    expect(opened.activeProject?.rootPath).toBe(path.resolve(projectRoot));

    const restartedWorkspace = new CodingWorkspace();
    const snapshot = await restartedWorkspace.getSnapshot();
    expect(snapshot.projects.map((project) => project.rootPath)).toEqual([path.resolve(projectRoot)]);
    expect(snapshot.activeProject).toBeNull();
    expect(snapshot.tree).toBeNull();

    const selected = await restartedWorkspace.selectProject(projectRoot);
    expect(selected.activeProject?.rootPath).toBe(path.resolve(projectRoot));
    expect(selected.tree?.children?.some((entry) => entry.name === "README.md")).toBe(true);
  });

  it("selectProject adds a valid local folder when it is not already in recent projects", async () => {
    const projectRoot = await makeTempRoot("select-existing-project");
    await writeFile(path.join(projectRoot, "README.md"), "# Select me\n", "utf8");

    const workspace = new CodingWorkspace();
    const selected = await workspace.selectProject(projectRoot);

    expect(selected.activeProject?.rootPath).toBe(path.resolve(projectRoot));
    expect(selected.projects.map((project) => project.rootPath)).toContain(path.resolve(projectRoot));
    expect(selected.tree?.children?.some((entry) => entry.name === "README.md")).toBe(true);
  });

  it("reports TS and Python language server readiness for the coding workspace", async () => {
    const workspace = new CodingWorkspace();
    const statuses = await workspace.getLanguageToolStatuses();

    expect(statuses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          language: "typescript",
          serverCommand: "typescript-language-server",
          installCommand: expect.stringContaining("typescript-language-server")
        }),
        expect.objectContaining({
          language: "python",
          serverCommand: "pyright-langserver",
          installCommand: expect.stringContaining("pyright")
        })
      ])
    );
    expect(statuses.every((status) => typeof status.available === "boolean")).toBe(true);
  });

  it("opens existing projects that already contain source files, assets, and config", async () => {
    const projectRoot = await makeTempRoot("existing-source-project");
    await mkdir(path.join(projectRoot, "src", "components"), { recursive: true });
    await mkdir(path.join(projectRoot, "public", "images"), { recursive: true });
    await writeFile(path.join(projectRoot, "package.json"), "{\"scripts\":{\"dev\":\"vite\"}}\n", "utf8");
    await writeFile(path.join(projectRoot, "README.md"), "# Existing project\n", "utf8");
    await writeFile(path.join(projectRoot, "src", "App.tsx"), "export function App() { return null; }\n", "utf8");
    await writeFile(path.join(projectRoot, "src", "components", "Button.tsx"), "export function Button() { return null; }\n", "utf8");
    await writeFile(path.join(projectRoot, "public", "images", "logo.svg"), "<svg />\n", "utf8");

    electronMock.showOpenDialog.mockResolvedValueOnce({ canceled: false, filePaths: [projectRoot] });
    const workspace = new CodingWorkspace();
    const snapshot = await workspace.openProject({} as never);

    expect(snapshot.activeProject?.rootPath).toBe(path.resolve(projectRoot));
    const rootNames = snapshot.tree?.children?.map((entry) => entry.name) ?? [];
    expect(rootNames).toEqual(expect.arrayContaining(["package.json", "README.md", "src", "public"]));

    const srcNode = snapshot.tree?.children?.find((entry) => entry.name === "src");
    expect(srcNode).toEqual(expect.objectContaining({ kind: "folder" }));
    expect(srcNode?.children?.some((entry) => entry.name === "App.tsx")).toBe(true);
  });

  it("ignores malformed package.json instead of trusting user-controlled JSON shape", async () => {
    const projectRoot = await makeTempRoot("malformed-package-project");
    await writeFile(path.join(projectRoot, "package.json"), "{\"scripts\":{\"dev\":\"vite\",", "utf8");
    await writeFile(path.join(projectRoot, "README.md"), "# Malformed package\n", "utf8");

    electronMock.showOpenDialog.mockResolvedValueOnce({ canceled: false, filePaths: [projectRoot] });
    const workspace = new CodingWorkspace();
    await workspace.openProject({} as never);

    const overview = await workspace.getRepoOverview();
    expect(overview.success).toBe(true);
    if (overview.success) {
      expect(overview.overview.scripts).toEqual([]);
      expect(overview.overview.packageManager).toBe("npm");
    }
  });

  it("creates projects by choosing a folder without overwriting existing files", async () => {
    const projectRoot = await makeTempRoot("create-existing-project");
    const sourcePath = path.join(projectRoot, "src");
    const appPath = path.join(sourcePath, "index.ts");
    await mkdir(sourcePath, { recursive: true });
    await writeFile(appPath, "export const existing = true;\n", "utf8");

    electronMock.showOpenDialog.mockResolvedValueOnce({ canceled: false, filePaths: [projectRoot] });
    const workspace = new CodingWorkspace();
    const snapshot = await workspace.createProject({} as never);

    expect(snapshot.activeProject?.rootPath).toBe(path.resolve(projectRoot));
    expect(electronMock.showSaveDialog).not.toHaveBeenCalled();
    const readResult = await workspace.readPath(appPath);
    expect(readResult).toEqual(
      expect.objectContaining({
        success: true,
        kind: "text",
        content: "export const existing = true;\n"
      })
    );
  });

  it("renames projects and keeps the custom name after restart", async () => {
    const projectRoot = await makeTempRoot("rename-project");
    await writeFile(path.join(projectRoot, "README.md"), "# Rename\n", "utf8");

    electronMock.showOpenDialog.mockResolvedValueOnce({ canceled: false, filePaths: [projectRoot] });
    const workspace = new CodingWorkspace();
    await workspace.openProject({} as never);

    const renamed = await workspace.renameProject(projectRoot, "Client Portal");
    expect(renamed.success).toBe(true);
    if (renamed.success) {
      expect(renamed.snapshot.activeProject?.name).toBe("Client Portal");
    }

    const restarted = new CodingWorkspace();
    const snapshot = await restarted.getSnapshot();
    expect(snapshot.projects.find((project) => project.rootPath === path.resolve(projectRoot))?.name).toBe("Client Portal");
  });

  it("loads AUTOPILOT.md project memory into coding agent runs", async () => {
    const projectRoot = await makeTempRoot("memory-project");
    await writeFile(path.join(projectRoot, "AUTOPILOT.md"), "# Project rules\n- Keep edits scoped.\n- Run the nearest test before approval.\n", "utf8");
    await writeFile(path.join(projectRoot, "README.md"), "# Memory project\n", "utf8");

    electronMock.showOpenDialog.mockResolvedValueOnce({ canceled: false, filePaths: [projectRoot] });
    const workspace = new CodingWorkspace();
    await workspace.openProject({} as never);

    const overview = await workspace.getRepoOverview();
    expect(overview.success).toBe(true);
    if (overview.success) {
      expect(overview.overview.projectMemory).toEqual(
        expect.objectContaining({
          present: true,
          relativePath: "AUTOPILOT.md"
        })
      );
      expect(overview.overview.summary).toContain("Project memory is loaded");
    }

    const run = await workspace.startAgentRun("Update the review UI safely");
    expect(run.success).toBe(true);
    if (run.success) {
      expect(run.plan.projectMemory?.relativePath).toBe("AUTOPILOT.md");
      expect(run.plan.steps[0]?.title).toBe("Load project memory");
      expect(run.run.progress?.some((event) => event.message.includes("Loaded project memory"))).toBe(true);
      expect(run.run.approvalState).toBe("needs_review");
    }
  });

  it("plans commands, requires approval by default, runs safe commands in full access, and keeps a command log", async () => {
    const projectRoot = await makeTempRoot("command-proof-project");
    await writeFile(path.join(projectRoot, "README.md"), "# Command proof\n", "utf8");
    await execFileAsync("git", ["init"], { cwd: projectRoot });

    const workspace = new CodingWorkspace();
    await workspace.selectProject(projectRoot);

    const plan = await workspace.planCommand({ command: "git status" });
    expect(plan.safety).toEqual(
      expect.objectContaining({
        allowed: true,
        requiresApproval: false,
        risk: "safe"
      })
    );

    const needsApproval = await workspace.runCommand({ command: "git status" });
    expect(needsApproval.success).toBe(false);
    if (!needsApproval.success) {
      expect(needsApproval.requiresApproval).toBe(true);
    }

    await workspace.setAccessMode("full");
    const result = await workspace.runCommand({ command: "git status" });
    expect(result.success).toBe(true);

    const log = await workspace.getCommandLog();
    expect(log.executions.length).toBeGreaterThanOrEqual(2);
    expect(log.executions.some((execution) => execution.result?.command === "git status")).toBe(true);
  });

  it("blocks destructive command plans before execution", async () => {
    const projectRoot = await makeTempRoot("command-safety-project");
    await writeFile(path.join(projectRoot, "README.md"), "# Command safety\n", "utf8");

    const workspace = new CodingWorkspace();
    await workspace.selectProject(projectRoot);

    const plan = await workspace.planCommand({ command: "git push --force" });
    expect(plan.safety).toEqual(
      expect.objectContaining({
        allowed: false,
        requiresApproval: true,
        risk: "destructive"
      })
    );

    const result = await workspace.runCommand({ command: "git push --force", approved: true });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toMatch(/blocked|destroy|overwrite/i);
    }
  });

  it("creates patchset proof only when git has changed files", async () => {
    const projectRoot = await makeTempRoot("patchset-proof-project");
    await execFileAsync("git", ["init"], { cwd: projectRoot });

    const workspace = new CodingWorkspace();
    await workspace.selectProject(projectRoot);

    const empty = await workspace.createPatchSet();
    expect(empty.success).toBe(false);
    if (!empty.success) {
      expect(empty.reason).toMatch(/No changed files/i);
    }

    await writeFile(path.join(projectRoot, "src.ts"), "export const value = 1;\n", "utf8");
    const patchSet = await workspace.createPatchSet();
    expect(patchSet.success).toBe(true);
    if (patchSet.success) {
      expect(patchSet.patchSet.files).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: "src.ts",
            status: "created"
          })
        ])
      );
    }
  });

  it("validates previews fail-closed for blank or errored output and pass with visible evidence", async () => {
    const workspace = new CodingWorkspace();

    const blank = await workspace.validatePreview({});
    expect(blank.success).toBe(false);
    expect(blank.validation.status).toBe("blocked");

    const errored = await workspace.validatePreview({
      url: "http://localhost:5173",
      domText: "App loaded",
      consoleMessages: ["Uncaught Error: boom"]
    });
    expect(errored.success).toBe(false);
    expect(errored.validation.status).toBe("failed");

    const passed = await workspace.validatePreview({
      url: "http://localhost:5173",
      domText: "Playable Snake",
      screenshotPresent: true
    });
    expect(passed.success).toBe(true);
    expect(passed.validation.status).toBe("passed");
  });

  it("publishes deep QA benchmark cases and blocks them until a project is open", async () => {
    const projectRoot = await makeTempRoot("deep-qa-project");
    await writeFile(path.join(projectRoot, "README.md"), "# Deep QA\n", "utf8");

    const workspace = new CodingWorkspace();
    const blocked = await workspace.runDeepQaBenchmark();
    expect(blocked.cases).toHaveLength(10);
    expect(blocked.cases.every((testCase) => testCase.status === "blocked")).toBe(true);

    await workspace.selectProject(projectRoot);
    const ready = await workspace.runDeepQaBenchmark();
    expect(ready.cases).toHaveLength(10);
    expect(ready.cases.every((testCase) => testCase.status === "ready")).toBe(true);
    expect(ready.cases.map((testCase) => testCase.scenario)).toEqual(
      expect.arrayContaining(["snake", "tetris", "agent", "plugin", "skill"])
    );
  });

  it("shows files and document entries when a folder contains more folders than the sidebar cap", async () => {
    const projectRoot = await makeTempRoot("large-project");
    for (let index = 0; index < 220; index += 1) {
      await mkdir(path.join(projectRoot, `folder-${String(index).padStart(3, "0")}`));
    }
    await writeFile(path.join(projectRoot, "notes.txt"), "Remember this file.\n", "utf8");
    await writeFile(path.join(projectRoot, "README"), "Plain text without an extension.\n", "utf8");
    await writeFile(path.join(projectRoot, "plan.pdf"), "%PDF-1.4\n% Autopilot test\n", "utf8");

    electronMock.showOpenDialog.mockResolvedValueOnce({ canceled: false, filePaths: [projectRoot] });
    const workspace = new CodingWorkspace();
    const snapshot = await workspace.openProject({} as never);

    expect(snapshot.tree?.children?.some((entry) => entry.kind === "file")).toBe(true);

    const readResult = await workspace.readPath(projectRoot);
    if (!readResult.success) {
      throw new Error(readResult.reason);
    }
    expect(readResult.kind).toBe("directory");
    if (readResult.kind === "directory") {
      const names = readResult.entries.map((entry) => entry.name);
      expect(names).toContain("notes.txt");
      expect(names).toContain("README");
      expect(names).toContain("plan.pdf");
      expect(readResult.entries.filter((entry) => entry.kind === "folder")).toHaveLength(220);
    }
  });

  it("opens real text-like files and previews PDFs instead of treating every unknown document as missing", async () => {
    const projectRoot = await makeTempRoot("documents-project");
    const textPath = path.join(projectRoot, "draft.custom");
    const pdfPath = path.join(projectRoot, "brief.pdf");
    await writeFile(textPath, "This custom extension is still a text file.\n", "utf8");
    await writeFile(pdfPath, "%PDF-1.4\n1 0 obj\n<<>>\nendobj\n", "utf8");

    electronMock.showOpenDialog.mockResolvedValueOnce({ canceled: false, filePaths: [projectRoot] });
    const workspace = new CodingWorkspace();
    await workspace.openProject({} as never);

    const textResult = await workspace.readPath(textPath);
    expect(textResult).toEqual(
      expect.objectContaining({
        success: true,
        kind: "text",
        content: "This custom extension is still a text file.\n"
      })
    );

    const documentResult = await workspace.readPath(pdfPath);
    expect(documentResult).toEqual(
      expect.objectContaining({
        success: true,
        kind: "document",
        mime: "application/pdf"
      })
    );
  });

  it("opens and saves environment files from the active project", async () => {
    const projectRoot = await makeTempRoot("secret-project");
    const envPath = path.join(projectRoot, ".env.local");
    await writeFile(envPath, "OPENAI_API_KEY=sk-test-secret\n", "utf8");

    electronMock.showOpenDialog.mockResolvedValueOnce({ canceled: false, filePaths: [projectRoot] });
    const workspace = new CodingWorkspace();
    await workspace.openProject({} as never);

    const snapshot = await workspace.getSnapshot();
    expect(snapshot.tree?.children?.some((entry) => entry.name === ".env.local")).toBe(true);

    const readResult = await workspace.readPath(envPath);
    expect(readResult).toEqual(
      expect.objectContaining({
        success: true,
        kind: "text",
        content: "OPENAI_API_KEY=sk-test-secret\n",
        language: "dotenv"
      })
    );

    const writeResult = await workspace.writeFile(envPath, "OPENAI_API_KEY=changed\n");
    expect(writeResult).toEqual(
      expect.objectContaining({
        success: true
      })
    );

    const updatedReadResult = await workspace.readPath(envPath);
    expect(updatedReadResult).toEqual(
      expect.objectContaining({
        success: true,
        kind: "text",
        content: "OPENAI_API_KEY=changed\n"
      })
    );
  });

  it("creates new text files inside the active project for AI-generated code", async () => {
    const projectRoot = await makeTempRoot("new-file-project");
    electronMock.showOpenDialog.mockResolvedValueOnce({ canceled: false, filePaths: [projectRoot] });
    const workspace = new CodingWorkspace();
    await workspace.openProject({} as never);

    const targetPath = path.join(projectRoot, "index.html");
    const writeResult = await workspace.writeFile(targetPath, "<main>Snake game</main>\n");
    expect(writeResult).toEqual(
      expect.objectContaining({
        success: true
      })
    );

    const readResult = await workspace.readPath(targetPath);
    expect(readResult).toEqual(
      expect.objectContaining({
        success: true,
        kind: "text",
        relativePath: "index.html",
        content: "<main>Snake game</main>\n"
      })
    );
  });

  it("deletes folders inside the active project but refuses to delete the project root", async () => {
    const projectRoot = await makeTempRoot("delete-project");
    const srcPath = path.join(projectRoot, "src");
    await mkdir(srcPath);
    await writeFile(path.join(srcPath, "index.ts"), "export const ok = true;\n", "utf8");

    electronMock.showOpenDialog.mockResolvedValueOnce({ canceled: false, filePaths: [projectRoot] });
    const workspace = new CodingWorkspace();
    await workspace.openProject({} as never);

    const deleteResult = await workspace.deletePath(srcPath);
    expect(deleteResult).toEqual(
      expect.objectContaining({
        success: true,
        deletedPath: path.resolve(srcPath)
      })
    );

    const readDeletedFolder = await workspace.readPath(srcPath);
    expect(readDeletedFolder).toEqual(expect.objectContaining({ success: false }));

    const rootDeleteResult = await workspace.deletePath(projectRoot);
    expect(rootDeleteResult).toEqual(
      expect.objectContaining({
        success: false,
        reason: expect.stringContaining("project root")
      })
    );
  });
});

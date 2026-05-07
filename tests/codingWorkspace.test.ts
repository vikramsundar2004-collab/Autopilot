import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

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

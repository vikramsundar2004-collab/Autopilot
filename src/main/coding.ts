import { app, dialog, type BrowserWindow } from "electron";
import fs from "node:fs/promises";
import path from "node:path";

import type {
  CodingDirectoryEntry,
  CodingFileReadResult,
  CodingProject,
  CodingSnapshot,
  CodingTreeNode,
  CodingWriteResult
} from "../shared/coding.js";

const PROJECTS_FILE = "coding-projects.json";
const MAX_TREE_DEPTH = 5;
const MAX_TREE_CHILDREN = 160;
const MAX_TEXT_BYTES = 2 * 1024 * 1024;
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

const SKIPPED_DIRECTORIES = new Set([
  ".git",
  ".next",
  ".turbo",
  ".vite",
  ".cache",
  "coverage",
  "dist",
  "build",
  "node_modules"
]);

const TEXT_EXTENSIONS = new Set([
  ".c",
  ".cc",
  ".cfg",
  ".conf",
  ".cpp",
  ".cs",
  ".css",
  ".csv",
  ".cts",
  ".env",
  ".go",
  ".graphql",
  ".h",
  ".html",
  ".java",
  ".js",
  ".json",
  ".jsx",
  ".log",
  ".md",
  ".mdx",
  ".mjs",
  ".py",
  ".rb",
  ".rs",
  ".scss",
  ".sh",
  ".sql",
  ".svg",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".xml",
  ".yaml",
  ".yml"
]);

const IMAGE_MIME_BY_EXTENSION = new Map([
  [".apng", "image/apng"],
  [".avif", "image/avif"],
  [".gif", "image/gif"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"]
]);

function getProjectsFilePath(): string {
  return path.join(app.getPath("userData"), PROJECTS_FILE);
}

function getProjectName(rootPath: string): string {
  return path.basename(rootPath) || rootPath;
}

function isInside(rootPath: string, targetPath: string): boolean {
  const relative = path.relative(rootPath, targetPath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function toRelativePath(rootPath: string, targetPath: string): string {
  const relative = path.relative(rootPath, targetPath);
  return relative || ".";
}

function inferLanguage(fileName: string): string {
  const extension = path.extname(fileName).toLowerCase().replace(".", "");
  if (!extension) {
    return "text";
  }

  if (extension === "cts" || extension === "mts") {
    return "typescript";
  }

  if (extension === "mdx") {
    return "markdown";
  }

  return extension;
}

function sortEntries(a: CodingDirectoryEntry, b: CodingDirectoryEntry): number {
  if (a.kind !== b.kind) {
    return a.kind === "folder" ? -1 : 1;
  }

  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export class CodingWorkspace {
  private projects: CodingProject[] = [];
  private activeRootPath: string | null = null;
  private loaded = false;

  async getSnapshot(): Promise<CodingSnapshot> {
    await this.ensureLoaded();
    await this.pruneMissingProjects();
    return this.buildSnapshot();
  }

  async openProject(window: BrowserWindow): Promise<CodingSnapshot> {
    await this.ensureLoaded();
    const result = await dialog.showOpenDialog(window, {
      title: "Open project folder",
      properties: ["openDirectory", "createDirectory"]
    });

    if (result.canceled || result.filePaths.length === 0) {
      return this.buildSnapshot();
    }

    return this.addProject(result.filePaths[0]);
  }

  async createProject(window: BrowserWindow): Promise<CodingSnapshot> {
    await this.ensureLoaded();
    const result = await dialog.showSaveDialog(window, {
      title: "Create project folder",
      buttonLabel: "Create project",
      defaultPath: path.join(app.getPath("documents"), "Autopilot Project")
    });

    if (result.canceled || !result.filePath) {
      return this.buildSnapshot();
    }

    await fs.mkdir(result.filePath, { recursive: true });
    return this.addProject(result.filePath);
  }

  async selectProject(rootPath: string): Promise<CodingSnapshot> {
    await this.ensureLoaded();
    const resolvedRoot = path.resolve(rootPath);
    if (this.projects.some((project) => project.rootPath === resolvedRoot)) {
      this.activeRootPath = resolvedRoot;
      await this.saveProjects();
    }

    return this.buildSnapshot();
  }

  async readPath(targetPath: string): Promise<CodingFileReadResult> {
    await this.ensureLoaded();
    const resolvedPath = path.resolve(targetPath);
    const activeProject = this.getActiveProject();
    if (!activeProject || !isInside(activeProject.rootPath, resolvedPath)) {
      return { success: false, reason: "Open a project before reading files." };
    }

    try {
      const stats = await fs.stat(resolvedPath);
      const relativePath = toRelativePath(activeProject.rootPath, resolvedPath);
      if (stats.isDirectory()) {
        return {
          success: true,
          kind: "directory",
          name: path.basename(resolvedPath) || activeProject.name,
          path: resolvedPath,
          relativePath,
          entries: await this.listDirectory(activeProject.rootPath, resolvedPath)
        };
      }

      if (!stats.isFile()) {
        return { success: false, reason: "Autopilot can only open files and folders." };
      }

      const extension = path.extname(resolvedPath).toLowerCase();
      const imageMime = IMAGE_MIME_BY_EXTENSION.get(extension);
      if (imageMime) {
        if (stats.size > MAX_IMAGE_BYTES) {
          return {
            success: true,
            kind: "binary",
            name: path.basename(resolvedPath),
            path: resolvedPath,
            relativePath,
            reason: "This image is too large to preview inside the coding workspace.",
            size: stats.size,
            modifiedAt: stats.mtimeMs
          };
        }

        const data = await fs.readFile(resolvedPath);
        return {
          success: true,
          kind: "image",
          name: path.basename(resolvedPath),
          path: resolvedPath,
          relativePath,
          dataUrl: `data:${imageMime};base64,${data.toString("base64")}`,
          mime: imageMime,
          size: stats.size,
          modifiedAt: stats.mtimeMs
        };
      }

      if (!TEXT_EXTENSIONS.has(extension) || stats.size > MAX_TEXT_BYTES) {
        return {
          success: true,
          kind: "binary",
          name: path.basename(resolvedPath),
          path: resolvedPath,
          relativePath,
          reason: stats.size > MAX_TEXT_BYTES ? "This file is too large for the built-in editor." : "This looks like a binary file.",
          size: stats.size,
          modifiedAt: stats.mtimeMs
        };
      }

      return {
        success: true,
        kind: "text",
        name: path.basename(resolvedPath),
        path: resolvedPath,
        relativePath,
        content: await fs.readFile(resolvedPath, "utf8"),
        language: inferLanguage(resolvedPath),
        size: stats.size,
        modifiedAt: stats.mtimeMs
      };
    } catch (error) {
      return {
        success: false,
        reason: error instanceof Error ? error.message : "Could not open that file."
      };
    }
  }

  async writeFile(targetPath: string, content: string): Promise<CodingWriteResult> {
    await this.ensureLoaded();
    const resolvedPath = path.resolve(targetPath);
    const activeProject = this.getActiveProject();
    if (!activeProject || !isInside(activeProject.rootPath, resolvedPath)) {
      return { success: false, reason: "Open a project before saving files." };
    }

    try {
      const stats = await fs.stat(resolvedPath);
      if (!stats.isFile()) {
        return { success: false, reason: "Autopilot can only save text files." };
      }

      const extension = path.extname(resolvedPath).toLowerCase();
      if (!TEXT_EXTENSIONS.has(extension)) {
        return { success: false, reason: "Autopilot will not overwrite this binary file." };
      }

      await fs.writeFile(resolvedPath, content, "utf8");
      const savedStats = await fs.stat(resolvedPath);
      return {
        success: true,
        savedAt: Date.now(),
        size: savedStats.size
      };
    } catch (error) {
      return {
        success: false,
        reason: error instanceof Error ? error.message : "Could not save that file."
      };
    }
  }

  private async addProject(rootPath: string): Promise<CodingSnapshot> {
    const resolvedRoot = path.resolve(rootPath);
    const project: CodingProject = {
      name: getProjectName(resolvedRoot),
      rootPath: resolvedRoot,
      openedAt: Date.now()
    };
    this.projects = [project, ...this.projects.filter((entry) => entry.rootPath !== resolvedRoot)].slice(0, 12);
    this.activeRootPath = resolvedRoot;
    await this.saveProjects();
    return this.buildSnapshot();
  }

  private async buildSnapshot(): Promise<CodingSnapshot> {
    const activeProject = this.getActiveProject();
    return {
      projects: [...this.projects],
      activeProject,
      tree: activeProject ? await this.buildTree(activeProject.rootPath, activeProject.rootPath, 0) : null
    };
  }

  private getActiveProject(): CodingProject | null {
    if (!this.activeRootPath) {
      return this.projects[0] ?? null;
    }

    return this.projects.find((project) => project.rootPath === this.activeRootPath) ?? this.projects[0] ?? null;
  }

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) {
      return;
    }

    const saved = await readJsonFile<{ projects: CodingProject[]; activeRootPath: string | null }>(getProjectsFilePath(), {
      projects: [],
      activeRootPath: null
    });
    this.projects = Array.isArray(saved.projects) ? saved.projects.filter((project) => project.rootPath && project.name) : [];
    this.activeRootPath = saved.activeRootPath ?? this.projects[0]?.rootPath ?? null;
    this.loaded = true;
  }

  private async pruneMissingProjects(): Promise<void> {
    const existingProjects: CodingProject[] = [];
    for (const project of this.projects) {
      if (await pathExists(project.rootPath)) {
        existingProjects.push(project);
      }
    }

    if (existingProjects.length !== this.projects.length) {
      this.projects = existingProjects;
      if (this.activeRootPath && !this.projects.some((project) => project.rootPath === this.activeRootPath)) {
        this.activeRootPath = this.projects[0]?.rootPath ?? null;
      }
      await this.saveProjects();
    }
  }

  private async saveProjects(): Promise<void> {
    await fs.mkdir(app.getPath("userData"), { recursive: true });
    await fs.writeFile(
      getProjectsFilePath(),
      JSON.stringify({ projects: this.projects, activeRootPath: this.activeRootPath }, null, 2),
      "utf8"
    );
  }

  private async listDirectory(rootPath: string, directoryPath: string): Promise<CodingDirectoryEntry[]> {
    const entries = await fs.readdir(directoryPath, { withFileTypes: true });
    const nodes: CodingDirectoryEntry[] = [];
    for (const entry of entries.slice(0, MAX_TREE_CHILDREN)) {
      if (entry.isDirectory() && SKIPPED_DIRECTORIES.has(entry.name)) {
        continue;
      }

      const entryPath = path.join(directoryPath, entry.name);
      const stats = await fs.stat(entryPath);
      if (!entry.isDirectory() && !entry.isFile()) {
        continue;
      }

      nodes.push({
        kind: entry.isDirectory() ? "folder" : "file",
        name: entry.name,
        path: entryPath,
        relativePath: toRelativePath(rootPath, entryPath),
        size: stats.size,
        modifiedAt: stats.mtimeMs,
        truncated: entries.length > MAX_TREE_CHILDREN
      });
    }

    return nodes.sort(sortEntries);
  }

  private async buildTree(rootPath: string, targetPath: string, depth: number): Promise<CodingTreeNode> {
    const stats = await fs.stat(targetPath);
    const node: CodingTreeNode = {
      kind: "folder",
      name: depth === 0 ? getProjectName(rootPath) : path.basename(targetPath),
      path: targetPath,
      relativePath: toRelativePath(rootPath, targetPath),
      size: stats.size,
      modifiedAt: stats.mtimeMs
    };

    if (depth >= MAX_TREE_DEPTH) {
      return node;
    }

    const entries = await this.listDirectory(rootPath, targetPath);
    node.children = [];
    for (const entry of entries) {
      if (entry.kind === "folder") {
        node.children.push(await this.buildTree(rootPath, entry.path, depth + 1));
      } else {
        node.children.push(entry);
      }
    }

    node.truncated = entries.some((entry) => entry.truncated);
    return node;
  }
}

import { app, dialog, type BrowserWindow } from "electron";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

import type {
  CodingAccessMode,
  CodingCommandRequest,
  CodingCommandResult,
  CodingDirectoryEntry,
  CodingFileReadResult,
  CodingProject,
  CodingResearchResult,
  CodingSearchResult,
  CodingSnapshot,
  CodingTreeNode,
  CodingWriteResult
} from "../shared/coding.js";

const PROJECTS_FILE = "coding-projects.json";
const MAX_TREE_DEPTH = 5;
const MAX_TREE_CHILDREN = 160;
const MAX_SEARCH_RESULTS = 80;
const MAX_TEXT_BYTES = 2 * 1024 * 1024;
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const COMMAND_TIMEOUT_MS = 60_000;

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

function getAppRootPath(): string {
  return path.resolve(app.getAppPath());
}

function getProjectName(rootPath: string): string {
  return path.basename(rootPath) || rootPath;
}

function isInside(rootPath: string, targetPath: string): boolean {
  const relative = path.relative(rootPath, targetPath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function isProtectedAppPath(targetPath: string): boolean {
  return isInside(getAppRootPath(), path.resolve(targetPath));
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

function normalizeResearchInput(input: string): string {
  const trimmedInput = input.trim();
  if (/^https?:\/\//i.test(trimmedInput) || /^file:\/\//i.test(trimmedInput)) {
    return trimmedInput;
  }

  if (/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?(?:\/|$)/i.test(trimmedInput)) {
    return `http://${trimmedInput}`;
  }

  if (/^[\w.-]+\.[a-z]{2,}(?:\/|$)/i.test(trimmedInput)) {
    return `https://${trimmedInput}`;
  }

  return `https://www.google.com/search?q=${encodeURIComponent(trimmedInput)}`;
}

function stripHtml(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTitle(html: string, fallback: string): string {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  return stripHtml(title ?? fallback).slice(0, 120) || fallback;
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
  private accessMode: CodingAccessMode = "ask";
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
      defaultPath: path.join(app.getPath("documents"), "New Coding Project")
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

  async setAccessMode(mode: CodingAccessMode): Promise<CodingSnapshot> {
    await this.ensureLoaded();
    this.accessMode = mode;
    await this.saveProjects();
    return this.buildSnapshot();
  }

  async searchProject(query: string): Promise<CodingSearchResult[]> {
    await this.ensureLoaded();
    const activeProject = this.getActiveProject();
    const normalizedQuery = query.trim().toLowerCase();
    if (!activeProject || normalizedQuery.length === 0) {
      return [];
    }

    const results: CodingSearchResult[] = [];
    await this.searchDirectory(activeProject.rootPath, activeProject.rootPath, normalizedQuery, results);
    return results;
  }

  async runCommand(input: CodingCommandRequest): Promise<CodingCommandResult> {
    await this.ensureLoaded();
    const command = input.command.trim();
    const activeProject = this.getActiveProject();
    if (!command) {
      return { success: false, reason: "Enter a command to run." };
    }

    const cwd = path.resolve(input.cwd || activeProject?.rootPath || app.getPath("home"));
    if (this.accessMode !== "full") {
      if (!activeProject || !isInside(activeProject.rootPath, cwd)) {
        return { success: false, command, cwd, reason: "Approval mode can only run commands inside the active project." };
      }

      if (!input.approved) {
        return {
          success: false,
          command,
          cwd,
          reason: "Approve this command before Autopilot runs it.",
          requiresApproval: true
        };
      }
    }

    if (isProtectedAppPath(cwd)) {
      return {
        success: false,
        command,
        cwd,
        reason: "Autopilot app source is protected. You can read it, but commands cannot run from inside the app code."
      };
    }

    return new Promise((resolve) => {
      const startedAt = Date.now();
      const shell = process.platform === "win32" ? "powershell.exe" : "/bin/sh";
      const args =
        process.platform === "win32"
          ? ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command]
          : ["-lc", command];
      const child = spawn(shell, args, {
        cwd,
        windowsHide: true,
        env: process.env
      });
      const stdoutChunks: Buffer[] = [];
      const stderrChunks: Buffer[] = [];
      const timeout = setTimeout(() => {
        child.kill();
      }, COMMAND_TIMEOUT_MS);

      child.stdout.on("data", (chunk: Buffer) => stdoutChunks.push(chunk));
      child.stderr.on("data", (chunk: Buffer) => stderrChunks.push(chunk));
      child.on("error", (error) => {
        clearTimeout(timeout);
        resolve({
          success: false,
          command,
          cwd,
          reason: error.message,
          stdout: Buffer.concat(stdoutChunks).toString("utf8"),
          stderr: Buffer.concat(stderrChunks).toString("utf8"),
          exitCode: null,
          durationMs: Date.now() - startedAt
        });
      });
      child.on("close", (exitCode) => {
        clearTimeout(timeout);
        const durationMs = Date.now() - startedAt;
        const stdout = Buffer.concat(stdoutChunks).toString("utf8").slice(-12000);
        const stderr = Buffer.concat(stderrChunks).toString("utf8").slice(-12000);
        if (durationMs >= COMMAND_TIMEOUT_MS) {
          resolve({
            success: false,
            command,
            cwd,
            stdout,
            stderr,
            exitCode,
            durationMs,
            reason: "Command timed out after 60 seconds."
          });
          return;
        }

        resolve({
          success: exitCode === 0,
          command,
          cwd,
          stdout,
          stderr,
          exitCode: exitCode ?? 0,
          durationMs,
          reason: exitCode === 0 ? undefined : `Command exited with code ${exitCode ?? "unknown"}.`
        } as CodingCommandResult);
      });
    });
  }

  async browse(input: string): Promise<CodingResearchResult> {
    const trimmedInput = input.trim();
    if (!trimmedInput) {
      return { success: false, input, reason: "Enter a URL or search query." };
    }

    const url = normalizeResearchInput(trimmedInput);
    try {
      const response = await fetch(url, {
        headers: {
          "user-agent": "AutopilotCoding/0.1 (+https://github.com/vikramsundar2004-collab/Autopilot)"
        }
      });
      const contentType = response.headers.get("content-type") ?? "";
      const text = contentType.includes("text") || contentType.includes("html") ? await response.text() : "";
      const title = contentType.includes("html") ? extractTitle(text, response.url) : response.url;
      const snippet = stripHtml(text).slice(0, 700);
      return {
        success: true,
        input,
        url: response.url,
        title,
        snippet: snippet || `Loaded ${contentType || "response"} with status ${response.status}.`,
        status: response.status
      };
    } catch (error) {
      return {
        success: false,
        input,
        url,
        reason: error instanceof Error ? error.message : "Autopilot could not browse that page."
      };
    }
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

    if (isProtectedAppPath(resolvedPath)) {
      return { success: false, reason: "Autopilot app code is read-only inside the coding workspace." };
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
      tree: activeProject ? await this.buildTree(activeProject.rootPath, activeProject.rootPath, 0) : null,
      accessMode: this.accessMode
    };
  }

  private getActiveProject(): CodingProject | null {
    if (!this.activeRootPath) {
      return null;
    }

    return this.projects.find((project) => project.rootPath === this.activeRootPath) ?? null;
  }

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) {
      return;
    }

    const saved = await readJsonFile<{ projects: CodingProject[]; activeRootPath?: string | null; accessMode?: CodingAccessMode }>(getProjectsFilePath(), {
      projects: [],
      activeRootPath: null,
      accessMode: "ask"
    });
    this.projects = Array.isArray(saved.projects) ? saved.projects.filter((project) => project.rootPath && project.name) : [];
    this.activeRootPath = null;
    this.accessMode = saved.accessMode === "full" ? "full" : "ask";
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
        this.activeRootPath = null;
      }
      await this.saveProjects();
    }
  }

  private async saveProjects(): Promise<void> {
    await fs.mkdir(app.getPath("userData"), { recursive: true });
    await fs.writeFile(
      getProjectsFilePath(),
      JSON.stringify({ projects: this.projects, accessMode: this.accessMode }, null, 2),
      "utf8"
    );
  }

  private async searchDirectory(
    rootPath: string,
    directoryPath: string,
    query: string,
    results: CodingSearchResult[],
    depth = 0
  ): Promise<void> {
    if (results.length >= MAX_SEARCH_RESULTS || depth > 8) {
      return;
    }

    let entries;
    try {
      entries = await fs.readdir(directoryPath, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (results.length >= MAX_SEARCH_RESULTS) {
        return;
      }

      if (entry.isDirectory() && SKIPPED_DIRECTORIES.has(entry.name)) {
        continue;
      }

      const entryPath = path.join(directoryPath, entry.name);
      const relativePath = toRelativePath(rootPath, entryPath);
      const normalizedRelativePath = relativePath.toLowerCase();
      const normalizedName = entry.name.toLowerCase();
      if (normalizedName.includes(query) || normalizedRelativePath.includes(query)) {
        const stats = await fs.stat(entryPath);
        results.push({
          kind: entry.isDirectory() ? "folder" : "file",
          name: entry.name,
          path: entryPath,
          relativePath,
          size: stats.size,
          modifiedAt: stats.mtimeMs,
          match: normalizedName.includes(query) ? "name" : "path"
        });
      }

      if (entry.isDirectory()) {
        await this.searchDirectory(rootPath, entryPath, query, results, depth + 1);
      }
    }
  }

  private async listDirectory(rootPath: string, directoryPath: string): Promise<CodingDirectoryEntry[]> {
    const entries = await fs.readdir(directoryPath, { withFileTypes: true });
    const visibleEntries = entries
      .filter((entry) => (entry.isDirectory() || entry.isFile()) && !(entry.isDirectory() && SKIPPED_DIRECTORIES.has(entry.name)))
      .sort((leftEntry, rightEntry) => {
        if (leftEntry.isDirectory() !== rightEntry.isDirectory()) {
          return leftEntry.isDirectory() ? -1 : 1;
        }

        return leftEntry.name.localeCompare(rightEntry.name, undefined, { sensitivity: "base" });
      });
    const truncated = visibleEntries.length > MAX_TREE_CHILDREN;
    const nodes: CodingDirectoryEntry[] = [];
    for (const entry of visibleEntries.slice(0, MAX_TREE_CHILDREN)) {
      const entryPath = path.join(directoryPath, entry.name);
      let stats;
      try {
        stats = await fs.stat(entryPath);
      } catch {
        continue;
      }

      nodes.push({
        kind: entry.isDirectory() ? "folder" : "file",
        name: entry.name,
        path: entryPath,
        relativePath: toRelativePath(rootPath, entryPath),
        size: stats.size,
        modifiedAt: stats.mtimeMs,
        truncated
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

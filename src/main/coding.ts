import { app, dialog, type BrowserWindow } from "electron";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import type { Dirent, Stats } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

import {
  createCodingAgentPlanFromOverview,
  parseGitPorcelainStatus,
  type CodingAgentPlanResult,
  type CodingAccessMode,
  type CodingCommandRequest,
  type CodingCommandResult,
  type CodingDeleteResult,
  type CodingDirectoryEntry,
  type CodingFileReadResult,
  type CodingGitDiffResult,
  type CodingGitStatusResult,
  type CodingLanguageToolStatus,
  type CodingPluginInstallResult,
  type CodingPluginStatus,
  type CodingOpenFileResult,
  type CodingProject,
  type CodingRepoOverview,
  type CodingRepoOverviewResult,
  type CodingResearchPass,
  type CodingResearchReportResult,
  type CodingResearchResult,
  type CodingResearchSource,
  type CodingSearchResult,
  type CodingSnapshot,
  type CodingTerminalInputRequest,
  type CodingTerminalInputResult,
  type CodingTerminalOpenRequest,
  type CodingTerminalOpenResult,
  type CodingTerminalOutputEvent,
  type CodingTreeNode,
  type CodingWriteResult
} from "../shared/coding.js";
import { CODING_PLUGIN_DEFINITIONS, type CodingPluginDefinition } from "../shared/codingPlugins.js";

const PROJECTS_FILE = "coding-projects.json";
const MAX_TREE_DEPTH = 5;
const MAX_TREE_CHILDREN = 160;
const MAX_SEARCH_RESULTS = 80;
const MAX_TEXT_BYTES = 2 * 1024 * 1024;
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;
const COMMAND_TIMEOUT_MS = 60_000;
const REPO_COMMAND_TIMEOUT_MS = 8_000;
const MAX_GIT_DIFF_BYTES = 80_000;
const PLUGIN_CHECK_TIMEOUT_MS = 15_000;
const PLUGIN_OUTPUT_LIMIT = 8000;
const RESEARCH_FETCH_TIMEOUT_MS = 12_000;
const MAX_RESEARCH_INPUT_LENGTH = 280;
const MAX_RESEARCH_SOURCES = 8;
const LANGUAGE_TOOL_CHECK_TIMEOUT_MS = 5_000;

type PluginDefinition = CodingPluginDefinition;

type RunningPluginInstall = {
  child: ChildProcessWithoutNullStreams;
  command: string;
  startedAt: number;
  estimatedSeconds: number;
  cwd: string;
  stdoutChunks: Buffer[];
  stderrChunks: Buffer[];
};

type RunningTerminalSession = {
  child: ChildProcessWithoutNullStreams;
  cwd: string;
  shell: string;
  shellName: string;
  output: string;
  running: boolean;
  startedAt: number;
  updatedAt: number;
  pid?: number;
  exitCode?: number | null;
};

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
  ".astro",
  ".c",
  ".cc",
  ".cfg",
  ".conf",
  ".cpp",
  ".cs",
  ".css",
  ".csv",
  ".cts",
  ".dart",
  ".env",
  ".erb",
  ".go",
  ".graphql",
  ".h",
  ".hpp",
  ".html",
  ".ini",
  ".java",
  ".js",
  ".json",
  ".jsx",
  ".kt",
  ".kts",
  ".less",
  ".log",
  ".lua",
  ".md",
  ".mdx",
  ".mjs",
  ".mts",
  ".php",
  ".pl",
  ".properties",
  ".py",
  ".r",
  ".rb",
  ".rs",
  ".rtf",
  ".sass",
  ".scss",
  ".sh",
  ".sql",
  ".svelte",
  ".svg",
  ".tex",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".vue",
  ".xml",
  ".yaml",
  ".yml"
]);

const TEXT_FILE_NAMES = new Set([
  ".babelrc",
  ".dockerignore",
  ".editorconfig",
  ".eslintignore",
  ".eslintrc",
  ".gitattributes",
  ".gitignore",
  ".npmrc",
  ".prettierrc",
  "dockerfile",
  "license",
  "makefile",
  "readme"
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

const DOCUMENT_MIME_BY_EXTENSION = new Map([
  [".pdf", "application/pdf"]
]);

const PLUGIN_DEFINITIONS: PluginDefinition[] = CODING_PLUGIN_DEFINITIONS;
const LANGUAGE_TOOL_DEFINITIONS: CodingLanguageToolStatus[] = [
  {
    language: "typescript",
    serverName: "TypeScript Language Server",
    serverCommand: "typescript-language-server",
    available: false,
    installCommand: "npm install -g typescript typescript-language-server"
  },
  {
    language: "python",
    serverName: "Pyright",
    serverCommand: "pyright-langserver",
    available: false,
    installCommand: "npm install -g pyright"
  }
];

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

function isEnvironmentFilePath(targetPath: string): boolean {
  const baseName = path.basename(targetPath).toLowerCase();
  return baseName === ".env" || baseName === "env.local" || baseName.startsWith(".env.");
}

function toRelativePath(rootPath: string, targetPath: string): string {
  const relative = path.relative(rootPath, targetPath);
  return relative || ".";
}

function inferLanguage(fileName: string): string {
  if (isEnvironmentFilePath(fileName)) {
    return "dotenv";
  }

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

function isTextFilePath(filePath: string): boolean {
  const extension = path.extname(filePath).toLowerCase();
  const baseName = path.basename(filePath).toLowerCase();
  return TEXT_EXTENSIONS.has(extension) || TEXT_FILE_NAMES.has(baseName) || isEnvironmentFilePath(filePath);
}

function looksLikeTextSample(sample: Buffer): boolean {
  if (sample.length === 0) {
    return true;
  }

  let suspiciousBytes = 0;
  for (const byte of sample) {
    if (byte === 0) {
      return false;
    }

    if (byte < 7 || (byte > 13 && byte < 32)) {
      suspiciousBytes += 1;
    }
  }

  return suspiciousBytes / sample.length < 0.05;
}

async function looksLikeTextFile(filePath: string, stats: Stats): Promise<boolean> {
  if (stats.size > MAX_TEXT_BYTES) {
    return false;
  }

  if (isTextFilePath(filePath)) {
    return true;
  }

  const sampleSize = Math.min(stats.size, 4096);
  if (sampleSize === 0) {
    return true;
  }

  const handle = await fs.open(filePath, "r");
  try {
    const sample = Buffer.alloc(sampleSize);
    const { bytesRead } = await handle.read(sample, 0, sampleSize, 0);
    return looksLikeTextSample(sample.subarray(0, bytesRead));
  } finally {
    await handle.close();
  }
}

function limitDirectoryEntries(entries: Dirent[], limit: number | null): Dirent[] {
  if (limit === null || entries.length <= limit) {
    return entries;
  }

  const folders = entries.filter((entry) => entry.isDirectory());
  const files = entries.filter((entry) => entry.isFile());
  const desiredFileSlots = Math.min(files.length, Math.max(Math.ceil(limit / 3), limit - folders.length));
  const folderSlots = Math.max(0, limit - desiredFileSlots);
  const selectedFolders = folders.slice(0, folderSlots);
  const selectedFiles = files.slice(0, limit - selectedFolders.length);

  return [...selectedFolders, ...selectedFiles];
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

function normalizeResearchQuery(input: string): string {
  return input.replace(/\s+/g, " ").trim().slice(0, MAX_RESEARCH_INPUT_LENGTH);
}

function buildGoogleNewsSearchUrl(query: string): string {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
}

function buildRecursiveResearchQueries(input: string): string[] {
  const baseQuery = normalizeResearchQuery(input);
  const currentYear = new Date().getFullYear();
  const queryCandidates = [
    baseQuery,
    /\b(latest|recent|news|today|this week|current)\b/iu.test(baseQuery) ? `${baseQuery} industry analysis` : `${baseQuery} latest news ${currentYear}`,
    `${baseQuery} trends market analysis ${currentYear}`
  ];

  return [...new Set(queryCandidates.map((query) => normalizeResearchQuery(query)).filter(Boolean))].slice(0, 3);
}

function decodeTextEntities(value: string): string {
  const namedEntities: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: "\""
  };

  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/giu, (entity, token: string) => {
    if (token.startsWith("#x")) {
      const codePoint = Number.parseInt(token.slice(2), 16);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : entity;
    }

    if (token.startsWith("#")) {
      const codePoint = Number.parseInt(token.slice(1), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : entity;
    }

    return namedEntities[token.toLowerCase()] ?? entity;
  });
}

function stripHtml(value: string): string {
  return decodeTextEntities(value)
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

function extractXmlTag(xml: string, tagName: string): string {
  return xml.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i"))?.[1] ?? "";
}

function getGoogleNewsSources(xml: string): CodingResearchSource[] {
  const sources: CodingResearchSource[] = [];
  for (const itemMatch of xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)) {
    const itemXml = itemMatch[1] ?? "";
    const title = stripHtml(extractXmlTag(itemXml, "title")).slice(0, 180);
    const url = decodeTextEntities(extractXmlTag(itemXml, "link")).trim();
    if (!title || !url) {
      continue;
    }

    const sourceName = stripHtml(extractXmlTag(itemXml, "source")).slice(0, 80) || undefined;
    const description = stripHtml(extractXmlTag(itemXml, "description")).slice(0, 280);
    const pubDate = extractXmlTag(itemXml, "pubDate");
    const publishedAt = pubDate ? Date.parse(pubDate) : Number.NaN;
    sources.push({
      title,
      url,
      snippet: description || title,
      provider: "google-news",
      sourceName,
      publishedAt: Number.isFinite(publishedAt) ? publishedAt : undefined,
      status: 200
    });

    if (sources.length >= 5) {
      break;
    }
  }

  return sources;
}

async function fetchResearchText(url: string): Promise<{ url: string; status: number; contentType: string; text: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RESEARCH_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "AutopilotCoding/0.1 (+https://github.com/vikramsundar2004-collab/Autopilot)"
      }
    });
    const contentType = response.headers.get("content-type") ?? "";
    const text = contentType.includes("text") || contentType.includes("xml") || contentType.includes("html") ? await response.text() : "";
    return {
      url: response.url,
      status: response.status,
      contentType,
      text
    };
  } finally {
    clearTimeout(timeout);
  }
}

function uniqueResearchSources(sources: CodingResearchSource[]): CodingResearchSource[] {
  const seen = new Set<string>();
  const uniqueSources: CodingResearchSource[] = [];
  for (const source of sources) {
    const key = `${source.url}|${source.title}`.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    uniqueSources.push(source);
    if (uniqueSources.length >= MAX_RESEARCH_SOURCES) {
      break;
    }
  }

  return uniqueSources;
}

function formatResearchSourceDate(value: number | undefined): string {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function buildResearchAnswer(input: string, iterations: CodingResearchPass[], sources: CodingResearchSource[]): string {
  if (sources.length === 0) {
    return `I ran ${iterations.length} recursive research ${iterations.length === 1 ? "pass" : "passes"} for "${input}", but no usable sources came back. Try a narrower industry, company, or time window.`;
  }

  const topSignals = sources
    .slice(0, 5)
    .map((source, index) => {
      const sourceLabel = [source.sourceName, formatResearchSourceDate(source.publishedAt)].filter(Boolean).join(" - ");
      return `${index + 1}. ${source.title}${sourceLabel ? ` (${sourceLabel})` : ""}`;
    })
    .join("\n");

  return [
    `I ran ${iterations.length} recursive research ${iterations.length === 1 ? "pass" : "passes"} for "${input}" using Google News/search routes.`,
    "",
    "Latest signals:",
    topSignals,
    "",
    "Ask a follow-up in the research bar to recurse on one slice, compare competitors, or turn this into a brief."
  ].join("\n");
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

function getShellInvocation(command: string): { shell: string; args: string[] } {
  return process.platform === "win32"
    ? {
        shell: "powershell.exe",
        args: ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command]
      }
    : {
        shell: "/bin/sh",
        args: ["-lc", command]
      };
}

function getInteractiveTerminalInvocation(): { shell: string; args: string[]; shellName: string } {
  if (process.platform === "win32") {
    return {
      shell: "powershell.exe",
      args: ["-NoLogo", "-NoExit"],
      shellName: "Windows PowerShell"
    };
  }

  const shell = process.env.SHELL || "/bin/sh";
  return {
    shell,
    args: [],
    shellName: path.basename(shell) || "Shell"
  };
}

function escapePowerShellSingleQuotedString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function toPowerShellStringArray(values: string[]): string {
  return `@(${values.map(escapePowerShellSingleQuotedString).join(",")})`;
}

function getPluginInstallInvocation(plugin: PluginDefinition): { shell: string; args: string[]; windowsHide: boolean } {
  if (process.platform === "win32" && plugin.installer === "winget" && plugin.installArgs) {
    const powerShellCommand = [
      "$ErrorActionPreference = 'Stop'",
      "$winget = (Get-Command winget.exe -ErrorAction SilentlyContinue).Source",
      "if (-not $winget) { Write-Error 'winget is not available. Install App Installer from Microsoft Store, then try again.'; exit 127 }",
      `$arguments = ${toPowerShellStringArray(plugin.installArgs)}`,
      "$process = Start-Process -FilePath $winget -ArgumentList $arguments -Verb RunAs -Wait -PassThru",
      "exit $process.ExitCode"
    ].join("; ");

    return {
      shell: "powershell.exe",
      args: ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", powerShellCommand],
      windowsHide: false
    };
  }

  const invocation = getShellInvocation(plugin.installCommand);
  return {
    ...invocation,
    windowsHide: true
  };
}

function formatPluginOutput(value: string): string {
  return value
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(-6)
    .join(" ")
    .slice(0, 600);
}

function getPluginFailureReason(plugin: PluginDefinition, exitCode: number | null, signal: NodeJS.Signals | null, stdout: string, stderr: string): string {
  if (signal) {
    return "Install cancelled.";
  }

  const output = formatPluginOutput(stderr || stdout);
  const codeLabel = exitCode ?? "unknown";
  const lowerOutput = output.toLowerCase();
  const manualCommand = plugin.installCommand;
  if (plugin.installer === "winget" && /cancel|denied|elevat|admin|permission|requires? administrator|uac/u.test(lowerOutput)) {
    return `Windows did not finish the elevated ${plugin.name} installer. Approve the Windows security prompt, or run this in an Administrator terminal: ${manualCommand}${output ? ` Details: ${output}` : ""}`;
  }

  if (plugin.installer === "winget" && exitCode === 1602) {
    return `The ${plugin.name} installer was cancelled before it finished. Try again and approve the Windows prompt, or run: ${manualCommand}`;
  }

  if (plugin.installer === "winget" && exitCode === 1603) {
    return `The ${plugin.name} installer hit a Windows Installer failure. Restart Autopilot or Windows Terminal as administrator, then run: ${manualCommand}${output ? ` Details: ${output}` : ""}`;
  }

  return `${plugin.name} installer exited with code ${codeLabel}.${output ? ` Details: ${output}` : ` Command: ${manualCommand}`}`;
}

function runShellCommand(command: string, cwd: string, timeoutMs: number, outputLimit = PLUGIN_OUTPUT_LIMIT): Promise<{
  exitCode: number | null;
  stdout: string;
  stderr: string;
  durationMs: number;
  timedOut: boolean;
  error?: string;
}> {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const { shell, args } = getShellInvocation(command);
    const child = spawn(shell, args, {
      cwd,
      windowsHide: true,
      env: process.env
    });
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => stdoutChunks.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => stderrChunks.push(chunk));
    child.on("error", (error) => {
      clearTimeout(timeout);
      resolve({
        exitCode: null,
        stdout: Buffer.concat(stdoutChunks).toString("utf8").slice(-outputLimit),
        stderr: Buffer.concat(stderrChunks).toString("utf8").slice(-outputLimit),
        durationMs: Date.now() - startedAt,
        timedOut,
        error: error.message
      });
    });
    child.on("close", (exitCode) => {
      clearTimeout(timeout);
      resolve({
        exitCode,
        stdout: Buffer.concat(stdoutChunks).toString("utf8").slice(-outputLimit),
        stderr: Buffer.concat(stderrChunks).toString("utf8").slice(-outputLimit),
        durationMs: Date.now() - startedAt,
        timedOut
      });
    });
  });
}

async function checkCommandAvailable(command: string, cwd: string): Promise<{ available: boolean; reason?: string }> {
  const probe = process.platform === "win32" ? `where.exe ${quoteShellArgument(command)}` : `command -v ${quoteShellArgument(command)}`;
  const result = await runShellCommand(probe, cwd, LANGUAGE_TOOL_CHECK_TIMEOUT_MS, 1200);
  if (result.exitCode === 0 && result.stdout.trim()) {
    return { available: true };
  }

  const reason = result.error || result.stderr.trim() || result.stdout.trim() || `${command} was not found on PATH.`;
  return {
    available: false,
    reason: reason.replace(/\s+/g, " ").trim().slice(0, 240)
  };
}

function quoteShellArgument(value: string): string {
  if (process.platform === "win32") {
    return escapePowerShellSingleQuotedString(value);
  }

  return `'${value.replace(/'/g, "'\\''")}'`;
}

async function readPackageJson(rootPath: string): Promise<{ scripts?: Record<string, unknown>; dependencies?: Record<string, unknown>; devDependencies?: Record<string, unknown> } | null> {
  try {
    const raw = await fs.readFile(path.join(rootPath, "package.json"), "utf8");
    return JSON.parse(raw) as { scripts?: Record<string, unknown>; dependencies?: Record<string, unknown>; devDependencies?: Record<string, unknown> };
  } catch {
    return null;
  }
}

async function detectPackageManager(rootPath: string): Promise<CodingRepoOverview["packageManager"]> {
  if (await pathExists(path.join(rootPath, "pnpm-lock.yaml"))) {
    return "pnpm";
  }

  if (await pathExists(path.join(rootPath, "yarn.lock"))) {
    return "yarn";
  }

  if (await pathExists(path.join(rootPath, "bun.lockb")) || (await pathExists(path.join(rootPath, "bun.lock")))) {
    return "bun";
  }

  if (await pathExists(path.join(rootPath, "package-lock.json")) || (await pathExists(path.join(rootPath, "package.json")))) {
    return "npm";
  }

  return "unknown";
}

function getPackageRunCommand(packageManager: CodingRepoOverview["packageManager"]): string {
  if (packageManager === "pnpm" || packageManager === "yarn" || packageManager === "bun") {
    return packageManager;
  }

  return "npm run";
}

function getPackageScripts(packageManager: CodingRepoOverview["packageManager"], packageJson: Awaited<ReturnType<typeof readPackageJson>>): CodingRepoOverview["scripts"] {
  const rawScripts = packageJson?.scripts ?? {};
  return Object.entries(rawScripts)
    .filter((entry): entry is [string, string] => typeof entry[1] === "string")
    .map(([name, value]) => ({
      name,
      command: `${getPackageRunCommand(packageManager)} ${name}${value ? ` (${value})` : ""}`
    }))
    .slice(0, 12);
}

async function collectKeyFiles(rootPath: string): Promise<string[]> {
  const candidates = [
    "package.json",
    "README.md",
    "src/main/main.ts",
    "src/main/coding.ts",
    "src/renderer/App.tsx",
    "src/renderer/styles.css",
    "src/shared/coding.ts",
    "vite.config.ts",
    "tsconfig.json",
    "tsconfig.electron.json",
    "electron.vite.config.ts"
  ];
  const keyFiles: string[] = [];
  for (const candidate of candidates) {
    if (await pathExists(path.join(rootPath, candidate))) {
      keyFiles.push(candidate);
    }
  }

  return keyFiles;
}

async function collectFrameworkHints(rootPath: string, packageJson: Awaited<ReturnType<typeof readPackageJson>>): Promise<string[]> {
  const dependencyNames = new Set([
    ...Object.keys(packageJson?.dependencies ?? {}),
    ...Object.keys(packageJson?.devDependencies ?? {})
  ]);
  const hints: string[] = [];
  const dependencyHints: Array<[string, string]> = [
    ["electron", "Electron"],
    ["react", "React"],
    ["vite", "Vite"],
    ["typescript", "TypeScript"],
    ["vitest", "Vitest"],
    ["next", "Next.js"],
    ["@vitejs/plugin-react", "Vite React"]
  ];
  for (const [dependency, label] of dependencyHints) {
    if (dependencyNames.has(dependency)) {
      hints.push(label);
    }
  }

  if (await pathExists(path.join(rootPath, "src", "main"))) {
    hints.push("main process");
  }

  if (await pathExists(path.join(rootPath, "src", "renderer"))) {
    hints.push("renderer");
  }

  return [...new Set(hints)];
}

function buildRepoOverviewSummary(input: {
  projectName: string;
  packageManager: CodingRepoOverview["packageManager"];
  scripts: CodingRepoOverview["scripts"];
  frameworkHints: string[];
  keyFiles: string[];
  changedFiles: number;
}): string {
  const stackLabel = input.frameworkHints.length > 0 ? input.frameworkHints.join(", ") : "no framework hints detected";
  const scriptLabel = input.scripts.length > 0 ? `${input.scripts.length} package script${input.scripts.length === 1 ? "" : "s"}` : "no package scripts";
  const fileLabel = input.keyFiles.length > 0 ? `key files include ${input.keyFiles.slice(0, 4).join(", ")}` : "no known key files found";
  return `${input.projectName} looks like a ${input.packageManager} project with ${stackLabel}, ${scriptLabel}, and ${fileLabel}. Git currently reports ${input.changedFiles} changed file${input.changedFiles === 1 ? "" : "s"}.`;
}

export class CodingWorkspace {
  private projects: CodingProject[] = [];
  private activeRootPath: string | null = null;
  private accessMode: CodingAccessMode = "ask";
  private loaded = false;
  private pluginInstalls = new Map<string, RunningPluginInstall>();
  private pluginLastStatuses = new Map<string, CodingPluginStatus>();
  private terminalSession: RunningTerminalSession | null = null;
  private terminalOutputListeners = new Set<(event: CodingTerminalOutputEvent) => void>();

  async getSnapshot(): Promise<CodingSnapshot> {
    await this.ensureLoaded();
    await this.pruneMissingProjects();
    return this.buildSnapshot();
  }

  async getLanguageToolStatuses(): Promise<CodingLanguageToolStatus[]> {
    await this.ensureLoaded();
    const cwd = this.activeRootPath ?? app.getPath("home");
    const statuses: CodingLanguageToolStatus[] = [];
    for (const tool of LANGUAGE_TOOL_DEFINITIONS) {
      const probe = await checkCommandAvailable(tool.serverCommand, cwd);
      statuses.push({
        ...tool,
        available: probe.available,
        reason: probe.available ? undefined : probe.reason
      });
    }

    return statuses;
  }

  async getRepoOverview(): Promise<CodingRepoOverviewResult> {
    await this.ensureLoaded();
    await this.pruneMissingProjects();
    const activeProject = this.getActiveProject();
    if (!activeProject) {
      return {
        success: false,
        reason: "Open a local project before asking Autopilot to understand the repo.",
        generatedAt: Date.now()
      };
    }

    const packageJson = await readPackageJson(activeProject.rootPath);
    const packageManager = await detectPackageManager(activeProject.rootPath);
    const scripts = getPackageScripts(packageManager, packageJson);
    const [keyFiles, frameworkHints, gitStatus] = await Promise.all([
      collectKeyFiles(activeProject.rootPath),
      collectFrameworkHints(activeProject.rootPath, packageJson),
      this.getGitStatusForRoot(activeProject.rootPath)
    ]);
    const changedFiles = gitStatus.success ? gitStatus.changedFiles : [];
    const overview: CodingRepoOverview = {
      projectName: activeProject.name,
      rootPath: activeProject.rootPath,
      generatedAt: Date.now(),
      packageManager,
      scripts,
      frameworkHints,
      keyFiles,
      gitBranch: gitStatus.success ? gitStatus.branch : "not a git repo",
      changedFiles,
      summary: buildRepoOverviewSummary({
        projectName: activeProject.name,
        packageManager,
        scripts,
        frameworkHints,
        keyFiles,
        changedFiles: changedFiles.length
      })
    };

    return {
      success: true,
      overview
    };
  }

  async createAgentPlan(goal: string): Promise<CodingAgentPlanResult> {
    const overviewResult = await this.getRepoOverview();
    if (!overviewResult.success) {
      return {
        success: false,
        reason: overviewResult.reason,
        generatedAt: Date.now()
      };
    }

    const now = Date.now();
    return {
      success: true,
      plan: createCodingAgentPlanFromOverview({
        id: `coding-plan-${now}`,
        goal,
        overview: overviewResult.overview,
        now
      })
    };
  }

  async getGitStatus(): Promise<CodingGitStatusResult> {
    await this.ensureLoaded();
    await this.pruneMissingProjects();
    const activeProject = this.getActiveProject();
    if (!activeProject) {
      return {
        success: false,
        reason: "Open a local project before reviewing git changes.",
        generatedAt: Date.now()
      };
    }

    return this.getGitStatusForRoot(activeProject.rootPath);
  }

  async getGitDiff(filePath?: string): Promise<CodingGitDiffResult> {
    await this.ensureLoaded();
    const activeProject = this.getActiveProject();
    if (!activeProject) {
      return {
        success: false,
        filePath,
        reason: "Open a local project before reviewing diffs.",
        generatedAt: Date.now()
      };
    }

    const resolvedFilePath = filePath ? path.resolve(filePath) : undefined;
    if (resolvedFilePath && !isInside(activeProject.rootPath, resolvedFilePath)) {
      return {
        success: false,
        rootPath: activeProject.rootPath,
        filePath,
        reason: "Diff review can only read files inside the active project.",
        generatedAt: Date.now()
      };
    }

    const relativeFilePath = resolvedFilePath ? toRelativePath(activeProject.rootPath, resolvedFilePath) : undefined;
    const command = relativeFilePath ? `git diff --no-ext-diff -- ${quoteShellArgument(relativeFilePath)}` : "git diff --no-ext-diff";
    const result = await runShellCommand(command, activeProject.rootPath, REPO_COMMAND_TIMEOUT_MS, MAX_GIT_DIFF_BYTES);
    if (result.timedOut) {
      return {
        success: false,
        rootPath: activeProject.rootPath,
        filePath,
        reason: "Git diff timed out before Autopilot could read it.",
        generatedAt: Date.now()
      };
    }

    if (result.exitCode !== 0) {
      return {
        success: false,
        rootPath: activeProject.rootPath,
        filePath,
        reason: result.stderr.trim() || result.stdout.trim() || result.error || "Git diff failed.",
        generatedAt: Date.now()
      };
    }

    return {
      success: true,
      rootPath: activeProject.rootPath,
      filePath: relativeFilePath,
      diff: result.stdout,
      generatedAt: Date.now()
    };
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

  async openFiles(window: BrowserWindow): Promise<CodingOpenFileResult> {
    await this.ensureLoaded();
    const activeProject = this.getActiveProject();
    const result = await dialog.showOpenDialog(window, {
      title: "Open files",
      buttonLabel: "Open files",
      defaultPath: activeProject?.rootPath ?? app.getPath("documents"),
      properties: ["openFile", "multiSelections"]
    });

    if (result.canceled || result.filePaths.length === 0) {
      return {
        success: false,
        reason: "No files selected.",
        snapshot: await this.buildSnapshot(),
        files: []
      };
    }

    const resolvedFilePaths = result.filePaths.map((filePath) => path.resolve(filePath));
    let snapshot: CodingSnapshot;
    if (activeProject && resolvedFilePaths.every((filePath) => isInside(activeProject.rootPath, filePath))) {
      snapshot = await this.buildSnapshot();
    } else {
      snapshot = await this.addProject(path.dirname(resolvedFilePaths[0]));
    }

    const files: CodingOpenFileResult["files"] = [];
    for (const filePath of resolvedFilePaths) {
      const currentProject = this.getActiveProject();
      if (!currentProject || !isInside(currentProject.rootPath, filePath)) {
        continue;
      }

      const openedFile = await this.readPath(filePath);
      if (openedFile.success && openedFile.kind !== "directory") {
        files.push(openedFile);
      }
    }

    if (files.length === 0) {
      return {
        success: false,
        reason: "Autopilot could not open any selected files.",
        snapshot,
        files
      };
    }

    return {
      success: true,
      snapshot: await this.buildSnapshot(),
      files
    };
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

  async addProjectFromPath(rootPath: string): Promise<CodingSnapshot> {
    await this.ensureLoaded();
    return this.addProject(rootPath);
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

  async deletePath(targetPath: string): Promise<CodingDeleteResult> {
    await this.ensureLoaded();
    const activeProject = this.getActiveProject();
    const resolvedPath = path.resolve(targetPath);
    if (!activeProject || !isInside(activeProject.rootPath, resolvedPath)) {
      return { success: false, reason: "Open a project before deleting folders." };
    }

    if (resolvedPath === path.resolve(activeProject.rootPath)) {
      return { success: false, reason: "Autopilot will not delete the project root." };
    }

    if (isProtectedAppPath(resolvedPath)) {
      return { success: false, reason: "Autopilot app source is protected from deletes." };
    }

    try {
      const stats = await fs.stat(resolvedPath);
      if (!stats.isDirectory()) {
        return { success: false, reason: "Folder deletion only works on folders." };
      }

      await fs.rm(resolvedPath, { recursive: true, force: false });
      return {
        success: true,
        deletedPath: resolvedPath,
        snapshot: await this.buildSnapshot()
      };
    } catch (error) {
      return {
        success: false,
        reason: error instanceof Error ? error.message : "Could not delete that folder."
      };
    }
  }

  async getPluginStatuses(): Promise<CodingPluginStatus[]> {
    await this.ensureLoaded();
    const cwd = app.getPath("home");
    const statuses: CodingPluginStatus[] = [];

    for (const plugin of PLUGIN_DEFINITIONS) {
      const running = this.pluginInstalls.get(plugin.id);
      if (running) {
        statuses.push(this.createRunningPluginStatus(plugin, running));
        continue;
      }

      const lastStatus = this.pluginLastStatuses.get(plugin.id);
      const check = await runShellCommand(plugin.checkCommand, cwd, PLUGIN_CHECK_TIMEOUT_MS);
      if (check.exitCode === 0) {
        statuses.push({
          id: plugin.id,
          name: plugin.name,
          command: plugin.command,
          status: "installed",
          installed: true,
          version: (check.stdout || check.stderr).split(/\r?\n/).find(Boolean)?.trim()
        });
      } else if (lastStatus?.status === "failed" || lastStatus?.status === "cancelled") {
        statuses.push(lastStatus);
      } else {
        statuses.push({
          id: plugin.id,
          name: plugin.name,
          command: plugin.command,
          status: "missing",
          installed: false,
          reason: check.timedOut ? "Install check timed out." : check.error || check.stderr || "Not installed."
        });
      }
    }

    return statuses;
  }

  async installPlugin(pluginId: string): Promise<CodingPluginInstallResult> {
    await this.ensureLoaded();
    const plugin = PLUGIN_DEFINITIONS.find((definition) => definition.id === pluginId);
    if (!plugin) {
      return { success: false, reason: "Unknown plugin." };
    }

    const cwd = app.getPath("home");
    const running = this.pluginInstalls.get(plugin.id);
    if (running) {
      return { success: true, status: this.createRunningPluginStatus(plugin, running) };
    }

    const check = await runShellCommand(plugin.checkCommand, cwd, PLUGIN_CHECK_TIMEOUT_MS);
    if (check.exitCode === 0) {
      const status: CodingPluginStatus = {
        id: plugin.id,
        name: plugin.name,
        command: plugin.command,
        status: "installed",
        installed: true,
        version: (check.stdout || check.stderr).split(/\r?\n/).find(Boolean)?.trim(),
        reason: "Already installed. Install cancelled."
      };
      this.pluginLastStatuses.set(plugin.id, status);
      return { success: true, status };
    }

    const { shell, args, windowsHide } = getPluginInstallInvocation(plugin);
    try {
      const child = spawn(shell, args, {
        cwd,
        windowsHide,
        env: process.env
      });
      const install: RunningPluginInstall = {
        child,
        command: plugin.installCommand,
        startedAt: Date.now(),
        estimatedSeconds: plugin.estimatedSeconds,
        cwd,
        stdoutChunks: [],
        stderrChunks: []
      };
      this.pluginInstalls.set(plugin.id, install);

      child.stdout.on("data", (chunk: Buffer) => install.stdoutChunks.push(chunk));
      child.stderr.on("data", (chunk: Buffer) => install.stderrChunks.push(chunk));
      child.on("error", (error) => {
        const status: CodingPluginStatus = {
          id: plugin.id,
          name: plugin.name,
          command: plugin.command,
          status: "failed",
          installed: false,
          reason: error.message,
          stdout: Buffer.concat(install.stdoutChunks).toString("utf8").slice(-PLUGIN_OUTPUT_LIMIT),
          stderr: Buffer.concat(install.stderrChunks).toString("utf8").slice(-PLUGIN_OUTPUT_LIMIT)
        };
        this.pluginInstalls.delete(plugin.id);
        this.pluginLastStatuses.set(plugin.id, status);
      });
      child.on("close", (exitCode, signal) => {
        const stdout = Buffer.concat(install.stdoutChunks).toString("utf8").slice(-PLUGIN_OUTPUT_LIMIT);
        const stderr = Buffer.concat(install.stderrChunks).toString("utf8").slice(-PLUGIN_OUTPUT_LIMIT);
        const wasCancelled = signal !== null;
        const status: CodingPluginStatus = {
          id: plugin.id,
          name: plugin.name,
          command: plugin.command,
          status: wasCancelled ? "cancelled" : exitCode === 0 ? "installed" : "failed",
          installed: !wasCancelled && exitCode === 0,
          reason:
            exitCode === 0 && !wasCancelled
              ? "Installed successfully."
              : getPluginFailureReason(plugin, exitCode, signal as NodeJS.Signals | null, stdout, stderr),
          stdout,
          stderr
        };
        this.pluginInstalls.delete(plugin.id);
        this.pluginLastStatuses.set(plugin.id, status);
      });

      return { success: true, status: this.createRunningPluginStatus(plugin, install) };
    } catch (error) {
      return {
        success: false,
        reason: error instanceof Error ? error.message : "Could not start plugin installer."
      };
    }
  }

  async cancelPluginInstall(pluginId: string): Promise<CodingPluginInstallResult> {
    await this.ensureLoaded();
    const plugin = PLUGIN_DEFINITIONS.find((definition) => definition.id === pluginId);
    if (!plugin) {
      return { success: false, reason: "Unknown plugin." };
    }

    const running = this.pluginInstalls.get(plugin.id);
    if (!running) {
      const status = this.pluginLastStatuses.get(plugin.id) ?? {
        id: plugin.id,
        name: plugin.name,
        command: plugin.command,
        status: "cancelled" as const,
        installed: false,
        reason: "No active install to cancel."
      };
      return { success: true, status };
    }

    running.child.kill();
    const status: CodingPluginStatus = {
      id: plugin.id,
      name: plugin.name,
      command: plugin.command,
      status: "cancelled",
      installed: false,
      reason: "Install cancellation requested.",
      stdout: Buffer.concat(running.stdoutChunks).toString("utf8").slice(-PLUGIN_OUTPUT_LIMIT),
      stderr: Buffer.concat(running.stderrChunks).toString("utf8").slice(-PLUGIN_OUTPUT_LIMIT)
    };
    this.pluginInstalls.delete(plugin.id);
    this.pluginLastStatuses.set(plugin.id, status);
    return { success: true, status };
  }

  onTerminalOutput(listener: (event: CodingTerminalOutputEvent) => void): () => void {
    this.terminalOutputListeners.add(listener);
    return () => this.terminalOutputListeners.delete(listener);
  }

  private buildTerminalOpenResult(session: RunningTerminalSession): Extract<CodingTerminalOpenResult, { success: true }> {
    return {
      success: true,
      cwd: session.cwd,
      shell: session.shell,
      shellName: session.shellName,
      output: session.output,
      running: session.running,
      startedAt: session.startedAt,
      updatedAt: session.updatedAt,
      pid: session.pid
    };
  }

  private emitTerminalOutput(session: RunningTerminalSession, chunk: string): void {
    const event: CodingTerminalOutputEvent = {
      output: session.output,
      chunk,
      cwd: session.cwd,
      shellName: session.shellName,
      running: session.running,
      updatedAt: session.updatedAt,
      pid: session.pid,
      exitCode: session.exitCode
    };
    for (const listener of this.terminalOutputListeners) {
      listener(event);
    }
  }

  private appendTerminalOutput(session: RunningTerminalSession, chunk: string): void {
    session.output = `${session.output}${chunk}`.slice(-40_000);
    session.updatedAt = Date.now();
    this.emitTerminalOutput(session, chunk);
  }

  async openTerminal(input: CodingTerminalOpenRequest = {}): Promise<CodingTerminalOpenResult> {
    await this.ensureLoaded();
    const activeProject = this.getActiveProject();
    const cwd = path.resolve(input.cwd || activeProject?.rootPath || app.getPath("home"));
    const invocation = getInteractiveTerminalInvocation();

    try {
      const stats = await fs.stat(cwd);
      if (!stats.isDirectory()) {
        return {
          success: false,
          cwd,
          shell: invocation.shell,
          shellName: invocation.shellName,
          reason: "PowerShell needs a folder to open from."
        };
      }
    } catch (error) {
      return {
        success: false,
        cwd,
        shell: invocation.shell,
        shellName: invocation.shellName,
        reason: error instanceof Error ? error.message : "PowerShell could not access that folder."
      };
    }

    if (this.terminalSession?.running && this.terminalSession.cwd === cwd) {
      return this.buildTerminalOpenResult(this.terminalSession);
    }

    if (this.terminalSession?.running) {
      this.terminalSession.child.kill();
      this.terminalSession.running = false;
    }

    return new Promise((resolve) => {
      let settled = false;
      const resolveOnce = (result: CodingTerminalOpenResult) => {
        if (settled) {
          return;
        }

        settled = true;
        resolve(result);
      };

      try {
        const child = spawn(invocation.shell, invocation.args, {
          cwd,
          windowsHide: true,
          env: process.env
        });
        const session: RunningTerminalSession = {
          child,
          cwd,
          shell: invocation.shell,
          shellName: invocation.shellName,
          output: "",
          running: true,
          startedAt: Date.now(),
          updatedAt: Date.now(),
          pid: child.pid
        };
        this.terminalSession = session;

        child.stdout.on("data", (chunk: Buffer) => this.appendTerminalOutput(session, chunk.toString("utf8")));
        child.stderr.on("data", (chunk: Buffer) => this.appendTerminalOutput(session, chunk.toString("utf8")));

        child.once("error", (error) =>
          resolveOnce({
            success: false,
            cwd,
            shell: invocation.shell,
            shellName: invocation.shellName,
            reason: error.message
          })
        );
        child.once("spawn", () => {
          resolveOnce(this.buildTerminalOpenResult(session));
        });
        child.once("close", (exitCode) => {
          session.running = false;
          session.exitCode = exitCode;
          this.appendTerminalOutput(session, `\r\n[${session.shellName} exited with code ${exitCode ?? "unknown"}]\r\n`);
        });
      } catch (error) {
        resolveOnce({
          success: false,
          cwd,
          shell: invocation.shell,
          shellName: invocation.shellName,
          reason: error instanceof Error ? error.message : "PowerShell could not start."
        });
      }
    });
  }

  async sendTerminalInput(input: CodingTerminalInputRequest): Promise<CodingTerminalInputResult> {
    const value = input.input;
    if (!value.trim()) {
      return {
        success: false,
        reason: "Enter a PowerShell command.",
        output: this.terminalSession?.output,
        running: this.terminalSession?.running
      };
    }

    let session = this.terminalSession;
    if (!session?.running) {
      const opened = await this.openTerminal();
      if (!opened.success) {
        return {
          success: false,
          reason: opened.reason
        };
      }

      session = this.terminalSession;
    }

    if (!session?.running) {
      return {
        success: false,
        reason: "PowerShell is not running.",
        output: session?.output,
        running: false
      };
    }

    session.child.stdin.write(`${value}\r\n`);
    return {
      success: true,
      output: session.output,
      running: session.running
    };
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
      const response = await fetchResearchText(url);
      const title = response.contentType.includes("html") ? extractTitle(response.text, response.url) : response.url;
      const snippet = stripHtml(response.text).slice(0, 700);
      return {
        success: true,
        input,
        url: response.url,
        title,
        snippet: snippet || `Loaded ${response.contentType || "response"} with status ${response.status}.`,
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

  async research(input: string): Promise<CodingResearchReportResult> {
    const query = normalizeResearchQuery(input);
    if (!query) {
      return {
        success: false,
        input,
        reason: "Ask a research question or name an industry to investigate.",
        generatedAt: Date.now(),
        iterations: [],
        sources: []
      };
    }

    const iterations: CodingResearchPass[] = [];
    for (const researchQuery of buildRecursiveResearchQueries(query)) {
      const url = buildGoogleNewsSearchUrl(researchQuery);
      try {
        const response = await fetchResearchText(url);
        const sources = getGoogleNewsSources(response.text);
        iterations.push({
          query: researchQuery,
          url: response.url,
          status: "searched",
          summary:
            sources.length > 0
              ? `Found ${sources.length} recent source${sources.length === 1 ? "" : "s"} from Google News.`
              : `Google News responded with status ${response.status}, but no source items were parsed.`,
          sources
        });
      } catch (error) {
        iterations.push({
          query: researchQuery,
          url,
          status: "failed",
          summary: "This research pass could not complete.",
          sources: [],
          reason: error instanceof Error ? error.message : "Google research pass failed."
        });
      }
    }

    let sources = uniqueResearchSources(iterations.flatMap((iteration) => iteration.sources));
    if (sources.length === 0) {
      const fallback = await this.browse(query);
      if (fallback.success) {
        sources = [
          {
            title: fallback.title,
            url: fallback.url,
            snippet: fallback.snippet,
            provider: "google-search",
            sourceName: "Google Search",
            status: fallback.status
          }
        ];
        iterations.push({
          query,
          url: fallback.url,
          status: "searched",
          summary: "Fell back to a Google search page because news search did not return usable source cards.",
          sources
        });
      }
    }

    if (sources.length === 0) {
      return {
        success: false,
        input: query,
        reason: "Autopilot could not find usable Google research results for that prompt.",
        generatedAt: Date.now(),
        iterations,
        sources: []
      };
    }

    return {
      success: true,
      input: query,
      answer: buildResearchAnswer(query, iterations, sources),
      generatedAt: Date.now(),
      iterations,
      sources
    };
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
          entries: await this.listDirectory(activeProject.rootPath, resolvedPath, { limit: null })
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

      const documentMime = DOCUMENT_MIME_BY_EXTENSION.get(extension);
      if (documentMime) {
        if (stats.size > MAX_DOCUMENT_BYTES) {
          return {
            success: true,
            kind: "binary",
            name: path.basename(resolvedPath),
            path: resolvedPath,
            relativePath,
            reason: "This document is too large to preview inside the coding workspace.",
            size: stats.size,
            modifiedAt: stats.mtimeMs
          };
        }

        const data = await fs.readFile(resolvedPath);
        return {
          success: true,
          kind: "document",
          name: path.basename(resolvedPath),
          path: resolvedPath,
          relativePath,
          dataUrl: `data:${documentMime};base64,${data.toString("base64")}`,
          mime: documentMime,
          size: stats.size,
          modifiedAt: stats.mtimeMs
        };
      }

      if (!(await looksLikeTextFile(resolvedPath, stats))) {
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

    if (isProtectedAppPath(resolvedPath) && !isEnvironmentFilePath(resolvedPath)) {
      return { success: false, reason: "Autopilot app code is read-only inside the coding workspace." };
    }

    try {
      const stats = await fs.stat(resolvedPath);
      if (!stats.isFile()) {
        return { success: false, reason: "Autopilot can only save text files." };
      }

      if (!(await looksLikeTextFile(resolvedPath, stats))) {
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

  private async getGitStatusForRoot(rootPath: string): Promise<CodingGitStatusResult> {
    const [branchResult, statusResult] = await Promise.all([
      runShellCommand("git branch --show-current", rootPath, REPO_COMMAND_TIMEOUT_MS),
      runShellCommand("git status --porcelain=v1", rootPath, REPO_COMMAND_TIMEOUT_MS)
    ]);
    if (statusResult.timedOut) {
      return {
        success: false,
        rootPath,
        reason: "Git status timed out before Autopilot could read the repo state.",
        generatedAt: Date.now()
      };
    }

    if (statusResult.exitCode !== 0) {
      return {
        success: false,
        rootPath,
        reason: statusResult.stderr.trim() || statusResult.stdout.trim() || statusResult.error || "Git status failed.",
        generatedAt: Date.now()
      };
    }

    return {
      success: true,
      rootPath,
      branch: branchResult.exitCode === 0 && branchResult.stdout.trim() ? branchResult.stdout.trim() : "unknown",
      changedFiles: parseGitPorcelainStatus(statusResult.stdout),
      generatedAt: Date.now()
    };
  }

  private createRunningPluginStatus(plugin: PluginDefinition, install: RunningPluginInstall): CodingPluginStatus {
    return {
      id: plugin.id,
      name: plugin.name,
      command: plugin.command,
      status: "installing",
      installed: false,
      startedAt: install.startedAt,
      estimatedSeconds: install.estimatedSeconds,
      elapsedMs: Date.now() - install.startedAt,
      stdout: Buffer.concat(install.stdoutChunks).toString("utf8").slice(-PLUGIN_OUTPUT_LIMIT),
      stderr: Buffer.concat(install.stderrChunks).toString("utf8").slice(-PLUGIN_OUTPUT_LIMIT)
    };
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
        let stats;
        try {
          stats = await fs.stat(entryPath);
        } catch {
          continue;
        }
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

  private async listDirectory(
    rootPath: string,
    directoryPath: string,
    options: { limit: number | null } = { limit: MAX_TREE_CHILDREN }
  ): Promise<CodingDirectoryEntry[]> {
    const entries = await fs.readdir(directoryPath, { withFileTypes: true });
    const visibleEntries = entries
      .filter((entry) => (entry.isDirectory() || entry.isFile()) && !(entry.isDirectory() && SKIPPED_DIRECTORIES.has(entry.name)))
      .sort((leftEntry, rightEntry) => {
        if (leftEntry.isDirectory() !== rightEntry.isDirectory()) {
          return leftEntry.isDirectory() ? -1 : 1;
        }

        return leftEntry.name.localeCompare(rightEntry.name, undefined, { sensitivity: "base" });
      });
    const selectedEntries = limitDirectoryEntries(visibleEntries, options.limit);
    const truncated = selectedEntries.length < visibleEntries.length;
    const nodes: CodingDirectoryEntry[] = [];
    for (const entry of selectedEntries) {
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

    const entries = await this.listDirectory(rootPath, targetPath, { limit: MAX_TREE_CHILDREN });
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

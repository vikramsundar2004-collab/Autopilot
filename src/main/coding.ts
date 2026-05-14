import { app, dialog, type BrowserWindow } from "electron";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { randomUUID } from "node:crypto";
import type { Dirent, Stats } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

import {
  createCodingAgentPlanFromOverview,
  parseGitPorcelainStatus,
  type CodingAgentPlan,
  type CodingAgentProgressEvent,
  type CodingAgentPlanResult,
  type CodingAgentRunResult,
  type CodingAccessMode,
  type CodingCommandExecution,
  type CodingCommandLogResult,
  type CodingCommandPlan,
  type CodingCommandRequest,
  type CodingCommandResult,
  type CodingDeepQaBenchmarkResult,
  type CodingDeleteResult,
  type CodingDirectoryEntry,
  type CodingFileReadResult,
  type CodingGitDiffResult,
  type CodingGitStatusResult,
  type CodingLanguageToolStatus,
  type CodingPluginInstallResult,
  type CodingPluginStatus,
  type CodingOpenFileResult,
  type CodingPatchFileChange,
  type CodingPatchSetResult,
  type CodingProject,
  type CodingProjectMemory,
  type CodingPreviewValidation,
  type CodingPreviewValidationRequest,
  type CodingPreviewValidationResult,
  type CodingRepoOverview,
  type CodingRepoOverviewResult,
  type CodingRenameProjectResult,
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
  type CodingWriteResult,
  type GitCommitProposalResult,
  type GitCommitRequest,
  type GitCommitResult,
  type GitPushRequest,
  type GitPushResult,
  type GitSafetyWarning
} from "../shared/coding.js";
import { CODING_PLUGIN_DEFINITIONS, type CodingPluginDefinition } from "../shared/codingPlugins.js";
import { buildCompetitiveThreatAppendix, buildThreatResponseMatrix, isCompetitorAnalysisPrompt } from "../shared/competitiveThreats.js";

const PROJECTS_FILE = "coding-projects.json";
const MAX_TREE_DEPTH = 5;
const MAX_TREE_CHILDREN = 160;
const MAX_SEARCH_RESULTS = 80;
const MAX_TEXT_BYTES = 2 * 1024 * 1024;
const MAX_JSON_CONFIG_BYTES = 512 * 1024;
const MAX_PROJECT_MEMORY_BYTES = 32 * 1024;
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
const MAX_SECRET_SCAN_BYTES = 512 * 1024;
const PROTECTED_BRANCH_PATTERN = /^(main|master|production|prod|release)$/iu;
const SECRET_FILE_PATTERN = /(^|[/\\])(\.env(\..*)?|id_rsa|id_dsa|id_ecdsa|id_ed25519|.*\.(pem|key|p12|pfx|crt|cer|token))$/iu;
const SECRET_CONTENT_PATTERN = /(-----BEGIN [A-Z ]*PRIVATE KEY-----|AKIA[0-9A-Z]{16}|sk-[A-Za-z0-9_-]{20,}|xox[baprs]-[A-Za-z0-9-]{20,}|ghp_[A-Za-z0-9]{20,}|OPENAI_API_KEY\s*=|SUPABASE_SERVICE_ROLE_KEY\s*=|STRIPE_SECRET_KEY\s*=)/u;

const PROJECT_MEMORY_CANDIDATES = [
  "AUTOPILOT.md",
  "AGENTS.md",
  "CLAUDE.md",
  ".cursorrules",
  path.join(".github", "copilot-instructions.md")
];

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
    const base = `I ran ${iterations.length} recursive research ${iterations.length === 1 ? "pass" : "passes"} for "${input}", but no usable sources came back. Try a narrower industry, company, or time window.`;
    return appendCompetitiveThreatsIfNeeded(input, base);
  }

  const topSignals = sources
    .slice(0, 5)
    .map((source, index) => {
      const sourceLabel = [source.sourceName, formatResearchSourceDate(source.publishedAt)].filter(Boolean).join(" - ");
      return `${index + 1}. ${source.title}${sourceLabel ? ` (${sourceLabel})` : ""}`;
    })
    .join("\n");

  const answer = [
    `I ran ${iterations.length} recursive research ${iterations.length === 1 ? "pass" : "passes"} for "${input}" using Google News/search routes.`,
    "",
    "Latest signals:",
    topSignals,
    "",
    "Ask a follow-up in the research bar to recurse on one slice, compare competitors, or turn this into a brief."
  ].join("\n");

  return appendCompetitiveThreatsIfNeeded(input, answer);
}

function appendCompetitiveThreatsIfNeeded(input: string, answer: string): string {
  if (!isCompetitorAnalysisPrompt(input)) {
    return answer;
  }

  return `${answer}\n\n${buildCompetitiveThreatAppendix()}\n\n${buildThreatResponseMatrix()}`;
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
    if (Buffer.byteLength(raw, "utf8") > MAX_JSON_CONFIG_BYTES) {
      console.warn(`Autopilot ignored oversized JSON config at ${filePath}.`);
      return fallback;
    }
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as T) : fallback;
  } catch (error) {
    warnCodingIssue(`Autopilot could not parse JSON config at ${filePath}.`, error);
    return fallback;
  }
}

function sanitizeObjectRecord(value: unknown, limit = 200): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  return Object.fromEntries(Object.entries(value as Record<string, unknown>).slice(0, limit));
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

function sanitizeGitRef(value: string): string {
  const trimmed = value.trim();
  return /^[A-Za-z0-9._/-]{1,160}$/u.test(trimmed) && !trimmed.includes("..") ? trimmed : "";
}

function sanitizeCommitMessage(value?: string): string {
  return String(value ?? "")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

function sanitizeGitFileSelection(rootPath: string, changedFiles: Array<{ path: string; staged: boolean }>, filePaths?: string[]): string[] {
  const changed = new Set(changedFiles.map((file) => file.path));
  const selected = Array.isArray(filePaths) && filePaths.length > 0
    ? filePaths
    : changedFiles.filter((file) => file.staged).map((file) => file.path);
  return selected
    .map((filePath) => {
      const normalized = path.isAbsolute(filePath) ? toRelativePath(rootPath, path.resolve(filePath)) : filePath;
      return normalized.replace(/\\/g, "/").replace(/^\.\/+/u, "").trim();
    })
    .filter((filePath, index, all) => filePath && !filePath.startsWith("../") && changed.has(filePath) && all.indexOf(filePath) === index);
}

function buildCommitMessageFromChanges(changedFiles: Array<{ path: string }>, selectedFiles: string[]): string {
  const targets = selectedFiles.length > 0 ? selectedFiles : changedFiles.map((file) => file.path);
  if (targets.length === 0) {
    return "Update project files";
  }
  const first = targets[0]?.split(/[\\/]/u).pop() ?? "project files";
  if (targets.length === 1) {
    return `Update ${first}`;
  }
  return `Update ${first} and ${targets.length - 1} more file${targets.length === 2 ? "" : "s"}`;
}

async function readPackageJson(rootPath: string): Promise<{ scripts?: Record<string, unknown>; dependencies?: Record<string, unknown>; devDependencies?: Record<string, unknown> } | null> {
  try {
    const raw = await fs.readFile(path.join(rootPath, "package.json"), "utf8");
    if (Buffer.byteLength(raw, "utf8") > MAX_JSON_CONFIG_BYTES) {
      console.warn(`Autopilot ignored oversized package.json in ${rootPath}.`);
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    const record = parsed as Record<string, unknown>;
    return {
      scripts: sanitizeObjectRecord(record.scripts, 80),
      dependencies: sanitizeObjectRecord(record.dependencies, 300),
      devDependencies: sanitizeObjectRecord(record.devDependencies, 300)
    };
  } catch (error) {
    warnCodingIssue(`Autopilot could not parse package.json in ${rootPath}.`, error);
    return null;
  }
}

function warnCodingIssue(message: string, error?: unknown): void {
  const detail = error instanceof Error ? error.message : typeof error === "string" ? error : undefined;
  console.warn(detail ? `${message} ${detail}` : message);
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
    "AUTOPILOT.md",
    "AGENTS.md",
    "CLAUDE.md",
    ".cursorrules",
    path.join(".github", "copilot-instructions.md"),
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

async function readProjectMemory(rootPath: string): Promise<CodingProjectMemory> {
  for (const candidate of PROJECT_MEMORY_CANDIDATES) {
    const memoryPath = path.join(rootPath, candidate);
    if (!(await pathExists(memoryPath))) {
      continue;
    }

    try {
      const stats = await fs.stat(memoryPath);
      if (!stats.isFile()) {
        continue;
      }

      const raw = await fs.readFile(memoryPath, "utf8");
      const truncated = Buffer.byteLength(raw, "utf8") > MAX_PROJECT_MEMORY_BYTES;
      const content = truncated ? raw.slice(0, MAX_PROJECT_MEMORY_BYTES) : raw;
      const instructions = extractProjectMemoryInstructions(content);
      return {
        present: true,
        relativePath: toRelativePath(rootPath, memoryPath),
        summary: summarizeProjectMemory(instructions, truncated),
        instructions,
        truncated
      };
    } catch (error) {
      warnCodingIssue(`Autopilot could not read project memory at ${memoryPath}.`, error);
    }
  }

  return {
    present: false,
    summary: "No AUTOPILOT.md, AGENTS.md, CLAUDE.md, .cursorrules, or Copilot instructions file was found.",
    instructions: []
  };
}

function extractProjectMemoryInstructions(content: string): string[] {
  return content
    .split(/\r?\n/u)
    .map((line) =>
      line
        .replace(/^\s{0,3}[-*]\s+/u, "")
        .replace(/^\s{0,3}\d+\.\s+/u, "")
        .replace(/^#+\s*/u, "")
        .trim()
    )
    .filter((line) => line.length > 0 && !/^```/u.test(line))
    .filter((line) => /[a-z0-9]/iu.test(line))
    .slice(0, 8)
    .map((line) => line.slice(0, 180));
}

function summarizeProjectMemory(instructions: string[], truncated: boolean): string {
  if (instructions.length === 0) {
    return truncated ? "Project memory exists but was too large to summarize fully." : "Project memory exists but contains no plain instruction lines.";
  }

  const summary = instructions.slice(0, 3).join(" ");
  return truncated ? `${summary} (truncated)` : summary;
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
  projectMemory?: CodingProjectMemory;
}): string {
  const stackLabel = input.frameworkHints.length > 0 ? input.frameworkHints.join(", ") : "no framework hints detected";
  const scriptLabel = input.scripts.length > 0 ? `${input.scripts.length} package script${input.scripts.length === 1 ? "" : "s"}` : "no package scripts";
  const fileLabel = input.keyFiles.length > 0 ? `key files include ${input.keyFiles.slice(0, 4).join(", ")}` : "no known key files found";
  const memoryLabel = input.projectMemory?.present ? ` Project memory is loaded from ${input.projectMemory.relativePath}.` : " No project memory file was found.";
  return `${input.projectName} looks like a ${input.packageManager} project with ${stackLabel}, ${scriptLabel}, and ${fileLabel}. Git currently reports ${input.changedFiles} changed file${input.changedFiles === 1 ? "" : "s"}.${memoryLabel}`;
}

function buildCodingRunProgress(
  runId: string,
  plan: CodingAgentPlan,
  input: {
    changedFiles: Extract<CodingGitStatusResult, { success: true }>["changedFiles"];
    diffReady: boolean;
    gitReason?: string;
    diffReason?: string;
    now: number;
  }
): CodingAgentProgressEvent[] {
  const events: CodingAgentProgressEvent[] = [
    {
      id: `${runId}:understanding`,
      runId,
      phase: "understanding",
      message: `Reading project files for: ${plan.goal}`,
      createdAt: input.now
    }
  ];

  if (plan.projectMemory?.present) {
    events.push({
      id: `${runId}:memory`,
      runId,
      phase: "planning",
      message: `Loaded project memory from ${plan.projectMemory.relativePath}: ${plan.projectMemory.summary}`,
      createdAt: input.now + 1,
      files: plan.projectMemory.relativePath ? [plan.projectMemory.relativePath] : undefined
    });
  }

  events.push(
    {
      id: `${runId}:schema`,
      runId,
      phase: "schema",
      message: `Found app entrypoint and target shape: ${plan.schema.expectedOutput}`,
      createdAt: input.now + 2,
      files: plan.schema.touchedFiles
    },
    {
      id: `${runId}:editing`,
      runId,
      phase: "editing",
      message:
        plan.schema.touchedFiles.length > 0
          ? `Writing patch candidate for ${plan.schema.touchedFiles.slice(0, 3).join(", ")}.`
          : "Writing patch candidate after the editor target is selected.",
      createdAt: input.now + 3,
      files: plan.schema.touchedFiles
    },
    {
      id: `${runId}:verification`,
      runId,
      phase: "testing",
      message:
        plan.suggestedCommands.length > 0
          ? `Running tests is approval-gated: ${plan.suggestedCommands.slice(0, 3).join(", ")}`
          : "No package verification command was detected; use the terminal for a project-specific check.",
      createdAt: input.now + 4,
      command: plan.suggestedCommands[0],
      requiresApproval: true
    },
    {
      id: `${runId}:review`,
      runId,
      phase: "review",
      message: input.diffReady && input.changedFiles.length > 0
        ? `Diff ready for review with ${input.changedFiles.length} changed file${input.changedFiles.length === 1 ? "" : "s"}.`
        : `Done blocked until there is a diff, command evidence, or a precise blocker: ${input.diffReason ?? input.gitReason ?? "no changed files"}`,
      createdAt: input.now + 5,
      files: input.changedFiles.map((file) => file.path),
      requiresApproval: true
    }
  );

  return events;
}

const SAFE_COMMAND_PATTERNS = [
  /^git\s+(status|diff|show|log|branch|rev-parse)\b/iu,
  /^(npm|pnpm|yarn)\s+(test|run\s+(test|check|build|lint|typecheck))\b/iu,
  /^npx\s+(vitest|playwright)\b/iu,
  /^(node|npm|pnpm|yarn)\s+(-v|--version)\b/iu,
  /^(ls|dir|Get-ChildItem)\b/iu
];

const WRITE_COMMAND_PATTERNS = [
  /^(npm|pnpm|yarn)\s+(install|i|add|remove|uninstall)\b/iu,
  /^git\s+(add|commit|checkout|switch|merge|rebase|stash)\b/iu,
  /(^|\s)(mkdir|New-Item|Set-Content|Copy-Item|Move-Item)\b/iu,
  /(>|>>)\s*[^&|]+$/u
];

const EXTERNAL_COMMAND_PATTERNS = [
  /^git\s+push\b/iu,
  /^(npm|pnpm|yarn)\s+publish\b/iu,
  /\b(netlify|vercel|firebase|supabase)\s+.*\b(deploy|publish|push)\b/iu,
  /\b(curl|Invoke-WebRequest|wget)\b/iu
];

const DESTRUCTIVE_COMMAND_PATTERNS = [
  /\brm\s+-rf\b/iu,
  /\bRemove-Item\b.*\b-Recurse\b/iu,
  /\b(del|erase|rmdir)\b/iu,
  /\bgit\s+(reset\s+--hard|clean\s+-fd|push\s+--force)\b/iu,
  /\b(format|shutdown|Stop-Computer)\b/iu
];

const BLOCKED_COMMAND_PATTERNS = [
  /\b(format|shutdown|Stop-Computer)\b/iu,
  /\bgit\s+push\b.*\s--force(?:-with-lease)?\b/iu
];

function createCommandSafetyDecision(command: string) {
  if (BLOCKED_COMMAND_PATTERNS.some((pattern) => pattern.test(command))) {
    return {
      allowed: false,
      requiresApproval: true,
      risk: "destructive" as const,
      reason: "This command is blocked because it can destroy local state or overwrite remote history."
    };
  }

  if (DESTRUCTIVE_COMMAND_PATTERNS.some((pattern) => pattern.test(command))) {
    return {
      allowed: true,
      requiresApproval: true,
      risk: "destructive" as const,
      reason: "This command can delete or overwrite local work, so Autopilot needs explicit approval."
    };
  }

  if (EXTERNAL_COMMAND_PATTERNS.some((pattern) => pattern.test(command))) {
    return {
      allowed: true,
      requiresApproval: true,
      risk: "external" as const,
      reason: "This command can affect external systems, so Autopilot needs explicit approval."
    };
  }

  if (WRITE_COMMAND_PATTERNS.some((pattern) => pattern.test(command))) {
    return {
      allowed: true,
      requiresApproval: true,
      risk: "write" as const,
      reason: "This command can change local files or dependencies, so Autopilot needs approval unless full access is enabled."
    };
  }

  if (SAFE_COMMAND_PATTERNS.some((pattern) => pattern.test(command))) {
    return {
      allowed: true,
      requiresApproval: false,
      risk: "safe" as const,
      reason: "This looks like a read-only or verification command."
    };
  }

  return {
    allowed: true,
    requiresApproval: true,
    risk: "write" as const,
    reason: "Autopilot could not prove this command is read-only, so it needs approval."
  };
}

function describeCommandPurpose(command: string): string {
  if (/\b(test|vitest|playwright)\b/iu.test(command)) {
    return "Run project tests and attach the result to Coding proof.";
  }
  if (/\b(build|typecheck|check|lint)\b/iu.test(command)) {
    return "Verify the project build or static checks before review.";
  }
  if (/^git\s+diff\b/iu.test(command)) {
    return "Inspect the current code diff before approval.";
  }
  if (/^git\s+status\b/iu.test(command)) {
    return "Inspect changed files in the active project.";
  }
  return "Run an active-project command with safety review.";
}

function parseNumstat(output: string): Map<string, { additions: number; deletions: number }> {
  const stats = new Map<string, { additions: number; deletions: number }>();
  for (const line of output.split(/\r?\n/u)) {
    const parts = line.trim().split(/\t/u);
    if (parts.length < 3) {
      continue;
    }

    const additions = Number.parseInt(parts[0] ?? "0", 10);
    const deletions = Number.parseInt(parts[1] ?? "0", 10);
    const filePath = parts.slice(2).join("\t");
    stats.set(filePath, {
      additions: Number.isFinite(additions) ? additions : 0,
      deletions: Number.isFinite(deletions) ? deletions : 0
    });
  }

  return stats;
}

function toPatchFileStatus(status: string): CodingPatchFileChange["status"] {
  if (status.includes("D")) {
    return "deleted";
  }
  if (status.includes("A") || status.includes("?")) {
    return "created";
  }
  return "modified";
}

function normalizeConsoleMessages(messages: string[] | undefined): string[] {
  return (messages ?? []).map((message) => message.trim()).filter(Boolean).slice(0, 10);
}

function buildDeepQaCases(activeProjectReady: boolean): CodingDeepQaBenchmarkResult["cases"] {
  const cases: CodingDeepQaBenchmarkResult["cases"] = [
    {
      scenario: "tetris",
      prompt: "Build a playable Tetris game with keyboard controls, scoring, restart, and preview validation.",
      requiredEvidence: ["multi_file_patch", "diff", "command", "preview", "repair_loop", "approval_gate"],
      status: activeProjectReady ? "ready" : "blocked",
      reason: activeProjectReady ? undefined : "Open a project before running generated-game QA."
    },
    {
      scenario: "snake",
      prompt: "Build a playable Snake game and verify the canvas is not blank in Browser Test.",
      requiredEvidence: ["multi_file_patch", "diff", "command", "preview", "repair_loop", "approval_gate"],
      status: activeProjectReady ? "ready" : "blocked",
      reason: activeProjectReady ? undefined : "Open a project before running generated-game QA."
    },
    {
      scenario: "todo_app",
      prompt: "Create a CRUD todo app with persistence, empty states, and tests.",
      requiredEvidence: ["multi_file_patch", "diff", "command", "preview", "approval_gate"],
      status: activeProjectReady ? "ready" : "blocked",
      reason: activeProjectReady ? undefined : "Open a project before running app-generation QA."
    },
    {
      scenario: "dashboard",
      prompt: "Build a small analytics dashboard with charts, filters, and responsive layout.",
      requiredEvidence: ["multi_file_patch", "diff", "command", "preview", "approval_gate"],
      status: activeProjectReady ? "ready" : "blocked",
      reason: activeProjectReady ? undefined : "Open a project before running dashboard QA."
    },
    {
      scenario: "agent",
      prompt: "Implement a scoped agent with tool permission checks and trace output.",
      requiredEvidence: ["multi_file_patch", "diff", "command", "approval_gate"],
      status: activeProjectReady ? "ready" : "blocked",
      reason: activeProjectReady ? undefined : "Open a project before running agent QA."
    },
    {
      scenario: "plugin",
      prompt: "Implement a plugin scaffold with manifest validation and install status.",
      requiredEvidence: ["multi_file_patch", "diff", "command", "approval_gate"],
      status: activeProjectReady ? "ready" : "blocked",
      reason: activeProjectReady ? undefined : "Open a project before running plugin QA."
    },
    {
      scenario: "skill",
      prompt: "Implement a skill scaffold with readable instructions and tests.",
      requiredEvidence: ["multi_file_patch", "diff", "command", "approval_gate"],
      status: activeProjectReady ? "ready" : "blocked",
      reason: activeProjectReady ? undefined : "Open a project before running skill QA."
    },
    {
      scenario: "complex_repo_feature",
      prompt: "Add a feature across shared types, main process IPC, renderer UI, and tests.",
      requiredEvidence: ["multi_file_patch", "diff", "command", "repair_loop", "approval_gate"],
      status: activeProjectReady ? "ready" : "blocked",
      reason: activeProjectReady ? undefined : "Open a project before running complex feature QA."
    },
    {
      scenario: "fix_failing_test",
      prompt: "Diagnose a failing test, patch the cause, rerun the test, and explain the evidence.",
      requiredEvidence: ["multi_file_patch", "diff", "command", "repair_loop", "approval_gate"],
      status: activeProjectReady ? "ready" : "blocked",
      reason: activeProjectReady ? undefined : "Open a project before running repair QA."
    },
    {
      scenario: "refactor_shared_module",
      prompt: "Refactor a shared module while preserving public behavior and test coverage.",
      requiredEvidence: ["multi_file_patch", "diff", "command", "approval_gate"],
      status: activeProjectReady ? "ready" : "blocked",
      reason: activeProjectReady ? undefined : "Open a project before running refactor QA."
    }
  ];

  return cases;
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
  private commandExecutions: CodingCommandExecution[] = [];
  private previewValidations: CodingPreviewValidation[] = [];

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
    const [keyFiles, frameworkHints, projectMemory, gitStatus] = await Promise.all([
      collectKeyFiles(activeProject.rootPath),
      collectFrameworkHints(activeProject.rootPath, packageJson),
      readProjectMemory(activeProject.rootPath),
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
      projectMemory,
      summary: buildRepoOverviewSummary({
        projectName: activeProject.name,
        packageManager,
        scripts,
        frameworkHints,
        keyFiles,
        changedFiles: changedFiles.length,
        projectMemory
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

  async startAgentRun(goal: string): Promise<CodingAgentRunResult> {
    const planResult = await this.createAgentPlan(goal);
    if (!planResult.success) {
      return {
        success: false,
        reason: planResult.reason,
        generatedAt: Date.now()
      };
    }

    const [status, diff] = await Promise.all([this.getGitStatus(), this.getGitDiff()]);
    const now = Date.now();
    const runId = `coding-run:${randomUUID()}`;
    const changedFiles = status.success ? status.changedFiles : [];
    const proofReady = diff.success && changedFiles.length > 0;
    const progress = buildCodingRunProgress(runId, planResult.plan, {
      changedFiles,
      diffReady: diff.success,
      gitReason: status.success ? undefined : status.reason,
      diffReason: diff.success ? undefined : diff.reason,
      now
    });

    return {
      success: true,
      plan: planResult.plan,
      run: {
        id: runId,
        planId: planResult.plan.id,
        phase: "review",
        understanding: planResult.plan.summary,
        schema: planResult.plan.schema,
        plan: planResult.plan.steps,
        commands: [],
        changedFiles,
        testResults: planResult.plan.suggestedCommands.length > 0
          ? [
              `Suggested verification: ${planResult.plan.suggestedCommands.slice(0, 3).join(", ")}`,
              proofReady ? "Diff evidence is available." : "Done is blocked until Coding generates or detects a reviewable diff."
            ]
          : [
              "No package verification command detected yet.",
              proofReady ? "Diff evidence is available." : "Done is blocked until Coding generates or detects a reviewable diff."
            ],
        progress,
        diff: diff.success ? diff.diff : undefined,
        approvalState: "needs_review",
        createdAt: now,
        updatedAt: now
      }
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

  async createGitCommitProposal(message?: string, filePaths?: string[]): Promise<GitCommitProposalResult> {
    await this.ensureLoaded();
    const activeProject = this.getActiveProject();
    if (!activeProject) {
      return {
        success: false,
        reason: "Open a local project before creating a commit proposal.",
        generatedAt: Date.now()
      };
    }

    const status = await this.getGitStatusForRoot(activeProject.rootPath);
    if (!status.success) {
      return {
        success: false,
        reason: status.reason,
        generatedAt: Date.now()
      };
    }

    const selectedFiles = sanitizeGitFileSelection(activeProject.rootPath, status.changedFiles, filePaths);
    const warnings = await this.buildGitSafetyWarnings(activeProject.rootPath, status.branch, status.changedFiles, selectedFiles, false);
    const diffCommand =
      selectedFiles.length > 0
        ? `git diff --no-ext-diff -- ${selectedFiles.map((filePath) => quoteShellArgument(filePath)).join(" ")}`
        : "git diff --no-ext-diff";
    const diffResult = await runShellCommand(diffCommand, activeProject.rootPath, REPO_COMMAND_TIMEOUT_MS, MAX_GIT_DIFF_BYTES);
    const proposedMessage = sanitizeCommitMessage(message) || buildCommitMessageFromChanges(status.changedFiles, selectedFiles);

    return {
      success: true,
      id: `git-commit-proposal:${randomUUID()}`,
      rootPath: activeProject.rootPath,
      branch: status.branch,
      remote: "origin",
      changedFiles: status.changedFiles,
      selectedFiles,
      proposedMessage,
      diffPreview: diffResult.exitCode === 0 ? diffResult.stdout : "",
      testsStatus: "not_run",
      warnings,
      blocked: warnings.some((warning) => warning.blocking),
      approvalRequired: true,
      generatedAt: Date.now()
    };
  }

  async gitCommit(request: GitCommitRequest): Promise<GitCommitResult> {
    await this.ensureLoaded();
    const activeProject = this.getActiveProject();
    if (!activeProject) {
      return {
        success: false,
        reason: "Open a local project before committing."
      };
    }
    if (request.approved !== true) {
      return {
        success: false,
        reason: "Git commit requires explicit approval after reviewing status, diff, warnings, and tests."
      };
    }

    const proposal = await this.createGitCommitProposal(request.message, request.filePaths);
    if (!proposal.success) {
      return { success: false, reason: proposal.reason, proposal };
    }
    const warnings = [
      ...proposal.warnings,
      ...(!request.testsPassed && !request.overrideFailedTests
        ? [
            {
              code: "failed_tests" as const,
              message: "Tests have not been marked as passed. Approve an override before committing anyway.",
              blocking: true
            }
          ]
        : [])
    ];
    if (warnings.some((warning) => warning.blocking)) {
      return {
        success: false,
        reason: warnings.find((warning) => warning.blocking)?.message ?? "Commit is blocked by safety checks.",
        proposal: {
          ...proposal,
          warnings,
          blocked: true
        }
      };
    }
    if (proposal.selectedFiles.length === 0) {
      return {
        success: false,
        reason: "Select the exact files to stage. Autopilot will not stage unrelated files by default.",
        proposal
      };
    }

    const addCommand = `git add -- ${proposal.selectedFiles.map((filePath) => quoteShellArgument(filePath)).join(" ")}`;
    const addResult = await runShellCommand(addCommand, activeProject.rootPath, REPO_COMMAND_TIMEOUT_MS, PLUGIN_OUTPUT_LIMIT);
    if (addResult.exitCode !== 0) {
      return {
        success: false,
        reason: addResult.stderr.trim() || addResult.stdout.trim() || addResult.error || "Git add failed.",
        proposal
      };
    }

    const message = sanitizeCommitMessage(request.message) || proposal.proposedMessage;
    const commitResult = await runShellCommand(`git commit -m ${quoteShellArgument(message)}`, activeProject.rootPath, REPO_COMMAND_TIMEOUT_MS, PLUGIN_OUTPUT_LIMIT);
    if (commitResult.exitCode !== 0) {
      return {
        success: false,
        reason: commitResult.stderr.trim() || commitResult.stdout.trim() || commitResult.error || "Git commit failed.",
        proposal
      };
    }

    const hashResult = await runShellCommand("git rev-parse HEAD", activeProject.rootPath, REPO_COMMAND_TIMEOUT_MS, 2000);
    return {
      success: true,
      commitHash: hashResult.exitCode === 0 ? hashResult.stdout.trim() : "unknown",
      message,
      branch: proposal.branch,
      files: proposal.selectedFiles,
      stdout: commitResult.stdout,
      stderr: commitResult.stderr.trim() || undefined,
      committedAt: Date.now()
    };
  }

  async gitPush(request: GitPushRequest): Promise<GitPushResult> {
    await this.ensureLoaded();
    const activeProject = this.getActiveProject();
    if (!activeProject) {
      return {
        success: false,
        reason: "Open a local project before pushing."
      };
    }
    if (request.force) {
      return {
        success: false,
        reason: "Force push is blocked in this version.",
        warnings: [{ code: "force_push_blocked", message: "Force push is blocked in v1.", blocking: true }]
      };
    }
    if (request.approved !== true) {
      return {
        success: false,
        reason: "Git push requires explicit approval after reviewing branch, remote, commit, and warnings."
      };
    }

    const status = await this.getGitStatusForRoot(activeProject.rootPath);
    if (!status.success) {
      return { success: false, reason: status.reason };
    }
    const branch = sanitizeGitRef(request.branch || status.branch);
    const remote = sanitizeGitRef(request.remote || "origin");
    if (!branch || branch === "unknown") {
      return { success: false, reason: "Could not determine the branch to push." };
    }
    if (!remote) {
      return { success: false, reason: "Remote is required before pushing." };
    }

    const warnings = await this.buildGitSafetyWarnings(activeProject.rootPath, branch, status.changedFiles, [], true);
    if (warnings.some((warning) => warning.blocking)) {
      return {
        success: false,
        reason: warnings.find((warning) => warning.blocking)?.message ?? "Push is blocked by safety checks.",
        warnings
      };
    }

    const pushResult = await runShellCommand(`git push ${quoteShellArgument(remote)} ${quoteShellArgument(branch)}`, activeProject.rootPath, REPO_COMMAND_TIMEOUT_MS * 3, PLUGIN_OUTPUT_LIMIT);
    if (pushResult.exitCode !== 0) {
      return {
        success: false,
        reason: pushResult.stderr.trim() || pushResult.stdout.trim() || pushResult.error || "Git push failed.",
        warnings
      };
    }
    return {
      success: true,
      remote,
      branch,
      stdout: pushResult.stdout,
      stderr: pushResult.stderr.trim() || undefined,
      pushedAt: Date.now()
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
    const result = await dialog.showOpenDialog(window, {
      title: "Choose or create project folder",
      buttonLabel: "Use folder",
      defaultPath: app.getPath("documents"),
      properties: ["openDirectory", "createDirectory"]
    });

    if (result.canceled || result.filePaths.length === 0) {
      return this.buildSnapshot();
    }

    const folderPath = result.filePaths[0];
    await fs.mkdir(folderPath, { recursive: true });
    return this.addProject(folderPath);
  }

  async selectProject(rootPath: string): Promise<CodingSnapshot> {
    await this.ensureLoaded();
    const resolvedRoot = path.resolve(rootPath);
    if (this.projects.some((project) => project.rootPath === resolvedRoot)) {
      this.activeRootPath = resolvedRoot;
      await this.saveProjects();
      return this.buildSnapshot();
    }

    try {
      const stats = await fs.stat(resolvedRoot);
      if (stats.isDirectory()) {
        return this.addProject(resolvedRoot);
      }
    } catch {
      // Keep the existing snapshot when the requested folder cannot be opened.
    }

    return this.buildSnapshot();
  }

  async renameProject(rootPath: string, name: string): Promise<CodingRenameProjectResult> {
    await this.ensureLoaded();
    const resolvedRoot = path.resolve(rootPath);
    const trimmedName = name.trim().replace(/\s+/g, " ").slice(0, 80);

    if (!trimmedName) {
      return {
        success: false,
        reason: "Project name cannot be empty.",
        snapshot: await this.buildSnapshot()
      };
    }

    if (!this.projects.some((project) => project.rootPath === resolvedRoot)) {
      return {
        success: false,
        reason: "Autopilot could not find that project.",
        snapshot: await this.buildSnapshot()
      };
    }

    this.projects = this.projects.map((project) =>
      project.rootPath === resolvedRoot
        ? {
            ...project,
            name: trimmedName
          }
        : project
    );
    await this.saveProjects();
    return {
      success: true,
      snapshot: await this.buildSnapshot()
    };
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

  async planCommand(input: CodingCommandRequest): Promise<CodingCommandPlan> {
    await this.ensureLoaded();
    const command = input.command.trim();
    const activeProject = this.getActiveProject();
    const cwd = path.resolve(input.cwd || activeProject?.rootPath || app.getPath("home"));
    return {
      id: `coding-command-plan:${randomUUID()}`,
      command,
      cwd,
      purpose: describeCommandPurpose(command),
      safety: command
        ? createCommandSafetyDecision(command)
        : {
            allowed: false,
            requiresApproval: false,
            risk: "safe",
            reason: "Enter a command to plan."
          },
      createdAt: Date.now()
    };
  }

  async approveCommand(input: CodingCommandRequest): Promise<CodingCommandResult> {
    return this.runCommand({
      ...input,
      approved: true
    });
  }

  async getCommandLog(): Promise<CodingCommandLogResult> {
    return {
      success: true,
      executions: [...this.commandExecutions]
    };
  }

  async createPatchSet(): Promise<CodingPatchSetResult> {
    await this.ensureLoaded();
    const activeProject = this.getActiveProject();
    if (!activeProject) {
      return {
        success: false,
        reason: "Open a local project before creating a patchset.",
        generatedAt: Date.now()
      };
    }

    const [status, unstagedNumstat, stagedNumstat] = await Promise.all([
      this.getGitStatus(),
      runShellCommand("git diff --numstat", activeProject.rootPath, REPO_COMMAND_TIMEOUT_MS, MAX_GIT_DIFF_BYTES),
      runShellCommand("git diff --cached --numstat", activeProject.rootPath, REPO_COMMAND_TIMEOUT_MS, MAX_GIT_DIFF_BYTES)
    ]);
    if (!status.success) {
      return {
        success: false,
        reason: status.reason,
        generatedAt: Date.now()
      };
    }

    if (status.changedFiles.length === 0) {
      return {
        success: false,
        reason: "No changed files are available. Coding cannot claim done until it has a diff or a precise blocker.",
        generatedAt: Date.now()
      };
    }

    const stats = new Map<string, { additions: number; deletions: number }>();
    for (const map of [parseNumstat(unstagedNumstat.stdout), parseNumstat(stagedNumstat.stdout)]) {
      for (const [filePath, counts] of map) {
        const existing = stats.get(filePath) ?? { additions: 0, deletions: 0 };
        stats.set(filePath, {
          additions: existing.additions + counts.additions,
          deletions: existing.deletions + counts.deletions
        });
      }
    }

    const files: CodingPatchFileChange[] = status.changedFiles.map((file) => {
      const counts = stats.get(file.path) ?? { additions: 0, deletions: 0 };
      return {
        path: file.path,
        status: toPatchFileStatus(file.status),
        additions: counts.additions,
        deletions: counts.deletions
      };
    });

    return {
      success: true,
      patchSet: {
        id: `coding-patchset:${randomUUID()}`,
        summary: `Reviewable patchset with ${files.length} changed file${files.length === 1 ? "" : "s"}.`,
        files,
        createdAt: Date.now()
      }
    };
  }

  async validatePreview(input: CodingPreviewValidationRequest): Promise<CodingPreviewValidationResult> {
    const now = Date.now();
    const consoleMessages = normalizeConsoleMessages(input.consoleMessages);
    const hasUrl = Boolean(input.url?.trim());
    const hasHtml = Boolean(input.html?.trim());
    const hasDomText = Boolean(input.domText?.trim());
    const hasScreenshot = input.screenshotPresent === true;
    const hasCanvasPixels = typeof input.canvasPixelCount === "number" && input.canvasPixelCount > 0;
    const hasConsoleError = consoleMessages.some((message) => /\b(error|exception|failed|uncaught|cannot find)\b/iu.test(message));
    const checks: CodingPreviewValidation["checks"] = [
      ...(hasScreenshot ? (["screenshot"] as const) : []),
      ...(hasDomText || hasHtml ? (["dom"] as const) : []),
      ...(consoleMessages.length > 0 ? (["console"] as const) : []),
      ...(hasCanvasPixels ? (["canvas"] as const) : [])
    ];

    if (!hasUrl && !hasHtml && !hasDomText && !hasScreenshot && !hasCanvasPixels) {
      const validation: CodingPreviewValidation = {
        id: `coding-preview:${randomUUID()}`,
        url: input.url?.trim() || "not provided",
        status: "blocked",
        checks,
        summary: "No preview evidence was provided. Browser Test cannot pass from an empty or invisible preview.",
        createdAt: now
      };
      this.previewValidations.unshift(validation);
      return {
        success: false,
        reason: validation.summary,
        validation
      };
    }

    if (hasConsoleError) {
      const validation: CodingPreviewValidation = {
        id: `coding-preview:${randomUUID()}`,
        url: input.url?.trim() || "local preview",
        status: "failed",
        checks,
        summary: `Preview failed because the console reported: ${consoleMessages[0]}`,
        createdAt: now
      };
      this.previewValidations.unshift(validation);
      return {
        success: false,
        reason: validation.summary,
        validation
      };
    }

    if (hasHtml && !hasDomText && !hasScreenshot && !hasCanvasPixels && stripHtml(input.html ?? "").trim().length === 0) {
      const validation: CodingPreviewValidation = {
        id: `coding-preview:${randomUUID()}`,
        url: input.url?.trim() || "local preview",
        status: "failed",
        checks,
        summary: "Preview rendered blank markup. Coding must repair the blank-screen state before done.",
        createdAt: now
      };
      this.previewValidations.unshift(validation);
      return {
        success: false,
        reason: validation.summary,
        validation
      };
    }

    const validation: CodingPreviewValidation = {
      id: `coding-preview:${randomUUID()}`,
      url: input.url?.trim() || "local preview",
      status: "passed",
      checks,
      summary: "Preview has visible evidence and no blocking console errors.",
      createdAt: now
    };
    this.previewValidations.unshift(validation);
    return {
      success: true,
      validation
    };
  }

  async runDeepQaBenchmark(): Promise<CodingDeepQaBenchmarkResult> {
    await this.ensureLoaded();
    return {
      success: true,
      generatedAt: Date.now(),
      cases: buildDeepQaCases(Boolean(this.getActiveProject()))
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
    const plan = await this.planCommand({ ...input, cwd });
    const recordResult = (result: CodingCommandResult, startedAt = Date.now()): CodingCommandResult => {
      this.commandExecutions.unshift({
        id: `coding-command:${randomUUID()}`,
        planId: plan.id,
        startedAt,
        finishedAt: Date.now(),
        result
      });
      this.commandExecutions.splice(50);
      return result;
    };

    if (!activeProject || !isInside(activeProject.rootPath, cwd)) {
      return recordResult({ success: false, command, cwd, reason: "Commands can only run inside the active project." });
    }

    if (!plan.safety.allowed) {
      return recordResult({ success: false, command, cwd, reason: plan.safety.reason });
    }

    if (this.accessMode !== "full" || plan.safety.requiresApproval) {
      if (!input.approved) {
        return recordResult({
          success: false,
          command,
          cwd,
          reason: plan.safety.reason || "Approve this command before Autopilot runs it.",
          requiresApproval: true
        });
      }
    }

    if (isProtectedAppPath(cwd)) {
      return recordResult({
        success: false,
        command,
        cwd,
        reason: "Autopilot app source is protected. You can read it, but commands cannot run from inside the app code."
      });
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
        resolve(
          recordResult(
            {
              success: false,
              command,
              cwd,
              reason: error.message,
              stdout: Buffer.concat(stdoutChunks).toString("utf8"),
              stderr: Buffer.concat(stderrChunks).toString("utf8"),
              exitCode: null,
              durationMs: Date.now() - startedAt
            },
            startedAt
          )
        );
      });
      child.on("close", (exitCode) => {
        clearTimeout(timeout);
        const durationMs = Date.now() - startedAt;
        const stdout = Buffer.concat(stdoutChunks).toString("utf8").slice(-12000);
        const stderr = Buffer.concat(stderrChunks).toString("utf8").slice(-12000);
        if (durationMs >= COMMAND_TIMEOUT_MS) {
          resolve(
            recordResult(
              {
                success: false,
                command,
                cwd,
                stdout,
                stderr,
                exitCode,
                durationMs,
                reason: "Command timed out after 60 seconds."
              },
              startedAt
            )
          );
          return;
        }

        resolve(
          recordResult(
            {
              success: exitCode === 0,
              command,
              cwd,
              stdout,
              stderr,
              exitCode: exitCode ?? 0,
              durationMs,
              reason: exitCode === 0 ? undefined : `Command exited with code ${exitCode ?? "unknown"}.`
            } as CodingCommandResult,
            startedAt
          )
        );
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
      let existingStats: Stats | null = null;
      try {
        existingStats = await fs.stat(resolvedPath);
      } catch (error) {
        const code = typeof error === "object" && error !== null && "code" in error ? String((error as { code?: unknown }).code) : "";
        if (code !== "ENOENT") {
          throw error;
        }
      }

      if (existingStats) {
        if (!existingStats.isFile()) {
          return { success: false, reason: "Autopilot can only save text files." };
        }

        if (!(await looksLikeTextFile(resolvedPath, existingStats))) {
          return { success: false, reason: "Autopilot will not overwrite this binary file." };
        }
      } else if (!isTextFilePath(resolvedPath)) {
        return { success: false, reason: "Autopilot can only create known text/code file types." };
      }

      await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
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

  private async buildGitSafetyWarnings(
    rootPath: string,
    branch: string,
    changedFiles: Array<{ path: string; staged: boolean; unstaged: boolean }>,
    selectedFiles: string[],
    pushMode: boolean
  ): Promise<GitSafetyWarning[]> {
    const warnings: GitSafetyWarning[] = [];
    if (PROTECTED_BRANCH_PATTERN.test(branch)) {
      warnings.push({
        code: "protected_branch",
        message: `${pushMode ? "Push" : "Commit"} targets protected-looking branch "${branch}". Review carefully before approving.`,
        blocking: false
      });
    }

    if (!pushMode && selectedFiles.length === 0) {
      warnings.push({
        code: "no_selected_files",
        message: "No files are selected. Autopilot will not stage unrelated files by default.",
        blocking: true
      });
    }

    const unselected = changedFiles.filter((file) => (file.staged || file.unstaged) && !selectedFiles.includes(file.path));
    if (!pushMode && unselected.length > 0) {
      warnings.push({
        code: "unstaged_files_not_selected",
        message: `${unselected.length} changed file${unselected.length === 1 ? "" : "s"} will not be staged by this commit.`,
        blocking: false
      });
    }

    for (const relativePath of selectedFiles) {
      if (SECRET_FILE_PATTERN.test(relativePath)) {
        warnings.push({
          code: "secret_like_file",
          message: `${relativePath} looks like a secret, certificate, key, or environment file. Autopilot will not commit it.`,
          filePath: relativePath,
          blocking: true
        });
        continue;
      }

      const fullPath = path.resolve(rootPath, relativePath);
      if (!isInside(rootPath, fullPath)) {
        warnings.push({
          code: "secret_like_file",
          message: `${relativePath} is outside the active project and cannot be committed.`,
          filePath: relativePath,
          blocking: true
        });
        continue;
      }

      try {
        const stats = await fs.stat(fullPath);
        if (!stats.isFile() || stats.size > MAX_SECRET_SCAN_BYTES) {
          continue;
        }
        const raw = await fs.readFile(fullPath, "utf8");
        if (SECRET_CONTENT_PATTERN.test(raw)) {
          warnings.push({
            code: "secret_like_content",
            message: `${relativePath} contains secret-looking content. Remove the secret or commit manually after review.`,
            filePath: relativePath,
            blocking: true
          });
        }
      } catch {
        // Missing deleted files are allowed to be committed; unreadable files are ignored by the scanner.
      }
    }

    return warnings;
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
    let entries: Dirent[];
    try {
      entries = await fs.readdir(directoryPath, { withFileTypes: true });
    } catch {
      return [];
    }

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
    let stats: Stats;
    try {
      stats = await fs.stat(targetPath);
    } catch {
      return {
        kind: "folder",
        name: depth === 0 ? getProjectName(rootPath) : path.basename(targetPath),
        path: targetPath,
        relativePath: toRelativePath(rootPath, targetPath),
        size: 0,
        modifiedAt: Date.now(),
        children: [],
        truncated: true
      };
    }

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
        try {
          node.children.push(await this.buildTree(rootPath, entry.path, depth + 1));
        } catch {
          node.children.push({
            ...entry,
            children: [],
            truncated: true
          });
        }
      } else {
        node.children.push(entry);
      }
    }

    node.truncated = entries.some((entry) => entry.truncated);
    return node;
  }
}

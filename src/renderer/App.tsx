import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bookmark,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  Clock,
  Code2,
  Download,
  Eye,
  EyeOff,
  FileText,
  Folder,
  FolderOpen,
  Github,
  Globe2,
  Image as ImageIcon,
  KeyRound,
  ListChecks,
  LockKeyhole,
  Mail,
  MessageCircle,
  Package,
  Palette,
  Play,
  Plus,
  Printer,
  RotateCw,
  Save,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Terminal,
  Trash2,
  Wrench,
  X
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  type CSSProperties,
  type FormEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from "react";

import { DEFAULT_BOOKMARKS, type BookmarkNodeTarget, type BrowserBookmarkNode, type BrowserBookmarkSourceOption } from "../shared/bookmarks";
import {
  AUTOPILOT_HOME_LABEL,
  createHistoryUrl,
  getDisplayUrl,
  isHistoryAddressInput,
  isHistoryPageUrl,
  isHomeUrl,
  type BrowserTheme,
  type Tab
} from "../shared/browserModel";
import type {
  CodingAccessMode,
  CodingCommandRequest,
  CodingCommandResult,
  CodingDirectoryEntry,
  CodingDownloadEntry,
  CodingFileReadResult,
  CodingPlugin,
  CodingPluginStatus,
  CodingProject,
  CodingResearchResult,
  CodingSearchResult,
  CodingSnapshot,
  CodingTreeNode
} from "../shared/coding";
import type { EmailActionSuggestion, EmailConnectionStatus, EmailMessageSummary } from "../shared/email";
import type { PasswordAvailability, PasswordCredentialSummary, PendingPasswordSave } from "../shared/passwords";
import type { AssistantContextSource, AssistantContextSourceId, AssistantResponse } from "../shared/assistant";
import type { ActionPlan, AgentRun } from "../shared/agent";
import {
  createDesignProjectFromArtifact,
  getActiveArtifactVersion,
  type Artifact,
  type ArtifactContent,
  type ArtifactExportResult,
  type ArtifactExportToCodingResult,
  type ArtifactKind,
  type DesignProject,
  type SlideArtifactSlide,
  type WebsiteDesignSection
} from "../shared/artifacts";
import {
  DEFAULT_WORKSPACE_PROFILES,
  type WorkspaceProfile,
  type WorkspaceView,
  type WorkspaceState
} from "../shared/workspaces";
import type { ProductivityDraft, ProductivityTask, ProductivityTaskState } from "../shared/productivity";
import { getAutopilotApi } from "./autopilotApi";
import { buildCodingDiff, type CodingDiffResult } from "./codingDiff";
import { addHistoryEntry, loadHistoryEntries, saveHistoryEntries, type BrowserHistoryEntry } from "./history";
import {
  createActionItem,
  extractActionItemTitles,
  loadActionItems,
  loadProductivitySources,
  sanitizeActionItems,
  saveActionItems,
  saveProductivitySources,
  type ActionItem,
  type ActionItemSource,
  type ProductivitySourceId
} from "./productivity";
import { applyTheme, getThemeWarnings, loadTheme, resetTheme, saveTheme } from "./theme";

type AppView = "browser" | "coding" | "productivity" | "design" | "settings";

type BookmarkContextMenu = {
  x: number;
  y: number;
  target: BookmarkNodeTarget | null;
  mode: "actions" | "new-folder";
};

const DEFAULT_SIDEBAR_WIDTH = 292;
const MIN_SIDEBAR_WIDTH = 220;
const MAX_SIDEBAR_WIDTH = 560;
const DEFAULT_CODING_SIDEBAR_WIDTH = 315;
const MIN_CODING_SIDEBAR_WIDTH = 220;
const MAX_CODING_SIDEBAR_WIDTH = 620;
const SIDEBAR_WIDTH_STORAGE_KEY = "autopilot:sidebar-width";
const CODING_SIDEBAR_WIDTH_STORAGE_KEY = "autopilot:coding-sidebar-width";
const CODING_CHATS_STORAGE_KEY = "autopilot:coding-chats";
const AUTO_WORK_ALL_STORAGE_KEY = "autopilot:auto-work-all-actions";
const MAX_CODING_CHATS = 120;

const colorControls: Array<{ key: keyof BrowserTheme; label: string }> = [
  { key: "bg", label: "Background" },
  { key: "surface", label: "Page surface" },
  { key: "surface2", label: "Raised surface" },
  { key: "primary", label: "Forest accent" },
  { key: "primaryHover", label: "Accent hover" },
  { key: "sidebarBg", label: "Sidebar base" },
  { key: "sidebarBgSoft", label: "Sidebar highlight" },
  { key: "sidebarText", label: "Sidebar text" },
  { key: "sidebarTextMuted", label: "Sidebar muted text" },
  { key: "sidebarBorder", label: "Sidebar border" },
  { key: "titlebarBg", label: "Top bar" },
  { key: "sage", label: "Sage accent" },
  { key: "sageMuted", label: "Pale sage" },
  { key: "clay", label: "Clay accent" },
  { key: "text", label: "Text" },
  { key: "textMuted", label: "Muted text" },
  { key: "border", label: "Border" },
  { key: "danger", label: "Danger" },
  { key: "focus", label: "Focus" }
];

const workspaceItems: Array<{ label: string; color: string; icon: LucideIcon; view: AppView }> = [
  { label: "browsing", color: "blue", icon: Globe2, view: "browser" },
  { label: "coding", color: "violet", icon: Code2, view: "coding" },
  { label: "productivity", color: "green", icon: Check, view: "productivity" },
  { label: "chatting", color: "orange", icon: MessageCircle, view: "browser" },
  { label: "design", color: "pink", icon: Palette, view: "design" }
];

type CodingSection = "files" | "search" | "plugins" | "terminal" | "browser";

type CodingRightPanel = "access" | "code" | "terminal" | "downloads" | "plugins";

type CodingOpenedFile = Extract<CodingFileReadResult, { success: true }>;

type CodingChatMessage = {
  id: string;
  role: "user" | "agent";
  content: string;
  createdAt: number;
};

type EmailWorkMode = "background" | "open-design" | "bulk" | "auto-draft";

type EmailWorkOptions = {
  mode?: EmailWorkMode;
  taskIds?: string[];
};

type DesignFoldSection = "needsReview" | "working" | "projects";

type CodingChatThread = {
  id: string;
  projectRootPath: string | null;
  projectName: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: CodingChatMessage[];
};

type CodingWorkbenchTab = {
  id: string;
  kind: "chat" | "project" | "file" | "folder" | "picker" | "plugins" | "terminal" | "browser";
  title: string;
  chatId?: string;
  projectRootPath?: string | null;
  path?: string;
  file?: CodingOpenedFile;
  content?: string;
  baseContent?: string;
  dirty?: boolean;
  savedAt?: number;
};

type CodingTextWorkbenchTab = CodingWorkbenchTab & {
  file: Extract<CodingOpenedFile, { kind: "text" }>;
};

function isTextCodingTab(tab: CodingWorkbenchTab | null | undefined): tab is CodingTextWorkbenchTab {
  return Boolean(tab && tab.kind === "file" && tab.file?.kind === "text");
}

function getCodingTabContent(tab: CodingTextWorkbenchTab): string {
  return tab.content ?? tab.file.content;
}

const CODING_CHAT_TAB_ID = "coding-chat-home";

const defaultCodingSnapshot: CodingSnapshot = {
  projects: [],
  activeProject: null,
  tree: null,
  accessMode: "ask"
};

const initialCodingTabs: CodingWorkbenchTab[] = [
  {
    id: CODING_CHAT_TAB_ID,
    kind: "chat",
    title: "Current chat"
  }
];

const codingPluginCatalog: CodingPlugin[] = [
  {
    id: "node",
    name: "Node.js CLI",
    category: "Runtime",
    description: "Run npm, Vite, TypeScript, and JavaScript tooling from project folders.",
    command: "winget install --id OpenJS.NodeJS.LTS --exact --silent"
  },
  {
    id: "git",
    name: "Git",
    category: "Source control",
    description: "Clone repositories, manage branches, and pull code from GitHub projects.",
    command: "winget install --id Git.Git --exact --silent"
  },
  {
    id: "python",
    name: "Python",
    category: "Runtime",
    description: "Run Python scripts, virtual environments, notebooks, and package tools.",
    command: "winget install --id Python.Python.3.12 --exact --silent"
  },
  {
    id: "eslint",
    name: "ESLint",
    category: "Quality",
    description: "Install the lint CLI globally so it is ready before you open a project.",
    command: "npm install -g eslint"
  },
  {
    id: "prettier",
    name: "Prettier",
    category: "Formatting",
    description: "Install the formatter globally so every project can use it from Autopilot.",
    command: "npm install -g prettier"
  },
  {
    id: "gh",
    name: "GitHub CLI",
    category: "GitHub",
    description: "Create pull requests, authenticate GitHub, and inspect repo status.",
    command: "winget install --id GitHub.cli --exact --silent"
  }
];

const productivitySourceOptions: Array<{
  id: ProductivitySourceId;
  label: string;
  detail: string;
  source: ActionItemSource;
  icon: LucideIcon;
  status: "ready" | "soon";
}> = [
  { id: "gmail", label: "Gmail", detail: "Pull inbox messages and action items", source: "Email", icon: Mail, status: "soon" },
  { id: "outlook", label: "Outlook", detail: "Rank Microsoft mail when connected", source: "Email", icon: Mail, status: "soon" },
  { id: "google-calendar", label: "Google Calendar", detail: "Turn events and deadlines into work", source: "Calendar", icon: Clock, status: "soon" },
  { id: "slack", label: "Slack", detail: "Find asks buried in messages", source: "Chat", icon: MessageCircle, status: "soon" }
];

const workspaceIconMap: Record<WorkspaceProfile["icon"], LucideIcon> = {
  globe: Globe2,
  code: Code2,
  check: Check,
  chat: MessageCircle,
  palette: Palette,
  settings: Settings
};

function productivityTaskToActionItem(task: ProductivityTask): ActionItem {
  const source: ActionItemSource =
    task.source.provider === "gmail" || task.source.provider === "outlook"
      ? "Email"
      : task.source.provider === "google-calendar"
        ? "Calendar"
        : task.source.provider === "slack"
          ? "Chat"
          : task.source.provider === "coding"
            ? "Notes"
            : "Manual";

  return {
    id: task.id,
    title: task.title,
    source,
    context: task.context || task.source.label,
    createdAt: task.createdAt,
    completedAt: task.state === "done" ? task.completedAt ?? task.updatedAt : null
  };
}

function getTaskStateLabel(state: ProductivityTaskState): string {
  switch (state) {
    case "todo":
      return "To do";
    case "waiting":
      return "Waiting";
    case "snoozed":
      return "Snoozed";
    case "done":
      return "Done";
  }
}

function isUrgentActionItem(item: ActionItem): boolean {
  return /\b(urgent|today|deadline|due|overdue|priority|password|lose|blocked|asap|by friday|by monday)\b/i.test(
    `${item.title} ${item.context}`
  );
}

function isWaitingActionItem(item: ActionItem): boolean {
  return /\b(waiting|wait|reply|response|approval|confirm)\b/i.test(`${item.title} ${item.context}`);
}

function formatFocusMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}m`;
}

function getActionVerb(source: ActionItemSource): string {
  switch (source) {
    case "Email":
      return "Reply or follow up";
    case "Calendar":
      return "Prepare for";
    case "Chat":
      return "Respond to";
    case "Web":
      return "Review";
    case "Notes":
      return "Turn into a task";
    default:
      return "Handle";
  }
}

function getActionInstruction(item: ActionItem): string {
  const context = item.context ? ` in ${item.context}` : "";
  return `${getActionVerb(item.source)}: ${item.title}${context}.`;
}

function getActionSourceSummary(item: ActionItem): string {
  return item.context ? `${item.source} - ${item.context}` : item.source;
}

function getBuiltInWorkspaceView(profile: WorkspaceProfile): WorkspaceView {
  return DEFAULT_WORKSPACE_PROFILES.find((defaultProfile) => defaultProfile.id === profile.id)?.view ?? profile.view;
}

function getArtifactKindLabel(kind: ArtifactKind): string {
  switch (kind) {
    case "document":
      return "Document";
    case "slide_deck":
      return "Slides";
    case "website_design":
      return "Website";
  }
}

function artifactContentToEditorText(content: ArtifactContent): string {
  switch (content.kind) {
    case "document":
      return content.markdown;
    case "slide_deck":
      return content.slides
        .map((slide) => [`# ${slide.title}`, ...slide.bullets.map((bullet) => `- ${bullet}`), slide.speakerNotes ? `Notes: ${slide.speakerNotes}` : ""].filter(Boolean).join("\n"))
        .join("\n\n");
    case "website_design":
      return `${content.html.trim()}\n\n--- CSS ---\n${content.css.trim()}`;
  }
}

function editorTextToArtifactContent(kind: ArtifactKind, draft: string, currentContent?: ArtifactContent): ArtifactContent {
  if (kind === "document") {
    return {
      kind,
      markdown: draft.trim() || "# Untitled document\n"
    };
  }

  if (kind === "slide_deck") {
    return {
      kind,
      slides: parseSlidesFromEditor(draft)
    };
  }

  const [htmlPart, cssPart] = draft.split(/\n--- CSS ---\n/u);
  const currentWebsite = currentContent?.kind === "website_design" ? currentContent : null;
  return {
    kind,
    html: htmlPart?.trim() || currentWebsite?.html || "<main><h1>Untitled design</h1></main>",
    css: cssPart?.trim() || currentWebsite?.css || "body{font-family:Inter,system-ui,sans-serif}",
    sections: currentWebsite?.sections ?? [
      {
        id: crypto.randomUUID(),
        name: "Generated design",
        summary: "Edited inside Artifact Studio."
      }
    ]
  };
}

function parseSlidesFromEditor(draft: string): SlideArtifactSlide[] {
  const sections = draft
    .split(/\n(?=#\s+)/u)
    .map((section) => section.trim())
    .filter(Boolean);
  const slides = sections.flatMap((section): SlideArtifactSlide[] => {
    const lines = section.split("\n").map((line) => line.trim()).filter(Boolean);
    const title = lines[0]?.replace(/^#\s+/u, "").trim();
    if (!title) {
      return [];
    }

    const bullets = lines
      .slice(1)
      .filter((line) => !line.toLowerCase().startsWith("notes:"))
      .map((line) => line.replace(/^[-*]\s*/u, "").trim())
      .filter(Boolean);
    const notes = lines.find((line) => line.toLowerCase().startsWith("notes:"))?.replace(/^notes:\s*/iu, "").trim();
    return [
      {
        id: crypto.randomUUID(),
        title,
        bullets: bullets.length > 0 ? bullets : ["Add supporting detail."],
        speakerNotes: notes || undefined
      }
    ];
  });

  return slides.length > 0
    ? slides
    : [
        {
          id: crypto.randomUUID(),
          title: "Untitled slide",
          bullets: ["Add supporting detail."]
        }
      ];
}

function getArtifactPreviewSrcDoc(content: ArtifactContent): string {
  if (content.kind !== "website_design") {
    return "";
  }

  return `<!doctype html><html><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><style>${content.css}</style></head><body>${content.html}</body></html>`;
}

function getSidebarMaxWidth(): number {
  if (typeof window === "undefined") {
    return MAX_SIDEBAR_WIDTH;
  }

  return Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, window.innerWidth - 360));
}

function clampSidebarWidth(width: number): number {
  return Math.min(getSidebarMaxWidth(), Math.max(MIN_SIDEBAR_WIDTH, Math.round(width)));
}

function loadSidebarWidth(): number {
  if (typeof window === "undefined") {
    return DEFAULT_SIDEBAR_WIDTH;
  }

  try {
    const storedWidth = Number.parseInt(window.localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY) ?? "", 10);
    return Number.isFinite(storedWidth) ? clampSidebarWidth(storedWidth) : DEFAULT_SIDEBAR_WIDTH;
  } catch {
    return DEFAULT_SIDEBAR_WIDTH;
  }
}

function getCodingSidebarMaxWidth(): number {
  if (typeof window === "undefined") {
    return MAX_CODING_SIDEBAR_WIDTH;
  }

  return Math.max(MIN_CODING_SIDEBAR_WIDTH, Math.min(MAX_CODING_SIDEBAR_WIDTH, window.innerWidth - 520));
}

function clampCodingSidebarWidth(width: number): number {
  return Math.min(getCodingSidebarMaxWidth(), Math.max(MIN_CODING_SIDEBAR_WIDTH, Math.round(width)));
}

function loadCodingSidebarWidth(): number {
  if (typeof window === "undefined") {
    return DEFAULT_CODING_SIDEBAR_WIDTH;
  }

  try {
    const storedWidth = Number.parseInt(window.localStorage.getItem(CODING_SIDEBAR_WIDTH_STORAGE_KEY) ?? "", 10);
    return Number.isFinite(storedWidth) ? clampCodingSidebarWidth(storedWidth) : DEFAULT_CODING_SIDEBAR_WIDTH;
  } catch {
    return DEFAULT_CODING_SIDEBAR_WIDTH;
  }
}

function getFolderCreationParent(target: BookmarkNodeTarget | null): BookmarkNodeTarget | null {
  return target?.kind === "folder" && target.source === "Autopilot" ? target : null;
}

type AutopilotNeedleProps = {
  className?: string;
  label?: string;
};

function AutopilotNeedle({ className = "", label }: AutopilotNeedleProps): JSX.Element {
  const ariaProps = label ? { role: "img", "aria-label": label } : { "aria-hidden": true };

  return (
    <svg className={`autopilot-needle ${className}`.trim()} viewBox="0 0 64 96" focusable="false" {...ariaProps}>
      <circle className="needle-disc" cx="32" cy="51" r="31" />
      <path className="needle-wing needle-wing-left" d="M32 6 59 89 32 72 5 89Z" />
      <path className="needle-wing needle-wing-right" d="M32 6 59 89 32 72Z" />
      <path className="needle-core" d="M32 22 45 64 32 56 19 64Z" />
      <path className="needle-ridge" d="M32 6 32 72" />
    </svg>
  );
}

type BookmarkTreeProps = {
  nodes: BrowserBookmarkNode[];
  openFolders: Record<string, boolean>;
  parentId: string;
  path?: string[];
  level?: number;
  onNavigate: (url: string) => void;
  onToggleFolder: (folderId: string) => void;
  onContextMenu: (event: ReactMouseEvent, target: BookmarkNodeTarget) => void;
};

function BookmarkTree({
  nodes,
  openFolders,
  parentId,
  path = [],
  level = 0,
  onNavigate,
  onToggleFolder,
  onContextMenu
}: BookmarkTreeProps): JSX.Element {
  return (
    <div className="bookmark-tree" style={{ "--bookmark-level": level } as CSSProperties}>
      {nodes.map((node, index) => {
        const nodeId = `${parentId}/${node.source}/${node.title}/${index}`;
        const target: BookmarkNodeTarget = {
          kind: node.kind,
          source: node.source,
          title: node.title,
          url: node.kind === "bookmark" ? node.url : undefined,
          path
        };

        if (node.kind === "folder") {
          const isOpen = Boolean(openFolders[nodeId]);
          const FolderIcon = isOpen ? FolderOpen : Folder;
          return (
            <div className="bookmark-folder" key={nodeId}>
              <button
                className={`bookmark-folder-row ${isOpen ? "open" : ""}`}
                type="button"
                onClick={() => onToggleFolder(nodeId)}
                onContextMenu={(event) => onContextMenu(event, target)}
                title={node.title}
              >
                <FolderIcon size={17} aria-hidden="true" />
                <span>{node.title}</span>
              </button>
              {isOpen && (
                <BookmarkTree
                  nodes={node.children}
                  openFolders={openFolders}
                  parentId={nodeId}
                  path={[...path, node.title]}
                  level={level + 1}
                  onNavigate={onNavigate}
                  onToggleFolder={onToggleFolder}
                  onContextMenu={onContextMenu}
                />
              )}
            </div>
          );
        }

        return (
          <button
            className="bookmark-item"
            key={nodeId}
            type="button"
            onClick={() => onNavigate(node.url)}
            onContextMenu={(event) => onContextMenu(event, target)}
            title={node.title}
          >
            <span className="bookmark-favicon" aria-hidden="true">
              {getBookmarkInitial(node.title, node.url)}
            </span>
            <span className="bookmark-copy">
              <span>{node.title}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

type CodingTreeProps = {
  node: CodingTreeNode;
  openFolders: Record<string, boolean>;
  activePath: string | null;
  level?: number;
  onOpen: (node: CodingTreeNode) => void;
};

function CodingTree({ node, openFolders, activePath, level = 0, onOpen }: CodingTreeProps): JSX.Element {
  const isFolder = node.kind === "folder";
  const isOpen = isFolder && (level === 0 || Boolean(openFolders[node.path]));
  const Icon = isFolder ? (isOpen ? FolderOpen : Folder) : getCodingFileIcon(node.name);
  const isActive = activePath === node.path;

  return (
    <div className="coding-tree-node">
      <button
        className={`coding-file ${isActive ? "active" : ""}`}
        style={{ "--file-level": level } as CSSProperties}
        type="button"
        onClick={() => onOpen(node)}
        title={node.path}
      >
        <Icon size={15} aria-hidden="true" />
        <span>{level === 0 ? node.name : node.name}</span>
        {node.truncated && <b>More</b>}
      </button>
      {isFolder && isOpen && node.children && (
        <div className="coding-tree-children">
          {node.children.map((child) => (
            <CodingTree
              activePath={activePath}
              key={child.path}
              node={child}
              openFolders={openFolders}
              level={level + 1}
              onOpen={onOpen}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function getCodingFileIcon(name: string): LucideIcon {
  const lowerName = name.toLowerCase();
  if (/\.(png|jpe?g|gif|webp|avif|apng)$/.test(lowerName)) {
    return ImageIcon;
  }

  return FileText;
}

function getBookmarkInitial(title: string, url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    return hostname[0]?.toUpperCase() ?? "B";
  } catch {
    return title.trim()[0]?.toUpperCase() ?? "B";
  }
}

function getCredentialHost(value: string): string {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return value;
  }
}

function formatCredentialDate(value: number): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

function getCredentialUsernameLabel(username: string): string {
  return username.trim() || "No username saved";
}

function getEmailContext(message: EmailMessageSummary): string {
  return `${message.from} - ${message.subject}`.slice(0, 80);
}

function formatTabMemory(memoryBytes: number | undefined): string {
  if (typeof memoryBytes !== "number" || !Number.isFinite(memoryBytes) || memoryBytes <= 0) {
    return "Measuring";
  }

  const megabytes = memoryBytes / (1024 * 1024);
  if (megabytes >= 1024) {
    return `${(megabytes / 1024).toFixed(1)} GB`;
  }

  return `${Math.max(1, Math.round(megabytes))} MB`;
}

function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${Math.round(bytes)} B`;
}

function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) {
    return "0s";
  }

  const seconds = Math.ceil(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
}

function normalizeLocalPathForCompare(value: string): string {
  return value.replace(/[\\/]+/g, "\\").replace(/\\+$/g, "").toLowerCase();
}

function isSameOrInsideLocalPath(targetPath: string, parentPath: string): boolean {
  const normalizedTarget = normalizeLocalPathForCompare(targetPath);
  const normalizedParent = normalizeLocalPathForCompare(parentPath);
  return normalizedTarget === normalizedParent || normalizedTarget.startsWith(`${normalizedParent}\\`);
}

function getPluginStatusLabel(status: CodingPluginStatus | undefined): string {
  if (!status) {
    return "Checking";
  }

  if (status.status === "installed") {
    return status.version ? `Installed: ${status.version}` : "Installed";
  }

  if (status.status === "installing") {
    return "Installing";
  }

  if (status.status === "failed") {
    return "Failed";
  }

  if (status.status === "cancelled") {
    return "Cancelled";
  }

  return "Not installed";
}

function getPluginInstallRemaining(status: CodingPluginStatus | undefined, now = Date.now()): string {
  if (!status || status.status !== "installing" || !status.startedAt || !status.estimatedSeconds) {
    return "";
  }

  const elapsedMs = Math.max(status.elapsedMs ?? 0, now - status.startedAt);
  const remainingMs = Math.max(0, status.estimatedSeconds * 1000 - elapsedMs);
  return `${formatDuration(remainingMs)} left`;
}

function formatSaveTime(value: number | undefined): string {
  if (!value) {
    return "Not saved yet";
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function createCodingTabId(kind: CodingWorkbenchTab["kind"], pathValue?: string): string {
  return `${kind}:${pathValue ?? Date.now().toString(36)}:${Math.random().toString(36).slice(2, 7)}`;
}

function createCodingChatId(): string {
  return `coding-chat:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`;
}

function createCodingChatMessage(role: CodingChatMessage["role"], content: string): CodingChatMessage {
  return {
    id: `message:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
    createdAt: Date.now()
  };
}

function createCodingChatThread(project: CodingProject | null, title?: string): CodingChatThread {
  const now = Date.now();
  const projectName = project?.name ?? "General";
  return {
    id: createCodingChatId(),
    projectRootPath: project?.rootPath ?? null,
    projectName,
    title: title ?? (project ? `New agent chat` : "New coding chat"),
    createdAt: now,
    updatedAt: now,
    messages: [
      createCodingChatMessage(
        "agent",
        project
          ? `I'm scoped to ${project.name}. Ask me what to build, which files to inspect, or which command to run. I'll keep this chat tied to the project.`
          : "Open a project to give this coding agent a folder, files, and command context."
      )
    ]
  };
}

function loadCodingChats(): CodingChatThread[] {
  try {
    const raw = window.localStorage.getItem(CODING_CHATS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((chat): chat is CodingChatThread => typeof chat?.id === "string" && typeof chat.title === "string")
      .map((chat) => ({
        ...chat,
        projectRootPath: typeof chat.projectRootPath === "string" ? chat.projectRootPath : null,
        projectName: typeof chat.projectName === "string" ? chat.projectName : "General",
        createdAt: typeof chat.createdAt === "number" ? chat.createdAt : Date.now(),
        updatedAt: typeof chat.updatedAt === "number" ? chat.updatedAt : Date.now(),
        messages: Array.isArray(chat.messages)
          ? chat.messages.filter(
              (message): message is CodingChatMessage =>
                typeof message?.id === "string" &&
                (message.role === "user" || message.role === "agent") &&
                typeof message.content === "string" &&
                typeof message.createdAt === "number"
            )
          : []
      }))
      .sort((leftChat, rightChat) => rightChat.updatedAt - leftChat.updatedAt)
      .slice(0, MAX_CODING_CHATS);
  } catch {
    return [];
  }
}

function saveCodingChats(chats: CodingChatThread[]): void {
  try {
    window.localStorage.setItem(CODING_CHATS_STORAGE_KEY, JSON.stringify(chats.slice(0, MAX_CODING_CHATS)));
  } catch {
    // Chat history is helpful, but the coding workspace should still work if storage is unavailable.
  }
}

function loadAutoWorkAllEnabled(): boolean {
  try {
    return window.localStorage.getItem(AUTO_WORK_ALL_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function saveAutoWorkAllEnabled(enabled: boolean): void {
  try {
    window.localStorage.setItem(AUTO_WORK_ALL_STORAGE_KEY, enabled ? "true" : "false");
  } catch {
    // This setting is local convenience state; failure should not block work generation.
  }
}

function deriveCodingChatTitle(message: string): string {
  const normalized = message.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "New agent chat";
  }

  return normalized.length > 42 ? `${normalized.slice(0, 39)}...` : normalized;
}

function formatCodingChatAge(timestamp: number): string {
  const ageMs = Math.max(0, Date.now() - timestamp);
  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;
  if (ageMs < hourMs) {
    return `${Math.max(1, Math.round(ageMs / minuteMs))}m`;
  }

  if (ageMs < dayMs) {
    return `${Math.round(ageMs / hourMs)}h`;
  }

  if (ageMs < dayMs * 14) {
    return `${Math.round(ageMs / dayMs)}d`;
  }

  return `${Math.round(ageMs / (dayMs * 7))}w`;
}

function createCodingAgentReply(message: string, projectName: string): string {
  return `Agent ready in ${projectName}: I can inspect files, open the picker, run approved commands, and turn "${message}" into concrete code changes.`;
}

function getCodingTabIcon(kind: CodingWorkbenchTab["kind"], file?: CodingOpenedFile): LucideIcon {
  if (kind === "chat") {
    return MessageCircle;
  }

  if (kind === "project") {
    return FolderOpen;
  }

  if (kind === "picker") {
    return Plus;
  }

  if (kind === "plugins") {
    return Package;
  }

  if (kind === "terminal") {
    return Terminal;
  }

  if (kind === "browser") {
    return Globe2;
  }

  if (file?.kind === "image") {
    return ImageIcon;
  }

  if (file?.kind === "document") {
    return FileText;
  }

  if (kind === "folder" || file?.kind === "directory") {
    return FolderOpen;
  }

  return FileText;
}

export function App(): JSX.Element {
  const autopilot = useMemo(() => getAutopilotApi(), []);
  const [theme, setTheme] = useState<BrowserTheme>(() => loadTheme());
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [bookmarks, setBookmarks] = useState<BrowserBookmarkNode[]>(DEFAULT_BOOKMARKS);
  const [bookmarkSources, setBookmarkSources] = useState<BrowserBookmarkSourceOption[]>([]);
  const [selectedBookmarkSources, setSelectedBookmarkSources] = useState<string[]>([]);
  const [draftBookmarkSources, setDraftBookmarkSources] = useState<string[]>([]);
  const [bookmarkImportOpen, setBookmarkImportOpen] = useState(false);
  const [bookmarkImportBusy, setBookmarkImportBusy] = useState(false);
  const [openBookmarkFolders, setOpenBookmarkFolders] = useState<Record<string, boolean>>({});
  const [bookmarkContextMenu, setBookmarkContextMenu] = useState<BookmarkContextMenu | null>(null);
  const [bookmarkFolderDraft, setBookmarkFolderDraft] = useState("New folder");
  const [bookmarkFolderBusy, setBookmarkFolderBusy] = useState(false);
  const [passwordAvailability, setPasswordAvailability] = useState<PasswordAvailability | null>(null);
  const [passwordEntries, setPasswordEntries] = useState<PasswordCredentialSummary[]>([]);
  const [passwordPrompt, setPasswordPrompt] = useState<PendingPasswordSave | null>(null);
  const [passwordStatus, setPasswordStatus] = useState("");
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, string>>({});
  const [historyEntries, setHistoryEntries] = useState<BrowserHistoryEntry[]>(() => loadHistoryEntries());
  const [actionItems, setActionItems] = useState<ActionItem[]>(() => loadActionItems());
  const [captureStatus, setCaptureStatus] = useState("");
  const [emailStatus, setEmailStatus] = useState<EmailConnectionStatus | null>(null);
  const [emailMessages, setEmailMessages] = useState<EmailMessageSummary[]>([]);
  const [emailSyncStatus, setEmailSyncStatus] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [productivityTasks, setProductivityTasks] = useState<ProductivityTask[]>([]);
  const [productivityDrafts, setProductivityDrafts] = useState<ProductivityDraft[]>([]);
  const [productivityDraftsLoaded, setProductivityDraftsLoaded] = useState(false);
  const [autoDraftStatus, setAutoDraftStatus] = useState("");
  const [selectedProductivitySources, setSelectedProductivitySources] = useState<ProductivitySourceId[]>(() => loadProductivitySources());
  const [selectedActionSource, setSelectedActionSource] = useState<ActionItemSource | "All">("All");
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [addressDraft, setAddressDraft] = useState("");
  const [view, setView] = useState<AppView>("browser");
  const [workspaceState, setWorkspaceState] = useState<WorkspaceState>({
    activeWorkspaceId: "browsing",
    profiles: structuredClone(DEFAULT_WORKSPACE_PROFILES)
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(() => loadSidebarWidth());
  const [isSidebarResizing, setIsSidebarResizing] = useState(false);
  const [codingSidebarWidth, setCodingSidebarWidth] = useState(() => loadCodingSidebarWidth());
  const [isCodingSidebarResizing, setIsCodingSidebarResizing] = useState(false);
  const [iconPreviewOpen, setIconPreviewOpen] = useState(false);
  const [codingSnapshot, setCodingSnapshot] = useState<CodingSnapshot>(defaultCodingSnapshot);
  const [codingTabs, setCodingTabs] = useState<CodingWorkbenchTab[]>(initialCodingTabs);
  const [activeCodingTabId, setActiveCodingTabId] = useState(CODING_CHAT_TAB_ID);
  const [codingChats, setCodingChats] = useState<CodingChatThread[]>(() => loadCodingChats());
  const [openCodingFolders, setOpenCodingFolders] = useState<Record<string, boolean>>({});
  const [collapsedCodingProjects, setCollapsedCodingProjects] = useState<Record<string, boolean>>({});
  const [codingSection, setCodingSection] = useState<CodingSection>("files");
  const [codingStatus, setCodingStatus] = useState("Open a folder or create a project to start editing local files.");
  const [codingBusy, setCodingBusy] = useState(false);
  const [codingDraftMessage, setCodingDraftMessage] = useState("");
  const [codingPluginStatuses, setCodingPluginStatuses] = useState<CodingPluginStatus[]>([]);
  const [codingPluginBusyIds, setCodingPluginBusyIds] = useState<Record<string, boolean>>({});
  const [codingDownloads, setCodingDownloads] = useState<CodingDownloadEntry[]>([]);
  const [browserDownloadsOpen, setBrowserDownloadsOpen] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState("");
  const [codingRightSidebarOpen, setCodingRightSidebarOpen] = useState(true);
  const [codingRightPanel, setCodingRightPanel] = useState<CodingRightPanel>("access");
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantSources, setAssistantSources] = useState<AssistantContextSource[]>([]);
  const [assistantSelectedSources, setAssistantSelectedSources] = useState<AssistantContextSourceId[]>(["current-tab"]);
  const [assistantPrompt, setAssistantPrompt] = useState("");
  const [assistantResponse, setAssistantResponse] = useState<AssistantResponse | null>(null);
  const [assistantBusy, setAssistantBusy] = useState(false);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [activeArtifactId, setActiveArtifactId] = useState<string | null>(null);
  const [artifactPrompt, setArtifactPrompt] = useState("Build a clean website design for this topic.");
  const [artifactEditorDraft, setArtifactEditorDraft] = useState("");
  const [artifactStatus, setArtifactStatus] = useState("");
  const [artifactBusy, setArtifactBusy] = useState(false);
  const [allDesignProjectsOpen, setAllDesignProjectsOpen] = useState(false);
  const [designProjectFilter, setDesignProjectFilter] = useState("");
  const [designPromptSuggestions, setDesignPromptSuggestions] = useState<string[]>([]);
  const [designPromptStatus, setDesignPromptStatus] = useState("");
  const [designPromptBusy, setDesignPromptBusy] = useState(false);
  const [exportToCodingStatus, setExportToCodingStatus] = useState("");
  const [agentRuns, setAgentRuns] = useState<AgentRun[]>([]);
  const [actionPlans, setActionPlans] = useState<ActionPlan[]>([]);
  const [lastActionPlan, setLastActionPlan] = useState<ActionPlan | null>(null);
  const [artifactExportResult, setArtifactExportResult] = useState<ArtifactExportResult | null>(null);
  const [buildingWorkMessageIds, setBuildingWorkMessageIds] = useState<string[]>([]);
  const [backgroundWorkStatus, setBackgroundWorkStatus] = useState("");
  const [bulkWorkBusy, setBulkWorkBusy] = useState(false);
  const [autoWorkAllEnabled, setAutoWorkAllEnabled] = useState(loadAutoWorkAllEnabled);
  const [autoWorkStatus, setAutoWorkStatus] = useState("");
  const [openDesignSections, setOpenDesignSections] = useState<Record<DesignFoldSection, boolean>>({
    needsReview: true,
    working: false,
    projects: true
  });
  const [codingReviewMode, setCodingReviewMode] = useState<"summary" | "review">("review");
  const [codingTerminalHistory, setCodingTerminalHistory] = useState<CodingCommandResult[]>([]);
  const [codingClock, setCodingClock] = useState(Date.now());
  const [codingSearchQuery, setCodingSearchQuery] = useState("");
  const [codingSearchResults, setCodingSearchResults] = useState<CodingSearchResult[]>([]);
  const [codingPickerEntries, setCodingPickerEntries] = useState<CodingDirectoryEntry[]>([]);
  const [codingPickerLoading, setCodingPickerLoading] = useState(false);
  const [codingPickerError, setCodingPickerError] = useState<string | null>(null);
  const [codingCommandDraft, setCodingCommandDraft] = useState("npm test");
  const [pendingCodingCommand, setPendingCodingCommand] = useState<CodingCommandRequest | null>(null);
  const [codingCommandResult, setCodingCommandResult] = useState<CodingCommandResult | null>(null);
  const [codingResearchDraft, setCodingResearchDraft] = useState("React autosave editor patterns");
  const [codingResearchResult, setCodingResearchResult] = useState<CodingResearchResult | null>(null);
  const webAreaRef = useRef<HTMLDivElement | null>(null);
  const sidebarWidthRef = useRef(sidebarWidth);
  const codingSidebarWidthRef = useRef(codingSidebarWidth);
  const productivityDraftsRef = useRef<ProductivityDraft[]>([]);
  const autoDraftingMessageIdsRef = useRef<Set<string>>(new Set());
  const autoDraftAttemptedMessageIdsRef = useRef<Set<string>>(new Set());

  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? null;
  const activeNavigationError = activeTab?.navigationError ?? null;
  const activeNavigationErrorKey = activeNavigationError ? `${activeNavigationError.code}:${activeNavigationError.url}` : "";
  const isBrowserPreview = autopilot.runtime === "browser-preview";
  const warnings = useMemo(() => getThemeWarnings(theme), [theme]);
  const workspaceProfiles = workspaceState.profiles.length > 0 ? workspaceState.profiles : DEFAULT_WORKSPACE_PROFILES;
  const activeWorkspaceId = workspaceState.activeWorkspaceId;
  const activeCodingTab = codingTabs.find((tab) => tab.id === activeCodingTabId) ?? codingTabs[0] ?? initialCodingTabs[0];
  const activeCodingProject = codingSnapshot.activeProject;
  const activeCodingPath = activeCodingTab?.path ?? null;
  const activeCodingChat = activeCodingTab.kind === "chat" ? codingChats.find((chat) => chat.id === activeCodingTab.chatId) ?? null : null;
  const activeCodingTabProjectRoot = activeCodingTab.projectRootPath ?? activeCodingChat?.projectRootPath ?? activeCodingProject?.rootPath ?? null;
  const activeCodingTabProject = activeCodingTabProjectRoot
    ? codingSnapshot.projects.find((project) => project.rootPath === activeCodingTabProjectRoot) ?? activeCodingProject
    : null;
  const codingChatsByProject = useMemo(() => {
    const chatsByProject = new Map<string, CodingChatThread[]>();
    for (const chat of codingChats) {
      if (!chat.projectRootPath) {
        continue;
      }

      const projectChats = chatsByProject.get(chat.projectRootPath) ?? [];
      projectChats.push(chat);
      chatsByProject.set(chat.projectRootPath, projectChats);
    }

    for (const chats of chatsByProject.values()) {
      chats.sort((leftChat, rightChat) => rightChat.updatedAt - leftChat.updatedAt);
    }

    return chatsByProject;
  }, [codingChats]);
  const activeProjectChats = useMemo(
    () => (activeCodingProject ? codingChatsByProject.get(activeCodingProject.rootPath) ?? [] : []),
    [activeCodingProject, codingChatsByProject]
  );
  const activeTabProjectChats = useMemo(
    () => (activeCodingTabProjectRoot ? codingChatsByProject.get(activeCodingTabProjectRoot) ?? [] : []),
    [activeCodingTabProjectRoot, codingChatsByProject]
  );
  const activeProjectOpenTabs = useMemo(
    () =>
      activeCodingProject
        ? codingTabs.filter((tab) => tab.projectRootPath === activeCodingProject.rootPath && (tab.kind === "file" || tab.kind === "folder"))
        : [],
    [activeCodingProject, codingTabs]
  );
  const textCodingTabs = useMemo(() => codingTabs.filter(isTextCodingTab), [codingTabs]);
  const codingDiffsByTabId = useMemo(() => {
    const diffs = new Map<string, CodingDiffResult>();
    for (const tab of textCodingTabs) {
      diffs.set(tab.id, buildCodingDiff(tab.baseContent ?? tab.file.content, getCodingTabContent(tab)));
    }
    return diffs;
  }, [textCodingTabs]);
  const changedCodingFileTabs = useMemo(
    () => textCodingTabs.filter((tab) => codingDiffsByTabId.get(tab.id)?.changed),
    [codingDiffsByTabId, textCodingTabs]
  );
  const activeTextCodingTab = isTextCodingTab(activeCodingTab) ? activeCodingTab : null;
  const activeTextCodingDiff = activeTextCodingTab ? codingDiffsByTabId.get(activeTextCodingTab.id) ?? null : null;
  const activeCodingReviewTab =
    activeTextCodingDiff?.changed && activeTextCodingTab ? activeTextCodingTab : changedCodingFileTabs[0] ?? activeTextCodingTab;
  const activeCodingReviewDiff = activeCodingReviewTab ? codingDiffsByTabId.get(activeCodingReviewTab.id) ?? null : null;
  const codingReviewDiffTabs = useMemo(() => {
    if (!activeCodingReviewTab || !activeCodingReviewDiff?.changed) {
      return changedCodingFileTabs;
    }

    return [activeCodingReviewTab, ...changedCodingFileTabs.filter((tab) => tab.id !== activeCodingReviewTab.id)];
  }, [activeCodingReviewDiff?.changed, activeCodingReviewTab, changedCodingFileTabs]);
  const codingDiffSummary = useMemo(() => {
    let added = 0;
    let removed = 0;
    for (const diff of codingDiffsByTabId.values()) {
      if (!diff.changed) {
        continue;
      }

      added += diff.added;
      removed += diff.removed;
    }
    return { added, removed };
  }, [codingDiffsByTabId]);
  const codingPluginStatusById = useMemo(
    () => new Map(codingPluginStatuses.map((status) => [status.id, status])),
    [codingPluginStatuses]
  );
  const installingCodingPluginCount = useMemo(
    () => codingPluginStatuses.filter((status) => status.status === "installing").length,
    [codingPluginStatuses]
  );
  const installedCodingPluginCount = useMemo(
    () => codingPluginStatuses.filter((status) => status.status === "installed").length,
    [codingPluginStatuses]
  );
  const activeArtifact = useMemo(
    () => artifacts.find((artifact) => artifact.id === activeArtifactId) ?? artifacts[0] ?? null,
    [activeArtifactId, artifacts]
  );
  const activeArtifactVersion = activeArtifact ? getActiveArtifactVersion(activeArtifact) : null;
  const activeActionPlan = useMemo(
    () =>
      activeArtifact
        ? actionPlans.find((plan) => plan.artifactId === activeArtifact.id) ??
          (lastActionPlan?.artifactId === activeArtifact.id ? lastActionPlan : null)
        : null,
    [activeArtifact, actionPlans, lastActionPlan]
  );
  const activeArtifactRun = useMemo(
    () => agentRuns.find((run) => run.planId === activeActionPlan?.id) ?? agentRuns[0] ?? null,
    [activeActionPlan?.id, agentRuns]
  );
  const actionPlanByArtifactId = useMemo(() => {
    const plansByArtifact = new Map<string, ActionPlan>();
    for (const plan of actionPlans) {
      if (plan.artifactId && !plansByArtifact.has(plan.artifactId)) {
        plansByArtifact.set(plan.artifactId, plan);
      }
    }
    return plansByArtifact;
  }, [actionPlans]);
  const reviewArtifacts = useMemo(
    () => artifacts.filter((artifact) => {
      const plan = actionPlanByArtifactId.get(artifact.id);
      return Boolean(plan?.finalApproval.required && !plan.finalApproval.approvedAt);
    }),
    [actionPlanByArtifactId, artifacts]
  );
  const designProjects = useMemo<DesignProject[]>(
    () =>
      artifacts
        .map((artifact) =>
          createDesignProjectFromArtifact(
            artifact,
            Boolean(actionPlanByArtifactId.get(artifact.id)?.finalApproval.required && !actionPlanByArtifactId.get(artifact.id)?.finalApproval.approvedAt)
          )
        )
        .sort((leftProject, rightProject) => {
          if (leftProject.pinned !== rightProject.pinned) {
            return leftProject.pinned ? -1 : 1;
          }

          return rightProject.updatedAt - leftProject.updatedAt;
        }),
    [actionPlanByArtifactId, artifacts]
  );
  const visibleDesignProjects = useMemo(
    () => designProjects.filter((project) => project.visibility === "user_project" || project.pinned).slice(0, 8),
    [designProjects]
  );
  const filteredDesignProjects = useMemo(() => {
    const query = designProjectFilter.trim().toLowerCase();
    if (!query) {
      return designProjects;
    }

    return designProjects.filter((project) =>
      [project.title, project.summary, project.sourceLabel, getArtifactKindLabel(project.kind), project.visibility]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [designProjectFilter, designProjects]);
  const activeDesignProject = useMemo(
    () => (activeArtifact ? designProjects.find((project) => project.artifactId === activeArtifact.id) ?? createDesignProjectFromArtifact(activeArtifact) : null),
    [activeArtifact, designProjects]
  );
  const workingDesignItems = useMemo(
    () =>
      buildingWorkMessageIds.map((messageId) => {
        const message = emailMessages.find((candidate) => candidate.id === messageId);
        return {
          id: messageId,
          title: message?.subject || "Background work",
          detail: message ? `${message.from}${message.fromEmail ? ` - ${message.fromEmail}` : ""}` : "Autopilot is preparing work",
          source: message
        };
      }),
    [buildingWorkMessageIds, emailMessages]
  );
  const draftByMessageId = useMemo(() => {
    const draftsByMessage = new Map<string, ProductivityDraft>();
    for (const draft of productivityDrafts) {
      const messageId = draft.source.messageId;
      if (messageId && !draftsByMessage.has(messageId)) {
        draftsByMessage.set(messageId, draft);
      }
    }
    return draftsByMessage;
  }, [productivityDrafts]);
  const preparedWorkMessageIds = useMemo(
    () => new Set(actionPlans.map((plan) => plan.source.messageId).filter((messageId): messageId is string => Boolean(messageId))),
    [actionPlans]
  );
  const openWorkableTasks = useMemo(
    () =>
      productivityTasks.filter(
        (task) => task.state !== "done" && task.source.provider === "gmail" && typeof task.source.messageId === "string" && task.source.messageId.length > 0
      ),
    [productivityTasks]
  );
  const unpreparedWorkableTasks = useMemo(
    () => openWorkableTasks.filter((task) => task.source.messageId && !preparedWorkMessageIds.has(task.source.messageId)),
    [openWorkableTasks, preparedWorkMessageIds]
  );
  const waitingForApprovalCount = useMemo(
    () => actionPlans.filter((plan) => plan.finalApproval.required && !plan.finalApproval.approvedAt).length,
    [actionPlans]
  );
  const activeCodingDownloads = useMemo(
    () => codingDownloads.filter((download) => download.state === "progressing").length,
    [codingDownloads]
  );
  const globalCodingChats = useMemo(
    () => codingChats.filter((chat) => !chat.projectRootPath).sort((leftChat, rightChat) => rightChat.updatedAt - leftChat.updatedAt),
    [codingChats]
  );
  const taskByActionId = useMemo(() => new Map(productivityTasks.map((task) => [task.id, task])), [productivityTasks]);
  const effectiveActionItems = useMemo(
    () => (productivityTasks.length > 0 ? productivityTasks.map(productivityTaskToActionItem) : actionItems),
    [actionItems, productivityTasks]
  );
  const openActionItems = useMemo(() => effectiveActionItems.filter((item) => !item.completedAt), [effectiveActionItems]);
  const completedActionItems = useMemo(() => effectiveActionItems.filter((item) => item.completedAt), [effectiveActionItems]);
  const selectedProductivitySourceSet = useMemo(() => new Set(selectedProductivitySources), [selectedProductivitySources]);
  const enabledActionSources = useMemo(() => {
    const sources = new Set<ActionItemSource>();
    for (const source of productivitySourceOptions) {
      if (selectedProductivitySourceSet.has(source.id)) {
        sources.add(source.source);
      }
    }

    return sources;
  }, [selectedProductivitySourceSet]);
  const sourcedOpenActionItems = useMemo(
    () => openActionItems.filter((item) => enabledActionSources.has(item.source)),
    [enabledActionSources, openActionItems]
  );
  const sourcedCompletedActionItems = useMemo(
    () => completedActionItems.filter((item) => enabledActionSources.has(item.source)),
    [completedActionItems, enabledActionSources]
  );
  const urgentActionCount = useMemo(() => sourcedOpenActionItems.filter(isUrgentActionItem).length, [sourcedOpenActionItems]);
  const waitingActionCount = useMemo(() => sourcedOpenActionItems.filter(isWaitingActionItem).length, [sourcedOpenActionItems]);
  const focusTimeLabel = useMemo(() => formatFocusMinutes(sourcedOpenActionItems.length * 18), [sourcedOpenActionItems.length]);
  const activeSourceCount = selectedProductivitySources.length;
  const todayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric"
      }).format(new Date()),
    []
  );
  const visibleOpenActionItems = useMemo(
    () => (selectedActionSource === "All" ? sourcedOpenActionItems : sourcedOpenActionItems.filter((item) => item.source === selectedActionSource)),
    [selectedActionSource, sourcedOpenActionItems]
  );
  const visibleCompletedActionItems = useMemo(
    () => (selectedActionSource === "All" ? sourcedCompletedActionItems : sourcedCompletedActionItems.filter((item) => item.source === selectedActionSource)),
    [selectedActionSource, sourcedCompletedActionItems]
  );
  const actionSourceCounts = useMemo(() => {
    const counts = new Map<ActionItemSource, number>();
    for (const item of sourcedOpenActionItems) {
      counts.set(item.source, (counts.get(item.source) ?? 0) + 1);
    }

    return counts;
  }, [sourcedOpenActionItems]);
  const topPriorityActionItems = useMemo(
    () => [...sourcedOpenActionItems].sort((left, right) => Number(isUrgentActionItem(right)) - Number(isUrgentActionItem(left))).slice(0, 5),
    [sourcedOpenActionItems]
  );
  const nextActionItem = topPriorityActionItems[0] ?? null;
  const remainingPriorityActionItems = topPriorityActionItems.slice(1);
  const selectedBookmarkSourceLabels = useMemo(() => {
    const labels = new Map(bookmarkSources.map((source) => [source.id, source.label]));
    return selectedBookmarkSources.map((sourceId) => labels.get(sourceId) ?? sourceId).join(", ");
  }, [bookmarkSources, selectedBookmarkSources]);

  const applyBookmarks = useCallback((nextBookmarks: BrowserBookmarkNode[]) => {
    setBookmarks(nextBookmarks);
  }, []);

  useEffect(() => {
    applyTheme(theme);
    saveTheme(theme);
  }, [theme]);

  useEffect(() => {
    saveActionItems(actionItems);
  }, [actionItems]);

  useEffect(() => {
    setActionItems((currentItems) => {
      const cleanedItems = sanitizeActionItems(currentItems);
      return cleanedItems.length === currentItems.length ? currentItems : cleanedItems;
    });
  }, []);

  useEffect(() => {
    saveProductivitySources(selectedProductivitySources);
  }, [selectedProductivitySources]);

  useEffect(() => {
    saveAutoWorkAllEnabled(autoWorkAllEnabled);
  }, [autoWorkAllEnabled]);

  useEffect(() => {
    saveCodingChats(codingChats);
  }, [codingChats]);

  useEffect(() => {
    if (selectedActionSource !== "All" && !enabledActionSources.has(selectedActionSource)) {
      setSelectedActionSource("All");
    }
  }, [enabledActionSources, selectedActionSource]);

  useEffect(() => {
    sidebarWidthRef.current = sidebarWidth;
    try {
      window.localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(sidebarWidth));
    } catch {
      // Ignore localStorage failures; resizing should still work for this session.
    }
  }, [sidebarWidth]);

  useEffect(() => {
    productivityDraftsRef.current = productivityDrafts;
  }, [productivityDrafts]);

  useEffect(() => {
    codingSidebarWidthRef.current = codingSidebarWidth;
    try {
      window.localStorage.setItem(CODING_SIDEBAR_WIDTH_STORAGE_KEY, String(codingSidebarWidth));
    } catch {
      // Ignore localStorage failures; resizing should still work for this session.
    }
  }, [codingSidebarWidth]);

  useEffect(() => {
    function handleResize(): void {
      setSidebarWidth((currentWidth) => clampSidebarWidth(currentWidth));
      setCodingSidebarWidth((currentWidth) => clampCodingSidebarWidth(currentWidth));
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    let cancelled = false;

    void autopilot.workspaces
      .state()
      .then((state) => {
        if (cancelled) {
          return;
        }

        setWorkspaceState(state);
        const activeProfile = state.profiles.find((profile) => profile.id === state.activeWorkspaceId);
        if (activeProfile && activeProfile.view !== "settings") {
          setView(activeProfile.view);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setWorkspaceState({
            activeWorkspaceId: "browsing",
            profiles: structuredClone(DEFAULT_WORKSPACE_PROFILES)
          });
        }
      });

    void autopilot.productivity
      .listTasks()
      .then((tasks) => {
        if (!cancelled) {
          setProductivityTasks(tasks);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProductivityTasks([]);
        }
      });

    void autopilot.productivity
      .listDrafts()
      .then((drafts) => {
        if (!cancelled) {
          productivityDraftsRef.current = drafts;
          setProductivityDrafts(drafts);
          setProductivityDraftsLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          productivityDraftsRef.current = [];
          setProductivityDrafts([]);
          setProductivityDraftsLoaded(true);
        }
      });

    void autopilot.assistant
      .sources()
      .then((sources) => {
        if (!cancelled) {
          setAssistantSources(sources);
          const enabledSources = sources.filter((source) => source.enabled && source.available).map((source) => source.id);
          if (enabledSources.length > 0) {
            setAssistantSelectedSources(enabledSources);
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAssistantSources([]);
        }
      });

    void autopilot.artifacts
      .list()
      .then((nextArtifacts) => {
        if (!cancelled) {
          setArtifacts(nextArtifacts);
          setActiveArtifactId((currentId) => currentId ?? nextArtifacts[0]?.id ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setArtifacts([]);
        }
      });

    void autopilot.agent
      .listPlans()
      .then((plans) => {
        if (!cancelled) {
          setActionPlans(plans);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setActionPlans([]);
        }
      });

    void autopilot.agent
      .listRuns()
      .then((runs) => {
        if (!cancelled) {
          setAgentRuns(runs);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAgentRuns([]);
        }
      });

    void autopilot.coding
      .getSnapshot()
      .then((snapshot) => {
        if (cancelled) {
          return;
        }

        setCodingSnapshot(snapshot);
        if (snapshot.tree) {
          setOpenCodingFolders((currentFolders) => ({
            ...currentFolders,
            [snapshot.tree?.path ?? ""]: true
          }));
          setCodingStatus(`Ready in ${snapshot.activeProject?.name ?? "project"}.`);
        } else if (snapshot.projects.length > 0) {
          setCodingStatus("Choose a recent project or open a folder to start browsing files.");
        } else {
          setCodingStatus("Open a folder or create a project to start editing local files.");
        }
      })
      .catch(() => setCodingStatus("Coding workspace could not read local project access."));

    return () => {
      cancelled = true;
    };
  }, [autopilot]);

  useEffect(() => {
    void refreshCodingDownloads();

    if (view === "coding") {
      void refreshCodingPluginStatuses();
    }
  }, [activeCodingProject?.rootPath, view]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void refreshCodingDownloads();
    }, browserDownloadsOpen || (view === "coding" && codingRightPanel === "downloads") ? 1500 : 6000);

    return () => window.clearInterval(interval);
  }, [browserDownloadsOpen, codingRightPanel, view]);

  useEffect(() => {
    if (!assistantOpen) {
      return;
    }

    let cancelled = false;
    void autopilot.assistant.sources().then((sources) => {
      if (!cancelled) {
        setAssistantSources(sources);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [assistantOpen, autopilot, activeTabId, emailMessages.length, codingSnapshot.activeProject?.rootPath, codingDownloads.length]);

  useEffect(() => {
    if (!activeArtifactVersion) {
      setArtifactEditorDraft("");
      return;
    }

    setArtifactEditorDraft(artifactContentToEditorText(activeArtifactVersion.content));
  }, [activeArtifactVersion?.id]);

  useEffect(() => {
    if (view !== "design") {
      return;
    }

    void generateDesignPromptSuggestions();
  }, [activeArtifact?.id, activeArtifactVersion?.id, view]);

  useEffect(() => {
    if (reviewArtifacts.length === 0 && workingDesignItems.length === 0) {
      return;
    }

    setOpenDesignSections((currentSections) => ({
      ...currentSections,
      needsReview: reviewArtifacts.length > 0 ? true : currentSections.needsReview,
      working: workingDesignItems.length > 0 ? true : currentSections.working
    }));
  }, [reviewArtifacts.length, workingDesignItems.length]);

  useEffect(() => {
    if (installingCodingPluginCount === 0) {
      return;
    }

    const clockInterval = window.setInterval(() => {
      setCodingClock(Date.now());
    }, 1000);
    const statusInterval = window.setInterval(() => {
      void refreshCodingPluginStatuses();
    }, 3500);

    return () => {
      window.clearInterval(clockInterval);
      window.clearInterval(statusInterval);
    };
  }, [installingCodingPluginCount]);

  useEffect(() => {
    if (codingSearchQuery.trim().length === 0) {
      setCodingSearchResults([]);
      return;
    }

    let cancelled = false;
    const timeout = window.setTimeout(() => {
      void autopilot.coding.search(codingSearchQuery).then((results) => {
        if (!cancelled) {
          setCodingSearchResults(results);
        }
      });
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [autopilot, codingSearchQuery]);

  useEffect(() => {
    if (activeCodingTab.kind !== "picker") {
      return;
    }

    if (!activeCodingProject?.rootPath) {
      setCodingPickerEntries([]);
      setCodingPickerError(null);
      setCodingPickerLoading(false);
      return;
    }

    let cancelled = false;
    setCodingPickerLoading(true);
    setCodingPickerError(null);
    void autopilot.coding
      .readPath(activeCodingProject.rootPath)
      .then((result) => {
        if (cancelled) {
          return;
        }

        if (result.success && result.kind === "directory") {
          setCodingPickerEntries(result.entries);
          setCodingPickerError(null);
          return;
        }

        setCodingPickerEntries([]);
        setCodingPickerError(result.success ? "The active project is not a folder." : result.reason);
      })
      .catch(() => {
        if (!cancelled) {
          setCodingPickerEntries([]);
          setCodingPickerError("Autopilot could not read this project folder.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setCodingPickerLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeCodingProject?.rootPath, activeCodingTab.kind, autopilot]);

  useEffect(() => {
    const dirtyTabs = codingTabs.filter((tab) => tab.kind === "file" && tab.file?.kind === "text" && tab.path && tab.dirty);
    if (dirtyTabs.length === 0) {
      return;
    }

    const timeout = window.setTimeout(() => {
      for (const tab of dirtyTabs) {
        if (!tab.path || typeof tab.content !== "string") {
          continue;
        }

        void autopilot.coding.writeFile(tab.path, tab.content).then((result) => {
          if (!result.success) {
            setCodingStatus(result.reason);
            return;
          }

          setCodingTabs((currentTabs) =>
            currentTabs.map((currentTab) =>
              currentTab.id === tab.id
                ? {
                    ...currentTab,
                    dirty: false,
                    savedAt: result.savedAt,
                    file:
                      currentTab.file?.kind === "text"
                        ? {
                            ...currentTab.file,
                            content: currentTab.content ?? currentTab.file.content,
                            size: result.size,
                            modifiedAt: result.savedAt
                          }
                        : currentTab.file
                  }
                : currentTab
            )
          );
          setCodingStatus(`Saved ${tab.title} to your computer.`);
        });
      }
    }, 650);

    return () => window.clearTimeout(timeout);
  }, [autopilot, codingTabs]);

  useEffect(() => {
    const unsubscribe = autopilot.tabs.subscribe((snapshot) => {
      setTabs(snapshot.tabs);
      setActiveTabId(snapshot.activeTabId);
    });

    void autopilot.tabs.getSnapshot().then((snapshot) => {
      setTabs(snapshot.tabs);
      setActiveTabId(snapshot.activeTabId);
    });

    return unsubscribe;
  }, [autopilot]);

  useEffect(() => {
    const activeProfile = workspaceProfiles.find((profile) => profile.id === activeWorkspaceId);
    if (activeProfile?.view !== "browser" || tabs.length === 0) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void autopilot.workspaces.persistBrowserSnapshot(activeWorkspaceId).then(setWorkspaceState).catch(() => undefined);
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [activeWorkspaceId, autopilot, tabs, workspaceProfiles]);

  useEffect(() => {
    void autopilot.bookmarks
      .list()
      .then((nextBookmarks) => {
        applyBookmarks(nextBookmarks);
        setOpenBookmarkFolders({});
      })
      .catch(() => setBookmarks(DEFAULT_BOOKMARKS));
  }, [applyBookmarks, autopilot]);

  useEffect(() => {
    let cancelled = false;

    void Promise.all([autopilot.email.status(), autopilot.email.list()])
      .then(([status, messages]) => {
        if (cancelled) {
          return;
        }

        setEmailStatus(status);
        setEmailMessages(messages);
        setEmailSyncStatus(status.connected ? `Connected to ${status.accountEmail ?? "Gmail"}.` : status.reason ?? "");
      })
      .catch(() => {
        if (!cancelled) {
          setEmailStatus({
            provider: "gmail",
            configured: false,
            connected: false,
            accountEmail: null,
            reason: "Email sync could not start."
          });
          setEmailMessages([]);
          setEmailSyncStatus("Email sync could not start.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [autopilot]);

  useEffect(() => {
    if (!emailStatus?.connected || !productivityDraftsLoaded || emailMessages.length === 0) {
      return;
    }

    const existingDraftMessageIds = new Set(
      productivityDraftsRef.current.map((draft) => draft.source.messageId).filter((messageId): messageId is string => Boolean(messageId))
    );
    const missingDraftMessages = emailMessages.filter(
      (message) =>
        !existingDraftMessageIds.has(message.id) &&
        !autoDraftingMessageIdsRef.current.has(message.id) &&
        !autoDraftAttemptedMessageIdsRef.current.has(message.id)
    );
    if (missingDraftMessages.length === 0) {
      return;
    }

    let cancelled = false;
    void (async () => {
      let completedCount = 0;
      setAutoDraftStatus(`Preparing AI drafts for ${missingDraftMessages.length} email${missingDraftMessages.length === 1 ? "" : "s"}...`);

      for (const message of missingDraftMessages) {
        if (cancelled) {
          break;
        }

        autoDraftingMessageIdsRef.current.add(message.id);
        setAutoDraftStatus(`Drafting ${completedCount + 1} of ${missingDraftMessages.length}: ${message.subject || "email"}`);
        await generateArtifactFromEmail(message, undefined, {
          mode: "auto-draft",
          taskIds: []
        });
        autoDraftingMessageIdsRef.current.delete(message.id);
        autoDraftAttemptedMessageIdsRef.current.add(message.id);
        completedCount += 1;
      }

      if (!cancelled) {
        setAutoDraftStatus(
          completedCount > 0
            ? `AI drafts ready for ${completedCount} email${completedCount === 1 ? "" : "s"}.`
            : ""
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [emailMessages, emailStatus?.connected, productivityDraftsLoaded]);

  useEffect(() => {
    let cancelled = false;

    void Promise.all([autopilot.bookmarks.sources(), autopilot.bookmarks.selectedSources()])
      .then(([sources, selectedSources]) => {
        if (cancelled) {
          return;
        }

        setBookmarkSources(sources);
        setSelectedBookmarkSources(selectedSources);
        setDraftBookmarkSources(selectedSources);
        setBookmarkImportOpen(sources.length > 0 && selectedSources.length === 0);
      })
      .catch(() => {
        if (!cancelled) {
          setBookmarkSources([]);
          setSelectedBookmarkSources([]);
          setDraftBookmarkSources([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [autopilot]);

  useEffect(() => {
    let cancelled = false;
    const unsubscribe = autopilot.passwords.subscribeSavePrompts((pending) => {
      setPasswordPrompt(pending);
      setPasswordStatus("");
    });
    const unsubscribeChanges = autopilot.passwords.subscribeChanges((entries) => {
      setPasswordEntries(entries);
    });

    void Promise.all([autopilot.passwords.availability(), autopilot.passwords.list()])
      .then(([availability, entries]) => {
        if (cancelled) {
          return;
        }

        setPasswordAvailability(availability);
        setPasswordEntries(entries);
      })
      .catch(() => {
        if (!cancelled) {
          setPasswordAvailability({
            secureStorage: false,
            backend: "Unavailable",
            reason: "Password manager could not start."
          });
          setPasswordEntries([]);
        }
      });

    return () => {
      cancelled = true;
      unsubscribe();
      unsubscribeChanges();
    };
  }, [autopilot]);

  useEffect(() => {
    if (view !== "settings") {
      setRevealedPasswords({});
    }
  }, [view]);

  useEffect(() => {
    if (!iconPreviewOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setIconPreviewOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [iconPreviewOpen]);

  useEffect(() => {
    if (!bookmarkContextMenu) {
      return;
    }

    function handlePointerDown(): void {
      closeBookmarkContextMenu();
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        closeBookmarkContextMenu();
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [bookmarkContextMenu]);

  useEffect(() => {
    if (activeTab) {
      const displayUrl = getDisplayUrl(activeTab.url);
      setAddressDraft(displayUrl === AUTOPILOT_HOME_LABEL ? "" : displayUrl);
    }
  }, [activeTab?.id, activeTab?.url]);

  useEffect(() => {
    if (!activeTab || activeTab.isLoading || activeTab.navigationError || isHomeUrl(activeTab.url) || isHistoryPageUrl(activeTab.url)) {
      return;
    }

    setHistoryEntries((currentEntries) => {
      const nextEntries = addHistoryEntry(currentEntries, {
        title: activeTab.title,
        url: activeTab.url,
        visitedAt: Date.now()
      });
      if (nextEntries === currentEntries) {
        return currentEntries;
      }

      saveHistoryEntries(nextEntries);
      return nextEntries;
    });
  }, [activeTab?.isLoading, activeTab?.navigationError, activeTab?.title, activeTab?.url]);

  const sendWebArea = useCallback(() => {
    const node = webAreaRef.current;
    if (!node) {
      return;
    }

    const rect = node.getBoundingClientRect();
    const sidePanelOpen = view === "browser" && (assistantOpen || browserDownloadsOpen);
    const sidePanelReserve = sidePanelOpen ? Math.min(456, Math.max(320, Math.round(rect.width * 0.34))) : 0;
    const browserWidth = Math.max(0, Math.round(rect.width - sidePanelReserve));
    void autopilot.tabs.setWebArea(
      {
        x: Math.round(rect.left),
        y: Math.round(rect.top),
        width: browserWidth,
        height: Math.round(rect.height)
      },
      view === "browser"
    );
  }, [assistantOpen, autopilot, browserDownloadsOpen, view]);

  useLayoutEffect(() => {
    sendWebArea();

    const resizeObserver = new ResizeObserver(() => sendWebArea());
    if (webAreaRef.current) {
      resizeObserver.observe(webAreaRef.current);
    }

    window.addEventListener("resize", sendWebArea);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", sendWebArea);
    };
  }, [sendWebArea, tabs.length, activeTabId, activeNavigationErrorKey, sidebarOpen, sidebarWidth, assistantOpen, browserDownloadsOpen]);

  function navigateTo(input: string): void {
    if (!activeTabId) {
      return;
    }

    const destination = isHistoryAddressInput(input) ? createHistoryUrl(historyEntries, theme) : input;
    void autopilot.tabs.navigate(activeTabId, destination);
    showBrowserWorkspace();
  }

  function openHistoryPage(): void {
    navigateTo(createHistoryUrl(historyEntries, theme));
  }

  function navigate(event?: FormEvent<HTMLFormElement>): void {
    event?.preventDefault();
    navigateTo(addressDraft);
  }

  function retryNavigationError(): void {
    if (!activeTabId || !activeNavigationError) {
      return;
    }

    void autopilot.tabs.navigate(activeTabId, activeNavigationError.url);
    showBrowserWorkspace();
  }

  function addTab(): void {
    void autopilot.tabs.create();
    showBrowserWorkspace();
  }

  async function openEmailInBrowser(message: EmailMessageSummary): Promise<void> {
    try {
      setEmailSyncStatus(`Opening ${message.subject || "email"} in a browser tab...`);
      await autopilot.tabs.create(message.url);
      showBrowserWorkspace();
      setEmailSyncStatus(`Opened ${message.subject || "email"} in a new tab.`);
    } catch {
      setEmailSyncStatus("Autopilot could not open that email. Sync Gmail again and try once more.");
    }
  }

  async function openProductivityTaskSource(task: ProductivityTask): Promise<void> {
    if (!task.source.url) {
      setEmailSyncStatus("This action item does not have a source link yet.");
      return;
    }

    try {
      await autopilot.tabs.create(task.source.url);
      showBrowserWorkspace();
      setEmailSyncStatus(`Opened ${task.source.subject || task.title} in a browser tab.`);
    } catch {
      setEmailSyncStatus("Autopilot could not open the source link for that action item.");
    }
  }

  function deleteTab(tabId = activeTabId): void {
    if (!tabId) {
      return;
    }

    void autopilot.tabs.close(tabId);
    showBrowserWorkspace();
  }

  function activateTab(tabId: string): void {
    void autopilot.tabs.activate(tabId);
    showBrowserWorkspace();
  }

  function goHome(): void {
    navigateTo(AUTOPILOT_HOME_LABEL);
  }

  function printActivePage(): void {
    if (!activeTabId) {
      return;
    }

    void autopilot.tabs.print(activeTabId);
  }

  function addActiveBookmark(): void {
    if (!activeTab || isHomeUrl(activeTab.url) || isHistoryPageUrl(activeTab.url)) {
      return;
    }

    void autopilot.bookmarks
      .add({
        title: activeTab.title,
        url: activeTab.url
      })
      .then((nextBookmarks) => {
        applyBookmarks(nextBookmarks);
      });
  }

  function toggleBookmarkFolder(folderId: string): void {
    setOpenBookmarkFolders((currentFolders) => ({
      ...currentFolders,
      [folderId]: !currentFolders[folderId]
    }));
  }

  function openBookmarkContextMenu(event: ReactMouseEvent, target: BookmarkNodeTarget | null): void {
    event.preventDefault();
    event.stopPropagation();
    setBookmarkContextMenu({
      x: Math.min(event.clientX, window.innerWidth - 220),
      y: Math.min(event.clientY, window.innerHeight - 150),
      target,
      mode: "actions"
    });
    setBookmarkFolderDraft("New folder");
  }

  function closeBookmarkContextMenu(): void {
    setBookmarkContextMenu(null);
    setBookmarkFolderDraft("New folder");
  }

  function beginBookmarkFolder(parent: BookmarkNodeTarget | null = null): void {
    setBookmarkFolderDraft("New folder");
    setBookmarkContextMenu((currentMenu) => {
      if (!currentMenu) {
        return null;
      }

      return {
        ...currentMenu,
        mode: "new-folder",
        target: parent,
        x: Math.min(currentMenu.x, window.innerWidth - 230),
        y: Math.min(currentMenu.y, window.innerHeight - 150)
      };
    });
  }

  function addBookmarkFolder(event?: FormEvent<HTMLFormElement>): void {
    event?.preventDefault();
    const title = bookmarkFolderDraft.trim();
    if (!title) {
      return;
    }

    const parent = getFolderCreationParent(bookmarkContextMenu?.target ?? null);
    setBookmarkFolderBusy(true);
    void autopilot.bookmarks
      .addFolder({
        title,
        parent
      })
      .then((nextBookmarks) => {
        applyBookmarks(nextBookmarks);
        closeBookmarkContextMenu();
      })
      .finally(() => setBookmarkFolderBusy(false));
  }

  function deleteBookmarkNode(target: BookmarkNodeTarget): void {
    void autopilot.bookmarks.delete(target).then((nextBookmarks) => {
      applyBookmarks(nextBookmarks);
      setOpenBookmarkFolders({});
      closeBookmarkContextMenu();
    });
  }

  function toggleDraftBookmarkSource(sourceId: string): void {
    setDraftBookmarkSources((currentSources) =>
      currentSources.includes(sourceId)
        ? currentSources.filter((currentSource) => currentSource !== sourceId)
        : [...currentSources, sourceId]
    );
  }

  function applyBookmarkSources(): void {
    setBookmarkImportBusy(true);
    void autopilot.bookmarks
      .setSources(draftBookmarkSources)
      .then((nextBookmarks) => {
        setSelectedBookmarkSources(draftBookmarkSources);
        applyBookmarks(nextBookmarks);
        setBookmarkImportOpen(false);
      })
      .finally(() => setBookmarkImportBusy(false));
  }

  function updateTheme(key: keyof BrowserTheme, value: string): void {
    setTheme((currentTheme) => ({ ...currentTheme, [key]: value }));
  }

  function handleResetTheme(): void {
    setTheme(resetTheme());
  }

  function savePendingPassword(): void {
    if (!passwordPrompt) {
      return;
    }

    void autopilot.passwords
      .savePending(passwordPrompt.id)
      .then((result) => {
        setPasswordEntries(result.entries);
        if (result.success) {
          setPasswordPrompt(null);
          setPasswordStatus("Password saved with your device login key.");
        } else {
          setPasswordStatus(result.reason);
        }
      })
      .catch(() => setPasswordStatus("Password could not be saved."));
  }

  function dismissPendingPassword(): void {
    if (!passwordPrompt) {
      return;
    }

    const pendingId = passwordPrompt.id;
    setPasswordPrompt(null);
    void autopilot.passwords.dismissPending(pendingId);
  }

  function togglePasswordReveal(id: string): void {
    if (revealedPasswords[id]) {
      setRevealedPasswords((currentPasswords) => {
        const { [id]: _hiddenPassword, ...remainingPasswords } = currentPasswords;
        return remainingPasswords;
      });
      return;
    }

    setPasswordStatus("Use your operating system sign-in to unlock this password.");
    void autopilot.passwords
      .reveal(id)
      .then((result) => {
        if (!result.success) {
          setPasswordStatus(result.reason);
          return;
        }

        setRevealedPasswords((currentPasswords) => ({
          ...currentPasswords,
          [id]: result.entry.password
        }));
        setPasswordStatus("Unlocked with your device login key.");
      })
      .catch(() => setPasswordStatus("Password could not be unlocked."));
  }

  function removePassword(id: string): void {
    void autopilot.passwords
      .remove(id)
      .then((entries) => {
        setPasswordEntries(entries);
        setRevealedPasswords((currentPasswords) => {
          const { [id]: _removedPassword, ...remainingPasswords } = currentPasswords;
          return remainingPasswords;
        });
        setPasswordStatus("Saved password removed.");
      })
      .catch(() => setPasswordStatus("Saved password could not be removed."));
  }

  function toggleProductivitySource(sourceId: ProductivitySourceId): void {
    setSelectedProductivitySources((currentSources) => {
      const nextSources = currentSources.includes(sourceId)
        ? currentSources.filter((currentSource) => currentSource !== sourceId)
        : [...currentSources, sourceId];

      return nextSources.length > 0 ? nextSources : currentSources;
    });
  }

  function showBrowserWorkspace(): void {
    const browsingProfile = workspaceProfiles.find((profile) => profile.id === "browsing") ?? workspaceProfiles.find((profile) => profile.view === "browser");
    setView("browser");
    if (!browsingProfile) {
      return;
    }

    setWorkspaceState((currentState) =>
      currentState.activeWorkspaceId === browsingProfile.id
        ? currentState
        : {
            ...currentState,
            activeWorkspaceId: browsingProfile.id
          }
    );
    void autopilot.workspaces.switch(browsingProfile.id).then(setWorkspaceState).catch(() => undefined);
  }

  function showDesignWorkspace(): void {
    const designProfile = workspaceProfiles.find((profile) => profile.id === "design") ?? workspaceProfiles.find((profile) => profile.view === "design");
    setView("design");
    setAssistantOpen(false);
    setBrowserDownloadsOpen(false);
    if (!designProfile) {
      return;
    }

    setWorkspaceState((currentState) =>
      currentState.activeWorkspaceId === designProfile.id
        ? currentState
        : {
            ...currentState,
            activeWorkspaceId: designProfile.id
          }
    );
    void autopilot.workspaces.switch(designProfile.id).then(setWorkspaceState).catch(() => undefined);
  }

  function toggleAssistantPanel(): void {
    setBrowserDownloadsOpen(false);
    showBrowserWorkspace();
    setAssistantOpen((isOpen) => !isOpen);
    void autopilot.assistant.sources().then(setAssistantSources).catch(() => setAssistantSources([]));
  }

  async function switchWorkspace(profile: WorkspaceProfile): Promise<void> {
    const nextView = getBuiltInWorkspaceView(profile);
    setView(nextView);
    if (nextView !== "browser") {
      setAssistantOpen(false);
      setBrowserDownloadsOpen(false);
    }
    setWorkspaceState((currentState) => ({
      ...currentState,
      activeWorkspaceId: profile.id
    }));

    const nextTheme = Object.keys(profile.theme).length > 0 ? { ...theme, ...profile.theme } : theme;
    if (nextTheme !== theme) {
      setTheme(nextTheme);
    }

    const nextState = await autopilot.workspaces.switch(profile.id).catch(() => null);
    if (nextState) {
      setWorkspaceState(nextState);
    }
  }

  async function refreshProductivityTasks(): Promise<void> {
    const tasks = await autopilot.productivity.listTasks().catch(() => null);
    if (tasks) {
      setProductivityTasks(tasks);
    }
  }

  async function syncProductivityTasksFromSources(): Promise<void> {
    const result = await autopilot.productivity.sync().catch((error: unknown) => ({
      success: false,
      tasks: productivityTasks,
      addedCount: 0,
      updatedCount: 0,
      model: undefined,
      reason: error instanceof Error ? error.message : "Productivity task sync failed."
    }));

    setProductivityTasks(result.tasks);
    setEmailSyncStatus(
      result.success
        ? `Built ${result.tasks.length} action ${result.tasks.length === 1 ? "item" : "items"} from Gmail${
            result.model ? ` with ${result.model}` : ""
          }.`
        : result.reason ?? "Productivity task sync failed."
    );
    if (result.success && autoWorkAllEnabled) {
      void buildAllActionItemWork(result.tasks, "auto");
    }
  }

  async function refreshArtifacts(): Promise<void> {
    const [nextArtifacts, nextPlans, nextRuns] = await Promise.all([
      autopilot.artifacts.list().catch(() => null),
      autopilot.agent.listPlans().catch(() => null),
      autopilot.agent.listRuns().catch(() => null)
    ]);
    if (!nextArtifacts) {
      setArtifactStatus("Artifact Studio could not load saved work.");
      return;
    }

    setArtifacts(nextArtifacts);
    if (nextPlans) {
      setActionPlans(nextPlans);
    }
    if (nextRuns) {
      setAgentRuns(nextRuns);
    }
    setActiveArtifactId((currentId) => currentId ?? nextArtifacts[0]?.id ?? null);
  }

  async function saveProductivityDraftFromEmail(message: EmailMessageSummary, artifact: Artifact, plan: ActionPlan): Promise<void> {
    const body = artifactContentToEditorText(getActiveArtifactVersion(artifact).content);
    const nextDrafts = await autopilot.productivity
      .upsertDraft({
        id: `email-draft:${message.id}:${artifact.id}`,
        title: artifact.title,
        body,
        preview: artifact.summary || body,
        status: plan.finalApproval.required ? "needs_review" : "draft",
        artifactId: artifact.id,
        artifactKind: artifact.kind,
        source: {
          provider: "gmail",
          label: `${message.from} - ${message.subject}`.slice(0, 120),
          messageId: message.id,
          url: message.url,
          from: message.from,
          subject: message.subject
        }
      })
      .catch(() => null);

    if (nextDrafts) {
      productivityDraftsRef.current = nextDrafts;
      setProductivityDrafts(nextDrafts);
    }
  }

  function openProductivityDraft(draft: ProductivityDraft): void {
    if (draft.artifactId) {
      setActiveArtifactId(draft.artifactId);
      setArtifactStatus(`Opened "${draft.title}" from Productivity drafts.`);
      showDesignWorkspace();
      return;
    }

    setEmailSyncStatus("This draft is saved in Productivity, but its design artifact is no longer linked.");
  }

  async function openProductivityDraftSource(draft: ProductivityDraft): Promise<void> {
    if (!draft.source.url) {
      setEmailSyncStatus("This draft does not have a source email link yet.");
      return;
    }

    showBrowserWorkspace();
    await autopilot.tabs.create(draft.source.url).catch(() => {
      setEmailSyncStatus("Autopilot could not open the source for that draft.");
    });
  }

  function deleteProductivityDraft(draftId: string): void {
    void autopilot.productivity
      .deleteDraft(draftId)
      .then((drafts) => {
        productivityDraftsRef.current = drafts;
        setProductivityDrafts(drafts);
      })
      .catch(() => {
        setEmailSyncStatus("Autopilot could not delete that draft.");
      });
  }

  async function markProductivityTasksWaiting(taskIds: string[]): Promise<void> {
    const uniqueTaskIds = [...new Set(taskIds)].filter(Boolean);
    if (uniqueTaskIds.length === 0) {
      return;
    }

    let latestTasks: ProductivityTask[] | null = null;
    for (const taskId of uniqueTaskIds) {
      latestTasks = await autopilot.productivity.setTaskState(taskId, "waiting").catch(() => latestTasks);
    }
    if (latestTasks) {
      setProductivityTasks(latestTasks);
    }
  }

  async function getEmailMessagesForWork(): Promise<Map<string, EmailMessageSummary>> {
    const latestMessages = await autopilot.email.list().catch(() => emailMessages);
    if (latestMessages.length > 0) {
      setEmailMessages(latestMessages);
    }

    const messagesById = new Map<string, EmailMessageSummary>();
    for (const message of [...emailMessages, ...latestMessages]) {
      messagesById.set(message.id, message);
    }
    return messagesById;
  }

  async function buildAllActionItemWork(tasksOverride?: ProductivityTask[], trigger: "manual" | "auto" = "manual"): Promise<void> {
    if (bulkWorkBusy) {
      return;
    }

    const sourceTasks = (tasksOverride ?? productivityTasks).filter(
      (task) => task.state !== "done" && task.source.provider === "gmail" && typeof task.source.messageId === "string" && task.source.messageId.length > 0
    );
    const plannedMessageIds = new Set(actionPlans.map((plan) => plan.source.messageId).filter((messageId): messageId is string => Boolean(messageId)));
    const groupedTasks = new Map<string, string[]>();
    for (const task of sourceTasks) {
      const messageId = task.source.messageId;
      if (!messageId || plannedMessageIds.has(messageId)) {
        continue;
      }

      groupedTasks.set(messageId, [...(groupedTasks.get(messageId) ?? []), task.id]);
    }

    if (groupedTasks.size === 0) {
      const message = sourceTasks.length > 0 ? "All open Gmail action items already have generated work in Design." : "No Gmail action items are ready for background work yet.";
      setAutoWorkStatus(message);
      setBackgroundWorkStatus(message);
      return;
    }

    setBulkWorkBusy(true);
    setAutoWorkStatus(`${trigger === "auto" ? "Auto-work is" : "Autopilot is"} preparing ${groupedTasks.size} work item${groupedTasks.size === 1 ? "" : "s"} in Design.`);
    setBackgroundWorkStatus("Background work started. You can keep using Autopilot while Design fills up.");

    const messagesById = await getEmailMessagesForWork();
    let builtCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const [messageId, taskIds] of groupedTasks) {
      const message = messagesById.get(messageId);
      if (!message) {
        skippedCount += 1;
        continue;
      }

      const success = await generateArtifactFromEmail(message, undefined, {
        mode: "bulk",
        taskIds
      });
      if (success) {
        builtCount += 1;
        plannedMessageIds.add(messageId);
      } else {
        failedCount += 1;
      }
      setAutoWorkStatus(`Prepared ${builtCount} of ${groupedTasks.size}. ${failedCount > 0 ? `${failedCount} failed. ` : ""}${skippedCount > 0 ? `${skippedCount} skipped.` : ""}`);
    }

    const finalStatus =
      builtCount > 0
        ? `Prepared ${builtCount} work item${builtCount === 1 ? "" : "s"} in Design${failedCount > 0 ? `, ${failedCount} failed` : ""}${skippedCount > 0 ? `, ${skippedCount} skipped` : ""}.`
        : failedCount > 0
          ? `Autopilot tried ${failedCount} work item${failedCount === 1 ? "" : "s"}, but none completed.`
          : "No matching synced emails were found for those action items.";
    setAutoWorkStatus(finalStatus);
    setBackgroundWorkStatus(finalStatus);
    setBulkWorkBusy(false);
  }

  async function generateArtifactFromEmail(message: EmailMessageSummary, preferredKind?: ArtifactKind, options: EmailWorkOptions = {}): Promise<boolean> {
    const mode = options.mode ?? "background";
    const isAutoDraft = mode === "auto-draft";
    const shouldOpenDesign = mode === "open-design";
    const taskIds = options.taskIds ?? productivityTasks.filter((task) => task.source.messageId === message.id && task.state !== "done").map((task) => task.id);

    if (!isAutoDraft) {
      setArtifactBusy(true);
      setArtifactStatus(`Autopilot is building work from "${message.subject || "email"}"...`);
      setBackgroundWorkStatus(`Working on "${message.subject || "email"}" in the Design workspace.`);
      setArtifactExportResult(null);
    }
    setBuildingWorkMessageIds((messageIds) => (messageIds.includes(message.id) ? messageIds : [...messageIds, message.id]));
    if (shouldOpenDesign) {
      showDesignWorkspace();
    }
    const result = await autopilot.agent
      .planFromEmail({
        messageId: message.id,
        preferredKind
      })
      .catch((error: unknown) => ({
        success: false as const,
        reason: error instanceof Error ? error.message : "Autopilot could not build from that email."
      }));

    if (result.success) {
      setLastActionPlan(result.plan);
      setActionPlans((plans) => [result.plan, ...plans.filter((plan) => plan.id !== result.plan.id)]);
      if (!isAutoDraft) {
        setActiveArtifactId(result.artifact.id);
      }
      await refreshArtifacts();
      setAgentRuns((runs) => [result.run, ...runs.filter((run) => run.id !== result.run.id)]);
      await saveProductivityDraftFromEmail(message, result.artifact, result.plan);
      if (!isAutoDraft && taskIds.length > 0) {
        await markProductivityTasksWaiting(taskIds);
      }
      if (!isAutoDraft) {
        setArtifactStatus(
          `${getArtifactKindLabel(result.artifact.kind)} created from ${message.from}${result.usedFallback ? " using the local fallback" : ""}.`
        );
        setBackgroundWorkStatus(`${getArtifactKindLabel(result.artifact.kind)} ready in the Design workspace.`);
      }
      setBuildingWorkMessageIds((messageIds) => messageIds.filter((messageId) => messageId !== message.id));
      if (!isAutoDraft) {
        setArtifactBusy(false);
      }
      return true;
    } else {
      if (!isAutoDraft) {
        setArtifactStatus(result.reason);
        setBackgroundWorkStatus(result.reason);
      }
      setBuildingWorkMessageIds((messageIds) => messageIds.filter((messageId) => messageId !== message.id));
      if (!isAutoDraft) {
        setArtifactBusy(false);
      }
      return false;
    }
  }

  async function generateArtifactFromPrompt(event?: FormEvent<HTMLFormElement>): Promise<void> {
    event?.preventDefault();
    const prompt = artifactPrompt.trim();
    if (!prompt || artifactBusy) {
      return;
    }

    setArtifactBusy(true);
    setArtifactExportResult(null);
    setArtifactStatus("Autopilot is generating an artifact...");
    showDesignWorkspace();
    const result = await autopilot.agent
      .startRun({ prompt })
      .catch((error: unknown) => ({
        success: false as const,
        reason: error instanceof Error ? error.message : "Autopilot could not generate that artifact."
      }));

    if (result.success) {
      setLastActionPlan(result.plan);
      setActionPlans((plans) => [result.plan, ...plans.filter((plan) => plan.id !== result.plan.id)]);
      setActiveArtifactId(result.artifact.id);
      await refreshArtifacts();
      setAgentRuns((runs) => [result.run, ...runs.filter((run) => run.id !== result.run.id)]);
      setArtifactStatus(`${getArtifactKindLabel(result.artifact.kind)} created. Keep prompting to revise it.`);
    } else {
      setArtifactStatus(result.reason);
    }
    setArtifactBusy(false);
  }

  async function reviseActiveArtifact(event?: FormEvent<HTMLFormElement>): Promise<void> {
    event?.preventDefault();
    if (!activeArtifact || !activeArtifactVersion || artifactBusy) {
      return;
    }

    const prompt = artifactPrompt.trim() || "Revise this artifact.";
    setArtifactBusy(true);
    setArtifactStatus("Saving a new artifact version...");
    const nextArtifacts = await autopilot.artifacts
      .update({
        artifactId: activeArtifact.id,
        prompt,
        summary: `Revised from prompt: ${prompt.slice(0, 120)}`,
        content: editorTextToArtifactContent(activeArtifact.kind, artifactEditorDraft, activeArtifactVersion.content)
      })
      .catch(() => null);

    if (nextArtifacts) {
      setArtifacts(nextArtifacts);
      setActiveArtifactId(activeArtifact.id);
      setArtifactStatus("New version saved.");
    } else {
      setArtifactStatus("Autopilot could not save that version.");
    }
    setArtifactBusy(false);
  }

  async function reviseActiveArtifactWithAi(): Promise<void> {
    if (!activeArtifact || !activeArtifactVersion || artifactBusy) {
      return;
    }

    const prompt = artifactPrompt.trim();
    if (!prompt) {
      setArtifactStatus("Tell Autopilot what to change first.");
      return;
    }

    setArtifactBusy(true);
    setArtifactStatus("Autopilot is revising this artifact...");
    const result = await autopilot.agent
      .startRun({
        preferredKind: activeArtifact.kind,
        prompt: `Revise this ${getArtifactKindLabel(activeArtifact.kind).toLowerCase()} using the instruction below.

Instruction:
${prompt}

Current artifact:
${artifactContentToEditorText(activeArtifactVersion.content)}`
      })
      .catch((error: unknown) => ({
        success: false as const,
        reason: error instanceof Error ? error.message : "Autopilot could not revise this artifact."
      }));

    if (!result.success) {
      setArtifactStatus(result.reason);
      setArtifactBusy(false);
      return;
    }

    const generatedVersion = getActiveArtifactVersion(result.artifact);
    const nextArtifacts = await autopilot.artifacts
      .update({
        artifactId: activeArtifact.id,
        prompt,
        summary: `AI revision: ${prompt.slice(0, 120)}`,
        content: generatedVersion.content.kind === activeArtifact.kind ? generatedVersion.content : activeArtifactVersion.content
      })
      .catch(() => null);

    if (nextArtifacts) {
      setArtifacts(nextArtifacts);
      setActiveArtifactId(activeArtifact.id);
      setAgentRuns((runs) => [result.run, ...runs.filter((run) => run.id !== result.run.id)]);
      setArtifactStatus("AI revision saved as a new version.");
    } else {
      setArtifactStatus("Autopilot generated a revision but could not save it.");
    }
    setArtifactBusy(false);
  }

  async function exportActiveArtifact(): Promise<void> {
    if (!activeArtifact || artifactBusy) {
      return;
    }

    setArtifactBusy(true);
    setArtifactStatus(`Exporting ${activeArtifact.title}...`);
    const result = await autopilot.artifacts.export(activeArtifact.id).catch(
      (error: unknown): ArtifactExportResult => ({
        success: false,
        artifactId: activeArtifact.id,
        kind: activeArtifact.kind,
        reason: error instanceof Error ? error.message : "Artifact export failed."
      })
    );
    setArtifactExportResult(result);
    setArtifactStatus(result.success ? `Exported to ${result.path}` : result.reason);
    setArtifactBusy(false);
  }

  async function exportActiveArtifactToCoding(): Promise<void> {
    if (!activeArtifact || artifactBusy) {
      return;
    }

    setArtifactBusy(true);
    setExportToCodingStatus(`Exporting ${activeArtifact.title} to Coding...`);
    const result = await autopilot.artifacts.exportToCoding(activeArtifact.id).catch(
      (error: unknown): ArtifactExportToCodingResult => ({
        success: false,
        artifactId: activeArtifact.id,
        kind: activeArtifact.kind,
        reason: error instanceof Error ? error.message : "Autopilot could not export this design to Coding."
      })
    );

    if (!result.success) {
      setExportToCodingStatus(result.reason);
      setArtifactStatus(result.reason);
      setArtifactBusy(false);
      return;
    }

    setExportToCodingStatus(`Exported to ${result.projectRootPath}`);
    setArtifactStatus(`Website design exported to Coding: ${result.projectRootPath}`);
    applyCodingSnapshot(result.codingSnapshot, `Ready to build ${activeArtifact.title}.`);
    const exportedProject =
      result.codingSnapshot.activeProject ??
      result.codingSnapshot.projects.find((project) => project.rootPath === result.projectRootPath) ??
      null;
    if (exportedProject) {
      startNewCodingChat(exportedProject, `Build ${activeArtifact.title}`);
    }

    const codingProfile = workspaceProfiles.find((profile) => profile.id === "coding") ?? workspaceProfiles.find((profile) => profile.view === "coding");
    if (codingProfile) {
      await switchWorkspace(codingProfile);
    } else {
      setView("coding");
    }
    setArtifactBusy(false);
  }

  async function generateDesignPromptSuggestions(): Promise<void> {
    if (designPromptBusy) {
      return;
    }

    setDesignPromptBusy(true);
    setDesignPromptStatus("Generating prompt ideas...");
    const contentPreview = activeArtifactVersion ? artifactContentToEditorText(activeArtifactVersion.content).slice(0, 4000) : artifactPrompt;
    const result = await autopilot.assistant
      .generatePrompts({
        artifactId: activeArtifact?.id,
        title: activeArtifact?.title ?? "New Autopilot design",
        kind: activeArtifact?.kind ?? "website_design",
        summary: activeArtifact?.summary,
        contentPreview
      })
      .catch((error: unknown) => ({
        success: false,
        suggestions: [],
        model: undefined,
        reason: error instanceof Error ? error.message : "Autopilot could not generate prompt ideas."
      }));

    if (result.success && result.suggestions.length > 0) {
      setDesignPromptSuggestions(result.suggestions.slice(0, 5));
      setDesignPromptStatus(result.model ? `Suggested by ${result.model}.` : "Prompt ideas ready.");
    } else {
      setDesignPromptSuggestions([]);
      setDesignPromptStatus(result.reason ?? "Prompt ideas are unavailable right now.");
    }
    setDesignPromptBusy(false);
  }

  async function submitDesignAssistantPrompt(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (activeArtifact && activeArtifactVersion) {
      await reviseActiveArtifactWithAi();
    } else {
      await generateArtifactFromPrompt();
    }
    void generateDesignPromptSuggestions();
  }

  async function approveFinalActionPlan(plan: ActionPlan): Promise<void> {
    if (artifactBusy) {
      return;
    }

    setArtifactBusy(true);
    setArtifactStatus("Recording final approval...");
    const runs = await autopilot.agent.approveFinalStep(plan.id).catch(() => null);
    const approvedAt = Date.now();
    const approvedPlan: ActionPlan = {
      ...plan,
      finalApproval: {
        ...plan.finalApproval,
        approvedAt
      },
      steps: plan.steps.map((step) => (step.requiresFinalApproval ? { ...step, state: "completed" } : step)),
      updatedAt: approvedAt
    };
    if (runs) {
      setAgentRuns(runs);
      setLastActionPlan(approvedPlan);
      setActionPlans((plans) => plans.map((currentPlan) => (currentPlan.id === approvedPlan.id ? approvedPlan : currentPlan)));
      setArtifactStatus("Final approval recorded. Autopilot can now proceed with the external step when that workflow is available.");
    } else {
      setArtifactStatus("Autopilot could not record final approval.");
    }
    setArtifactBusy(false);
  }

  function addEmailActionSuggestions(suggestions: EmailActionSuggestion[]): number {
    const existingKeys = new Set(actionItems.map((item) => `${item.source}:${item.context}:${item.title}`.toLowerCase()));
    const nextItems: ActionItem[] = [];

    for (const suggestion of suggestions) {
      const item = createActionItem(suggestion.title, "Email", suggestion.context);
      const key = `${item.source}:${item.context}:${item.title}`.toLowerCase();
      if (!existingKeys.has(key)) {
        existingKeys.add(key);
        nextItems.push(item);
      }
    }

    if (nextItems.length > 0) {
      setActionItems((currentItems) => [...nextItems, ...currentItems]);
    }

    return nextItems.length;
  }

  function addLocalActionsFromEmailMessages(messages: EmailMessageSummary[]): number {
    const suggestions: EmailActionSuggestion[] = [];

    for (const message of messages) {
      const context = getEmailContext(message);
      const titles = extractActionItemTitles(`${message.subject}.\n${message.snippet}\n${message.actionText ?? ""}`);
      for (const title of titles) {
        suggestions.push({ title, context, sourceMessageId: message.id });
      }
    }

    return addEmailActionSuggestions(suggestions);
  }

  async function addActionsFromEmailMessages(messages: EmailMessageSummary[]): Promise<{
    addedCount: number;
    engine: "openai" | "local";
    model?: string;
    reason?: string;
  }> {
    if (messages.length === 0) {
      return { addedCount: 0, engine: "local" };
    }

    const analysis = await autopilot.email.analyzeActions(messages).catch((error: unknown) => ({
      success: false,
      configured: true,
      actions: [],
      model: undefined,
      reason: error instanceof Error ? error.message : "OpenAI email analysis failed."
    }));

    if (analysis.success) {
      return {
        addedCount: addEmailActionSuggestions(analysis.actions),
        engine: "openai",
        model: analysis.model
      };
    }

    return {
      addedCount: addLocalActionsFromEmailMessages(messages),
      engine: "local",
      model: analysis.model,
      reason: analysis.reason
    };
  }

  async function syncEmailInbox(): Promise<void> {
    setEmailBusy(true);
    setEmailSyncStatus("Syncing Gmail inbox...");
    const result = await autopilot.email.sync().catch(() => ({
      success: false as const,
      status: emailStatus ?? {
        provider: "gmail" as const,
        configured: false,
        connected: false,
        accountEmail: null,
        reason: "Email sync failed."
      },
      messages: emailMessages,
      reason: "Email sync failed."
    }));

    setEmailStatus(result.status);
    setEmailMessages(result.messages);
    if (!result.success) {
      setEmailSyncStatus(result.reason ?? result.status.reason ?? "Email sync failed.");
      setEmailBusy(false);
      return;
    }

    setEmailSyncStatus("Reading synced emails and building today's call...");
    const actionResult = await addActionsFromEmailMessages(result.messages);
    await syncProductivityTasksFromSources();
    const plannerLabel = actionResult.engine === "openai" ? `OpenAI${actionResult.model ? ` (${actionResult.model})` : ""}` : "local rules";
    const fallbackNote = actionResult.reason ? ` ${actionResult.reason} Used ${plannerLabel}.` : "";
    setEmailSyncStatus(
      `Synced ${result.messages.length} inbox messages and added ${actionResult.addedCount} action ${
        actionResult.addedCount === 1 ? "item" : "items"
      } with ${plannerLabel}.${fallbackNote}`
    );
    setEmailBusy(false);
  }

  async function connectGmailInbox(mode: "autopilot" | "external" = "autopilot"): Promise<void> {
    setEmailBusy(true);
    setEmailSyncStatus(mode === "external" ? "Opening Google sign-in in another browser." : "Opening Google sign-in inside Autopilot.");
    if (mode === "autopilot") {
      showBrowserWorkspace();
    }
    const connect = mode === "external" ? autopilot.email.connectGmailExternal : autopilot.email.connectGmail;
    const result = await connect().catch(() => ({
      success: false as const,
      status: emailStatus ?? {
        provider: "gmail" as const,
        configured: false,
        connected: false,
        accountEmail: null,
        reason: "Gmail connection failed."
      },
      messages: emailMessages,
      reason: mode === "external" ? "Gmail connection failed in the external browser." : "Gmail connection failed."
    }));

    setEmailStatus(result.status);
    setEmailMessages(result.messages ?? emailMessages);
    if (!result.success) {
      setEmailSyncStatus(result.reason ?? result.status.reason ?? "Gmail connection failed.");
      setEmailBusy(false);
      return;
    }

    const syncedMessages = result.messages ?? [];
    setEmailSyncStatus("Gmail connected. Reading inbox for today's call...");
    const actionResult = await addActionsFromEmailMessages(syncedMessages);
    await syncProductivityTasksFromSources();
    const plannerLabel = actionResult.engine === "openai" ? `OpenAI${actionResult.model ? ` (${actionResult.model})` : ""}` : "local rules";
    const fallbackNote = actionResult.reason ? ` ${actionResult.reason} Used ${plannerLabel}.` : "";
    setEmailSyncStatus(
      `Connected ${result.status.accountEmail ?? "Gmail"} and added ${actionResult.addedCount} action ${
        actionResult.addedCount === 1 ? "item" : "items"
      } with ${plannerLabel}.${fallbackNote}`
    );
    setEmailBusy(false);
  }

  async function disconnectEmailInbox(): Promise<void> {
    setEmailBusy(true);
    const status = await autopilot.email.disconnect();
    setEmailStatus(status);
    setEmailMessages([]);
    setEmailSyncStatus("Gmail disconnected.");
    setEmailBusy(false);
  }

  async function syncSelectedProductivitySources(): Promise<void> {
    if (selectedProductivitySources.includes("gmail")) {
      if (emailStatus?.connected) {
        await syncEmailInbox();
      } else {
        await connectGmailInbox("autopilot");
      }
      return;
    }

    const selectedLabels = productivitySourceOptions
      .filter((source) => selectedProductivitySources.includes(source.id))
      .map((source) => source.label)
      .join(", ");
    setCaptureStatus(`${selectedLabels || "These sources"} will start syncing when Google and app integrations are connected.`);
  }

  function toggleActionItem(itemId: string): void {
    const task = taskByActionId.get(itemId);
    if (task) {
      const nextState: ProductivityTaskState = task.state === "done" ? "todo" : "done";
      void autopilot.productivity.setTaskState(task.id, nextState).then(setProductivityTasks).catch(() => undefined);
      return;
    }

    setActionItems((currentItems) =>
      currentItems.map((item) =>
        item.id === itemId
          ? {
              ...item,
              completedAt: item.completedAt ? null : Date.now()
            }
          : item
      )
    );
  }

  function deleteActionItem(itemId: string): void {
    const task = taskByActionId.get(itemId);
    if (task) {
      void autopilot.productivity.setTaskState(task.id, "done").then(setProductivityTasks).catch(() => undefined);
      return;
    }

    setActionItems((currentItems) => currentItems.filter((item) => item.id !== itemId));
  }

  function setProductivityTaskState(taskId: string, state: ProductivityTaskState): void {
    void autopilot.productivity.setTaskState(taskId, state).then(setProductivityTasks).catch(() => undefined);
  }

  function toggleDesignSection(section: DesignFoldSection): void {
    setOpenDesignSections((currentSections) => ({
      ...currentSections,
      [section]: !currentSections[section]
    }));
  }

  function toggleAssistantSource(sourceId: AssistantContextSourceId): void {
    setAssistantSelectedSources((currentSources) => {
      const nextSources = currentSources.includes(sourceId)
        ? currentSources.filter((currentSource) => currentSource !== sourceId)
        : [...currentSources, sourceId];

      return nextSources.length > 0 ? nextSources : currentSources;
    });
  }

  async function askAssistant(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const prompt = assistantPrompt.trim();
    if (!prompt || assistantBusy) {
      return;
    }

    setAssistantBusy(true);
    const response = await autopilot.assistant
      .ask({
        prompt,
        sources: assistantSelectedSources,
        activeTabId
      })
      .catch((error: unknown) => ({
        success: false,
        answer: "",
        sources: [],
        reason: error instanceof Error ? error.message : "Assistant failed."
      }));
    setAssistantResponse(response);
    setAssistantBusy(false);
  }

  function applyCodingSnapshot(snapshot: CodingSnapshot, status?: string): void {
    setCodingSnapshot(snapshot);
    if (snapshot.tree) {
      setOpenCodingFolders((currentFolders) => ({
        ...currentFolders,
        [snapshot.tree?.path ?? ""]: true
      }));
    } else {
      setOpenCodingFolders({});
      setCodingSearchResults([]);
      setCodingPickerEntries([]);
      setCodingPickerError(null);
    }
    if (snapshot.activeProject) {
      const activeProjectRoot = snapshot.activeProject.rootPath;
      setCollapsedCodingProjects((currentProjects) => ({
        ...currentProjects,
        [activeProjectRoot]: false
      }));
    }
    setCodingStatus(
      status ??
        (snapshot.tree
          ? `Ready in ${snapshot.activeProject?.name ?? "project"}.`
          : snapshot.projects.length > 0
            ? "Choose a recent project or open a folder to start browsing files."
            : "Open a folder or create a project to start editing local files.")
    );
  }

  function openCodingChatTab(chat: CodingChatThread): void {
    setCodingTabs((currentTabs) => {
      const existingTab = currentTabs.find((tab) => tab.kind === "chat" && tab.chatId === chat.id);
      if (existingTab) {
        setActiveCodingTabId(existingTab.id);
        return currentTabs.map((tab) =>
          tab.id === existingTab.id
            ? {
                ...tab,
                title: chat.title,
                projectRootPath: chat.projectRootPath
              }
            : tab
        );
      }

      const tab: CodingWorkbenchTab = {
        id: createCodingTabId("chat", chat.id),
        kind: "chat",
        title: chat.title,
        chatId: chat.id,
        projectRootPath: chat.projectRootPath
      };
      setActiveCodingTabId(tab.id);
      return [...currentTabs, tab];
    });
  }

  function startNewCodingChat(project: CodingProject | null = activeCodingProject, title?: string): CodingChatThread {
    const chat = createCodingChatThread(project, title);
    setCodingChats((currentChats) => [chat, ...currentChats.filter((currentChat) => currentChat.id !== chat.id)].slice(0, MAX_CODING_CHATS));
    if (project) {
      setCollapsedCodingProjects((currentProjects) => ({
        ...currentProjects,
        [project.rootPath]: false
      }));
    }
    openCodingChatTab(chat);
    setCodingStatus(project ? `New agent chat started in ${project.name}.` : "New coding chat started.");
    return chat;
  }

  async function openExistingCodingChat(chat: CodingChatThread): Promise<void> {
    if (chat.projectRootPath && chat.projectRootPath !== activeCodingProject?.rootPath) {
      setCodingBusy(true);
      const snapshot = await autopilot.coding.selectProject(chat.projectRootPath).catch(() => codingSnapshot);
      applyCodingSnapshot(snapshot, `Opened ${chat.title}.`);
      setCodingBusy(false);
    }

    openCodingChatTab(chat);
    setCodingStatus(`Opened chat: ${chat.title}`);
  }

  async function openCodingProject(): Promise<void> {
    setCodingBusy(true);
    setCodingStatus("Choose a folder on your computer.");
    const snapshot = await autopilot.coding.openProject().catch(() => defaultCodingSnapshot);
    applyCodingSnapshot(snapshot, snapshot.activeProject ? `Opened ${snapshot.activeProject.name}.` : "No project selected.");
    if (snapshot.activeProject) {
      startNewCodingChat(snapshot.activeProject);
    }
    setCodingBusy(false);
  }

  async function createCodingProject(): Promise<void> {
    setCodingBusy(true);
    setCodingStatus("Choose where the new project folder should live.");
    const snapshot = await autopilot.coding.createProject().catch(() => defaultCodingSnapshot);
    applyCodingSnapshot(snapshot, snapshot.activeProject ? `Created ${snapshot.activeProject.name}.` : "No project created.");
    if (snapshot.activeProject) {
      startNewCodingChat(snapshot.activeProject, `Create ${snapshot.activeProject.name}`);
    }
    setCodingBusy(false);
  }

  async function selectCodingProject(rootPath: string, options: { startChat?: boolean } = { startChat: true }): Promise<void> {
    setCodingBusy(true);
    const snapshot = await autopilot.coding.selectProject(rootPath).catch(() => codingSnapshot);
    applyCodingSnapshot(snapshot, snapshot.activeProject ? `Switched to ${snapshot.activeProject.name}.` : undefined);
    if (options.startChat && snapshot.activeProject) {
      startNewCodingChat(snapshot.activeProject);
    }
    setCodingBusy(false);
  }

  function upsertCodingTab(tab: CodingWorkbenchTab): void {
    setCodingTabs((currentTabs) => {
      const existingTab = currentTabs.find((currentTab) => currentTab.path && currentTab.path === tab.path && currentTab.kind === tab.kind);
      if (existingTab) {
        setActiveCodingTabId(existingTab.id);
        return currentTabs.map((currentTab) => (currentTab.id === existingTab.id ? { ...currentTab, ...tab, id: existingTab.id } : currentTab));
      }

      setActiveCodingTabId(tab.id);
      return [...currentTabs, tab];
    });
  }

  async function openCodingPath(targetPath: string, projectRootPath: string | null = activeCodingProject?.rootPath ?? null): Promise<void> {
    setCodingBusy(true);
    const result = await autopilot.coding.readPath(targetPath).catch(() => ({ success: false as const, reason: "Could not open that path." }));
    if (!result.success) {
      setCodingStatus(result.reason);
      setCodingBusy(false);
      return;
    }

    const tab: CodingWorkbenchTab = {
      id: createCodingTabId(result.kind === "directory" ? "folder" : "file", result.path),
      kind: result.kind === "directory" ? "folder" : "file",
      title: result.name,
      path: result.path,
      projectRootPath,
      file: result,
      content: result.kind === "text" ? result.content : undefined,
      baseContent: result.kind === "text" ? result.content : undefined,
      savedAt: result.kind === "text" ? result.modifiedAt : undefined
    };
    upsertCodingTab(tab);
    setCodingStatus(
      result.kind === "directory"
        ? result.entries.length === 0
          ? `Folder ${result.relativePath} is empty.`
          : `Opened folder ${result.relativePath}.`
        : `Opened ${result.relativePath}.`
    );
    setCodingBusy(false);
  }

  function openCodingNode(node: CodingTreeNode): void {
    if (node.kind === "folder") {
      setOpenCodingFolders((currentFolders) => ({
        ...currentFolders,
        [node.path]: !currentFolders[node.path]
      }));
    }

    void openCodingPath(node.path);
  }

  function openCodingPicker(): void {
    const tab: CodingWorkbenchTab = {
      id: createCodingTabId("picker"),
      kind: "picker",
      title: "Open file",
      projectRootPath: activeCodingProject?.rootPath ?? null
    };
    setCodingTabs((currentTabs) => [...currentTabs, tab]);
    setActiveCodingTabId(tab.id);
  }

  function openCodingPlugins(): void {
    setCodingSection("plugins");
    setCodingRightPanel("plugins");
    setCodingRightSidebarOpen(true);
    void refreshCodingPluginStatuses();
    const existingTab = codingTabs.find((tab) => tab.kind === "plugins");
    if (existingTab) {
      setActiveCodingTabId(existingTab.id);
      return;
    }

    const tab: CodingWorkbenchTab = {
      id: createCodingTabId("plugins"),
      kind: "plugins",
      title: "Plugins"
    };
    setCodingTabs((currentTabs) => [...currentTabs, tab]);
    setActiveCodingTabId(tab.id);
  }

  function openCodingSearch(): void {
    setCodingSection("search");
    setCodingStatus("Search is filtering the active project file tree.");
  }

  function openCodingTerminal(): void {
    setCodingSection("terminal");
    setCodingRightPanel("terminal");
    setCodingRightSidebarOpen(true);
    const existingTab = codingTabs.find((tab) => tab.kind === "terminal");
    if (existingTab) {
      setActiveCodingTabId(existingTab.id);
      return;
    }

    const tab: CodingWorkbenchTab = {
      id: createCodingTabId("terminal"),
      kind: "terminal",
      title: "Terminal"
    };
    setCodingTabs((currentTabs) => [...currentTabs, tab]);
    setActiveCodingTabId(tab.id);
  }

  function openCodingBrowser(): void {
    setCodingSection("browser");
    const existingTab = codingTabs.find((tab) => tab.kind === "browser");
    if (existingTab) {
      setActiveCodingTabId(existingTab.id);
      return;
    }

    const tab: CodingWorkbenchTab = {
      id: createCodingTabId("browser"),
      kind: "browser",
      title: "Research"
    };
    setCodingTabs((currentTabs) => [...currentTabs, tab]);
    setActiveCodingTabId(tab.id);
  }

  function openCodingDownloads(): void {
    setCodingRightPanel("downloads");
    setCodingRightSidebarOpen(true);
    void refreshCodingDownloads();
  }

  function openBrowserDownloads(): void {
    setAssistantOpen(false);
    showBrowserWorkspace();
    setBrowserDownloadsOpen((isOpen) => !isOpen);
    void refreshCodingDownloads();
  }

  function toggleCodingProjectGroup(rootPath: string): void {
    setCollapsedCodingProjects((currentProjects) => ({
      ...currentProjects,
      [rootPath]: !currentProjects[rootPath]
    }));
  }

  async function openCodingProjectDetails(project: CodingProject): Promise<void> {
    setCodingBusy(true);
    let selectedSnapshot = codingSnapshot;
    if (project.rootPath !== activeCodingProject?.rootPath) {
      selectedSnapshot = await autopilot.coding.selectProject(project.rootPath).catch(() => codingSnapshot);
      applyCodingSnapshot(selectedSnapshot, `Opened ${project.name}.`);
    }

    const result = await autopilot.coding.readPath(project.rootPath).catch(() => ({ success: false as const, reason: "Could not open project details." }));
    if (!result.success || result.kind !== "directory") {
      setCodingStatus(result.success ? "Project details need a folder to open." : result.reason);
      setCodingBusy(false);
      return;
    }

    const tab: CodingWorkbenchTab = {
      id: createCodingTabId("project", project.rootPath),
      kind: "project",
      title: project.name,
      path: project.rootPath,
      projectRootPath: project.rootPath,
      file: result
    };
    upsertCodingTab(tab);
    setCollapsedCodingProjects((currentProjects) => ({
      ...currentProjects,
      [project.rootPath]: false
    }));
    setCodingStatus(`Opened ${selectedSnapshot.activeProject?.name ?? project.name} project details.`);
    setCodingBusy(false);
  }

  function newCodingChat(): void {
    startNewCodingChat(activeCodingProject);
  }

  function deleteCodingChat(chatId: string): void {
    const deletedChat = codingChats.find((chat) => chat.id === chatId);
    setCodingChats((currentChats) => currentChats.filter((chat) => chat.id !== chatId));
    setCodingTabs((currentTabs) => {
      const nextTabs = currentTabs.filter((tab) => tab.chatId !== chatId);
      if (nextTabs.length === 0) {
        setActiveCodingTabId(CODING_CHAT_TAB_ID);
        return initialCodingTabs;
      }

      if (activeCodingTab.kind === "chat" && activeCodingTab.chatId === chatId) {
        setActiveCodingTabId(nextTabs[0]?.id ?? CODING_CHAT_TAB_ID);
      }

      return nextTabs;
    });
    setCodingStatus(deletedChat ? `Deleted chat: ${deletedChat.title}` : "Deleted chat.");
  }

  function closeCodingTab(tabId: string): void {
    setCodingTabs((currentTabs) => {
      if (currentTabs.length === 1) {
        return currentTabs;
      }

      const closingIndex = currentTabs.findIndex((tab) => tab.id === tabId);
      const nextTabs = currentTabs.filter((tab) => tab.id !== tabId);
      if (activeCodingTabId === tabId) {
        setActiveCodingTabId(nextTabs[Math.max(0, closingIndex - 1)]?.id ?? nextTabs[0]?.id ?? CODING_CHAT_TAB_ID);
      }
      return nextTabs;
    });
  }

  function updateCodingFileContent(tabId: string, content: string): void {
    setCodingTabs((currentTabs) =>
      currentTabs.map((tab) =>
        tab.id === tabId
          ? {
              ...tab,
              content,
              dirty: tab.file?.kind === "text" && content !== tab.file.content
            }
          : tab
      )
    );
  }

  function openCodingReview(tabId?: string): void {
    setCodingRightPanel("code");
    setCodingRightSidebarOpen(true);
    setCodingReviewMode("review");
    if (tabId) {
      setActiveCodingTabId(tabId);
    }
  }

  function markCodingFileReviewed(tabId: string): void {
    const tab = codingTabs.find((currentTab) => currentTab.id === tabId);
    if (!isTextCodingTab(tab)) {
      return;
    }

    if (tab.dirty) {
      setCodingStatus("Let autosave finish before marking this file reviewed.");
      return;
    }

    const nextContent = getCodingTabContent(tab);
    setCodingTabs((currentTabs) =>
      currentTabs.map((currentTab) =>
        currentTab.id === tabId && isTextCodingTab(currentTab)
          ? {
              ...currentTab,
              baseContent: nextContent,
              content: nextContent,
              dirty: false,
              file: {
                ...currentTab.file,
                content: nextContent
              }
            }
          : currentTab
      )
    );
    setCodingStatus(`Marked ${tab.title} as reviewed.`);
  }

  function revertCodingFileToBaseline(tabId: string): void {
    const tab = codingTabs.find((currentTab) => currentTab.id === tabId);
    if (!isTextCodingTab(tab)) {
      return;
    }

    const baseline = tab.baseContent ?? tab.file.content;
    setCodingTabs((currentTabs) =>
      currentTabs.map((currentTab) =>
        currentTab.id === tabId && isTextCodingTab(currentTab)
          ? {
              ...currentTab,
              content: baseline,
              dirty: baseline !== currentTab.file.content
            }
          : currentTab
      )
    );
    setActiveCodingTabId(tabId);
    setCodingStatus(`Restored ${tab.title} to the last reviewed version.`);
  }

  async function deleteCodingFolder(entry: CodingDirectoryEntry): Promise<void> {
    if (entry.kind !== "folder") {
      return;
    }

    const confirmed = window.confirm(`Delete folder "${entry.name}" from your computer? This cannot be undone.`);
    if (!confirmed) {
      return;
    }

    setCodingBusy(true);
    const result = await autopilot.coding.deletePath(entry.path).catch(() => ({
      success: false as const,
      reason: "Could not delete that folder."
    }));
    setCodingBusy(false);
    if (!result.success) {
      setCodingStatus(result.reason);
      return;
    }

    applyCodingSnapshot(result.snapshot, `Deleted ${entry.name}.`);
    setOpenCodingFolders((currentFolders) => {
      const nextFolders = { ...currentFolders };
      for (const folderPath of Object.keys(nextFolders)) {
        if (isSameOrInsideLocalPath(folderPath, result.deletedPath)) {
          delete nextFolders[folderPath];
        }
      }
      return nextFolders;
    });
    setCodingTabs((currentTabs) => {
      const nextTabs = currentTabs
        .filter((tab) => !tab.path || !isSameOrInsideLocalPath(tab.path, result.deletedPath))
        .map((tab) => {
          if (tab.file?.kind !== "directory") {
            return tab;
          }

          return {
            ...tab,
            file: {
              ...tab.file,
              entries: tab.file.entries.filter((folderEntry) => !isSameOrInsideLocalPath(folderEntry.path, result.deletedPath))
            }
          };
        });

      if (nextTabs.length === 0) {
        setActiveCodingTabId(CODING_CHAT_TAB_ID);
        return initialCodingTabs;
      }

      if (!nextTabs.some((tab) => tab.id === activeCodingTabId)) {
        setActiveCodingTabId(nextTabs[0].id);
      }

      return nextTabs;
    });
  }

  async function refreshCodingPluginStatuses(): Promise<void> {
    const statuses = await autopilot.coding.pluginStatuses().catch(() => null);
    if (statuses) {
      setCodingPluginStatuses(statuses);
    }
  }

  async function refreshCodingDownloads(): Promise<void> {
    const downloads = await autopilot.downloads.list().catch(() => null);
    if (downloads) {
      setCodingDownloads(downloads);
    }
  }

  async function openDownloadedFile(download: CodingDownloadEntry): Promise<void> {
    const result = await autopilot.downloads.open(download.id).catch(() => ({
      success: false,
      reason: "Could not open download."
    }));

    if (!result.success) {
      const reason = result.reason ?? "Could not open download.";
      setDownloadStatus(reason);
      setCodingStatus(reason);
      return;
    }

    setDownloadStatus(`Opened ${download.filename}.`);
  }

  async function installCodingPlugin(plugin: CodingPlugin): Promise<void> {
    const currentStatus = codingPluginStatusById.get(plugin.id);
    if (currentStatus?.status === "installed") {
      setCodingStatus(`${plugin.name} is already installed. No install started.`);
      return;
    }

    setCodingPluginBusyIds((currentIds) => ({ ...currentIds, [plugin.id]: true }));
    setCodingStatus(`Starting ${plugin.name} install...`);
    const result = await autopilot.coding.installPlugin(plugin.id).catch(() => ({
      success: false as const,
      reason: "Could not start installer."
    }));
    setCodingPluginBusyIds((currentIds) => ({ ...currentIds, [plugin.id]: false }));
    await refreshCodingPluginStatuses();
    if (result.success) {
      setCodingStatus(
        result.status.status === "installed"
          ? `${plugin.name} is installed.`
          : result.status.status === "installing"
            ? `${plugin.name} is installing. ${getPluginInstallRemaining(result.status) || "Time remaining will update shortly."}`
            : result.status.reason ?? `${plugin.name}: ${getPluginStatusLabel(result.status)}`
      );
      return;
    }

    setCodingStatus(result.reason);
  }

  async function cancelCodingPluginInstall(plugin: CodingPlugin): Promise<void> {
    setCodingPluginBusyIds((currentIds) => ({ ...currentIds, [plugin.id]: true }));
    const result = await autopilot.coding.cancelPluginInstall(plugin.id).catch(() => ({
      success: false as const,
      reason: "Could not cancel installer."
    }));
    setCodingPluginBusyIds((currentIds) => ({ ...currentIds, [plugin.id]: false }));
    await refreshCodingPluginStatuses();
    setCodingStatus(result.success ? `${plugin.name}: ${result.status.reason ?? "Install cancelled."}` : result.reason);
  }

  function setCodingAccessMode(mode: CodingAccessMode): void {
    void autopilot.coding
      .setAccessMode(mode)
      .then((snapshot) => {
        applyCodingSnapshot(snapshot, mode === "full" ? "Full access enabled. Commands can run without approval." : "Approval mode enabled.");
        if (mode !== "full") {
          setPendingCodingCommand(null);
        }
      })
      .catch(() => setCodingStatus("Could not update coding access mode."));
  }

  async function runCodingCommand(approved = false): Promise<void> {
    const request: CodingCommandRequest = pendingCodingCommand && approved
      ? { ...pendingCodingCommand, approved: true }
      : {
          command: codingCommandDraft,
          cwd: activeCodingProject?.rootPath,
          approved
        };

    setCodingBusy(true);
    setCodingCommandResult(null);
    const result: CodingCommandResult = await autopilot.coding.runCommand(request).catch(() => ({
      success: false,
      command: request.command,
      cwd: request.cwd,
      reason: "Command runner failed before it could start."
    }));
    setCodingBusy(false);
    if (!result.success && result.requiresApproval) {
      setPendingCodingCommand(request);
      setCodingStatus("Command is waiting for approval.");
      return;
    }

    setPendingCodingCommand(null);
    setCodingCommandResult(result);
    setCodingTerminalHistory((currentHistory) => [result, ...currentHistory].slice(0, 12));
    setCodingStatus(result.success ? `Command finished in ${result.durationMs}ms.` : result.reason);
  }

  async function browseFromCoding(): Promise<void> {
    setCodingBusy(true);
    const result = await autopilot.coding.browse(codingResearchDraft).catch(() => ({
      success: false as const,
      input: codingResearchDraft,
      reason: "Coding browser could not start."
    }));
    setCodingResearchResult(result);
    setCodingBusy(false);
    setCodingStatus(result.success ? `Browsed ${result.title}.` : result.reason);
  }

  function sendCodingChatMessage(): void {
    const message = codingDraftMessage.trim();
    if (!message) {
      return;
    }

    let targetChat = activeCodingChat;
    if (!targetChat) {
      targetChat = createCodingChatThread(activeCodingProject);
      setCodingChats((currentChats) => [targetChat as CodingChatThread, ...currentChats].slice(0, MAX_CODING_CHATS));
      openCodingChatTab(targetChat);
    }

    const now = Date.now();
    const nextTitle =
      targetChat.messages.filter((chatMessage) => chatMessage.role === "user").length === 0 ? deriveCodingChatTitle(message) : targetChat.title;
    const userMessage = createCodingChatMessage("user", message);
    const agentMessage = createCodingChatMessage("agent", createCodingAgentReply(message, targetChat.projectName));

    setCodingChats((currentChats) => {
      const existingChats = currentChats.some((chat) => chat.id === targetChat?.id) ? currentChats : [targetChat as CodingChatThread, ...currentChats];
      return existingChats
        .map((chat) =>
          chat.id === targetChat?.id
            ? {
                ...chat,
                title: nextTitle,
                updatedAt: now,
                messages: [...chat.messages, userMessage, agentMessage]
              }
            : chat
        )
        .sort((leftChat, rightChat) => rightChat.updatedAt - leftChat.updatedAt)
        .slice(0, MAX_CODING_CHATS);
    });
    setCodingTabs((currentTabs) =>
      currentTabs.map((tab) =>
        tab.kind === "chat" && tab.chatId === targetChat?.id
          ? {
              ...tab,
              title: nextTitle
            }
          : tab
      )
    );
    setCodingDraftMessage("");
    setCodingStatus(`Agent chat updated: ${nextTitle}`);
  }

  function openGithubForCoding(): void {
    openCodingBrowser();
    setCodingResearchDraft("https://github.com/");
    void autopilot.coding.browse("https://github.com/").then((result) => setCodingResearchResult(result));
  }

  function startSidebarResize(event: ReactPointerEvent<HTMLDivElement>): void {
    if (!sidebarOpen) {
      return;
    }

    event.preventDefault();
    const startX = event.clientX;
    const startWidth = sidebarWidthRef.current;
    setIsSidebarResizing(true);

    function handlePointerMove(moveEvent: PointerEvent): void {
      setSidebarWidth(clampSidebarWidth(startWidth + moveEvent.clientX - startX));
    }

    function stopResizing(): void {
      setIsSidebarResizing(false);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResizing);
      window.removeEventListener("pointercancel", stopResizing);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResizing);
    window.addEventListener("pointercancel", stopResizing);
  }

  function startCodingSidebarResize(event: ReactPointerEvent<HTMLDivElement>): void {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = codingSidebarWidthRef.current;
    setIsCodingSidebarResizing(true);

    function handlePointerMove(moveEvent: PointerEvent): void {
      setCodingSidebarWidth(clampCodingSidebarWidth(startWidth + moveEvent.clientX - startX));
    }

    function stopResizing(): void {
      setIsCodingSidebarResizing(false);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResizing);
      window.removeEventListener("pointercancel", stopResizing);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResizing);
    window.addEventListener("pointercancel", stopResizing);
  }

  const bookmarkFolderActionLabel = getFolderCreationParent(bookmarkContextMenu?.target ?? null) ? "Add folder inside" : "Add folder";

  function renderCodingEntryCard(entry: CodingDirectoryEntry, projectRootPath: string | null = activeCodingProject?.rootPath ?? null): JSX.Element {
    const EntryIcon = entry.kind === "folder" ? Folder : getCodingFileIcon(entry.name);
    if (entry.kind !== "folder") {
      return (
        <button key={entry.path} type="button" onClick={() => void openCodingPath(entry.path, projectRootPath)}>
          <EntryIcon size={20} aria-hidden="true" />
          <span>
            <strong>{entry.name}</strong>
            <small>{formatFileSize(entry.size)}</small>
          </span>
        </button>
      );
    }

    return (
      <article className="coding-entry-card" key={entry.path}>
        <button className="coding-entry-open" type="button" onClick={() => void openCodingPath(entry.path, projectRootPath)}>
          <EntryIcon size={20} aria-hidden="true" />
          <span>
            <strong>{entry.name}</strong>
            <small>Folder</small>
          </span>
        </button>
        <button className="coding-entry-delete" type="button" aria-label={`Delete ${entry.name}`} onClick={() => void deleteCodingFolder(entry)}>
          <Trash2 size={15} aria-hidden="true" />
        </button>
      </article>
    );
  }

  function renderDesignQueueToggle(section: DesignFoldSection, label: string, count: number): JSX.Element {
    const isOpen = openDesignSections[section];
    return (
      <button className="design-queue-toggle" type="button" aria-expanded={isOpen} onClick={() => toggleDesignSection(section)}>
        <span>{label}</span>
        <b>{count}</b>
        <ChevronDown size={14} aria-hidden="true" />
      </button>
    );
  }

  function renderDesignArtifactItem(artifact: Artifact, meta?: string): JSX.Element {
    const plan = actionPlanByArtifactId.get(artifact.id);
    const needsReview = Boolean(plan?.finalApproval.required && !plan.finalApproval.approvedAt);
    return (
      <button
        className={`artifact-list-item ${activeArtifact?.id === artifact.id ? "active" : ""}`}
        key={artifact.id}
        type="button"
        onClick={() => setActiveArtifactId(artifact.id)}
      >
        <span className="artifact-kind-pill">{needsReview ? "Review" : getArtifactKindLabel(artifact.kind)}</span>
        <strong>{artifact.title}</strong>
        <small>{meta ?? artifact.source.label}</small>
      </button>
    );
  }

  function renderDesignSidebarArtifactItem(artifact: Artifact, meta?: string): JSX.Element {
    const plan = actionPlanByArtifactId.get(artifact.id);
    const needsReview = Boolean(plan?.finalApproval.required && !plan.finalApproval.approvedAt);
    return (
      <button
        className={artifact.id === activeArtifact?.id ? "active" : ""}
        type="button"
        key={artifact.id}
        onClick={() => setActiveArtifactId(artifact.id)}
      >
        <FileText size={14} aria-hidden="true" />
        <span>
          <strong>{artifact.title}</strong>
          <small>{needsReview ? "Needs review" : meta ?? getArtifactKindLabel(artifact.kind)}</small>
        </span>
      </button>
    );
  }

  function selectDesignProject(project: DesignProject): void {
    setActiveArtifactId(project.artifactId);
    setAllDesignProjectsOpen(false);
  }

  function getDesignProjectSubtitle(project: DesignProject): string {
    if (project.exportedProjectPath) {
      return "Exported to Coding";
    }

    if (project.needsReview) {
      return "Needs final review";
    }

    if (project.visibility === "ai_generated") {
      return `AI-created - ${getArtifactKindLabel(project.kind)}`;
    }

    if (project.visibility === "archived") {
      return `Archived - ${getArtifactKindLabel(project.kind)}`;
    }

    return `${getArtifactKindLabel(project.kind)} - ${project.sourceLabel}`;
  }

  function renderDesignProjectItem(project: DesignProject, mode: "sidebar" | "modal" = "sidebar"): JSX.Element {
    const Icon = project.kind === "website_design" ? Globe2 : project.kind === "slide_deck" ? ListChecks : FileText;
    return (
      <button
        className={`design-project-row ${mode} ${activeArtifact?.id === project.artifactId ? "active" : ""}`}
        key={project.id}
        type="button"
        onClick={() => selectDesignProject(project)}
      >
        <span className="design-project-icon" aria-hidden="true">
          <Icon size={15} />
        </span>
        <span className="design-project-copy">
          <strong>{project.title}</strong>
          <small>{getDesignProjectSubtitle(project)}</small>
        </span>
        {project.pinned && <Star size={14} aria-label="Pinned project" />}
      </button>
    );
  }

  return (
    <main
      className={`app-shell ${view === "browser" && sidebarOpen ? "browser-sidebar-open" : "sidebar-collapsed"} ${
        isSidebarResizing ? "sidebar-resizing" : ""
      } ${
        isCodingSidebarResizing ? "coding-sidebar-resizing" : ""
      }`}
      style={{ "--sidebar-width": `${sidebarWidth}px`, "--coding-sidebar-width": `${codingSidebarWidth}px` } as CSSProperties}
    >
      <aside className="workspace-rail" aria-label="Workspace switcher">
        <button className="rail-logo-button" type="button" aria-label="Preview Autopilot icon" onClick={() => setIconPreviewOpen(true)}>
          <img className="rail-logo" src="./autopilot-logo.svg" alt="" />
        </button>
        <nav className="rail-workspaces" aria-label="Workspaces">
          {workspaceProfiles.map((item) => {
            const Icon = workspaceIconMap[item.icon] ?? Globe2;
            const itemView = getBuiltInWorkspaceView(item);
            const isActive = activeWorkspaceId === item.id && (itemView === view || (itemView === "browser" && view === "browser"));
            return (
              <button
                className={`rail-workspace-button ${item.color} ${isActive ? "active" : ""}`}
                key={item.id}
                title={item.label}
                aria-label={`Open ${item.label}`}
                type="button"
                onClick={() => void switchWorkspace(item)}
              >
                <Icon size={18} aria-hidden="true" />
              </button>
            );
          })}
        </nav>
        <button
          className={`rail-workspace-button rail-settings ${view === "settings" ? "active" : ""}`}
          type="button"
          aria-label={view === "settings" ? "Close settings" : "Settings"}
          title="Settings"
          onClick={() => setView((currentView) => (currentView === "settings" ? "browser" : "settings"))}
        >
          <Settings size={18} aria-hidden="true" />
        </button>
      </aside>

      {view === "browser" && (
      <aside className="sidebar browser-sidebar" aria-label="Browser navigation">
        <div className="sidebar-scroll">
          <section className="sidebar-brand" aria-label="Autopilot">
            <button className="icon-preview-trigger brand-icon-trigger" type="button" aria-label="Preview Autopilot icon" onClick={() => setIconPreviewOpen(true)}>
              <img className="brand-logo" src="./autopilot-logo.svg" alt="" />
            </button>
            <span>
              <strong>Autopilot</strong>
              <small>Browser workspaces</small>
            </span>
          </section>

          <section className="sidebar-section with-divider" aria-labelledby="tabs-heading">
            <div className="sidebar-heading-row">
              <p className="sidebar-heading" id="tabs-heading">
                Tabs
              </p>
              <button className="sidebar-icon-button" type="button" aria-label="New tab" onClick={addTab}>
                <Plus size={16} />
              </button>
            </div>
            <div className="tab-list" aria-label="Open tabs">
              {tabs.map((tab) => (
                <div className={`sidebar-tab ${tab.id === activeTabId ? "active" : ""}`} key={tab.id}>
                  <button className="sidebar-tab-main" type="button" onClick={() => activateTab(tab.id)}>
                    <Globe2 size={16} aria-hidden="true" />
                    <span>{tab.title}</span>
                    <span className={`sidebar-tab-memory ${tab.memoryBytes ? "" : "pending"}`} title="Memory used by this tab">
                      {tab.hibernated ? "Sleeping" : tab.memoryBytes ? formatTabMemory(tab.memoryBytes) : "--"}
                    </span>
                  </button>
                  {tab.duplicateOfTabId && <span className="sidebar-tab-duplicate">Duplicate</span>}
                  <button className="sidebar-tab-close" type="button" aria-label={`Delete ${tab.title}`} onClick={() => deleteTab(tab.id)}>
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="sidebar-section with-divider" aria-labelledby="bookmarks-heading">
            <div className="sidebar-heading-row">
              <p className="sidebar-heading" id="bookmarks-heading">
                Bookmarks
              </p>
              <Bookmark size={14} aria-hidden="true" />
            </div>
            {bookmarkSources.length > 0 && (
              <div className={`bookmark-import ${bookmarkImportOpen ? "open" : ""}`}>
                <button className="bookmark-import-toggle" type="button" onClick={() => setBookmarkImportOpen((isOpen) => !isOpen)}>
                  <FolderOpen size={15} aria-hidden="true" />
                  <span>
                    <strong>Browser imports</strong>
                    <small>{selectedBookmarkSourceLabels || "Choose browsers"}</small>
                  </span>
                  <ChevronDown size={15} aria-hidden="true" />
                </button>
                {bookmarkImportOpen && (
                  <div className="bookmark-import-panel">
                    <div className="bookmark-source-list">
                      {bookmarkSources.map((source) => (
                        <label className="bookmark-source-option" key={source.id}>
                          <input
                            type="checkbox"
                            checked={draftBookmarkSources.includes(source.id)}
                            onChange={() => toggleDraftBookmarkSource(source.id)}
                          />
                          <span>
                            <strong>{source.label}</strong>
                            <small>{source.profileCount === 1 ? "1 profile" : `${source.profileCount} profiles`}</small>
                          </span>
                        </label>
                      ))}
                    </div>
                    <button className="bookmark-import-action" type="button" disabled={bookmarkImportBusy} onClick={applyBookmarkSources}>
                      {draftBookmarkSources.length > 0 ? "Pull selected" : "Use none"}
                    </button>
                  </div>
                )}
              </div>
            )}
            <nav className="bookmark-list" aria-label="Bookmarks" onContextMenu={(event) => openBookmarkContextMenu(event, null)}>
              <BookmarkTree
                nodes={bookmarks}
                openFolders={openBookmarkFolders}
                parentId="bookmarks"
                onNavigate={navigateTo}
                onToggleFolder={toggleBookmarkFolder}
                onContextMenu={openBookmarkContextMenu}
              />
            </nav>
          </section>

          <section className="sidebar-section with-divider history-section" aria-labelledby="history-heading">
            <button
              className="history-link"
              type="button"
              onClick={openHistoryPage}
              aria-label="Open history"
            >
              <Clock size={16} aria-hidden="true" />
              <span id="history-heading">History</span>
            </button>
          </section>
        </div>

        <div className="sidebar-footer">
          <button className="sidebar-action" type="button" onClick={() => deleteTab()} aria-label="Delete active tab">
            <Trash2 size={16} />
            <span>Delete tab</span>
          </button>
          <button className={`sidebar-action ${browserDownloadsOpen ? "active" : ""}`} type="button" onClick={openBrowserDownloads} aria-label="Downloads">
            <Download size={16} />
            <span>Downloads</span>
            {activeCodingDownloads > 0 && <b className="sidebar-action-badge">{activeCodingDownloads}</b>}
          </button>
        </div>
      </aside>
      )}

      {view === "browser" && bookmarkContextMenu && (
        <div
          className="bookmark-context-menu"
          style={{ left: bookmarkContextMenu.x, top: bookmarkContextMenu.y }}
          role="menu"
          onPointerDown={(event) => event.stopPropagation()}
        >
          {bookmarkContextMenu.mode === "new-folder" ? (
            <form className="bookmark-context-form" onSubmit={addBookmarkFolder}>
              <input
                autoFocus
                aria-label="Folder name"
                value={bookmarkFolderDraft}
                onChange={(event) => setBookmarkFolderDraft(event.target.value)}
              />
              <div className="bookmark-context-actions">
                <button type="button" onClick={() => setBookmarkContextMenu((currentMenu) => (currentMenu ? { ...currentMenu, mode: "actions" } : null))}>
                  Back
                </button>
                <button type="submit" data-bookmark-action="create-folder" disabled={bookmarkFolderBusy || bookmarkFolderDraft.trim().length === 0}>
                  Add
                </button>
              </div>
            </form>
          ) : (
            <>
              <button
                type="button"
                role="menuitem"
                data-bookmark-action="begin-add-folder"
                onClick={() => beginBookmarkFolder(bookmarkContextMenu.target)}
              >
                <Folder size={15} aria-hidden="true" />
                <span>{bookmarkFolderActionLabel}</span>
              </button>
              {bookmarkContextMenu.target && (
                <button className="danger" type="button" role="menuitem" onClick={() => deleteBookmarkNode(bookmarkContextMenu.target as BookmarkNodeTarget)}>
                  <Trash2 size={15} aria-hidden="true" />
                  <span>Delete {bookmarkContextMenu.target.kind}</span>
                </button>
              )}
            </>
          )}
        </div>
      )}

      {view === "browser" && sidebarOpen && <div className="sidebar-resize-handle" aria-hidden="true" onPointerDown={startSidebarResize} />}

      {view === "browser" && (
        <button
          className="sidebar-toggle"
          type="button"
          aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          onClick={() => setSidebarOpen((isOpen) => !isOpen)}
        >
          {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>
      )}

      <section className={`browser-shell ${view === "browser" ? "" : "app-view"}`} aria-label="Autopilot workspace">
        <header className="titlebar">
          <div className="app-title">
            <button className="icon-preview-trigger app-icon-trigger" type="button" aria-label="Preview Autopilot icon" onClick={() => setIconPreviewOpen(true)}>
              <img className="app-logo" src="./autopilot-logo.svg" alt="" />
            </button>
            <strong>
              {view === "productivity"
                ? "Autopilot Productivity"
                : view === "coding"
                  ? "Autopilot Coding"
                  : view === "settings"
                    ? "Autopilot Settings"
                    : view === "design"
                      ? "Autopilot Design"
                      : "Autopilot Browser"}
            </strong>
          </div>
        </header>

        {view === "browser" && (
          <form className="nav-toolbar" onSubmit={navigate}>
            <div className="nav-actions" aria-label="Navigation controls">
              <button type="button" aria-label="Back" disabled={!activeTab?.canGoBack} onClick={() => activeTabId && autopilot.tabs.back(activeTabId)}>
                <ArrowLeft size={18} />
              </button>
              <button
                type="button"
                aria-label="Forward"
                disabled={!activeTab?.canGoForward}
                onClick={() => activeTabId && autopilot.tabs.forward(activeTabId)}
              >
                <ArrowRight size={18} />
              </button>
              <button type="button" aria-label="Reload" onClick={() => activeTabId && autopilot.tabs.reload(activeTabId)}>
                <RotateCw size={17} className={activeTab?.isLoading ? "spin" : ""} />
              </button>
              <button
                type="button"
                aria-label="Add bookmark"
                disabled={!activeTab || isHomeUrl(activeTab.url) || isHistoryPageUrl(activeTab.url)}
                onClick={addActiveBookmark}
              >
                <Star size={17} />
              </button>
              <button type="button" aria-label="Print page" onClick={printActivePage}>
                <Printer size={17} />
              </button>
              <button className={browserDownloadsOpen ? "active" : ""} type="button" aria-label="Downloads" onClick={openBrowserDownloads}>
                <Download size={17} />
                {activeCodingDownloads > 0 && <span className="nav-button-badge">{activeCodingDownloads}</span>}
              </button>
              <button
                className={`nav-command ${assistantOpen ? "active" : ""}`}
                type="button"
                aria-label="Open Autopilot Assistant"
                onClick={toggleAssistantPanel}
              >
                <Sparkles size={17} />
                <span>Assistant</span>
              </button>
            </div>

            <label className="address-bar">
              <LockKeyhole size={16} aria-hidden="true" />
              <input
                value={addressDraft}
                onChange={(event) => setAddressDraft(event.target.value)}
                aria-label="Address"
                placeholder="Search or enter address"
                spellCheck={false}
              />
              <Search size={17} aria-hidden="true" />
            </label>
            {activeNavigationError && (
              <div className="navigation-error-message" role="status">
                <AlertTriangle size={16} aria-hidden="true" />
                <strong>{activeNavigationError.reason}</strong>
                <span>{activeNavigationError.guidance}</span>
                <code>
                  {activeNavigationError.description} ({activeNavigationError.code})
                </code>
                <button type="button" onClick={retryNavigationError}>
                  Try again
                </button>
              </div>
            )}
          </form>
        )}

        <section className="workspace">
          <div
            className={`web-content-frame ${view !== "browser" ? "hidden" : ""} ${
              view === "browser" && (assistantOpen || browserDownloadsOpen) ? "side-panel-open" : ""
            }`}
            ref={webAreaRef}
          >
            {isBrowserPreview && (
              <div className="web-content-placeholder">
                <section className="empty-state" aria-label="Autopilot start page">
                  <h1 className="home-wordmark">
                    <span>Autopilot</span>
                    <button className="icon-preview-trigger home-title-icon-trigger" type="button" aria-label="Preview Autopilot icon" onClick={() => setIconPreviewOpen(true)}>
                      <AutopilotNeedle className="home-title-needle" />
                    </button>
                  </h1>
                  <p>Where to next?</p>
                  <form className="empty-search" onSubmit={navigate}>
                    <Search size={22} aria-hidden="true" />
                    <input
                      value={addressDraft}
                      onChange={(event) => setAddressDraft(event.target.value)}
                      aria-label="Search or enter address"
                      placeholder="Search Google or enter an address"
                    />
                    <LockKeyhole size={19} aria-hidden="true" />
                    <button className="empty-search-submit" type="submit">
                      Search
                    </button>
                  </form>
                  <span className="workspace-status">
                    Currently in <b>Browser</b> workspace
                  </span>
                </section>
              </div>
            )}
          </div>

          {view === "browser" && browserDownloadsOpen && (
            <aside className="browser-downloads-panel" aria-label="Browser downloads">
              <div className="browser-downloads-heading">
                <span>
                  <strong>Downloads</strong>
                  <small>{activeCodingDownloads > 0 ? `${activeCodingDownloads} active` : "Installers, zips, documents, and app files"}</small>
                </span>
                <div>
                  <button type="button" onClick={() => void refreshCodingDownloads()}>
                    Refresh
                  </button>
                  <button type="button" aria-label="Close downloads" onClick={() => setBrowserDownloadsOpen(false)}>
                    <X size={15} aria-hidden="true" />
                  </button>
                </div>
              </div>
              {downloadStatus && <p className="browser-download-status">{downloadStatus}</p>}
              <div className="browser-download-list">
                {codingDownloads.length === 0 ? (
                  <div className="browser-download-empty">
                    <Download size={20} aria-hidden="true" />
                    <span>
                      <strong>No downloads yet.</strong>
                      <small>Files you download from websites in Autopilot Browser will show up here.</small>
                    </span>
                  </div>
                ) : (
                  codingDownloads.map((download) => {
                    const progress =
                      download.totalBytes > 0 ? Math.min(100, Math.round((download.receivedBytes / download.totalBytes) * 100)) : 0;
                    return (
                      <button className={`browser-download-card ${download.state}`} key={download.id} type="button" onClick={() => void openDownloadedFile(download)}>
                        <Download size={16} aria-hidden="true" />
                        <span>
                          <strong>{download.filename}</strong>
                          <small>
                            {download.state === "progressing"
                              ? `${formatFileSize(download.receivedBytes)}${download.totalBytes ? ` of ${formatFileSize(download.totalBytes)}` : ""}`
                              : download.state === "completed"
                                ? "Downloaded"
                                : download.reason ?? download.state}
                          </small>
                          {download.state === "progressing" && <i style={{ "--download-progress": `${progress}%` } as CSSProperties} />}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </aside>
          )}

          {view === "browser" && assistantOpen && (
            <aside className="assistant-panel" aria-label="Autopilot assistant">
              <div className="assistant-heading">
                <span>
                  <strong>Assistant</strong>
                  <small>Choose sources before sharing context</small>
                </span>
                <button type="button" aria-label="Close assistant" onClick={() => setAssistantOpen(false)}>
                  <X size={15} aria-hidden="true" />
                </button>
              </div>

              {assistantSources.length === 0 ? (
                <p className="assistant-hint">Assistant sources are loading. If this stays here, restart Autopilot so the new desktop bridge can load.</p>
              ) : (
                <div className="assistant-source-list" aria-label="Assistant sources">
                  {assistantSources.map((source) => (
                    <label className={`assistant-source ${source.available ? "" : "disabled"}`} key={source.id}>
                      <input
                        type="checkbox"
                        disabled={!source.available}
                        checked={assistantSelectedSources.includes(source.id)}
                        onChange={() => toggleAssistantSource(source.id)}
                      />
                      <span>
                        <strong>{source.label}</strong>
                        <small>{source.detail}</small>
                      </span>
                    </label>
                  ))}
                </div>
              )}

              <form className="assistant-form" onSubmit={(event) => void askAssistant(event)}>
                <textarea
                  value={assistantPrompt}
                  onChange={(event) => setAssistantPrompt(event.target.value)}
                  placeholder="Ask about this tab, inbox, downloads, or coding project..."
                  aria-label="Ask Autopilot"
                />
                <button className="primary-action" type="submit" disabled={assistantBusy || assistantPrompt.trim().length === 0}>
                  <Sparkles size={16} className={assistantBusy ? "spin" : ""} aria-hidden="true" />
                  Ask
                </button>
              </form>

              {assistantResponse && (
                <section className={`assistant-response ${assistantResponse.success ? "" : "error"}`} aria-live="polite">
                  <p className="panel-kicker">{assistantResponse.success ? assistantResponse.model ?? "Assistant" : "Assistant needs attention"}</p>
                  {assistantResponse.success ? <p>{assistantResponse.answer}</p> : <p>{assistantResponse.reason}</p>}
                  <div className="assistant-shared-sources">
                    <strong>Shared sources</strong>
                    {assistantResponse.sources.length === 0 ? (
                      <small>No sources shared.</small>
                    ) : (
                      assistantResponse.sources.map((source) => (
                        <small key={`${source.sourceId}:${source.title}`}>{source.title}</small>
                      ))
                    )}
                  </div>
                </section>
              )}
            </aside>
          )}

          {view === "coding" && (
            <section className={`coding-page ${codingRightSidebarOpen ? "" : "right-sidebar-closed"}`} aria-labelledby="coding-heading">
              <div className="coding-activity-rail" aria-label="Coding tools">
                <button className={codingSection === "files" ? "active" : ""} type="button" aria-label="Files" onClick={() => setCodingSection("files")}>
                  <FolderOpen size={18} />
                </button>
                <button className={codingSection === "search" ? "active" : ""} type="button" aria-label="Search project files" onClick={openCodingSearch}>
                  <Search size={18} />
                </button>
                <button className={codingSection === "plugins" ? "active" : ""} type="button" aria-label="Plugins" onClick={openCodingPlugins}>
                  <Package size={18} />
                </button>
                <button className={codingSection === "terminal" ? "active" : ""} type="button" aria-label="Terminal" onClick={openCodingTerminal}>
                  <Terminal size={18} />
                </button>
                <button className={codingSection === "browser" ? "active" : ""} type="button" aria-label="Research browser" onClick={openCodingBrowser}>
                  <Globe2 size={18} />
                </button>
                <button
                  className={codingRightPanel === "downloads" && codingRightSidebarOpen ? "active" : ""}
                  type="button"
                  aria-label="Downloads"
                  onClick={openCodingDownloads}
                >
                  <Download size={18} />
                </button>
              </div>

              <aside className="coding-explorer" aria-label="Project explorer">
                <div className="coding-panel-heading">
                  <div>
                    <p className="panel-kicker">Explorer</p>
                    <h2 id="coding-heading">{activeCodingProject?.name ?? "No project"}</h2>
                  </div>
                  <button type="button" aria-label="Open file picker" onClick={openCodingPicker}>
                    <Plus size={15} />
                  </button>
                </div>

                <div className="coding-project-actions">
                  <button type="button" disabled={codingBusy} onClick={() => void createCodingProject()}>
                    <Folder size={15} aria-hidden="true" />
                    New project
                  </button>
                  <button type="button" disabled={codingBusy} onClick={() => void openCodingProject()}>
                    <Download size={15} aria-hidden="true" />
                    Open local folder
                  </button>
                  <button type="button" onClick={openGithubForCoding}>
                    <Github size={15} aria-hidden="true" />
                    GitHub in browser
                  </button>
                </div>

                <div className="coding-project-browser" aria-label="Projects and chats">
                  <div className="coding-sidebar-section-title">
                    <span>Projects</span>
                    <div>
                      <button type="button" aria-label="Open file picker" onClick={openCodingPicker}>
                        <Search size={13} aria-hidden="true" />
                      </button>
                      <button type="button" aria-label="New project chat" onClick={() => startNewCodingChat(activeCodingProject)}>
                        <Plus size={13} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                  {codingSnapshot.projects.length === 0 ? (
                    <span className="coding-sidebar-empty">No projects yet</span>
                  ) : (
                    <div className="coding-project-list">
                      {codingSnapshot.projects.map((project) => {
                        const projectChats = codingChatsByProject.get(project.rootPath) ?? [];
                        const isActiveProject = project.rootPath === activeCodingProject?.rootPath;
                        const isCollapsed = Boolean(collapsedCodingProjects[project.rootPath]);
                        return (
                          <div className="coding-project-group" key={project.rootPath}>
                            <div className={`coding-project-row ${isActiveProject ? "active" : ""}`}>
                              <button
                                className="coding-project-collapse"
                                type="button"
                                aria-label={isCollapsed ? `Expand ${project.name}` : `Collapse ${project.name}`}
                                onClick={() => toggleCodingProjectGroup(project.rootPath)}
                              >
                                {isCollapsed ? <ChevronRight size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
                              </button>
                              <button type="button" className="coding-project-main" onClick={() => void openCodingProjectDetails(project)}>
                                <Folder size={15} aria-hidden="true" />
                                <span>{project.name}</span>
                              </button>
                              <button
                                className="coding-project-new-chat"
                                type="button"
                                aria-label={`New chat in ${project.name}`}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void selectCodingProject(project.rootPath, { startChat: false }).then(() => startNewCodingChat(project));
                                }}
                              >
                                <Plus size={13} aria-hidden="true" />
                              </button>
                            </div>
                            {!isCollapsed && (
                              <div className="coding-project-details">
                                <div className="coding-project-chat-label">
                                  <span>Project chats</span>
                                  <small>{projectChats.length}</small>
                                </div>
                                {projectChats.length === 0 ? (
                                  <span className="coding-sidebar-empty indented">No chats in this project</span>
                                ) : (
                                  projectChats.slice(0, 5).map((chat) => (
                                    <div
                                      className={`coding-chat-row-shell ${chat.id === activeCodingChat?.id ? "active" : ""}`}
                                      key={chat.id}
                                    >
                                      <button className="coding-chat-row" type="button" onClick={() => void openExistingCodingChat(chat)}>
                                        <span>{chat.title}</span>
                                        <small>{formatCodingChatAge(chat.updatedAt)}</small>
                                      </button>
                                      <button
                                        className="coding-chat-delete"
                                        type="button"
                                        aria-label={`Delete ${chat.title}`}
                                        onClick={() => deleteCodingChat(chat.id)}
                                      >
                                        <Trash2 size={12} aria-hidden="true" />
                                      </button>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="coding-sidebar-section-title compact">
                    <span>Chats</span>
                    <button type="button" aria-label="New general coding chat" onClick={() => startNewCodingChat(null)}>
                      <Plus size={13} aria-hidden="true" />
                    </button>
                  </div>
                  {globalCodingChats.length === 0 ? (
                    <span className="coding-sidebar-empty">No chats</span>
                  ) : (
                    <div className="coding-project-list">
                      {globalCodingChats.slice(0, 5).map((chat) => (
                        <div className={`coding-chat-row-shell global ${chat.id === activeCodingChat?.id ? "active" : ""}`} key={chat.id}>
                          <button className="coding-chat-row global" type="button" onClick={() => void openExistingCodingChat(chat)}>
                            <span>{chat.title}</span>
                            <small>{formatCodingChatAge(chat.updatedAt)}</small>
                          </button>
                          <button
                            className="coding-chat-delete"
                            type="button"
                            aria-label={`Delete ${chat.title}`}
                            onClick={() => deleteCodingChat(chat.id)}
                          >
                            <Trash2 size={12} aria-hidden="true" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {codingSection === "search" ? (
                  <div className="coding-search-panel">
                    <label className="coding-search-box">
                      <Search size={16} aria-hidden="true" />
                      <input
                        autoFocus
                        value={codingSearchQuery}
                        onChange={(event) => setCodingSearchQuery(event.target.value)}
                        placeholder="Search files and folders"
                        aria-label="Search project files"
                      />
                    </label>
                    <div className="coding-search-results" aria-label="Project search results">
                      {codingSearchResults.length === 0 ? (
                        <span>
                          {!activeCodingProject
                            ? "Open a project to search files."
                            : codingSearchQuery.trim()
                              ? "No matching files yet."
                              : "Type to search this project."}
                        </span>
                      ) : (
                        codingSearchResults.map((result) => {
                          const ResultIcon = result.kind === "folder" ? Folder : getCodingFileIcon(result.name);
                          return (
                            <button key={result.path} type="button" onClick={() => void openCodingPath(result.path)}>
                              <ResultIcon size={15} aria-hidden="true" />
                              <span>
                                <strong>{result.name}</strong>
                                <small>{result.relativePath}</small>
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                ) : codingSection === "plugins" ? (
                  <div className="coding-plugin-list compact">
                    {codingPluginCatalog.map((plugin) => {
                      const status = codingPluginStatusById.get(plugin.id);
                      const isInstalling = status?.status === "installing";
                      return (
                        <button
                          key={plugin.id}
                          type="button"
                          onClick={() => (isInstalling ? void cancelCodingPluginInstall(plugin) : void installCodingPlugin(plugin))}
                          disabled={codingPluginBusyIds[plugin.id]}
                        >
                          <Package size={15} aria-hidden="true" />
                          <span>
                            <strong>{plugin.name}</strong>
                            <small>{isInstalling ? getPluginInstallRemaining(status, codingClock) : getPluginStatusLabel(status)}</small>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : codingSnapshot.tree ? (
                  <div className="coding-tree">
                    <CodingTree activePath={activeCodingPath} node={codingSnapshot.tree} openFolders={openCodingFolders} onOpen={openCodingNode} />
                  </div>
                ) : (
                  <div className="coding-empty-explorer">
                    <FolderOpen size={22} aria-hidden="true" />
                    <span>Open a folder from your PC to browse and edit files.</span>
                  </div>
                )}
              </aside>

              <div className="coding-sidebar-resize-handle" aria-hidden="true" onPointerDown={startCodingSidebarResize} />

              <section className="coding-workbench" aria-label="Coding workspace">
                <div className="coding-workbench-tabs" role="tablist" aria-label="Open chats and files">
                  {codingTabs.map((tab) => {
                    const TabIcon = getCodingTabIcon(tab.kind, tab.file);
                    const tabTitle = tab.kind === "chat" && tab.chatId ? codingChats.find((chat) => chat.id === tab.chatId)?.title ?? tab.title : tab.title;
                    return (
                      <button
                        className={`coding-tab ${tab.id === activeCodingTabId ? "active" : ""}`}
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={tab.id === activeCodingTabId}
                        onClick={() => setActiveCodingTabId(tab.id)}
                      >
                        <TabIcon size={14} aria-hidden="true" />
                        <span>{tabTitle}</span>
                        {tab.dirty && <b>Unsaved</b>}
                        {codingTabs.length > 1 && (
                          <X
                            size={13}
                            aria-hidden="true"
                            onClick={(event) => {
                              event.stopPropagation();
                              closeCodingTab(tab.id);
                            }}
                          />
                        )}
                      </button>
                    );
                  })}
                  <button className="coding-tab-add" type="button" aria-label="Open file tab" onClick={openCodingPicker}>
                    <Plus size={16} />
                  </button>
                  <button
                    className={`coding-tab-add coding-right-sidebar-toggle ${codingRightSidebarOpen ? "active" : ""}`}
                    type="button"
                    aria-label={codingRightSidebarOpen ? "Hide right sidebar" : "Show right sidebar"}
                    onClick={() => setCodingRightSidebarOpen((isOpen) => !isOpen)}
                  >
                    {codingRightSidebarOpen ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                  </button>
                </div>

                <div className="coding-workbench-content">
                  {activeCodingTab.kind === "chat" && (
                    <section className="coding-chat" aria-label="Coding chat">
                      {activeCodingChat ? (
                        <>
                          <div className="coding-chat-session-heading">
                            <AutopilotNeedle className="coding-agent-needle" />
                            <div>
                              <p className="panel-kicker">Agentic coding</p>
                              <h2>{activeCodingChat.title}</h2>
                              <span>{activeCodingChat.projectRootPath ? activeCodingChat.projectName : "General coding chat"}</span>
                            </div>
                            <button type="button" onClick={newCodingChat}>
                              <Plus size={16} aria-hidden="true" />
                              New chat
                            </button>
                          </div>
                          <div className="coding-agent-brief" aria-label="Coding workspace context">
                            <span>
                              <strong>{activeCodingChat.projectRootPath ? "Project" : "Scope"}</strong>
                              <small>{activeCodingChat.projectRootPath ? activeCodingChat.projectName : "General workspace"}</small>
                            </span>
                            <span>
                              <strong>Access</strong>
                              <small>{codingSnapshot.accessMode === "full" ? "Full access" : "Ask before commands"}</small>
                            </span>
                            <span>
                              <strong>Open tabs</strong>
                              <small>{codingTabs.length} active</small>
                            </span>
                            <span>
                              <strong>Files</strong>
                              <small>{activeProjectOpenTabs.length} open in project</small>
                            </span>
                          </div>
                          <div className="coding-session-actions" aria-label="Coding session actions">
                            <button type="button" onClick={openCodingPicker}>
                              <FolderOpen size={15} aria-hidden="true" />
                              Open file
                            </button>
                            <button type="button" onClick={openCodingTerminal}>
                              <Terminal size={15} aria-hidden="true" />
                              Run command
                            </button>
                            <button type="button" onClick={openCodingBrowser}>
                              <Globe2 size={15} aria-hidden="true" />
                              Research
                            </button>
                            <button type="button" onClick={openCodingPlugins}>
                              <Package size={15} aria-hidden="true" />
                              Plugins
                            </button>
                          </div>
                          <div className="coding-chat-thread" aria-label="Chat messages">
                            {activeCodingChat.messages.map((message) => (
                              <article className={`coding-chat-message ${message.role}`} key={message.id}>
                                <strong>{message.role === "agent" ? "Autopilot" : "You"}</strong>
                                <p>{message.content}</p>
                              </article>
                            ))}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="coding-chat-hero">
                            <AutopilotNeedle className="coding-agent-needle" />
                            <div>
                              <p className="panel-kicker">Coding</p>
                              <h2>What are we building?</h2>
                              <span>
                                Pick a project, start a chat, and let Autopilot move between files, commands, plugins, and research without losing context.
                              </span>
                            </div>
                          </div>
                          {activeCodingProject && (
                            <div className="coding-agent-brief prominent" aria-label="Active project context">
                              <span>
                                <strong>Active project</strong>
                                <small>{activeCodingProject.name}</small>
                              </span>
                              <span>
                                <strong>Project chats</strong>
                                <small>{activeProjectChats.length} saved</small>
                              </span>
                              <span>
                                <strong>Access</strong>
                                <small>{codingSnapshot.accessMode === "full" ? "Full access" : "Ask before commands"}</small>
                              </span>
                              <span>
                                <strong>Files</strong>
                                <small>{codingSnapshot.tree?.children?.length ?? 0} visible at root</small>
                              </span>
                            </div>
                          )}
                          <div className="coding-action-grid">
                            <button type="button" onClick={() => void openCodingProject()}>
                              <FolderOpen size={18} aria-hidden="true" />
                              <span>
                                <strong>Open local folder</strong>
                                <small>Browse files on this computer</small>
                              </span>
                            </button>
                            <button type="button" onClick={() => void createCodingProject()}>
                              <Folder size={18} aria-hidden="true" />
                              <span>
                                <strong>Create project</strong>
                                <small>Make a new project folder</small>
                              </span>
                            </button>
                            <button type="button" onClick={newCodingChat}>
                              <MessageCircle size={18} aria-hidden="true" />
                              <span>
                                <strong>New chat</strong>
                                <small>Start a fresh coding thread</small>
                              </span>
                            </button>
                            <button type="button" onClick={openGithubForCoding}>
                              <Github size={18} aria-hidden="true" />
                              <span>
                                <strong>Open GitHub</strong>
                                <small>Research repos in the coding browser</small>
                              </span>
                            </button>
                            <button type="button" onClick={openCodingPlugins}>
                              <Package size={18} aria-hidden="true" />
                              <span>
                                <strong>Install plugins</strong>
                                <small>Install CLIs and dev tools</small>
                              </span>
                            </button>
                            <button type="button" onClick={openCodingTerminal}>
                              <Terminal size={18} aria-hidden="true" />
                              <span>
                                <strong>Run commands</strong>
                                <small>Approval mode by default</small>
                              </span>
                            </button>
                          </div>
                        </>
                      )}
                      <form
                        className="coding-chat-input"
                        onSubmit={(event) => {
                          event.preventDefault();
                          sendCodingChatMessage();
                        }}
                      >
                        <input
                          value={codingDraftMessage}
                          onChange={(event) => setCodingDraftMessage(event.target.value)}
                          placeholder="Ask Autopilot to explain, edit, or plan code..."
                          aria-label="Coding chat message"
                        />
                        <button type="submit">
                          <ArrowRight size={16} aria-hidden="true" />
                        </button>
                      </form>
                    </section>
                  )}

                  {activeCodingTab.kind === "picker" && (
                    <section className="coding-folder-view" aria-label="Choose file">
                      <div className="coding-content-heading">
                        <div>
                          <p className="panel-kicker">Open tab</p>
                          <h2>{activeCodingProject ? "Choose a chat, file, or folder" : "No project open"}</h2>
                        </div>
                        <button type="button" onClick={() => void openCodingProject()}>
                          <FolderOpen size={16} aria-hidden="true" />
                          Open folder
                        </button>
                      </div>
                      {activeProjectChats.length > 0 && (
                        <div className="coding-picker-section">
                          <p className="panel-kicker">Project chats</p>
                          <div className="coding-picker-chat-list">
                            {activeProjectChats.slice(0, 8).map((chat) => (
                              <button key={chat.id} type="button" onClick={() => void openExistingCodingChat(chat)}>
                                <MessageCircle size={18} aria-hidden="true" />
                                <span>
                                  <strong>{chat.title}</strong>
                                  <small>{formatCodingChatAge(chat.updatedAt)} ago</small>
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {codingPickerLoading ? (
                        <div className="coding-folder-empty">
                          <FolderOpen size={26} aria-hidden="true" />
                          <strong>Loading files from disk...</strong>
                          <span>Autopilot is reading {activeCodingProject?.rootPath ?? "the selected project"}.</span>
                        </div>
                      ) : codingPickerError ? (
                        <div className="coding-folder-empty">
                          <FolderOpen size={26} aria-hidden="true" />
                          <strong>Could not show this folder.</strong>
                          <span>{codingPickerError}</span>
                        </div>
                      ) : codingPickerEntries.length === 0 ? (
                        <div className="coding-folder-empty">
                          <FolderOpen size={26} aria-hidden="true" />
                          <strong>{activeCodingProject ? "This project folder is empty." : "Open a project first."}</strong>
                          <span>
                            {activeCodingProject
                              ? "No files or subfolders were found at the selected project root."
                              : "Choose a recent project or open a local folder to browse files."}
                          </span>
                        </div>
                      ) : (
                        <div className="coding-folder-grid">
                          {codingPickerEntries.map((entry) => renderCodingEntryCard(entry))}
                        </div>
                      )}
                    </section>
                  )}

                  {activeCodingTab.kind === "project" && activeCodingTab.file?.kind === "directory" && (
                    <section className="coding-project-overview" aria-label={`${activeCodingTab.title} project details`}>
                      <div className="coding-content-heading">
                        <div>
                          <p className="panel-kicker">Project</p>
                          <h2>{activeCodingTab.title}</h2>
                          <span>{activeCodingTab.path}</span>
                        </div>
                        <button type="button" disabled={!activeCodingTabProject} onClick={() => activeCodingTabProject && startNewCodingChat(activeCodingTabProject)}>
                          <Plus size={16} aria-hidden="true" />
                          New chat
                        </button>
                      </div>

                      <div className="coding-project-overview-grid">
                        <section className="coding-project-overview-panel" aria-label="Project files">
                          <div className="coding-project-overview-heading">
                            <span>
                              <strong>Files</strong>
                              <small>{activeCodingTab.file.entries.length} visible at project root</small>
                            </span>
                            <button type="button" onClick={openCodingPicker}>
                              Open picker
                            </button>
                          </div>
                          {activeCodingTab.file.entries.length === 0 ? (
                            <div className="coding-folder-empty compact">
                              <FolderOpen size={24} aria-hidden="true" />
                              <strong>No files found in this project.</strong>
                              <span>This folder is empty, or every visible item is inside an ignored build directory.</span>
                            </div>
                          ) : (
                            <div className="coding-folder-grid compact">
                              {activeCodingTab.file.entries.map((entry) => renderCodingEntryCard(entry, activeCodingTab.projectRootPath ?? null))}
                            </div>
                          )}
                        </section>

                        <section className="coding-project-overview-panel" aria-label="Project chats">
                          <div className="coding-project-overview-heading">
                            <span>
                              <strong>Chats</strong>
                              <small>{activeTabProjectChats.length} saved in this project</small>
                            </span>
                            <button type="button" disabled={!activeCodingTabProject} onClick={() => activeCodingTabProject && startNewCodingChat(activeCodingTabProject)}>
                              New chat
                            </button>
                          </div>
                          {activeTabProjectChats.length === 0 ? (
                            <div className="coding-folder-empty compact">
                              <MessageCircle size={24} aria-hidden="true" />
                              <strong>No chats in this project yet.</strong>
                              <span>Start a project chat when you want Autopilot to explain, edit, or run work in this folder.</span>
                            </div>
                          ) : (
                            <div className="coding-project-overview-chats">
                              {activeTabProjectChats.map((chat) => (
                                <article key={chat.id}>
                                  <button type="button" onClick={() => void openExistingCodingChat(chat)}>
                                    <MessageCircle size={18} aria-hidden="true" />
                                    <span>
                                      <strong>{chat.title}</strong>
                                      <small>{formatCodingChatAge(chat.updatedAt)} ago</small>
                                    </span>
                                  </button>
                                  <button type="button" aria-label={`Delete ${chat.title}`} onClick={() => deleteCodingChat(chat.id)}>
                                    <Trash2 size={14} aria-hidden="true" />
                                  </button>
                                </article>
                              ))}
                            </div>
                          )}
                        </section>
                      </div>
                    </section>
                  )}

                  {activeCodingTab.kind === "folder" && activeCodingTab.file?.kind === "directory" && (
                    <section className="coding-folder-view" aria-label={`${activeCodingTab.title} folder`}>
                      <div className="coding-content-heading">
                        <div>
                          <p className="panel-kicker">Folder</p>
                          <h2>{activeCodingTab.file.relativePath}</h2>
                        </div>
                      </div>
                      {activeCodingTab.file.entries.length === 0 ? (
                        <div className="coding-folder-empty">
                          <FolderOpen size={26} aria-hidden="true" />
                          <strong>This folder is empty.</strong>
                          <span>No files or subfolders were found in {activeCodingTab.file.relativePath}.</span>
                        </div>
                      ) : (
                        <>
                          <div className="coding-folder-grid">
                            {activeCodingTab.file.entries.map((entry) => renderCodingEntryCard(entry, activeCodingTab.projectRootPath ?? null))}
                          </div>
                          {activeCodingTab.file.entries.some((entry) => entry.truncated) && (
                            <p className="coding-folder-note">This folder has more items. Use search or open a narrower folder to keep the explorer fast.</p>
                          )}
                        </>
                      )}
                    </section>
                  )}

                  {activeCodingTab.kind === "file" && activeCodingTab.file?.kind === "text" && (
                    <section className="coding-editor-shell" aria-label={`${activeCodingTab.title} editor`}>
                      <div className="coding-content-heading">
                        <div>
                          <p className="panel-kicker">{activeCodingTab.file.language}</p>
                          <h2>{activeCodingTab.file.relativePath}</h2>
                        </div>
                        <div className="coding-editor-actions">
                          {activeTextCodingDiff?.changed && (
                            <button type="button" className="coding-review-button" onClick={() => openCodingReview(activeCodingTab.id)}>
                              <Code2 size={15} aria-hidden="true" />
                              Review changes
                            </button>
                          )}
                          <span className="coding-save-state">
                            <Save size={15} aria-hidden="true" />
                            {activeCodingTab.dirty ? "Autosaving..." : `Saved ${formatSaveTime(activeCodingTab.savedAt)}`}
                          </span>
                        </div>
                      </div>
                      <textarea
                        className="coding-textarea"
                        value={activeCodingTab.content ?? activeCodingTab.file.content}
                        onChange={(event) => updateCodingFileContent(activeCodingTab.id, event.target.value)}
                        spellCheck={false}
                        aria-label={`Edit ${activeCodingTab.title}`}
                      />
                    </section>
                  )}

                  {activeCodingTab.kind === "file" && activeCodingTab.file?.kind === "image" && (
                    <section className="coding-image-view" aria-label={`${activeCodingTab.title} preview`}>
                      <div className="coding-content-heading">
                        <div>
                          <p className="panel-kicker">Image preview</p>
                          <h2>{activeCodingTab.file.relativePath}</h2>
                        </div>
                        <span>{formatFileSize(activeCodingTab.file.size)}</span>
                      </div>
                      <div className="coding-image-stage">
                        <img src={activeCodingTab.file.dataUrl} alt={activeCodingTab.file.name} />
                      </div>
                    </section>
                  )}

                  {activeCodingTab.kind === "file" && activeCodingTab.file?.kind === "document" && (
                    <section className="coding-document-view" aria-label={`${activeCodingTab.title} document`}>
                      <div className="coding-content-heading">
                        <div>
                          <p className="panel-kicker">Document preview</p>
                          <h2>{activeCodingTab.file.relativePath}</h2>
                        </div>
                        <span>{formatFileSize(activeCodingTab.file.size)}</span>
                      </div>
                      <iframe
                        className="coding-document-frame"
                        src={activeCodingTab.file.dataUrl}
                        title={`${activeCodingTab.file.name} preview`}
                      />
                    </section>
                  )}

                  {activeCodingTab.kind === "file" && activeCodingTab.file?.kind === "binary" && (
                    <section className="coding-binary-view" aria-label={`${activeCodingTab.title} file`}>
                      <FileText size={34} aria-hidden="true" />
                      <h2>{activeCodingTab.file.relativePath}</h2>
                      <p>{activeCodingTab.file.reason}</p>
                      <span>{formatFileSize(activeCodingTab.file.size)}</span>
                    </section>
                  )}

                  {activeCodingTab.kind === "plugins" && (
                    <section className="coding-plugin-market" aria-label="Plugin marketplace">
                      <div className="coding-content-heading">
                        <div>
                          <p className="panel-kicker">Plugins</p>
                          <h2>Install coding tools and CLIs</h2>
                        </div>
                        <span>
                          {installedCodingPluginCount} installed
                          {installingCodingPluginCount > 0 ? `, ${installingCodingPluginCount} installing` : ""}
                        </span>
                      </div>
                      <div className="coding-plugin-grid">
                        {codingPluginCatalog.map((plugin) => {
                          const status = codingPluginStatusById.get(plugin.id);
                          const isInstalled = status?.status === "installed";
                          const isInstalling = status?.status === "installing";
                          return (
                            <article className={`coding-plugin-card ${status?.status ?? "checking"}`} key={plugin.id}>
                              <span className="coding-plugin-icon">
                                <Wrench size={18} aria-hidden="true" />
                              </span>
                              <div>
                                <strong>{plugin.name}</strong>
                                <small>{isInstalling ? getPluginInstallRemaining(status, codingClock) : getPluginStatusLabel(status)}</small>
                                <p>{plugin.description}</p>
                                <code>{plugin.command}</code>
                                {status?.reason && <em>{status.reason}</em>}
                              </div>
                              {isInstalling ? (
                                <button type="button" onClick={() => void cancelCodingPluginInstall(plugin)} disabled={codingPluginBusyIds[plugin.id]}>
                                  Cancel
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => void installCodingPlugin(plugin)}
                                  disabled={isInstalled || codingPluginBusyIds[plugin.id]}
                                >
                                  {isInstalled ? "Installed" : "Install"}
                                </button>
                              )}
                            </article>
                          );
                        })}
                      </div>
                    </section>
                  )}

                  {activeCodingTab.kind === "terminal" && (
                    <section className="coding-terminal-panel" aria-label="Command runner">
                      <div className="coding-content-heading">
                        <div>
                          <p className="panel-kicker">Terminal</p>
                          <h2>Run project commands</h2>
                        </div>
                        <div className="coding-access-toggle" aria-label="Command access mode">
                          <button
                            className={codingSnapshot.accessMode === "ask" ? "active" : ""}
                            type="button"
                            onClick={() => setCodingAccessMode("ask")}
                          >
                            <ShieldCheck size={15} aria-hidden="true" />
                            Ask first
                          </button>
                          <button
                            className={codingSnapshot.accessMode === "full" ? "active danger" : "danger"}
                            type="button"
                            onClick={() => setCodingAccessMode("full")}
                          >
                            <AlertTriangle size={15} aria-hidden="true" />
                            Full access
                          </button>
                        </div>
                      </div>
                      <form
                        className="coding-command-bar"
                        onSubmit={(event) => {
                          event.preventDefault();
                          void runCodingCommand(false);
                        }}
                      >
                        <Terminal size={16} aria-hidden="true" />
                        <input
                          value={codingCommandDraft}
                          onChange={(event) => setCodingCommandDraft(event.target.value)}
                          placeholder="npm test"
                          aria-label="Command to run"
                          spellCheck={false}
                        />
                        <button type="submit" disabled={codingBusy}>
                          <Play size={15} aria-hidden="true" />
                          Run
                        </button>
                      </form>
                      {pendingCodingCommand && (
                        <div className="coding-approval-card" role="status">
                          <AlertTriangle size={18} aria-hidden="true" />
                          <span>
                            <strong>Approve command</strong>
                            <small>{pendingCodingCommand.command}</small>
                          </span>
                          <button type="button" onClick={() => void runCodingCommand(true)}>
                            Approve and run
                          </button>
                          <button type="button" onClick={() => setPendingCodingCommand(null)}>
                            Cancel
                          </button>
                        </div>
                      )}
                      <pre className="coding-command-output">
                        {codingCommandResult
                          ? [
                              `> ${codingCommandResult.command ?? codingCommandDraft}`,
                              codingCommandResult.cwd ? `cwd: ${codingCommandResult.cwd}` : "",
                              codingCommandResult.success ? `exit ${codingCommandResult.exitCode} in ${codingCommandResult.durationMs}ms` : codingCommandResult.reason,
                              codingCommandResult.stdout ?? "",
                              codingCommandResult.stderr ?? ""
                            ]
                              .filter(Boolean)
                              .join("\n")
                          : "Commands run from the active project. In Ask first mode, Autopilot pauses before executing."}
                      </pre>
                    </section>
                  )}

                  {activeCodingTab.kind === "browser" && (
                    <section className="coding-browser-panel" aria-label="Coding browser">
                      <div className="coding-content-heading">
                        <div>
                          <p className="panel-kicker">Browser</p>
                          <h2>Research without leaving Coding</h2>
                        </div>
                      </div>
                      <form
                        className="coding-command-bar"
                        onSubmit={(event) => {
                          event.preventDefault();
                          void browseFromCoding();
                        }}
                      >
                        <Globe2 size={16} aria-hidden="true" />
                        <input
                          value={codingResearchDraft}
                          onChange={(event) => setCodingResearchDraft(event.target.value)}
                          placeholder="Search Google or enter a URL"
                          aria-label="Coding browser search"
                        />
                        <button type="submit" disabled={codingBusy}>
                          <Search size={15} aria-hidden="true" />
                          Browse
                        </button>
                      </form>
                      <article className={`coding-research-result ${codingResearchResult?.success ? "" : "empty"}`}>
                        {codingResearchResult ? (
                          codingResearchResult.success ? (
                            <>
                              <span>{codingResearchResult.status}</span>
                              <h3>{codingResearchResult.title}</h3>
                              <a href={codingResearchResult.url} target="_blank" rel="noreferrer">
                                {codingResearchResult.url}
                              </a>
                              <p>{codingResearchResult.snippet}</p>
                              <button type="button" onClick={() => navigateTo(codingResearchResult.url)}>
                                Open full page in Browser workspace
                              </button>
                            </>
                          ) : (
                            <>
                              <h3>Could not browse that page</h3>
                              <p>{codingResearchResult.reason}</p>
                            </>
                          )
                        ) : (
                          <>
                            <h3>Ready to research</h3>
                            <p>Autopilot can fetch URLs, localhost pages, or Google search queries from the coding workspace.</p>
                          </>
                        )}
                      </article>
                    </section>
                  )}
                </div>

                <div className="coding-console" aria-label="Coding status">
                  <Terminal size={15} aria-hidden="true" />
                  <span>{codingBusy ? "Working..." : codingStatus}</span>
                </div>
              </section>

              <aside className="coding-right-sidebar" aria-label="Coding inspector sidebar">
                <div className="coding-right-header">
                  <div>
                    <p className="panel-kicker">Inspector</p>
                    <h2>{codingRightPanel}</h2>
                  </div>
                  <button type="button" aria-label="Minimize inspector" onClick={() => setCodingRightSidebarOpen(false)}>
                    <ChevronRight size={16} aria-hidden="true" />
                  </button>
                </div>

                <div className="coding-right-tabs" role="tablist" aria-label="Inspector panels">
                  <button className={codingRightPanel === "access" ? "active" : ""} type="button" onClick={() => setCodingRightPanel("access")}>
                    <ShieldCheck size={15} aria-hidden="true" />
                    Access
                  </button>
                  <button className={codingRightPanel === "code" ? "active" : ""} type="button" onClick={() => setCodingRightPanel("code")}>
                    <Code2 size={15} aria-hidden="true" />
                    Code
                  </button>
                  <button className={codingRightPanel === "terminal" ? "active" : ""} type="button" onClick={() => setCodingRightPanel("terminal")}>
                    <Terminal size={15} aria-hidden="true" />
                    Terminal
                  </button>
                  <button className={codingRightPanel === "downloads" ? "active" : ""} type="button" onClick={openCodingDownloads}>
                    <Download size={15} aria-hidden="true" />
                    Downloads
                  </button>
                  <button className={codingRightPanel === "plugins" ? "active" : ""} type="button" onClick={openCodingPlugins}>
                    <Package size={15} aria-hidden="true" />
                    Plugins
                  </button>
                </div>

                <div className="coding-right-content">
                  {codingRightPanel === "access" && (
                    <section className="coding-right-panel" aria-label="Access mode">
                      <div className={`coding-access-card ${codingSnapshot.accessMode}`}>
                        <span>{codingSnapshot.accessMode === "full" ? "Full access" : "Ask first"}</span>
                        <strong>{codingSnapshot.accessMode === "full" ? "Commands can run without a pause." : "Autopilot asks before commands run."}</strong>
                        <small>
                          Full access is for project work you trust. Ask first keeps command execution gated while still allowing file browsing and edits.
                        </small>
                      </div>
                      <div className="coding-access-toggle vertical" aria-label="Command access mode">
                        <button className={codingSnapshot.accessMode === "ask" ? "active" : ""} type="button" onClick={() => setCodingAccessMode("ask")}>
                          <ShieldCheck size={15} aria-hidden="true" />
                          Ask first
                        </button>
                        <button
                          className={codingSnapshot.accessMode === "full" ? "active danger" : "danger"}
                          type="button"
                          onClick={() => setCodingAccessMode("full")}
                        >
                          <AlertTriangle size={15} aria-hidden="true" />
                          Full access
                        </button>
                      </div>
                    </section>
                  )}

                  {codingRightPanel === "code" && (
                    <section className="coding-right-panel coding-review-panel" aria-label="Code review">
                      <div className="coding-review-tabs" role="tablist" aria-label="Code review sections">
                        <button
                          className={codingReviewMode === "summary" ? "active" : ""}
                          type="button"
                          role="tab"
                          aria-selected={codingReviewMode === "summary"}
                          onClick={() => setCodingReviewMode("summary")}
                        >
                          Summary
                        </button>
                        <button
                          className={codingReviewMode === "review" ? "active" : ""}
                          type="button"
                          role="tab"
                          aria-selected={codingReviewMode === "review"}
                          onClick={() => setCodingReviewMode("review")}
                        >
                          Review
                        </button>
                      </div>

                      <div className="coding-review-summary">
                        <span>
                          <strong>{changedCodingFileTabs.length}</strong>
                          <small>Changed</small>
                        </span>
                        <span className="added">
                          <strong>+{codingDiffSummary.added}</strong>
                          <small>New code</small>
                        </span>
                        <span className="removed">
                          <strong>-{codingDiffSummary.removed}</strong>
                          <small>Deleted</small>
                        </span>
                      </div>

                      {codingReviewMode === "summary" && (
                        <div className="coding-review-brief">
                          <span>
                            <strong>{activeCodingProject?.name ?? "No project"}</strong>
                            <small>{activeCodingProject?.rootPath ?? "Open a local folder to inspect files."}</small>
                          </span>
                          <button type="button" onClick={openCodingPicker}>
                            Open file
                          </button>
                        </div>
                      )}

                      <div className="coding-change-file-list" aria-label="Changed files">
                        {changedCodingFileTabs.length === 0 ? (
                          <span className="coding-right-empty">Edits will appear here after you change a text file in the coding workspace.</span>
                        ) : (
                          changedCodingFileTabs.map((tab) => {
                            const diff = codingDiffsByTabId.get(tab.id);
                            return (
                              <button
                                key={tab.id}
                                className={tab.id === activeCodingReviewTab?.id ? "active" : ""}
                                type="button"
                                onClick={() => openCodingReview(tab.id)}
                              >
                                <FileText size={14} aria-hidden="true" />
                                <span>
                                  <strong>{tab.file.relativePath}</strong>
                                  <small>
                                    +{diff?.added ?? 0} -{diff?.removed ?? 0}
                                  </small>
                                </span>
                              </button>
                            );
                          })
                        )}
                      </div>

                      {codingReviewMode === "review" && codingReviewDiffTabs.length > 0 && (
                        <div className="coding-review-diff-stack" aria-label="Changed file diffs">
                          {codingReviewDiffTabs.map((tab, index) => {
                            const diff = codingDiffsByTabId.get(tab.id);
                            if (!diff?.changed) {
                              return null;
                            }

                            return (
                              <article
                                className={`coding-diff-card ${tab.id === activeCodingReviewTab?.id ? "active" : ""}`}
                                key={tab.id}
                                aria-label={`Review changes for ${tab.file.relativePath}`}
                              >
                                <div className="coding-diff-header">
                                  <span>
                                    <strong>{tab.file.relativePath}</strong>
                                    <small>
                                      File {index + 1} of {changedCodingFileTabs.length} | {diff.tooLarge ? "Large file preview" : "Line review"} | +{diff.added} -
                                      {diff.removed}
                                    </small>
                                  </span>
                                  <div>
                                    <button type="button" onClick={() => setActiveCodingTabId(tab.id)}>
                                      Open
                                    </button>
                                    <button type="button" onClick={() => markCodingFileReviewed(tab.id)}>
                                      Reviewed
                                    </button>
                                    <button type="button" className="danger" onClick={() => revertCodingFileToBaseline(tab.id)}>
                                      Revert
                                    </button>
                                  </div>
                                </div>
                                <div className="coding-diff-body">
                                  {diff.hunks.map((hunk) => (
                                    <section className="coding-diff-hunk" key={hunk.id} aria-label={`Changes near line ${hunk.newStart || hunk.oldStart}`}>
                                      <div className="coding-diff-hunk-label">
                                        @@ -{hunk.oldStart} +{hunk.newStart} @@
                                      </div>
                                      {hunk.lines.map((line) => (
                                        <div className={`coding-diff-line ${line.kind}`} key={line.id}>
                                          <span className="coding-diff-gutter">{line.oldLine ?? ""}</span>
                                          <span className="coding-diff-gutter">{line.newLine ?? ""}</span>
                                          <span className="coding-diff-marker">{line.kind === "added" ? "+" : line.kind === "removed" ? "-" : " "}</span>
                                          <code>{line.text.length > 0 ? line.text : " "}</code>
                                        </div>
                                      ))}
                                    </section>
                                  ))}
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      )}

                      {codingReviewMode === "review" && codingReviewDiffTabs.length === 0 && (
                        <div className="coding-review-empty">
                          <Code2 size={18} aria-hidden="true" />
                          <span>
                            <strong>No changes to review.</strong>
                            <small>Open a text file, make an edit, and this panel will show the red and green diff.</small>
                          </span>
                        </div>
                      )}
                    </section>
                  )}

                  {codingRightPanel === "terminal" && (
                    <section className="coding-right-panel" aria-label="Terminal sessions">
                      <div className="coding-right-summary">
                        <span>
                          <strong>Active terminal</strong>
                          <small>{activeCodingProject?.rootPath ?? "Home directory"}</small>
                        </span>
                        <button type="button" onClick={openCodingTerminal}>
                          Open
                        </button>
                      </div>
                      <div className="coding-right-list terminal-history">
                        {codingTerminalHistory.length === 0 ? (
                          <span className="coding-right-empty">Run a command to see active terminal history here.</span>
                        ) : (
                          codingTerminalHistory.map((result, index) => (
                            <button key={`${result.command ?? "command"}-${index}`} type="button" onClick={openCodingTerminal}>
                              <Terminal size={14} aria-hidden="true" />
                              <span>
                                <strong>{result.command ?? "Command"}</strong>
                                <small>{result.success ? `exit ${result.exitCode} in ${result.durationMs}ms` : result.reason}</small>
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    </section>
                  )}

                  {codingRightPanel === "downloads" && (
                    <section className="coding-right-panel" aria-label="Downloads">
                      <div className="coding-right-summary">
                        <span>
                          <strong>Recent downloads</strong>
                          <small>{activeCodingDownloads} active</small>
                        </span>
                        <button type="button" onClick={() => void refreshCodingDownloads()}>
                          Refresh
                        </button>
                      </div>
                      <div className="coding-right-list downloads">
                        {codingDownloads.length === 0 ? (
                          <span className="coding-right-empty">Downloaded files will show up here.</span>
                        ) : (
                          codingDownloads.map((download) => {
                            const progress =
                              download.totalBytes > 0 ? Math.min(100, Math.round((download.receivedBytes / download.totalBytes) * 100)) : 0;
                            return (
                              <button
                                key={download.id}
                                type="button"
                                onClick={() => void openDownloadedFile(download)}
                              >
                                <Download size={14} aria-hidden="true" />
                                <span>
                                  <strong>{download.filename}</strong>
                                  <small>
                                    {download.state === "progressing"
                                      ? `${formatFileSize(download.receivedBytes)}${download.totalBytes ? ` of ${formatFileSize(download.totalBytes)}` : ""}`
                                      : download.state}
                                  </small>
                                  {download.state === "progressing" && <i style={{ "--download-progress": `${progress}%` } as CSSProperties} />}
                                </span>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </section>
                  )}

                  {codingRightPanel === "plugins" && (
                    <section className="coding-right-panel" aria-label="Plugins">
                      <div className="coding-right-summary">
                        <span>
                          <strong>Plugin checks</strong>
                          <small>{installedCodingPluginCount} installed</small>
                        </span>
                        <button type="button" onClick={() => void refreshCodingPluginStatuses()}>
                          Check
                        </button>
                      </div>
                      <div className="coding-right-list plugins">
                        {codingPluginCatalog.map((plugin) => {
                          const status = codingPluginStatusById.get(plugin.id);
                          const isInstalling = status?.status === "installing";
                          return (
                            <button
                              key={plugin.id}
                              type="button"
                              onClick={() => (isInstalling ? void cancelCodingPluginInstall(plugin) : void installCodingPlugin(plugin))}
                              disabled={codingPluginBusyIds[plugin.id] || status?.status === "installed"}
                            >
                              <Package size={14} aria-hidden="true" />
                              <span>
                                <strong>{plugin.name}</strong>
                                <small>{isInstalling ? getPluginInstallRemaining(status, codingClock) : getPluginStatusLabel(status)}</small>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  )}
                </div>
              </aside>
            </section>
          )}

          {view === "productivity" && (
            <section className="productivity-page" aria-labelledby="productivity-heading">
              <header className="productivity-hero">
                <div className="productivity-hero-copy">
                  <p className="panel-kicker">{todayLabel}</p>
                  <h1 id="productivity-heading">
                    {sourcedOpenActionItems.length} {sourcedOpenActionItems.length === 1 ? "thing needs" : "things need"} action,{" "}
                    {urgentActionCount} {urgentActionCount === 1 ? "is" : "are"} urgent.
                  </h1>
                  <p>
                    Connected sources become a ranked day plan. Gmail and Google Calendar will feed this directly once integration is connected.
                  </p>
                </div>
                <div className="productivity-compass-card" aria-label="Current productivity bearing">
                  <div className="productivity-compass-orbit" aria-hidden="true">
                    <AutopilotNeedle className="productivity-compass-needle" />
                    <span className="compass-node north" />
                    <span className="compass-node east" />
                    <span className="compass-node south" />
                  </div>
                  <div>
                    <span>Next bearing</span>
                    <strong>{nextActionItem ? getActionInstruction(nextActionItem) : "Connect a source"}</strong>
                  </div>
                </div>
                <div className="productivity-stats" aria-label="Action item summary">
                  <span>
                    <strong>{focusTimeLabel}</strong>
                    <small>Focus time</small>
                  </span>
                  <span>
                    <strong>{waitingActionCount}</strong>
                    <small>Waiting</small>
                  </span>
                  <span>
                    <strong>{activeSourceCount}</strong>
                    <small>Sources</small>
                  </span>
                </div>
              </header>

              <section className="priority-callout" aria-label="Today's priority call">
                <AutopilotNeedle className="priority-callout-needle" />
                <div>
                  <p className="panel-kicker">Today's call</p>
                  <h2>{nextActionItem ? "Start here" : "No action items yet."}</h2>
                  {nextActionItem ? (
                    <>
                      <div className="callout-brief">
                        <span>Do first</span>
                        <strong>{getActionInstruction(nextActionItem)}</strong>
                        <small>Source: {getActionSourceSummary(nextActionItem)}</small>
                      </div>
                      {remainingPriorityActionItems.length > 0 && (
                        <ol aria-label="Next priority actions">
                          {remainingPriorityActionItems.map((item, index) => (
                            <li key={item.id}>
                              <strong>{`Step ${index + 2}`}</strong>
                              <span>{getActionInstruction(item)}</span>
                            </li>
                          ))}
                        </ol>
                      )}
                    </>
                  ) : (
                    <p>Sync a real source, like an email thread, calendar event, chat, or task page, to build today's plan.</p>
                  )}
                  {!nextActionItem && (
                    <ol aria-label="How to add action items">
                      <li>
                        <strong>Start here</strong>
                        <span>Open a page with real requests, then run Sync selected from Sources.</span>
                      </li>
                    </ol>
                  )}
                </div>
                <button
                  className="callout-action"
                  type="button"
                  disabled={!nextActionItem}
                  onClick={() => nextActionItem && setSelectedActionSource(nextActionItem.source)}
                >
                  Start next task
                  <ArrowRight size={17} aria-hidden="true" />
                </button>
              </section>

              <div className="productivity-grid">
                <section className="email-inbox-panel" aria-label="Built-in email inbox">
                  <div className="email-inbox-heading">
                    <div>
                      <p className="panel-kicker">Inbox</p>
                      <h2>Email action feed</h2>
                      <span>
                        {emailStatus?.connected
                          ? `Connected to ${emailStatus.accountEmail ?? "Gmail"}`
                          : emailStatus?.reason ?? "Connect Gmail to pull messages into Autopilot."}
                      </span>
                    </div>
                    <div className="email-inbox-actions">
                      {emailStatus?.connected ? (
                        <>
                          <button className="secondary-action" type="button" onClick={() => void disconnectEmailInbox()} disabled={emailBusy}>
                            Disconnect
                          </button>
                          <button className="primary-action" type="button" onClick={() => void syncEmailInbox()} disabled={emailBusy}>
                            <RotateCw size={16} className={emailBusy ? "spin" : ""} aria-hidden="true" />
                            Sync inbox
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="primary-action"
                            type="button"
                            onClick={() => void connectGmailInbox("autopilot")}
                            disabled={emailBusy || emailStatus?.configured === false}
                          >
                            <Mail size={16} aria-hidden="true" />
                            Connect Gmail
                          </button>
                          <button
                            className="secondary-action"
                            type="button"
                            onClick={() => void connectGmailInbox("external")}
                            disabled={emailBusy || emailStatus?.configured === false}
                          >
                            Use another browser
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {emailSyncStatus ? <p className="email-sync-status">{emailSyncStatus}</p> : null}
                  {backgroundWorkStatus ? <p className="email-sync-status work-status">{backgroundWorkStatus}</p> : null}
                  {autoDraftStatus ? <p className="email-sync-status draft-status">{autoDraftStatus}</p> : null}

                  {emailMessages.length === 0 ? (
                    <div className="email-empty">
                      <Mail size={22} aria-hidden="true" />
                      <span>{emailStatus?.connected ? "No inbox messages synced yet." : "Connect Gmail to show your inbox here."}</span>
                    </div>
                  ) : (
                    <div className="email-message-list">
                      {emailMessages.slice(0, 8).map((message) => {
                        const isBuildingMessage = buildingWorkMessageIds.includes(message.id);
                        const messageDraft = draftByMessageId.get(message.id);
                        const messageTaskIds = productivityTasks.filter((task) => task.source.messageId === message.id && task.state !== "done").map((task) => task.id);
                        return (
                          <article className={`email-message ${message.unread ? "unread" : ""} ${messageDraft ? "has-draft" : ""}`} key={message.id}>
                            <button
                              className="email-message-summary"
                              type="button"
                              aria-label={`Open ${message.subject || "email"} in the browser`}
                              onClick={() => void openEmailInBrowser(message)}
                            >
                              <span className="email-message-icon" aria-hidden="true">
                                <Mail size={16} />
                              </span>
                              <div className="email-message-copy">
                                <span className="email-message-topline">
                                  <strong>{message.subject}</strong>
                                  <time dateTime={new Date(message.receivedAt).toISOString()}>{formatCredentialDate(message.receivedAt)}</time>
                                </span>
                                <span>
                                  {message.from}
                                  {message.fromEmail ? ` - ${message.fromEmail}` : ""}
                                </span>
                              </div>
                            </button>
                            <div className="email-message-actions">
                              <button
                                className={`secondary-action email-full-button ${messageDraft ? "ready" : ""}`}
                                type="button"
                                disabled={isBuildingMessage && !messageDraft}
                                onClick={() => {
                                  if (messageDraft) {
                                    openProductivityDraft(messageDraft);
                                    return;
                                  }

                                  void generateArtifactFromEmail(message, undefined, {
                                    mode: "background",
                                    taskIds: messageTaskIds
                                  });
                                }}
                              >
                                {messageDraft ? "View draft" : isBuildingMessage ? "Drafting..." : "Create draft"}
                                <Sparkles size={16} className={isBuildingMessage ? "spin" : ""} aria-hidden="true" />
                              </button>
                              <button className="secondary-action email-full-button" type="button" onClick={() => void openEmailInBrowser(message)}>
                                Show full email
                                <ArrowRight size={16} aria-hidden="true" />
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>

                <section className="productivity-drafts-panel" aria-label="Saved drafts">
                  <div className="action-checklist-heading">
                    <div>
                      <p className="panel-kicker">Drafts</p>
                      <h2>Saved work</h2>
                    </div>
                    <span>{productivityDrafts.length} saved</span>
                  </div>

                  {productivityDrafts.length === 0 ? (
                    <div className="checklist-empty">
                      <FileText size={20} aria-hidden="true" />
                      <span>Build work from an email and Autopilot will keep the draft here for review.</span>
                    </div>
                  ) : (
                    <div className="productivity-draft-list">
                      {productivityDrafts.map((draft) => (
                        <article className="productivity-draft-card" key={draft.id}>
                          <button className="productivity-draft-main" type="button" onClick={() => openProductivityDraft(draft)}>
                            <span className="productivity-draft-icon" aria-hidden="true">
                              <FileText size={16} />
                            </span>
                            <span className="productivity-draft-copy">
                              <strong>{draft.title}</strong>
                              <small>
                                {getArtifactKindLabel(draft.artifactKind)} from {draft.source.from ?? draft.source.label}
                              </small>
                              <span>{draft.preview}</span>
                            </span>
                            <b>{draft.status === "needs_review" ? "Review" : "Draft"}</b>
                          </button>
                          <div className="productivity-draft-actions">
                            <button className="secondary-action" type="button" onClick={() => openProductivityDraft(draft)}>
                              Open
                            </button>
                            {draft.source.url && (
                              <button className="secondary-action" type="button" onClick={() => void openProductivityDraftSource(draft)}>
                                Source
                              </button>
                            )}
                            <button className="icon-button danger" type="button" aria-label={`Delete ${draft.title}`} onClick={() => deleteProductivityDraft(draft.id)}>
                              <Trash2 size={15} aria-hidden="true" />
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>

                <section className="action-checklist-panel" aria-label="Action item checklist">
                  <div className="action-checklist-heading">
                    <div>
                      <p className="panel-kicker">Checklist</p>
                      <h2>Action items</h2>
                    </div>
                    <span>{sourcedOpenActionItems.length} open</span>
                  </div>

                  {sourcedOpenActionItems.length === 0 ? (
                    <div className="checklist-empty">
                      <Check size={20} aria-hidden="true" />
                      <span>No action items yet.</span>
                    </div>
                  ) : (
                    <div className="action-checklist">
                      {sourcedOpenActionItems.map((item) => {
                        const task = taskByActionId.get(item.id);
                        return (
                          <article className="checklist-item" key={item.id}>
                            <label>
                              <input
                                type="checkbox"
                                checked={false}
                                onChange={() => toggleActionItem(item.id)}
                                aria-label={`Mark ${item.title} done`}
                              />
                              <span className="checklist-copy">
                                <strong>{item.title}</strong>
                                <small>
                                  {item.source}
                                  {item.context ? ` - ${item.context}` : ""}
                                </small>
                              </span>
                            </label>
                            {task && (
                              <div className="task-state-actions" aria-label={`${task.title} state`}>
                                {(["todo", "waiting", "snoozed", "done"] satisfies ProductivityTaskState[]).map((state) => (
                                  <button
                                    className={task.state === state ? "active" : ""}
                                    type="button"
                                    key={state}
                                    onClick={() => setProductivityTaskState(task.id, state)}
                                  >
                                    {getTaskStateLabel(state)}
                                  </button>
                                ))}
                              </div>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>

                <section className="sources-panel" aria-label="Productivity sources">
                  <div className="sources-heading">
                    <div>
                      <p className="panel-kicker">Sources</p>
                      <h2>Choose what Autopilot reads</h2>
                    </div>
                    <button className="secondary-action" type="button" onClick={() => void syncSelectedProductivitySources()}>
                      Sync selected
                    </button>
                  </div>
                  <div className="source-grid">
                    {productivitySourceOptions.map((source) => {
                      const Icon = source.icon;
                      const isSelected = selectedProductivitySourceSet.has(source.id);
                      const count = actionSourceCounts.get(source.source) ?? 0;
                      const isGmailSource = source.id === "gmail";
                      const sourceStatusClass = isGmailSource && emailStatus?.connected ? "ready" : source.status;
                      const sourceStatusLabel = isGmailSource
                        ? emailStatus?.connected
                          ? "Connected"
                          : emailStatus?.configured === false
                            ? "Setup needed"
                            : isSelected
                              ? "Selected"
                              : "Connect"
                        : isSelected
                          ? "Selected"
                          : source.status === "ready"
                            ? "Local"
                            : "Connect later";
                      return (
                        <button
                          className={`source-card ${isSelected ? "selected" : ""}`}
                          key={source.id}
                          type="button"
                          onClick={() => toggleProductivitySource(source.id)}
                        >
                          <span className="source-card-icon">
                            <Icon size={17} aria-hidden="true" />
                          </span>
                          <span className="source-card-copy">
                            <strong>{source.label}</strong>
                            <small>{source.detail}</small>
                          </span>
                          <span className={`source-status ${sourceStatusClass}`}>{sourceStatusLabel}</span>
                          <b>{count}</b>
                        </button>
                      );
                    })}
                  </div>
                  {captureStatus ? <p className="capture-status">{captureStatus}</p> : null}
                </section>

                <section className="action-list-panel" aria-label="Action items">
                  <div className="action-list-heading">
                    <div>
                      <p className="panel-kicker">Queue</p>
                      <h2>{selectedActionSource === "All" ? "Open actions" : `${selectedActionSource} actions`}</h2>
                    </div>
                    {selectedActionSource !== "All" && (
                      <button className="clear-source-filter" type="button" onClick={() => setSelectedActionSource("All")}>
                        Show all
                      </button>
                    )}
                  </div>

                  {visibleOpenActionItems.length === 0 ? (
                    <div className="action-empty">
                      <Check size={22} aria-hidden="true" />
                      <span>{selectedActionSource === "All" ? "No open action items" : `No open ${selectedActionSource.toLowerCase()} actions`}</span>
                    </div>
                  ) : (
                    <div className="action-list">
                      {visibleOpenActionItems.map((item) => {
                        const task = taskByActionId.get(item.id);
                        return (
                          <article className="action-item" key={item.id}>
                            <button className="action-check" type="button" aria-label={`Mark ${item.title} done`} onClick={() => toggleActionItem(item.id)}>
                              <Check size={15} />
                            </button>
                            <div className="action-copy">
                              <strong>{item.title}</strong>
                              <span>
                                <b>{item.source}</b>
                                {item.context ? ` - ${item.context}` : ""}
                              </span>
                              {task && <small>{getTaskStateLabel(task.state)}</small>}
                            </div>
                            {task?.source.url && (
                              <button className="action-source" type="button" onClick={() => void openProductivityTaskSource(task)}>
                                Open source
                                <ArrowRight size={14} aria-hidden="true" />
                              </button>
                            )}
                            <button className="action-delete" type="button" aria-label={`Delete ${item.title}`} onClick={() => deleteActionItem(item.id)}>
                              <Trash2 size={15} />
                            </button>
                          </article>
                        );
                      })}
                    </div>
                  )}

                  {visibleCompletedActionItems.length > 0 && (
                    <details className="completed-actions">
                      <summary>Completed</summary>
                      {visibleCompletedActionItems.map((item) => (
                        <article className="action-item completed" key={item.id}>
                          <button className="action-check" type="button" aria-label={`Reopen ${item.title}`} onClick={() => toggleActionItem(item.id)}>
                            <Check size={15} />
                          </button>
                          <div className="action-copy">
                            <strong>{item.title}</strong>
                            <span>{item.source}</span>
                          </div>
                          <button className="action-delete" type="button" aria-label={`Delete ${item.title}`} onClick={() => deleteActionItem(item.id)}>
                            <Trash2 size={15} />
                          </button>
                        </article>
                      ))}
                    </details>
                  )}
                </section>
              </div>
            </section>
          )}

          {view === "design" && (
            <section className="design-studio-page" aria-labelledby="design-studio-heading">
              <aside className="design-project-sidebar" aria-label="Design projects">
                <div className="design-project-sidebar-heading">
                  <div>
                    <p className="panel-kicker">Design</p>
                    <h2>Projects</h2>
                  </div>
                  <button className="icon-button" type="button" onClick={() => setAllDesignProjectsOpen(true)} aria-label="Show all design projects">
                    <Search size={16} aria-hidden="true" />
                  </button>
                </div>

                <button className="design-all-projects-button" type="button" onClick={() => setAllDesignProjectsOpen(true)}>
                  <FolderOpen size={16} aria-hidden="true" />
                  <span>
                    <strong>All projects</strong>
                    <small>{designProjects.length} total including AI and archived work</small>
                  </span>
                </button>

                <div className="design-project-list" aria-label="Recent design projects">
                  <p className="sidebar-heading">Recent user projects</p>
                  {visibleDesignProjects.map((project) => renderDesignProjectItem(project))}
                  {visibleDesignProjects.length === 0 && (
                    <div className="design-project-empty">
                      <Palette size={18} aria-hidden="true" />
                      <span>Prompt the assistant or build work from an email to start a user project.</span>
                    </div>
                  )}
                </div>

                <div className="design-selected-shortcuts" aria-label="Selected project shortcuts">
                  <p className="sidebar-heading">Selected</p>
                  {activeDesignProject ? (
                    <>
                      <div className="design-selected-card">
                        <strong>{activeDesignProject.title}</strong>
                        <span>{getDesignProjectSubtitle(activeDesignProject)}</span>
                      </div>
                      <button className="sidebar-action" type="button" disabled={!activeArtifact || artifactBusy} onClick={() => void exportActiveArtifact()}>
                        <Download size={15} aria-hidden="true" />
                        <span>Export artifact</span>
                      </button>
                      <button
                        className="sidebar-action"
                        type="button"
                        disabled={!activeArtifact || activeArtifact.kind !== "website_design" || artifactBusy}
                        onClick={() => void exportActiveArtifactToCoding()}
                      >
                        <Code2 size={15} aria-hidden="true" />
                        <span>Send to Coding</span>
                      </button>
                    </>
                  ) : (
                    <span className="design-sidebar-empty">No project selected.</span>
                  )}
                </div>
              </aside>

              <section className="artifact-workbench" aria-label="Artifact editor and preview">
                <header className="artifact-hero design-canvas-hero">
                  <div>
                    <p className="panel-kicker">Artifact Studio</p>
                    <h1 id="design-studio-heading">{activeArtifact ? activeArtifact.title : "Design work starts here."}</h1>
                    <p>
                      {activeArtifact
                        ? activeArtifact.summary
                        : "Create documents, decks, and website designs from email context or a direct prompt."}
                    </p>
                  </div>
                  <div className="artifact-hero-actions">
                    <button className="secondary-action" type="button" onClick={() => void refreshArtifacts()}>
                      <RotateCw size={15} aria-hidden="true" />
                      Refresh
                    </button>
                    <button className="primary-action" type="button" disabled={!activeArtifact || artifactBusy} onClick={() => void exportActiveArtifact()}>
                      <Download size={15} aria-hidden="true" />
                      Export
                    </button>
                  </div>
                </header>

                {artifactStatus ? <p className="artifact-status" role="status">{artifactStatus}</p> : null}
                {artifactExportResult?.success && <p className="artifact-status success">Export saved at {artifactExportResult.path}</p>}
                {exportToCodingStatus && <p className="artifact-status success">{exportToCodingStatus}</p>}

                {!activeArtifact || !activeArtifactVersion ? (
                  <div className="artifact-empty-state">
                    <AutopilotNeedle className="artifact-empty-needle" />
                    <h2>Ask the AI sidebar to build something.</h2>
                    <p>The generated artifact appears here and stays connected to the source email, plan, and run log.</p>
                  </div>
                ) : (
                  <div className="artifact-studio-grid">
                    <section className="artifact-canvas" aria-label="Artifact preview">
                      <div className="artifact-canvas-heading">
                        <div>
                          <p className="panel-kicker">{getArtifactKindLabel(activeArtifact.kind)}</p>
                          <h2>{activeArtifact.title}</h2>
                          <span>{activeArtifact.summary}</span>
                        </div>
                        <span className="artifact-source">
                          <Mail size={14} aria-hidden="true" />
                          {activeArtifact.source.label}
                        </span>
                      </div>

                      {activeArtifactVersion.content.kind === "document" && (
                        <article className="document-preview">
                          {activeArtifactVersion.content.markdown.split("\n").map((line, index) => {
                            const trimmed = line.trim();
                            if (!trimmed) {
                              return <br key={`line-${index}`} />;
                            }
                            if (trimmed.startsWith("# ")) {
                              return <h1 key={`line-${index}`}>{trimmed.slice(2)}</h1>;
                            }
                            if (trimmed.startsWith("## ")) {
                              return <h2 key={`line-${index}`}>{trimmed.slice(3)}</h2>;
                            }
                            return <p key={`line-${index}`}>{trimmed.replace(/^[-*]\s*/u, "")}</p>;
                          })}
                        </article>
                      )}

                      {activeArtifactVersion.content.kind === "slide_deck" && (
                        <div className="slide-preview-grid">
                          {activeArtifactVersion.content.slides.map((slide, index) => (
                            <article className="slide-preview-card" key={slide.id}>
                              <span>{String(index + 1).padStart(2, "0")}</span>
                              <h3>{slide.title}</h3>
                              <ul>
                                {slide.bullets.map((bullet) => (
                                  <li key={bullet}>{bullet}</li>
                                ))}
                              </ul>
                            </article>
                          ))}
                        </div>
                      )}

                      {activeArtifactVersion.content.kind === "website_design" && (
                        <div className="website-preview-shell">
                          <div className="website-preview-topbar">
                            <span />
                            <span />
                            <span />
                          </div>
                          <iframe
                            title={`${activeArtifact.title} preview`}
                            sandbox=""
                            srcDoc={getArtifactPreviewSrcDoc(activeArtifactVersion.content)}
                          />
                        </div>
                      )}
                    </section>

                    <aside className="artifact-editor-panel" aria-label="Artifact editor">
                      <div className="artifact-panel-section">
                        <p className="panel-kicker">Editor</p>
                        <textarea
                          value={artifactEditorDraft}
                          onChange={(event) => setArtifactEditorDraft(event.target.value)}
                          aria-label="Edit artifact content"
                        />
                        <div className="artifact-editor-actions">
                          <button className="secondary-action" type="button" disabled={artifactBusy} onClick={() => void reviseActiveArtifact()}>
                            <Save size={15} aria-hidden="true" />
                            Save version
                          </button>
                          <button className="primary-action" type="button" disabled={artifactBusy || artifactPrompt.trim().length === 0} onClick={() => void reviseActiveArtifactWithAi()}>
                            <Sparkles size={15} aria-hidden="true" />
                            Apply AI prompt
                          </button>
                        </div>
                      </div>

                      {activeActionPlan?.artifactId === activeArtifact.id && (
                        <div className="artifact-panel-section">
                          <p className="panel-kicker">Action plan</p>
                          <h3>{activeActionPlan.title}</h3>
                          <p className="artifact-plan-summary">{activeActionPlan.summary}</p>
                          <ol className="artifact-plan-list">
                            {activeActionPlan.steps.map((step) => (
                              <li key={step.id}>
                                <strong>{step.title}</strong>
                                <span>{step.state.replace(/_/g, " ")}</span>
                              </li>
                            ))}
                          </ol>
                          {activeActionPlan.finalApproval.required && (
                            <div className="artifact-approval-card">
                              <ShieldCheck size={18} aria-hidden="true" />
                              <div>
                                <strong>
                                  {activeActionPlan.finalApproval.approvedAt ? "Final approval recorded" : "Final approval required"}
                                </strong>
                                <span>
                                  {activeActionPlan.finalApproval.approvedAt
                                    ? formatCredentialDate(activeActionPlan.finalApproval.approvedAt)
                                    : activeActionPlan.finalApproval.reason}
                                </span>
                              </div>
                              {!activeActionPlan.finalApproval.approvedAt && (
                                <button
                                  className="primary-action compact-action"
                                  type="button"
                                  disabled={artifactBusy}
                                  onClick={() => void approveFinalActionPlan(activeActionPlan)}
                                >
                                  <Check size={14} aria-hidden="true" />
                                  Approve
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="artifact-panel-section">
                        <p className="panel-kicker">Version history</p>
                        <div className="artifact-version-list">
                          {activeArtifact.versions
                            .slice()
                            .reverse()
                            .map((version) => (
                              <button
                                className={version.id === activeArtifact.activeVersionId ? "active" : ""}
                                key={version.id}
                                type="button"
                                onClick={() => setArtifactEditorDraft(artifactContentToEditorText(version.content))}
                              >
                                <strong>{version.summary}</strong>
                                <span>{formatCredentialDate(version.createdAt)}</span>
                              </button>
                            ))}
                        </div>
                      </div>

                      {activeArtifactRun && (
                        <div className="artifact-panel-section">
                          <p className="panel-kicker">Run log</p>
                          <div className="artifact-run-log">
                            {activeArtifactRun.events.map((event) => (
                              <span className={event.level} key={event.id}>
                                {event.message}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </aside>
                  </div>
                )}
              </section>

              <aside className="design-ai-sidebar" aria-label="Design AI assistant">
                <div className="design-ai-heading">
                  <div>
                    <p className="panel-kicker">AI designer</p>
                    <h2>Ask Autopilot</h2>
                  </div>
                  <Sparkles size={18} aria-hidden="true" />
                </div>

                <form className="design-assistant-form" onSubmit={(event) => void submitDesignAssistantPrompt(event)}>
                  <textarea
                    value={artifactPrompt}
                    onChange={(event) => setArtifactPrompt(event.target.value)}
                    placeholder={activeArtifact ? "Tell Autopilot how to revise this artifact..." : "Describe the document, deck, or website design you want..."}
                    aria-label="Design assistant prompt"
                  />
                  <button className="primary-action" type="submit" disabled={artifactBusy || artifactPrompt.trim().length === 0}>
                    {artifactBusy ? "Working" : activeArtifact ? "Revise" : "Build"}
                    <ArrowRight size={15} aria-hidden="true" />
                  </button>
                </form>

                <section className="design-ai-section" aria-label="Prompt suggestions">
                  <div className="design-ai-section-heading">
                    <span>Prompt ideas</span>
                    <button className="icon-button small" type="button" disabled={designPromptBusy} onClick={() => void generateDesignPromptSuggestions()} aria-label="Refresh prompt ideas">
                      <RotateCw size={14} className={designPromptBusy ? "spin" : ""} aria-hidden="true" />
                    </button>
                  </div>
                  <div className="design-prompt-suggestions">
                    {designPromptSuggestions.map((suggestion) => (
                      <button type="button" key={suggestion} onClick={() => setArtifactPrompt(suggestion)}>
                        {suggestion}
                      </button>
                    ))}
                    {designPromptSuggestions.length === 0 && <span>{designPromptStatus || "Prompt ideas appear after a project is selected."}</span>}
                  </div>
                </section>

                <section className="design-ai-section" aria-label="Shared context">
                  <div className="design-ai-section-heading">
                    <span>Context shared</span>
                  </div>
                  <div className="design-context-card">
                    {activeArtifact ? (
                      <>
                        <strong>{activeArtifact.title}</strong>
                        <span>{activeArtifact.source.label}</span>
                        <small>
                          {activeArtifactVersion
                            ? `${artifactContentToEditorText(activeArtifactVersion.content).length.toLocaleString()} editable characters`
                            : "No version selected"}
                        </small>
                      </>
                    ) : (
                      <span>No artifact context selected.</span>
                    )}
                  </div>
                </section>

                <section className="design-ai-section" aria-label="Artifact actions">
                  <div className="design-ai-section-heading">
                    <span>Actions</span>
                  </div>
                  <div className="design-action-grid">
                    <button type="button" disabled={!activeArtifact || artifactBusy || artifactPrompt.trim().length === 0} onClick={() => void reviseActiveArtifactWithAi()}>
                      <Sparkles size={15} aria-hidden="true" />
                      Revise
                    </button>
                    <button type="button" disabled={artifactBusy || artifactPrompt.trim().length === 0} onClick={() => void generateArtifactFromPrompt()}>
                      <RotateCw size={15} aria-hidden="true" />
                      Regenerate
                    </button>
                    <button type="button" disabled={!activeArtifact || artifactBusy} onClick={() => void exportActiveArtifact()}>
                      <Download size={15} aria-hidden="true" />
                      Export
                    </button>
                    <button type="button" disabled={!activeArtifact || activeArtifact.kind !== "website_design" || artifactBusy} onClick={() => void exportActiveArtifactToCoding()}>
                      <Code2 size={15} aria-hidden="true" />
                      To Coding
                    </button>
                  </div>
                </section>

                {(designPromptStatus || backgroundWorkStatus) && (
                  <p className="design-ai-status" role="status">
                    {backgroundWorkStatus || designPromptStatus}
                  </p>
                )}
              </aside>
            </section>
          )}

          {view === "design" && allDesignProjectsOpen && (
            <div className="design-project-modal-backdrop" role="presentation" onClick={() => setAllDesignProjectsOpen(false)}>
              <section className="design-project-modal" role="dialog" aria-modal="true" aria-labelledby="design-project-modal-heading" onClick={(event) => event.stopPropagation()}>
                <header className="design-project-modal-heading">
                  <div>
                    <p className="panel-kicker">All design work</p>
                    <h2 id="design-project-modal-heading">Projects and AI artifacts</h2>
                  </div>
                  <button className="icon-button" type="button" aria-label="Close all projects" onClick={() => setAllDesignProjectsOpen(false)}>
                    <X size={16} aria-hidden="true" />
                  </button>
                </header>
                <label className="design-project-search">
                  <Search size={16} aria-hidden="true" />
                  <input
                    autoFocus
                    value={designProjectFilter}
                    onChange={(event) => setDesignProjectFilter(event.target.value)}
                    placeholder="Search projects, AI work, archived artifacts..."
                    aria-label="Search design projects"
                  />
                </label>
                <div className="design-project-modal-list">
                  {filteredDesignProjects.map((project) => renderDesignProjectItem(project, "modal"))}
                  {filteredDesignProjects.length === 0 && (
                    <div className="design-project-empty">
                      <Search size={18} aria-hidden="true" />
                      <span>No design projects match that search.</span>
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}

          {view === "settings" && (
            <section className="settings-page" aria-labelledby="settings-heading">
              <div className="settings-heading">
                <div className="settings-title-lockup">
                  <button className="icon-preview-trigger settings-icon-trigger" type="button" aria-label="Preview Autopilot icon" onClick={() => setIconPreviewOpen(true)}>
                    <AutopilotNeedle className="settings-needle" />
                  </button>
                  <div>
                    <p className="panel-kicker">Color system</p>
                    <h1 id="settings-heading">Autopilot settings</h1>
                  </div>
                </div>
                <button className="primary-action" type="button" onClick={handleResetTheme}>
                  Reset colors
                </button>
              </div>

              {warnings.length > 0 && (
                <div className="contrast-warning" role="status">
                  {warnings.map((warning) => (
                    <p key={warning}>{warning}</p>
                  ))}
                </div>
              )}

              <div className="settings-grid">
                <section className="color-panel" aria-label="Theme colors">
                  {colorControls.map((control) => (
                    <label className="color-control" key={control.key}>
                      <span>
                        <strong>{control.label}</strong>
                        <code>{theme[control.key]}</code>
                      </span>
                      <input
                        type="color"
                        value={theme[control.key]}
                        onChange={(event) => updateTheme(control.key, event.target.value)}
                        aria-label={control.label}
                      />
                    </label>
                  ))}
                </section>

                <section className="theme-preview" aria-label="Theme preview">
                  <div className="preview-chrome-sample" aria-hidden="true">
                    <span>
                      <i />
                      <i />
                      <i />
                    </span>
                    <b />
                  </div>
                  <div className="preview-titlebar">
                    <button className="icon-preview-trigger preview-title-icon-trigger" type="button" aria-label="Preview Autopilot icon" onClick={() => setIconPreviewOpen(true)}>
                      <AutopilotNeedle className="preview-title-needle" />
                    </button>
                    <strong>Autopilot Browser</strong>
                  </div>
                  <div className="preview-toolbar">
                    <span />
                    <span />
                    <div>{AUTOPILOT_HOME_LABEL}</div>
                  </div>
                  <div className="preview-content">
                    <button className="icon-preview-trigger preview-icon-trigger" type="button" aria-label="Preview Autopilot icon" onClick={() => setIconPreviewOpen(true)}>
                      <AutopilotNeedle className="preview-needle" />
                    </button>
                    <h2>Ready to browse</h2>
                    <p>The shell, tabs, and settings all follow this palette.</p>
                    <button type="button">Primary action</button>
                  </div>
                </section>
              </div>

              <section className="automation-settings-panel" aria-label="Autopilot work automation">
                <div className="automation-settings-heading">
                  <span className="automation-settings-icon" aria-hidden="true">
                    <Sparkles size={20} />
                  </span>
                  <div>
                    <p className="panel-kicker">Work automation</p>
                    <h2>Do the work behind action items</h2>
                    <p>
                      Autopilot prepares drafts, documents, decks, and website designs from every open Gmail action item in the background. It still asks before
                      sending, sharing, submitting, or publishing.
                    </p>
                  </div>
                </div>
                <label className="automation-toggle">
                  <input type="checkbox" checked={autoWorkAllEnabled} onChange={(event) => setAutoWorkAllEnabled(event.target.checked)} />
                  <span>
                    <strong>Automatically prepare work after inbox sync</strong>
                    <small>
                      {autoWorkAllEnabled
                        ? "New Gmail action items will start building in Design after sync."
                        : "Leave this off if you want to start the queue manually."}
                    </small>
                  </span>
                </label>
                <div className="automation-settings-actions">
                  <button
                    className="primary-action"
                    type="button"
                    disabled={bulkWorkBusy || unpreparedWorkableTasks.length === 0}
                    onClick={() => void buildAllActionItemWork(undefined, "manual")}
                  >
                    <Sparkles size={16} className={bulkWorkBusy ? "spin" : ""} aria-hidden="true" />
                    {bulkWorkBusy ? "Working..." : "Build all open work"}
                  </button>
                  <span>
                    {unpreparedWorkableTasks.length} ready, {openWorkableTasks.length - unpreparedWorkableTasks.length} already prepared,{" "}
                    {waitingForApprovalCount} waiting for approval
                  </span>
                </div>
                {autoWorkStatus ? <p className="automation-status">{autoWorkStatus}</p> : null}
              </section>

              <section className="password-manager-panel" aria-label="Password manager">
                <div className="password-manager-heading">
                  <span className="password-manager-icon" aria-hidden="true">
                    <KeyRound size={20} />
                  </span>
                  <div>
                    <p className="panel-kicker">Password manager</p>
                    <h2>Saved passwords</h2>
                    <p>
                      {passwordAvailability?.secureStorage
                        ? `Encrypted with ${passwordAvailability.backend}.`
                        : passwordAvailability?.reason ?? "Checking secure storage..."}
                    </p>
                  </div>
                </div>

                {passwordStatus && (
                  <p className="password-status" role="status">
                    {passwordStatus}
                  </p>
                )}

                {passwordEntries.length === 0 ? (
                  <div className="password-empty">
                    <ShieldCheck size={22} aria-hidden="true" />
                    <span>Saved passwords will appear here after you sign in and choose Save.</span>
                  </div>
                ) : (
                  <div className="password-list" aria-label="Saved passwords">
                    {passwordEntries.map((entry) => {
                      const revealedPassword = revealedPasswords[entry.id];
                      return (
                        <article className="password-row" key={entry.id}>
                          <div className="password-row-copy">
                            <strong>{getCredentialHost(entry.origin)}</strong>
                            <span>{getCredentialUsernameLabel(entry.username)}</span>
                            <small>Updated {formatCredentialDate(entry.updatedAt)}</small>
                          </div>
                          <code className={`password-secret ${revealedPassword ? "revealed" : ""}`}>
                            {revealedPassword ?? "************"}
                          </code>
                          <div className="password-row-actions">
                            <button
                              type="button"
                              aria-label={
                                revealedPassword
                                  ? `Hide password for ${getCredentialUsernameLabel(entry.username)}`
                                  : `Reveal password for ${getCredentialUsernameLabel(entry.username)}`
                              }
                              onClick={() => togglePasswordReveal(entry.id)}
                            >
                              {revealedPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                            <button
                              type="button"
                              aria-label={`Delete saved password for ${getCredentialUsernameLabel(entry.username)}`}
                              onClick={() => removePassword(entry.id)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            </section>
          )}
        </section>
      </section>

      {iconPreviewOpen && (
        <div className="icon-preview-backdrop" onPointerDown={() => setIconPreviewOpen(false)}>
          <section
            className="icon-preview-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="icon-preview-heading"
            onPointerDown={(event) => event.stopPropagation()}
          >
            <button className="icon-preview-close" type="button" aria-label="Close icon preview" onClick={() => setIconPreviewOpen(false)}>
              <X size={18} />
            </button>
            <div className="icon-preview-art">
              <img className="icon-preview-logo" src="./autopilot-logo.svg" alt="" />
            </div>
            <h2 id="icon-preview-heading">Autopilot</h2>
          </section>
        </div>
      )}

      {passwordPrompt && (
        <aside className="password-save-prompt" role="dialog" aria-label="Save password">
          <span className="password-prompt-icon" aria-hidden="true">
            <ShieldCheck size={20} />
          </span>
          <div className="password-prompt-copy">
            <strong>Save password for {getCredentialHost(passwordPrompt.origin)}?</strong>
            <span>{getCredentialUsernameLabel(passwordPrompt.username)}</span>
          </div>
          <div className="password-prompt-actions">
            <button className="primary-action" type="button" data-password-action="save" onClick={savePendingPassword}>
              Save
            </button>
            <button className="secondary-action" type="button" data-password-action="dismiss" onClick={dismissPendingPassword}>
              Not now
            </button>
          </div>
        </aside>
      )}
    </main>
  );
}

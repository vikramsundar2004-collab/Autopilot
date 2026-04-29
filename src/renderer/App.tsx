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
  CodingFileReadResult,
  CodingPlugin,
  CodingResearchResult,
  CodingSearchResult,
  CodingSnapshot,
  CodingTreeNode
} from "../shared/coding";
import type { EmailConnectionStatus, EmailMessageSummary } from "../shared/email";
import type { PasswordAvailability, PasswordCredentialSummary, PendingPasswordSave } from "../shared/passwords";
import { getAutopilotApi } from "./autopilotApi";
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

type AppView = "browser" | "coding" | "productivity" | "settings";

type BookmarkContextMenu = {
  x: number;
  y: number;
  target: BookmarkNodeTarget | null;
  mode: "actions" | "new-folder";
};

const DEFAULT_SIDEBAR_WIDTH = 292;
const MIN_SIDEBAR_WIDTH = 220;
const MAX_SIDEBAR_WIDTH = 560;
const SIDEBAR_WIDTH_STORAGE_KEY = "autopilot:sidebar-width";

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
  { label: "design", color: "pink", icon: Palette, view: "browser" }
];

type CodingSection = "files" | "search" | "plugins" | "terminal" | "browser";

type CodingOpenedFile = Extract<CodingFileReadResult, { success: true }>;

type CodingWorkbenchTab = {
  id: string;
  kind: "chat" | "file" | "folder" | "picker" | "plugins" | "terminal" | "browser";
  title: string;
  path?: string;
  file?: CodingOpenedFile;
  content?: string;
  dirty?: boolean;
  savedAt?: number;
};

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
    command: "winget install OpenJS.NodeJS.LTS"
  },
  {
    id: "git",
    name: "Git",
    category: "Source control",
    description: "Clone repositories, manage branches, and pull code from GitHub projects.",
    command: "winget install Git.Git"
  },
  {
    id: "python",
    name: "Python",
    category: "Runtime",
    description: "Run Python scripts, virtual environments, notebooks, and package tools.",
    command: "winget install Python.Python.3.12"
  },
  {
    id: "eslint",
    name: "ESLint",
    category: "Quality",
    description: "Show JavaScript and TypeScript lint checks beside the files you edit.",
    command: "npm install -D eslint"
  },
  {
    id: "prettier",
    name: "Prettier",
    category: "Formatting",
    description: "Format supported files consistently before saving or committing.",
    command: "npm install -D prettier"
  },
  {
    id: "gh",
    name: "GitHub CLI",
    category: "GitHub",
    description: "Create pull requests, authenticate GitHub, and inspect repo status.",
    command: "winget install GitHub.cli"
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

function getCodingTabIcon(kind: CodingWorkbenchTab["kind"], file?: CodingOpenedFile): LucideIcon {
  if (kind === "chat") {
    return MessageCircle;
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
  const [selectedProductivitySources, setSelectedProductivitySources] = useState<ProductivitySourceId[]>(() => loadProductivitySources());
  const [selectedActionSource, setSelectedActionSource] = useState<ActionItemSource | "All">("All");
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [addressDraft, setAddressDraft] = useState("");
  const [view, setView] = useState<AppView>("browser");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(() => loadSidebarWidth());
  const [isSidebarResizing, setIsSidebarResizing] = useState(false);
  const [iconPreviewOpen, setIconPreviewOpen] = useState(false);
  const [codingSnapshot, setCodingSnapshot] = useState<CodingSnapshot>(defaultCodingSnapshot);
  const [codingTabs, setCodingTabs] = useState<CodingWorkbenchTab[]>(initialCodingTabs);
  const [activeCodingTabId, setActiveCodingTabId] = useState(CODING_CHAT_TAB_ID);
  const [openCodingFolders, setOpenCodingFolders] = useState<Record<string, boolean>>({});
  const [codingSection, setCodingSection] = useState<CodingSection>("files");
  const [codingStatus, setCodingStatus] = useState("Open a folder or create a project to start editing local files.");
  const [codingBusy, setCodingBusy] = useState(false);
  const [codingDraftMessage, setCodingDraftMessage] = useState("");
  const [installedCodingPlugins, setInstalledCodingPlugins] = useState<Record<string, boolean>>({});
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

  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? null;
  const activeNavigationError = activeTab?.navigationError ?? null;
  const activeNavigationErrorKey = activeNavigationError ? `${activeNavigationError.code}:${activeNavigationError.url}` : "";
  const isBrowserPreview = autopilot.runtime === "browser-preview";
  const warnings = useMemo(() => getThemeWarnings(theme), [theme]);
  const activeCodingTab = codingTabs.find((tab) => tab.id === activeCodingTabId) ?? codingTabs[0] ?? initialCodingTabs[0];
  const activeCodingProject = codingSnapshot.activeProject;
  const activeCodingPath = activeCodingTab?.path ?? null;
  const openActionItems = useMemo(() => actionItems.filter((item) => !item.completedAt), [actionItems]);
  const completedActionItems = useMemo(() => actionItems.filter((item) => item.completedAt), [actionItems]);
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
    function handleResize(): void {
      setSidebarWidth((currentWidth) => clampSidebarWidth(currentWidth));
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    let cancelled = false;

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
    void autopilot.tabs.setWebArea(
      {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height
      },
      view === "browser"
    );
  }, [autopilot, view]);

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
  }, [sendWebArea, tabs.length, activeTabId, activeNavigationErrorKey, sidebarOpen, sidebarWidth]);

  function navigateTo(input: string): void {
    if (!activeTabId) {
      return;
    }

    const destination = isHistoryAddressInput(input) ? createHistoryUrl(historyEntries, theme) : input;
    void autopilot.tabs.navigate(activeTabId, destination);
    setView("browser");
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
    setView("browser");
  }

  function addTab(): void {
    void autopilot.tabs.create();
    setView("browser");
  }

  async function openEmailInBrowser(message: EmailMessageSummary): Promise<void> {
    try {
      setEmailSyncStatus(`Opening ${message.subject || "email"} in a browser tab...`);
      await autopilot.tabs.create(message.url);
      setView("browser");
      setEmailSyncStatus(`Opened ${message.subject || "email"} in a new tab.`);
    } catch {
      setEmailSyncStatus("Autopilot could not open that email. Sync Gmail again and try once more.");
    }
  }

  function deleteTab(tabId = activeTabId): void {
    if (!tabId) {
      return;
    }

    void autopilot.tabs.close(tabId);
    setView("browser");
  }

  function activateTab(tabId: string): void {
    void autopilot.tabs.activate(tabId);
    setView("browser");
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

  function addActionsFromEmailMessages(messages: EmailMessageSummary[]): number {
    const existingKeys = new Set(actionItems.map((item) => `${item.source}:${item.context}:${item.title}`.toLowerCase()));
    const nextItems: ActionItem[] = [];

    for (const message of messages) {
      const context = getEmailContext(message);
      const titles = extractActionItemTitles(`${message.subject}.\n${message.snippet}\n${message.actionText ?? ""}`);
      for (const title of titles) {
        const item = createActionItem(title, "Email", context);
        const key = `${item.source}:${item.context}:${item.title}`.toLowerCase();
        if (!existingKeys.has(key)) {
          existingKeys.add(key);
          nextItems.push(item);
        }
      }
    }

    if (nextItems.length > 0) {
      setActionItems((currentItems) => [...nextItems, ...currentItems]);
    }

    return nextItems.length;
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

    const addedCount = addActionsFromEmailMessages(result.messages);
    setEmailSyncStatus(`Synced ${result.messages.length} inbox messages and added ${addedCount} action ${addedCount === 1 ? "item" : "items"}.`);
    setEmailBusy(false);
  }

  async function connectGmailInbox(): Promise<void> {
    setEmailBusy(true);
    setEmailSyncStatus("Opening Google sign-in. Finish the prompt in your browser.");
    const result = await autopilot.email.connectGmail().catch(() => ({
      success: false as const,
      status: emailStatus ?? {
        provider: "gmail" as const,
        configured: false,
        connected: false,
        accountEmail: null,
        reason: "Gmail connection failed."
      },
      messages: emailMessages,
      reason: "Gmail connection failed."
    }));

    setEmailStatus(result.status);
    setEmailMessages(result.messages ?? emailMessages);
    if (!result.success) {
      setEmailSyncStatus(result.reason ?? result.status.reason ?? "Gmail connection failed.");
      setEmailBusy(false);
      return;
    }

    const syncedMessages = result.messages ?? [];
    const addedCount = addActionsFromEmailMessages(syncedMessages);
    setEmailSyncStatus(`Connected ${result.status.accountEmail ?? "Gmail"} and added ${addedCount} action ${addedCount === 1 ? "item" : "items"}.`);
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
      await syncEmailInbox();
      return;
    }

    const selectedLabels = productivitySourceOptions
      .filter((source) => selectedProductivitySources.includes(source.id))
      .map((source) => source.label)
      .join(", ");
    setCaptureStatus(`${selectedLabels || "These sources"} will start syncing when Google and app integrations are connected.`);
  }

  function toggleActionItem(itemId: string): void {
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
    setActionItems((currentItems) => currentItems.filter((item) => item.id !== itemId));
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
    setCodingStatus(
      status ??
        (snapshot.tree
          ? `Ready in ${snapshot.activeProject?.name ?? "project"}.`
          : snapshot.projects.length > 0
            ? "Choose a recent project or open a folder to start browsing files."
            : "Open a folder or create a project to start editing local files.")
    );
  }

  async function openCodingProject(): Promise<void> {
    setCodingBusy(true);
    setCodingStatus("Choose a folder on your computer.");
    const snapshot = await autopilot.coding.openProject().catch(() => defaultCodingSnapshot);
    applyCodingSnapshot(snapshot, snapshot.activeProject ? `Opened ${snapshot.activeProject.name}.` : "No project selected.");
    setCodingBusy(false);
  }

  async function createCodingProject(): Promise<void> {
    setCodingBusy(true);
    setCodingStatus("Choose where the new project folder should live.");
    const snapshot = await autopilot.coding.createProject().catch(() => defaultCodingSnapshot);
    applyCodingSnapshot(snapshot, snapshot.activeProject ? `Created ${snapshot.activeProject.name}.` : "No project created.");
    setCodingBusy(false);
  }

  async function selectCodingProject(rootPath: string): Promise<void> {
    setCodingBusy(true);
    const snapshot = await autopilot.coding.selectProject(rootPath).catch(() => codingSnapshot);
    applyCodingSnapshot(snapshot, snapshot.activeProject ? `Switched to ${snapshot.activeProject.name}.` : undefined);
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

  async function openCodingPath(targetPath: string): Promise<void> {
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
      file: result,
      content: result.kind === "text" ? result.content : undefined,
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
      title: "Open file"
    };
    setCodingTabs((currentTabs) => [...currentTabs, tab]);
    setActiveCodingTabId(tab.id);
  }

  function openCodingPlugins(): void {
    setCodingSection("plugins");
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

  function newCodingChat(): void {
    const tab: CodingWorkbenchTab = {
      id: createCodingTabId("chat"),
      kind: "chat",
      title: `Chat ${codingTabs.filter((currentTab) => currentTab.kind === "chat").length + 1}`
    };
    setCodingTabs((currentTabs) => [...currentTabs, tab]);
    setActiveCodingTabId(tab.id);
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

  function installCodingPlugin(plugin: CodingPlugin): void {
    setInstalledCodingPlugins((currentPlugins) => ({
      ...currentPlugins,
      [plugin.id]: true
    }));
    setCodingStatus(`${plugin.name} is queued. Run ${plugin.command} in the terminal when you are ready.`);
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

    setCodingDraftMessage("");
    setCodingStatus(`Chat saved: ${message}`);
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

  const bookmarkFolderActionLabel = getFolderCreationParent(bookmarkContextMenu?.target ?? null) ? "Add folder inside" : "Add folder";

  return (
    <main
      className={`app-shell ${sidebarOpen ? "" : "sidebar-collapsed"} ${isSidebarResizing ? "sidebar-resizing" : ""}`}
      style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}
    >
      <aside className="sidebar" aria-label="Autopilot navigation">
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

          <section className="sidebar-section" aria-labelledby="workspaces-heading">
            <p className="sidebar-heading" id="workspaces-heading">
              Workspaces
            </p>
            <nav className="workspace-list" aria-label="Workspaces">
              {workspaceItems.map((item, index) => {
                const Icon = item.icon;
                const isActive = item.view === "browser" ? index === 0 && view === "browser" : view === item.view;
                return (
                  <button
                    className={`workspace-item ${item.color} ${isActive ? "active" : ""}`}
                    key={item.label}
                    onClick={() => setView(item.view)}
                    type="button"
                  >
                    <span className={`workspace-icon ${item.color}`} aria-hidden="true">
                      <Icon size={12} />
                    </span>
                    <span className="workspace-label">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </section>

          {view === "productivity" ? (
            <section className="sidebar-section with-divider productivity-sidebar" aria-labelledby="productivity-sidebar-heading">
              <p className="sidebar-heading" id="productivity-sidebar-heading">
                Today
              </p>
              <div className="productivity-sidebar-stat">
                <ListChecks size={16} aria-hidden="true" />
                <span>
                  <strong>{sourcedOpenActionItems.length}</strong>
                  <small>Open actions</small>
                </span>
              </div>
              <div className="productivity-sidebar-stat">
                <Clock size={16} aria-hidden="true" />
                <span>
                  <strong>{urgentActionCount}</strong>
                  <small>Urgent</small>
                </span>
              </div>
              <div className="productivity-sidebar-note">
                <strong>Sources live in the workspace</strong>
                <span>Choose Gmail, Calendar, Outlook, or Slack there.</span>
              </div>
            </section>
          ) : view === "coding" ? (
            <section className="sidebar-section with-divider coding-sidebar" aria-labelledby="coding-sidebar-heading">
              <p className="sidebar-heading" id="coding-sidebar-heading">
                Coding
              </p>
              <div className="productivity-sidebar-stat">
                <Code2 size={16} aria-hidden="true" />
                <span>
                  <strong>{codingTabs.filter((tab) => tab.kind === "file").length}</strong>
                  <small>Open files</small>
                </span>
              </div>
              <div className="productivity-sidebar-stat">
                <FolderOpen size={16} aria-hidden="true" />
                <span>
                  <strong>{codingSnapshot.projects.length}</strong>
                  <small>Projects</small>
                </span>
              </div>
              <div className="productivity-sidebar-note">
                <strong>{activeCodingProject?.name ?? "No project open"}</strong>
                <span>{activeCodingProject ? "Files autosave as you edit." : "Open a local folder to start."}</span>
              </div>
            </section>
          ) : (
            <>
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
                    <div className={`sidebar-tab ${tab.id === activeTabId && view === "browser" ? "active" : ""}`} key={tab.id}>
                      <button className="sidebar-tab-main" type="button" onClick={() => activateTab(tab.id)}>
                        <Globe2 size={16} aria-hidden="true" />
                        <span>{tab.title}</span>
                        <span className={`sidebar-tab-memory ${tab.memoryBytes ? "" : "pending"}`} title="Memory used by this tab">
                          {tab.memoryBytes ? formatTabMemory(tab.memoryBytes) : "--"}
                        </span>
                      </button>
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
            </>
          )}
        </div>

        <div className="sidebar-footer">
          {view === "browser" ? (
            <button className="sidebar-action" type="button" onClick={() => deleteTab()} aria-label="Delete active tab">
              <Trash2 size={16} />
              <span>Delete tab</span>
            </button>
          ) : (
            <button className="sidebar-action" type="button" onClick={() => setView("browser")} aria-label="Open browser workspace">
              <Globe2 size={16} />
              <span>Open browsing</span>
            </button>
          )}
          <button
            className={`sidebar-action ${view === "settings" ? "active" : ""}`}
            type="button"
            onClick={() => setView((currentView) => (currentView === "settings" ? "browser" : "settings"))}
            aria-label={view === "settings" ? "Close settings" : "Settings"}
          >
            <Settings size={16} />
            <span>Settings</span>
          </button>
        </div>
      </aside>

      {bookmarkContextMenu && (
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

      {sidebarOpen && <div className="sidebar-resize-handle" aria-hidden="true" onPointerDown={startSidebarResize} />}

      <button
        className="sidebar-toggle"
        type="button"
        aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
        onClick={() => setSidebarOpen((isOpen) => !isOpen)}
      >
        {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
      </button>

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
            </div>

            <label className="address-bar">
              <AutopilotNeedle className="address-needle" />
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
          <div className={`web-content-frame ${view !== "browser" ? "hidden" : ""}`} ref={webAreaRef}>
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

          {view === "coding" && (
            <section className="coding-page" aria-labelledby="coding-heading">
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

                {codingSnapshot.projects.length > 0 && (
                  <div className="coding-project-switcher" aria-label="Recent projects">
                    {codingSnapshot.projects.map((project) => (
                      <button
                        className={project.rootPath === activeCodingProject?.rootPath ? "active" : ""}
                        key={project.rootPath}
                        type="button"
                        onClick={() => void selectCodingProject(project.rootPath)}
                      >
                        <FolderOpen size={14} aria-hidden="true" />
                        <span>
                          <strong>{project.name}</strong>
                          <small>{project.rootPath}</small>
                        </span>
                      </button>
                    ))}
                  </div>
                )}

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
                    {codingPluginCatalog.map((plugin) => (
                      <button key={plugin.id} type="button" onClick={() => installCodingPlugin(plugin)}>
                        <Package size={15} aria-hidden="true" />
                        <span>
                          <strong>{plugin.name}</strong>
                          <small>{installedCodingPlugins[plugin.id] ? "Queued" : plugin.category}</small>
                        </span>
                      </button>
                    ))}
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

              <section className="coding-workbench" aria-label="Coding workspace">
                <div className="coding-workbench-tabs" role="tablist" aria-label="Open chats and files">
                  {codingTabs.map((tab) => {
                    const TabIcon = getCodingTabIcon(tab.kind, tab.file);
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
                        <span>{tab.title}</span>
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
                </div>

                <div className="coding-workbench-content">
                  {activeCodingTab.kind === "chat" && (
                    <section className="coding-chat" aria-label="Coding chat">
                      <div className="coding-chat-hero">
                        <AutopilotNeedle className="coding-agent-needle" />
                        <div>
                          <p className="panel-kicker">Coding</p>
                          <h2>What are we building?</h2>
                          <span>
                            Start with a chat, open a local project, pull up GitHub in the browser, or use the plus tab to pick a file.
                          </span>
                        </div>
                      </div>
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
                            <small>Queue CLIs and dev tools</small>
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
                          <h2>{activeCodingProject ? "Choose a file or folder" : "No project open"}</h2>
                        </div>
                        <button type="button" onClick={() => void openCodingProject()}>
                          <FolderOpen size={16} aria-hidden="true" />
                          Open folder
                        </button>
                      </div>
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
                          {codingPickerEntries.map((entry) => {
                            const EntryIcon = entry.kind === "folder" ? Folder : getCodingFileIcon(entry.name);
                            return (
                              <button key={entry.path} type="button" onClick={() => void openCodingPath(entry.path)}>
                                <EntryIcon size={20} aria-hidden="true" />
                                <span>
                                  <strong>{entry.name}</strong>
                                  <small>{entry.kind === "folder" ? "Folder" : formatFileSize(entry.size)}</small>
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
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
                            {activeCodingTab.file.entries.map((entry) => {
                              const EntryIcon = entry.kind === "folder" ? Folder : getCodingFileIcon(entry.name);
                              return (
                                <button key={entry.path} type="button" onClick={() => void openCodingPath(entry.path)}>
                                  <EntryIcon size={20} aria-hidden="true" />
                                  <span>
                                    <strong>{entry.name}</strong>
                                    <small>{entry.kind === "folder" ? "Folder" : formatFileSize(entry.size)}</small>
                                  </span>
                                </button>
                              );
                            })}
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
                        <span className="coding-save-state">
                          <Save size={15} aria-hidden="true" />
                          {activeCodingTab.dirty ? "Autosaving..." : `Saved ${formatSaveTime(activeCodingTab.savedAt)}`}
                        </span>
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
                        <span>{Object.keys(installedCodingPlugins).length} queued</span>
                      </div>
                      <div className="coding-plugin-grid">
                        {codingPluginCatalog.map((plugin) => (
                          <article className="coding-plugin-card" key={plugin.id}>
                            <span className="coding-plugin-icon">
                              <Wrench size={18} aria-hidden="true" />
                            </span>
                            <div>
                              <strong>{plugin.name}</strong>
                              <small>{plugin.category}</small>
                              <p>{plugin.description}</p>
                              <code>{plugin.command}</code>
                            </div>
                            <button type="button" onClick={() => installCodingPlugin(plugin)}>
                              {installedCodingPlugins[plugin.id] ? "Queued" : "Install"}
                            </button>
                          </article>
                        ))}
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
                        <button className="primary-action" type="button" onClick={() => void connectGmailInbox()} disabled={emailBusy || emailStatus?.configured === false}>
                          <Mail size={16} aria-hidden="true" />
                          Connect Gmail
                        </button>
                      )}
                    </div>
                  </div>

                  {emailSyncStatus ? <p className="email-sync-status">{emailSyncStatus}</p> : null}

                  {emailMessages.length === 0 ? (
                    <div className="email-empty">
                      <Mail size={22} aria-hidden="true" />
                      <span>{emailStatus?.connected ? "No inbox messages synced yet." : "Connect Gmail to show your inbox here."}</span>
                    </div>
                  ) : (
                    <div className="email-message-list">
                      {emailMessages.slice(0, 8).map((message) => (
                        <article className={`email-message ${message.unread ? "unread" : ""}`} key={message.id}>
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
                            <button className="secondary-action email-full-button" type="button" onClick={() => void openEmailInBrowser(message)}>
                              Show full email
                              <ArrowRight size={16} aria-hidden="true" />
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
                      {sourcedOpenActionItems.map((item) => (
                        <label className="checklist-item" key={item.id}>
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
                      ))}
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
                      {visibleOpenActionItems.map((item) => (
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
                          </div>
                          <button className="action-delete" type="button" aria-label={`Delete ${item.title}`} onClick={() => deleteActionItem(item.id)}>
                            <Trash2 size={15} />
                          </button>
                        </article>
                      ))}
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

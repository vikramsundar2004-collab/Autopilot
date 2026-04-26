import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  Clock,
  Code2,
  Eye,
  EyeOff,
  Folder,
  FolderOpen,
  Globe2,
  KeyRound,
  ListChecks,
  LockKeyhole,
  Mail,
  MessageCircle,
  Palette,
  Plus,
  Printer,
  RotateCw,
  Search,
  Settings,
  ShieldCheck,
  Star,
  Trash2,
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

type AppView = "browser" | "productivity" | "settings";

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
  { key: "surface", label: "Sidebar surface" },
  { key: "surface2", label: "Raised surface" },
  { key: "primary", label: "Forest accent" },
  { key: "primaryHover", label: "Accent hover" },
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
  { label: "coding", color: "violet", icon: Code2, view: "browser" },
  { label: "productivity", color: "green", icon: Check, view: "productivity" },
  { label: "chatting", color: "orange", icon: MessageCircle, view: "browser" },
  { label: "design", color: "pink", icon: Palette, view: "browser" }
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
      <path className="needle-core-shadow" d="M32 22 45 64 32 56 19 64Z" />
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
  const webAreaRef = useRef<HTMLDivElement | null>(null);
  const sidebarWidthRef = useRef(sidebarWidth);

  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? null;
  const isBrowserPreview = autopilot.runtime === "browser-preview";
  const warnings = useMemo(() => getThemeWarnings(theme), [theme]);
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
    if (!activeTab || activeTab.isLoading || isHomeUrl(activeTab.url) || isHistoryPageUrl(activeTab.url)) {
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
  }, [activeTab?.isLoading, activeTab?.title, activeTab?.url]);

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
  }, [sendWebArea, tabs.length, activeTabId, sidebarOpen, sidebarWidth]);

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

  function addTab(): void {
    void autopilot.tabs.create();
    setView("browser");
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
                const isActive = item.view === "productivity" ? view === "productivity" : index === 0 && view === "browser";
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
            <strong>{view === "productivity" ? "Autopilot Productivity" : view === "settings" ? "Autopilot Settings" : "Autopilot Browser"}</strong>
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
          </form>
        )}

        <section className="workspace">
          <div className={`web-content-frame ${view !== "browser" ? "hidden" : ""}`} ref={webAreaRef}>
            <div className="web-content-placeholder">
              {isBrowserPreview ? (
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
                  </form>
                  <span className="workspace-status">
                    Currently in <b>Browser</b> workspace
                  </span>
                </section>
              ) : (
                <span className="loading-ring" aria-label="Loading page" />
              )}
            </div>
          </div>

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
                          <span className="email-message-icon" aria-hidden="true">
                            <Mail size={16} />
                          </span>
                          <div className="email-message-copy">
                            <strong>{message.subject}</strong>
                            <span>
                              {message.from}
                              {message.fromEmail ? ` - ${message.fromEmail}` : ""}
                            </span>
                            <p>{message.snippet}</p>
                          </div>
                          <time dateTime={new Date(message.receivedAt).toISOString()}>{formatCredentialDate(message.receivedAt)}</time>
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

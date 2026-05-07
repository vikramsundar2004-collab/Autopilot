import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Archive,
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
  GripVertical,
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
  SquarePen,
  Star,
  Terminal,
  Trash2,
  Wrench,
  X
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  type ClipboardEvent as ReactClipboardEvent,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
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
  readableTitle,
  shouldUseNativeBrowserView,
  type BrowserTheme,
  type Tab
} from "../shared/browserModel";
import {
  advanceCodingAgentPlan,
  type CodingAgentPlan,
  type CodingAccessMode,
  type CodingCommandRequest,
  type CodingCommandResult,
  type CodingDirectoryEntry,
  type CodingDownloadEntry,
  type CodingFileReadResult,
  type CodingGitChangedFile,
  type CodingGitStatusResult,
  type CodingPlugin,
  type CodingPluginStatus,
  type CodingProject,
  type CodingRepoOverview,
  type CodingResearchReportResult,
  type CodingSearchResult,
  type CodingSnapshot,
  type CodingTerminalInputResult,
  type CodingTerminalOpenResult,
  type CodingTreeNode
} from "../shared/coding";
import { CODING_PLUGIN_CATALOG } from "../shared/codingPlugins";
import type { EmailActionSuggestion, EmailConnectionStatus, EmailMessageSummary } from "../shared/email";
import type { PasswordAvailability, PasswordCredentialSummary, PendingPasswordSave } from "../shared/passwords";
import type { AssistantContextSource, AssistantContextSourceId, AssistantResponse } from "../shared/assistant";
import type { ActionPlan, ActionStep, AgentRun } from "../shared/agent";
import {
  buildDesignSourceContext,
  buildGeneratedArtifactReview,
  createDesignProjectFromArtifact,
  getActiveArtifactVersion,
  isAiDesignProject,
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
import type { CalendarRecurrence, LocalCalendarEvent } from "../shared/localCalendar";
import type { ProductivityDraft, ProductivitySourceSyncResult, ProductivityTask, ProductivityTaskState, ProductivityTaskSyncResult } from "../shared/productivity";
import { detectAutomationIntent, type AutomationCreateRecipeInput, type AutomationRecipe, type AutomationRun, type AutomationSourceKind, type AutomationSourceWorkspace } from "../shared/automation";
import {
  getRouteReviewReason,
  getWorkItemOwnership,
  getWorkItemPermissionLevel,
  getWorkItemSourceSummary,
  needsRouteReview,
  type WorkAssignment,
  type WorkItem,
  type WorkspaceRole
} from "../shared/workItems";
import { buildTodaysCallPlan, type TodaysCallMove } from "../shared/todaysCall";
import { buildProactiveWorkPlan, type ProactiveWorkItem } from "../shared/proactiveWork";
import { buildOnboardingSummary, type OnboardingPrimaryAction } from "../shared/onboarding";
import { getAutopilotApi } from "./autopilotApi";
import {
  CALENDAR_HOUR_HEIGHT,
  CALENDAR_WEEK_END_HOUR,
  CALENDAR_WEEK_START_HOUR,
  addCalendarDays,
  formatCalendarDateInput,
  formatCalendarTime,
  formatCalendarMonthLabel,
  formatCalendarTimeInput,
  formatCalendarWeekRange,
  getCalendarEventColor,
  getCalendarWeekDays,
  getCalendarWeekEvents,
  getMiniCalendarDays,
  getStartOfDay,
  isSameCalendarDay,
  loadLocalCalendarEvents,
  parseCalendarDateTime,
  saveLocalCalendarEvents,
  type CalendarEditorState,
  type CalendarEventForm,
  type CalendarWeekEvent
} from "./calendarUtils";
import { buildCodingDiff, parseUnifiedGitDiff, type CodingDiffResult } from "./codingDiff";
import { AutopilotNeedle } from "./components/AutopilotNeedle";
import { BookmarkTree } from "./components/BookmarkTree";
import { CodingTree } from "./components/CodingTree";
import { WorkAssignmentCard } from "./components/WorkAssignmentCard";
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
import { THEME_PRESETS, applyTheme, getThemeWarnings, loadTheme, resetTheme, saveTheme } from "./theme";

type AppView = "browser" | "coding" | "productivity" | "design" | "settings";
type DesignToolSection = "projects" | "pages" | "components" | "assets" | "styles" | "plugins" | "team" | "settings";
type DesignProjectTab = "mine" | "ai";

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
const DEFAULT_GLOBAL_RAIL_WIDTH = 52;
const MIN_GLOBAL_RAIL_WIDTH = 52;
const MAX_GLOBAL_RAIL_WIDTH = 230;
const GLOBAL_RAIL_LABEL_WIDTH = 126;
const SIDEBAR_WIDTH_STORAGE_KEY = "autopilot:sidebar-width";
const CODING_SIDEBAR_WIDTH_STORAGE_KEY = "autopilot:coding-sidebar-width";
const GLOBAL_RAIL_OPEN_STORAGE_KEY = "autopilot:global-rail-open";
const GLOBAL_RAIL_WIDTH_STORAGE_KEY = "autopilot:global-rail-width";
const GLOBAL_RAIL_EXPANDED_STORAGE_KEY = "autopilot:global-rail-expanded";
const CODING_ACTIVITY_RAIL_EXPANDED_STORAGE_KEY = "autopilot:coding-activity-rail-expanded";
const CODING_EXPLORER_OPEN_STORAGE_KEY = "autopilot:coding-explorer-open";
const CODING_CHATS_STORAGE_KEY = "autopilot:coding-chats";
const CODING_ARCHIVED_CHAT_IDS_STORAGE_KEY = "autopilot:coding-archived-chat-ids";
const CODING_PROJECT_ORDER_STORAGE_KEY = "autopilot:coding-project-order";
const CONFIRMED_ROUTE_WORK_ITEMS_STORAGE_KEY = "autopilot:confirmed-route-work-items";
const AUTO_WORK_ALL_STORAGE_KEY = "autopilot:auto-work-all-actions";
const MAX_CODING_CHATS = 120;

const DESIGN_TOOL_SECTIONS: Array<{ id: DesignToolSection; label: string; icon: LucideIcon }> = [
  { id: "projects", label: "Projects", icon: FolderOpen },
  { id: "pages", label: "Pages", icon: FileText },
  { id: "components", label: "Components", icon: Package },
  { id: "assets", label: "Assets", icon: ImageIcon },
  { id: "styles", label: "Styles", icon: Palette },
  { id: "plugins", label: "Plugins", icon: Wrench },
  { id: "team", label: "Team", icon: MessageCircle },
  { id: "settings", label: "Settings", icon: Settings }
];

const DESIGN_CANVAS_WIDTHS = [960, 1200, 1440, 1728];
const DESIGN_CANVAS_ZOOMS = [50, 75, 100, 125];

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

type CodingRightPanel = "assistant" | "summary" | "access" | "code" | "terminal" | "downloads" | "plugins";

type OpenCodingTerminalOptions = {
  launchShell?: boolean;
  forceLaunch?: boolean;
};

type SlidePreviewVariant = "title-only" | "title-bullets" | "content-blocks";

type CodingOpenedFile = Extract<CodingFileReadResult, { success: true }>;

type CodingChatMessage = {
  id: string;
  role: "user" | "agent";
  content: string;
  createdAt: number;
};

type CodingResearchChatMessage = {
  id: string;
  role: "user" | "agent";
  content: string;
  createdAt: number;
  status?: "working" | "error";
  result?: CodingResearchReportResult;
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

type CodingPluginBrowserTab = "plugins" | "skills";

type CodingAutomationSetupState = {
  title: string;
  prompt: string;
  schedule: NonNullable<AutomationCreateRecipeInput["schedule"]>;
  outputKind: NonNullable<AutomationCreateRecipeInput["outputKind"]>;
  sources: AutomationSourceKind[];
  qualityBar: number;
  requiresApproval: boolean;
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
    title: "Workbench"
  }
];

const codingPluginCatalog: CodingPlugin[] = CODING_PLUGIN_CATALOG;

const codingSkillTemplates = [
  {
    id: "plugin-builder",
    name: "Plugin builder",
    category: "Creation",
    description: "Scaffold a new Autopilot plugin with install, test, and review steps.",
    prompt: "Build a new Autopilot plugin for this project. Start by asking what capability it should add, then scaffold it safely."
  },
  {
    id: "skill-builder",
    name: "Skill builder",
    category: "Creation",
    description: "Create a reusable coding skill that can be used across projects.",
    prompt: "Create a reusable Autopilot coding skill for this project. Include workflow, safety rules, and test steps."
  },
  {
    id: "repo-review",
    name: "Repo review",
    category: "Quality",
    description: "Inspect architecture, changed files, tests, and risks before approval.",
    prompt: "Review this project like a senior engineer. Explain architecture, changed files, risks, missing tests, and next fixes."
  },
  {
    id: "automation-recipe",
    name: "Automation recipe",
    category: "Automation",
    description: "Turn a repeatable coding or research request into a scheduled automation.",
    prompt: "Turn this into an automation recipe with schedule, sources, output type, quality bar, and approval rules."
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
  { id: "gmail", label: "Gmail", detail: "Inbox, drafts, and action items", source: "Email", icon: Mail, status: "ready" },
  { id: "outlook", label: "Outlook", detail: "Rank Microsoft mail when connected", source: "Email", icon: Mail, status: "soon" },
  { id: "google-calendar", label: "Google Calendar", detail: "Pull meetings and deadlines into Today", source: "Calendar", icon: Clock, status: "ready" },
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

function getDraftStatusLabel(status: ProductivityDraft["status"]): string {
  switch (status) {
    case "draft":
      return "Draft";
    case "needs_review":
      return "Review";
    case "approved":
      return "Approved";
  }
}

function getActionStepStateLabel(state: ActionStep["state"]): string {
  switch (state) {
    case "pending":
      return "Pending";
    case "running":
      return "Running";
    case "needs_user":
      return "Needs you";
    case "completed":
      return "Done";
    case "blocked":
      return "Blocked";
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

type ActionItemHandler = "ai" | "user";

function getActionItemHandler(item: ActionItem): ActionItemHandler {
  if (item.source === "Calendar") {
    return "user";
  }

  const text = `${item.title} ${item.context}`.toLowerCase();

  // Verbs that require a human: decisions, attendance, sensitive replies.
  if (/\b(approve|decide|sign|vote|attend|meet with|interview|present|negotiate|introduce|confirm)\b/u.test(text)) {
    return "user";
  }

  // Verbs Autopilot can credibly prepare a draft or first pass for.
  if (/\b(draft|summarize|outline|research|compile|generate|write up|prepare|plan|read|review)\b/u.test(text)) {
    return "ai";
  }

  // Source-based fallback: AI can prep emails, web research, and notes.
  // Calendar attendance and chat replies stay with the user.
  switch (item.source) {
    case "Email":
    case "Web":
    case "Notes":
      return "ai";
    case "Chat":
      return "user";
    default:
      return "user";
  }
}

function getActionHandlerLabel(handler: ActionItemHandler): string {
  return handler === "ai" ? "Needs doing" : "User must handle";
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

function clampGlobalRailWidth(width: number): number {
  return Math.min(MAX_GLOBAL_RAIL_WIDTH, Math.max(MIN_GLOBAL_RAIL_WIDTH, Math.round(width)));
}

function loadGlobalRailOpen(): boolean {
  if (typeof window === "undefined") {
    return true;
  }

  try {
    return window.localStorage.getItem(GLOBAL_RAIL_OPEN_STORAGE_KEY) !== "false";
  } catch {
    return true;
  }
}

function loadGlobalRailWidth(): number {
  if (typeof window === "undefined") {
    return DEFAULT_GLOBAL_RAIL_WIDTH;
  }

  try {
    const storedWidth = Number.parseInt(window.localStorage.getItem(GLOBAL_RAIL_WIDTH_STORAGE_KEY) ?? "", 10);
    return Number.isFinite(storedWidth) ? clampGlobalRailWidth(storedWidth) : DEFAULT_GLOBAL_RAIL_WIDTH;
  } catch {
    return DEFAULT_GLOBAL_RAIL_WIDTH;
  }
}

function loadGlobalRailExpanded(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(GLOBAL_RAIL_EXPANDED_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function loadCodingActivityRailExpanded(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(CODING_ACTIVITY_RAIL_EXPANDED_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function loadCodingExplorerOpen(): boolean {
  if (typeof window === "undefined") {
    return true;
  }

  try {
    return window.localStorage.getItem(CODING_EXPLORER_OPEN_STORAGE_KEY) !== "false";
  } catch {
    return true;
  }
}

function loadStringArrayFromStorage(key: string): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function saveStringArrayToStorage(key: string, values: string[]): void {
  try {
    window.localStorage.setItem(key, JSON.stringify([...new Set(values)].slice(0, 240)));
  } catch {
    // Local coding preferences should not block the coding workspace.
  }
}

function getFolderCreationParent(target: BookmarkNodeTarget | null): BookmarkNodeTarget | null {
  return target?.kind === "folder" && target.source === "Autopilot" ? target : null;
}

function getCodingFileIcon(name: string): LucideIcon {
  const lowerName = name.toLowerCase();
  if (/\.(png|jpe?g|gif|webp|avif|apng)$/.test(lowerName)) {
    return ImageIcon;
  }

  return FileText;
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

function getInboxSenderLabel(message: EmailMessageSummary): string {
  const rawSender = (message.from || message.fromEmail || "Unknown sender").trim();
  const withoutQuotes = rawSender.replace(/^"+|"+$/gu, "");
  const withoutEmail = withoutQuotes.replace(/\s*<[^>]+>\s*$/u, "").trim();
  return withoutEmail || message.fromEmail || "Unknown sender";
}

function getInboxSenderInitials(message: EmailMessageSummary): string {
  const sender = getInboxSenderLabel(message)
    .replace(/[^a-z0-9\s]/giu, " ")
    .trim();
  const words = sender.split(/\s+/u).filter(Boolean);
  if (words.length === 0) {
    return "M";
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

function formatInboxReceivedAt(value: number): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const today = new Date();
  const isToday = date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate();
  if (isToday) {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit"
    }).format(date);
  }

  const options: Intl.DateTimeFormatOptions =
    date.getFullYear() === today.getFullYear()
      ? { month: "short", day: "numeric" }
      : { month: "short", day: "numeric", year: "numeric" };
  return new Intl.DateTimeFormat(undefined, options).format(date);
}

function getInboxNeededSummary(message: EmailMessageSummary, tasks: ProductivityTask[], draft: ProductivityDraft | undefined): string {
  const activeTask = tasks.find((task) => task.state !== "done");
  if (activeTask) {
    return `Needs: ${activeTask.title}`;
  }

  if (draft) {
    return `Needs: review Autopilot's draft before sending or exporting.`;
  }

  const text = `${message.subject} ${message.snippet} ${message.actionText ?? ""}`.toLowerCase();
  if (/\b(failed|failure|error|blocked|security alert|password reset)\b/u.test(text)) {
    return "Needs: review the alert and decide whether Autopilot should prepare a fix.";
  }

  if (/\b(reply|respond|follow up|follow-up|please|can you|could you|\?)\b/u.test(text)) {
    return "Needs: decide whether to reply, delegate, or let Autopilot draft the response.";
  }

  if (/\b(slide|deck|presentation|document|report|proposal|resume|website|design)\b/u.test(text)) {
    return "Needs: turn this request into a draft artifact for review.";
  }

  if (message.unread) {
    return "Needs: read and triage this unread email.";
  }

  return "Needs: no action extracted yet. Open the email to review the full thread.";
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

function getLocalPathName(value: string): string {
  const parts = value.split(/[\\/]+/).filter(Boolean);
  return parts[parts.length - 1] ?? value;
}

function getLocalParentPath(value: string): string | null {
  const normalized = value.replace(/[\\/]+$/g, "");
  const slashIndex = Math.max(normalized.lastIndexOf("\\"), normalized.lastIndexOf("/"));
  return slashIndex > 0 ? normalized.slice(0, slashIndex) : null;
}

function isAbsoluteLocalPath(value: string): boolean {
  return /^[a-z]:[\\/]/iu.test(value) || value.startsWith("\\\\") || value.startsWith("/");
}

function joinLocalPath(rootPath: string, childPath: string): string {
  if (isAbsoluteLocalPath(childPath)) {
    return childPath;
  }

  const cleanChildPath = childPath.replace(/^[\\/]+/u, "").replace(/[\\/]+/g, "\\");
  return `${rootPath.replace(/[\\/]+$/u, "")}\\${cleanChildPath}`;
}

function normalizeCodingRelativePath(value: string): string {
  return value.replace(/\\/g, "/").replace(/^\.\//u, "").toLowerCase();
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

function getPluginStatusMessage(plugin: CodingPlugin, status: CodingPluginStatus | undefined, now = Date.now()): string {
  if (!status) {
    return `${plugin.name}: checking install status.`;
  }

  if (status.status === "installed") {
    return status.reason && status.reason !== "Installed successfully." ? `${plugin.name}: ${status.reason}` : `${plugin.name} is installed.`;
  }

  if (status.status === "installing") {
    return `${plugin.name} is installing. ${getPluginInstallRemaining(status, now) || "Time remaining will update shortly."}`;
  }

  return status.reason ?? `${plugin.name}: ${getPluginStatusLabel(status)}`;
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

function createCodingResearchMessage(
  role: CodingResearchChatMessage["role"],
  content: string,
  extra: Partial<Pick<CodingResearchChatMessage, "result" | "status">> = {}
): CodingResearchChatMessage {
  return {
    id: `research:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
    createdAt: Date.now(),
    ...extra
  };
}

function getAutomationRunTitle(run: AutomationRun): string {
  return (run.outputTitle || run.recipeName || "Automation run").replace(/\s+/g, " ").trim();
}

function getAutomationRunStatusLabel(run: AutomationRun): string {
  if (run.state === "completed") {
    return typeof run.qualityScore === "number" ? `Completed - ${run.qualityScore}/100` : "Completed";
  }

  if (run.state === "needs_review") {
    return "Needs review";
  }

  if (run.state === "failed") {
    return "Failed";
  }

  return "Running";
}

function getAutomationScheduleLabel(recipe: AutomationRecipe | null): string {
  if (!recipe) {
    return "Manual";
  }

  return recipe.schedule === "daily" ? "Daily" : recipe.schedule === "weekly" ? "Weekly" : "Manual";
}

function getAutomationOutputLabel(recipe: AutomationRecipe | null, run: AutomationRun | null): string {
  const kind = recipe?.outputKind ?? (run?.outputMarkdown ? "document" : "brief");
  return kind.replace("_", " ");
}

function getAutomationRunDetailText(run: AutomationRun | null): string {
  if (!run) {
    return "Choose an automation from the sidebar to see what Autopilot produced, what it checked, and where the result was saved.";
  }

  const lines = [
    run.outputSummary || run.failureReason || "Autopilot saved this automation run.",
    "",
    run.outputMarkdown ? run.outputMarkdown.trim() : "",
    "",
    run.steps.length > 0 ? "Steps taken:" : "",
    ...run.steps.map((step, index) => `${index + 1}. ${step}`),
    "",
    run.qualityChecks.length > 0 ? "Quality checks:" : "",
    ...run.qualityChecks.map((check) => `- ${check}`),
    "",
    run.sources.length > 0 ? "References used:" : "",
    ...run.sources.map((source, index) => {
      const url = source.url ? ` (${source.url})` : "";
      const snippet = source.snippet ? ` - ${source.snippet}` : "";
      return `${index + 1}. ${source.title}${url}${snippet}`;
    })
  ];

  return lines.filter((line, index, allLines) => line || (allLines[index - 1] && allLines[index + 1])).join("\n").trim();
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

function getAutomationSourcesForWorkspace(goal: string, sourceWorkspace: AutomationSourceWorkspace): AutomationSourceKind[] {
  const text = goal.toLowerCase();
  const sources = new Set<AutomationSourceKind>();
  if (sourceWorkspace === "coding") {
    sources.add("coding");
  }
  if (sourceWorkspace === "productivity" || /\b(gmail|email|inbox|reply|calendar|meeting|deadline)\b/u.test(text)) {
    sources.add("gmail");
    sources.add("calendar");
  }
  if (/\b(slack|channel|message)\b/u.test(text)) {
    sources.add("slack");
  }
  sources.add("web");
  return [...sources];
}

function getAutomationWorkspaceLabel(sourceWorkspace: AutomationSourceWorkspace): string {
  switch (sourceWorkspace) {
    case "browser":
      return "Browser";
    case "productivity":
      return "Productivity";
    case "design":
      return "Design";
    case "coding":
      return "Coding";
    case "automation":
      return "Automation";
  }
}

function getAutomationOutputKindFromGoal(goal: string): NonNullable<AutomationCreateRecipeInput["outputKind"]> {
  const text = goal.toLowerCase();
  if (/\b(draft|reply|email|response)\b/u.test(text)) {
    return "draft";
  }
  if (/\b(document|doc|memo|proposal|report|writeup|write up)\b/u.test(text)) {
    return "document";
  }
  if (/\b(research|industry|competitor|market|brief|trend|sources|latest)\b/u.test(text)) {
    return "research_report";
  }
  return "brief";
}

function getAutomationArtifactKindFromGoal(goal: string): ArtifactKind {
  const text = goal.toLowerCase();
  if (/\b(slide|slides|deck|presentation)\b/u.test(text)) {
    return "slide_deck";
  }
  if (/\b(website|landing page|homepage|mockup|design)\b/u.test(text)) {
    return "website_design";
  }
  return "document";
}

function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select" || target.isContentEditable;
}

function shouldAutoReadCurrentTab(prompt: string): boolean {
  return /\b(this page|this tab|current page|current tab|summari[sz]e this|what does this say|read this|explain this page)\b/iu.test(prompt);
}

function getAssistantSourcesForPrompt(
  prompt: string,
  selectedSources: AssistantContextSourceId[]
): AssistantContextSourceId[] {
  if (!shouldAutoReadCurrentTab(prompt) || selectedSources.includes("current-tab")) {
    return selectedSources;
  }

  return ["current-tab", ...selectedSources];
}

function getWorkItemRouteSummary(item: WorkItem): string {
  const roles = item.assignedRoles.map(getWorkspaceRoleDisplayLabel).join(" + ");
  return `Routed to ${roles} (${item.routeConfidence}%): ${item.routeReason}`;
}

function getWorkspaceRoleDisplayLabel(role: WorkspaceRole): string {
  switch (role) {
    case "automation":
      return "Automation";
    case "coding":
      return "Coding";
    case "design":
      return "Design";
    case "productivity":
      return "Productivity";
  }
}

function getSlidePreviewVariant(slide: SlideArtifactSlide): SlidePreviewVariant {
  if (slide.bullets.length <= 1) {
    return "title-only";
  }

  if (slide.bullets.length > 5 || slide.title.length > 54) {
    return "content-blocks";
  }

  return "title-bullets";
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
  return `Agent ready in ${projectName}: I can turn "${message}" into a plan, inspect files, run approved commands, show changed-file diffs, and keep commit/push behind your approval.`;
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
  const [expandedEmailIds, setExpandedEmailIds] = useState<string[]>([]);
  const [ignoredEmailIds, setIgnoredEmailIds] = useState<string[]>([]);
  const [selectedInboxEmailId, setSelectedInboxEmailId] = useState<string | null>(null);
  const [productivityShortcutHelpOpen, setProductivityShortcutHelpOpen] = useState(false);
  const [emailSyncStatus, setEmailSyncStatus] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [lastProductivitySourceResults, setLastProductivitySourceResults] = useState<ProductivitySourceSyncResult[]>([]);
  const [productivityTasks, setProductivityTasks] = useState<ProductivityTask[]>([]);
  const [productivityDrafts, setProductivityDrafts] = useState<ProductivityDraft[]>([]);
  const [productivityDraftsLoaded, setProductivityDraftsLoaded] = useState(false);
  const [autoDraftStatus, setAutoDraftStatus] = useState("");
  const [selectedProductivitySources, setSelectedProductivitySources] = useState<ProductivitySourceId[]>(() => loadProductivitySources());
  const [productivitySourcesOpen, setProductivitySourcesOpen] = useState(false);
  const [selectedActionSource, setSelectedActionSource] = useState<ActionItemSource | "All">("All");
  const [selectedChecklistActionId, setSelectedChecklistActionId] = useState<string | null>(null);
  const [calendarReferenceDate, setCalendarReferenceDate] = useState(() => getStartOfDay(new Date()));
  const [localCalendarEvents, setLocalCalendarEvents] = useState<LocalCalendarEvent[]>(() => loadLocalCalendarEvents());
  const [calendarEditorState, setCalendarEditorState] = useState<CalendarEditorState | null>(null);
  const [calendarEventForm, setCalendarEventForm] = useState<CalendarEventForm>(() => {
    const startAt = new Date();
    startAt.setMinutes(0, 0, 0);
    startAt.setHours(Math.min(CALENDAR_WEEK_END_HOUR - 1, Math.max(CALENDAR_WEEK_START_HOUR, startAt.getHours() + 1)));
    const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);
    return {
      title: "",
      notes: "",
      date: formatCalendarDateInput(startAt.getTime()),
      startTime: formatCalendarTimeInput(startAt.getTime()),
      endTime: formatCalendarTimeInput(endAt.getTime()),
      recurrence: "none"
    };
  });
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [addressDraft, setAddressDraft] = useState("");
  const [view, setView] = useState<AppView>("browser");
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [workspaceState, setWorkspaceState] = useState<WorkspaceState>({
    activeWorkspaceId: "browsing",
    profiles: structuredClone(DEFAULT_WORKSPACE_PROFILES)
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(() => loadSidebarWidth());
  const [isSidebarResizing, setIsSidebarResizing] = useState(false);
  const [codingSidebarWidth, setCodingSidebarWidth] = useState(() => loadCodingSidebarWidth());
  const [isCodingSidebarResizing, setIsCodingSidebarResizing] = useState(false);
  const [globalRailOpen, setGlobalRailOpen] = useState(() => loadGlobalRailOpen());
  const [globalRailWidth, setGlobalRailWidth] = useState(() => loadGlobalRailWidth());
  const [isGlobalRailResizing, setIsGlobalRailResizing] = useState(false);
  const [globalRailExpanded, setGlobalRailExpanded] = useState(() => loadGlobalRailExpanded());
  const [codingActivityRailExpanded, setCodingActivityRailExpanded] = useState(() => loadCodingActivityRailExpanded());
  const [codingExplorerOpen, setCodingExplorerOpen] = useState(() => loadCodingExplorerOpen());
  const [iconPreviewOpen, setIconPreviewOpen] = useState(false);
  const [codingSnapshot, setCodingSnapshot] = useState<CodingSnapshot>(defaultCodingSnapshot);
  const [codingTabs, setCodingTabs] = useState<CodingWorkbenchTab[]>(initialCodingTabs);
  const [activeCodingTabId, setActiveCodingTabId] = useState(CODING_CHAT_TAB_ID);
  const [codingChats, setCodingChats] = useState<CodingChatThread[]>(() => loadCodingChats());
  const [activeCodingAssistantChatId, setActiveCodingAssistantChatId] = useState<string | null>(null);
  const [archivedCodingChatIds, setArchivedCodingChatIds] = useState<string[]>(() => loadStringArrayFromStorage(CODING_ARCHIVED_CHAT_IDS_STORAGE_KEY));
  const [codingProjectOrder, setCodingProjectOrder] = useState<string[]>(() => loadStringArrayFromStorage(CODING_PROJECT_ORDER_STORAGE_KEY));
  const [confirmedRouteWorkItemIds, setConfirmedRouteWorkItemIds] = useState<string[]>(() => loadStringArrayFromStorage(CONFIRMED_ROUTE_WORK_ITEMS_STORAGE_KEY));
  const [draggingCodingProjectRoot, setDraggingCodingProjectRoot] = useState<string | null>(null);
  const [openCodingFolders, setOpenCodingFolders] = useState<Record<string, boolean>>({});
  const [collapsedCodingProjects, setCollapsedCodingProjects] = useState<Record<string, boolean>>({});
  const [codingSection, setCodingSection] = useState<CodingSection>("files");
  const [codingStatus, setCodingStatus] = useState("Open a folder or create a project to start editing local files.");
  const [codingBusy, setCodingBusy] = useState(false);
  const [codingDraftMessage, setCodingDraftMessage] = useState("");
  const [codingPluginBrowserTab, setCodingPluginBrowserTab] = useState<CodingPluginBrowserTab>("plugins");
  const [codingPluginSearch, setCodingPluginSearch] = useState("");
  const [codingPluginCategory, setCodingPluginCategory] = useState("All");
  const [codingPluginStatuses, setCodingPluginStatuses] = useState<CodingPluginStatus[]>([]);
  const [codingPluginBusyIds, setCodingPluginBusyIds] = useState<Record<string, boolean>>({});
  const [codingDownloads, setCodingDownloads] = useState<CodingDownloadEntry[]>([]);
  const [browserDownloadsOpen, setBrowserDownloadsOpen] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState("");
  const [codingRightSidebarOpen, setCodingRightSidebarOpen] = useState(true);
  const [codingRightPanel, setCodingRightPanel] = useState<CodingRightPanel>("assistant");
  const [codingToolMenuOpen, setCodingToolMenuOpen] = useState(false);
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
  const [designToolSection, setDesignToolSection] = useState<DesignToolSection>("projects");
  const [designProjectTab, setDesignProjectTab] = useState<DesignProjectTab>("ai");
  const [designProjectDrawerOpen, setDesignProjectDrawerOpen] = useState(false);
  const [designAiPanelOpen, setDesignAiPanelOpen] = useState(true);
  const [designAssistantCollapsed, setDesignAssistantCollapsed] = useState(false);
  const [designCanvasWidth, setDesignCanvasWidth] = useState(1440);
  const [designCanvasZoom, setDesignCanvasZoom] = useState(75);
  const [designPreviewMode, setDesignPreviewMode] = useState(true);
  const [designGuidesVisible, setDesignGuidesVisible] = useState(true);
  const [designPreviewVersionIndex, setDesignPreviewVersionIndex] = useState<number | null>(null);
  const [exportToCodingStatus, setExportToCodingStatus] = useState("");
  const [agentRuns, setAgentRuns] = useState<AgentRun[]>([]);
  const [actionPlans, setActionPlans] = useState<ActionPlan[]>([]);
  const [lastActionPlan, setLastActionPlan] = useState<ActionPlan | null>(null);
  const [artifactExportResult, setArtifactExportResult] = useState<ArtifactExportResult | null>(null);
  const [buildingWorkMessageIds, setBuildingWorkMessageIds] = useState<string[]>([]);
  const [backgroundWorkStatus, setBackgroundWorkStatus] = useState("");
  const [autoWorkAllEnabled, setAutoWorkAllEnabled] = useState(loadAutoWorkAllEnabled);
  const [proactiveWorkBusy, setProactiveWorkBusy] = useState(false);
  const [proactiveWorkStatus, setProactiveWorkStatus] = useState("");
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [workAssignments, setWorkAssignments] = useState<WorkAssignment[]>([]);
  const [selectedWorkItemId, setSelectedWorkItemId] = useState<string | null>(null);
  const [routingWorkItemIds, setRoutingWorkItemIds] = useState<Record<string, boolean>>({});
  const [automationRecipes, setAutomationRecipes] = useState<AutomationRecipe[]>([]);
  const [automationRuns, setAutomationRuns] = useState<AutomationRun[]>([]);
  const [automationDraft, setAutomationDraft] = useState("Create a daily brief about the latest AI browser productivity trends.");
  const [automationSetup, setAutomationSetup] = useState<CodingAutomationSetupState>({
    title: "",
    prompt: "Monitor the latest AI coding tools every week and make a concise report with sources, useful changes, and next steps.",
    schedule: "weekly",
    outputKind: "research_report",
    sources: ["coding", "web"],
    qualityBar: 86,
    requiresApproval: true
  });
  const [automationBusy, setAutomationBusy] = useState(false);
  const [automationStatus, setAutomationStatus] = useState("");
  const [selectedAutomationRunId, setSelectedAutomationRunId] = useState<string | null>(null);
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
  const [codingTerminalOpening, setCodingTerminalOpening] = useState(false);
  const [codingTerminalLaunch, setCodingTerminalLaunch] = useState<CodingTerminalOpenResult | null>(null);
  const [codingTerminalOutput, setCodingTerminalOutput] = useState("");
  const [codingRepoOverview, setCodingRepoOverview] = useState<CodingRepoOverview | null>(null);
  const [codingAgentPlan, setCodingAgentPlan] = useState<CodingAgentPlan | null>(null);
  const [codingGitStatus, setCodingGitStatus] = useState<CodingGitStatusResult | null>(null);
  const [codingGitDiff, setCodingGitDiff] = useState<string | null>(null);
  const [selectedCodingGitDiffPath, setSelectedCodingGitDiffPath] = useState<string | null>(null);
  const [codingRepoLoading, setCodingRepoLoading] = useState(false);
  const [codingResearchDraft, setCodingResearchDraft] = useState("What is the latest in AI coding tools?");
  const [codingResearchMessages, setCodingResearchMessages] = useState<CodingResearchChatMessage[]>([]);
  const webAreaRef = useRef<HTMLDivElement | null>(null);
  const sidebarWidthRef = useRef(sidebarWidth);
  const codingSidebarWidthRef = useRef(codingSidebarWidth);
  const globalRailWidthRef = useRef(globalRailWidth);
  const codingTerminalOutputRef = useRef<HTMLTextAreaElement | null>(null);
  const productivityDraftsRef = useRef<ProductivityDraft[]>([]);
  const autoDraftingMessageIdsRef = useRef<Set<string>>(new Set());
  const autoDraftAttemptedMessageIdsRef = useRef<Set<string>>(new Set());

  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? null;
  const activeNavigationError = activeTab?.navigationError ?? null;
  const activeNavigationErrorKey = activeNavigationError ? `${activeNavigationError.code}:${activeNavigationError.url}` : "";
  const isBrowserPreview = autopilot.runtime === "browser-preview";
  const browserShowsHome = !activeTab || !shouldUseNativeBrowserView(activeTab.url);
  const browserPreviewShowsExternalPage = isBrowserPreview && activeTab !== null && !isHomeUrl(activeTab.url);
  const browserPreviewTitle = activeTab ? readableTitle(activeTab.title, activeTab.url) : "Autopilot Browser";
  const browserPreviewUrl = activeTab?.url ?? "";
  const browserPreviewCanOpenUrl = /^https?:\/\//i.test(browserPreviewUrl);
  const warnings = useMemo(() => getThemeWarnings(theme), [theme]);
  const workspaceProfiles = workspaceState.profiles.length > 0 ? workspaceState.profiles : DEFAULT_WORKSPACE_PROFILES;
  const activeWorkspaceId = workspaceState.activeWorkspaceId;
  const activeCodingTab = codingTabs.find((tab) => tab.id === activeCodingTabId) ?? codingTabs[0] ?? initialCodingTabs[0];
  const sortedAutomationRuns = useMemo(
    () => [...automationRuns].sort((leftRun, rightRun) => rightRun.startedAt - leftRun.startedAt),
    [automationRuns]
  );
  const runningAutomationRuns = useMemo(() => sortedAutomationRuns.filter((run) => run.state === "running"), [sortedAutomationRuns]);
  const activeAutomationRun = sortedAutomationRuns.find((run) => run.id === selectedAutomationRunId) ?? sortedAutomationRuns[0] ?? null;
  const activeAutomationRecipe = activeAutomationRun ? automationRecipes.find((recipe) => recipe.id === activeAutomationRun.recipeId) ?? null : null;
  const activeAutomationDetailText = useMemo(() => getAutomationRunDetailText(activeAutomationRun), [activeAutomationRun]);
  const activeCodingProject = codingSnapshot.activeProject;
  const activeCodingPath = activeCodingTab?.path ?? null;
  const activeCodingChat = activeCodingTab.kind === "chat" ? codingChats.find((chat) => chat.id === activeCodingTab.chatId) ?? null : null;
  const activeCodingTabProjectRoot = activeCodingTab.projectRootPath ?? activeCodingChat?.projectRootPath ?? activeCodingProject?.rootPath ?? null;
  const activeCodingTabProject = activeCodingTabProjectRoot
    ? codingSnapshot.projects.find((project) => project.rootPath === activeCodingTabProjectRoot) ?? activeCodingProject
    : null;
  const archivedCodingChatIdSet = useMemo(() => new Set(archivedCodingChatIds), [archivedCodingChatIds]);
  const visibleCodingChats = useMemo(
    () => codingChats.filter((chat) => !archivedCodingChatIdSet.has(chat.id)),
    [archivedCodingChatIdSet, codingChats]
  );
  const orderedCodingProjects = useMemo(() => {
    const orderIndex = new Map(codingProjectOrder.map((rootPath, index) => [rootPath, index]));
    return [...codingSnapshot.projects].sort((leftProject, rightProject) => {
      const leftIndex = orderIndex.get(leftProject.rootPath) ?? Number.MAX_SAFE_INTEGER;
      const rightIndex = orderIndex.get(rightProject.rootPath) ?? Number.MAX_SAFE_INTEGER;
      return leftIndex - rightIndex || rightProject.openedAt - leftProject.openedAt;
    });
  }, [codingProjectOrder, codingSnapshot.projects]);
  const codingChatsByProject = useMemo(() => {
    const chatsByProject = new Map<string, CodingChatThread[]>();
    for (const chat of visibleCodingChats) {
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
  }, [visibleCodingChats]);
  const activeProjectChats = useMemo(
    () => (activeCodingProject ? codingChatsByProject.get(activeCodingProject.rootPath) ?? [] : []),
    [activeCodingProject, codingChatsByProject]
  );
  const activeCodingAssistantChat = useMemo(() => {
    if (activeCodingAssistantChatId) {
      const selectedChat = visibleCodingChats.find((chat) => chat.id === activeCodingAssistantChatId);
      if (selectedChat) {
        return selectedChat;
      }
    }

    if (activeCodingChat) {
      return activeCodingChat;
    }

    if (activeProjectChats.length > 0) {
      return activeProjectChats[0];
    }

    return visibleCodingChats.find((chat) => !chat.projectRootPath) ?? visibleCodingChats[0] ?? null;
  }, [activeCodingAssistantChatId, activeCodingChat, activeProjectChats, visibleCodingChats]);
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
  const activeCodingPickerPath = activeCodingTab.kind === "picker" ? activeCodingTab.path ?? activeCodingProject?.rootPath ?? null : null;
  const activeCodingPickerLabel = activeCodingPickerPath
    ? activeCodingPickerPath === activeCodingProject?.rootPath
      ? activeCodingProject?.name ?? "Project root"
      : getLocalPathName(activeCodingPickerPath)
    : null;
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
  const codingGitChangedFiles = useMemo<CodingGitChangedFile[]>(
    () => (codingGitStatus?.success ? codingGitStatus.changedFiles : []),
    [codingGitStatus]
  );
  const selectedCodingGitChangedFile = useMemo(
    () =>
      selectedCodingGitDiffPath
        ? codingGitChangedFiles.find((file) => normalizeCodingRelativePath(file.path) === normalizeCodingRelativePath(selectedCodingGitDiffPath)) ?? null
        : null,
    [codingGitChangedFiles, selectedCodingGitDiffPath]
  );
  const selectedCodingGitDiff = useMemo(() => (codingGitDiff ? parseUnifiedGitDiff(codingGitDiff) : null), [codingGitDiff]);
  const activeCodingVisibleDiff =
    activeTextCodingDiff?.changed
      ? activeTextCodingDiff
      : selectedCodingGitDiffPath &&
          activeTextCodingTab &&
          selectedCodingGitDiff?.changed &&
          normalizeCodingRelativePath(activeTextCodingTab.file.relativePath) === normalizeCodingRelativePath(selectedCodingGitDiffPath)
        ? selectedCodingGitDiff
        : null;
  const codingReviewChangedCount = changedCodingFileTabs.length + codingGitChangedFiles.length;
  const codingReviewAddedCount = codingDiffSummary.added + (selectedCodingGitDiff?.added ?? 0);
  const codingReviewRemovedCount = codingDiffSummary.removed + (selectedCodingGitDiff?.removed ?? 0);
  const codingPlanVerificationCommands = useMemo(() => {
    if (codingAgentPlan?.suggestedCommands.length) {
      return codingAgentPlan.suggestedCommands;
    }

    if (!codingRepoOverview) {
      return [];
    }

    return codingRepoOverview.scripts
      .filter((script) => /check|test|build|lint|type/iu.test(script.name))
      .slice(0, 3)
      .map((script) => (codingRepoOverview.packageManager === "npm" ? `npm run ${script.name}` : `${codingRepoOverview.packageManager} ${script.name}`));
  }, [codingAgentPlan, codingRepoOverview]);
  const codingPluginStatusById = useMemo(
    () => new Map(codingPluginStatuses.map((status) => [status.id, status])),
    [codingPluginStatuses]
  );
  const codingPluginCategories = useMemo(
    () => ["All", ...Array.from(new Set(codingPluginCatalog.map((plugin) => plugin.category))).sort((left, right) => left.localeCompare(right))],
    []
  );
  const filteredCodingPlugins = useMemo(() => {
    const query = codingPluginSearch.trim().toLowerCase();
    return codingPluginCatalog.filter((plugin) => {
      const matchesCategory = codingPluginCategory === "All" || plugin.category === codingPluginCategory;
      const matchesQuery =
        !query ||
        `${plugin.name} ${plugin.category} ${plugin.description} ${plugin.command}`.toLowerCase().includes(query);
      return matchesCategory && matchesQuery;
    });
  }, [codingPluginCategory, codingPluginSearch]);
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
  const activeArtifactVersionIndex = useMemo(() => {
    if (!activeArtifact || !activeArtifactVersion) {
      return -1;
    }

    return activeArtifact.versions.findIndex((version) => version.id === activeArtifactVersion.id);
  }, [activeArtifact, activeArtifactVersion]);
  const designCanvasVersion =
    activeArtifact && designPreviewVersionIndex !== null
      ? activeArtifact.versions[designPreviewVersionIndex] ?? activeArtifactVersion
      : activeArtifactVersion;
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
  const activeDesignSourceContext = useMemo(
    () => (activeArtifact ? buildDesignSourceContext(activeArtifact) : null),
    [activeArtifact]
  );
  const activeGeneratedArtifactReview = useMemo(
    () => (activeArtifact ? buildGeneratedArtifactReview(activeArtifact) : null),
    [activeArtifact]
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
            Boolean(actionPlanByArtifactId.get(artifact.id)?.finalApproval.required && !actionPlanByArtifactId.get(artifact.id)?.finalApproval.approvedAt),
            actionPlanByArtifactId.has(artifact.id) || artifact.visibility !== "user_project"
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
    () => designProjects.filter((project) => project.visibility === "user_project").slice(0, 12),
    [designProjects]
  );
  const filteredVisibleDesignProjects = useMemo(() => {
    const query = designProjectFilter.trim().toLowerCase();
    const projects = designProjects.filter((project) => project.visibility === "user_project");
    if (!query) {
      return projects.slice(0, 10);
    }

    return projects
      .filter((project) =>
        [project.title, project.summary, project.sourceLabel, getArtifactKindLabel(project.kind)]
          .join(" ")
          .toLowerCase()
          .includes(query)
      )
      .slice(0, 10);
  }, [designProjectFilter, designProjects]);
  const moreDesignProjects = useMemo(
    () => designProjects.filter(isAiDesignProject),
    [designProjects]
  );
  const aiWorkingDesignProjects = useMemo(() => {
    const query = designProjectFilter.trim().toLowerCase();
    const seenArtifactIds = new Set<string>();
    return designProjects
      .filter(isAiDesignProject)
      .filter((project) =>
        query
          ? [project.title, project.summary, project.sourceLabel, getArtifactKindLabel(project.kind), project.visibility]
              .join(" ")
              .toLowerCase()
              .includes(query)
          : true
      )
      .filter((project) => {
        if (seenArtifactIds.has(project.artifactId)) {
          return false;
        }
        seenArtifactIds.add(project.artifactId);
        return true;
      });
  }, [designProjectFilter, designProjects]);
  const designBrowserProjects = designProjectTab === "mine" ? filteredVisibleDesignProjects : aiWorkingDesignProjects;
  const filteredMoreDesignProjects = useMemo(() => {
    const query = designProjectFilter.trim().toLowerCase();
    if (!query) {
      return moreDesignProjects;
    }

    return moreDesignProjects.filter((project) =>
      [project.title, project.summary, project.sourceLabel, getArtifactKindLabel(project.kind), project.visibility]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [designProjectFilter, moreDesignProjects]);
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
  const routableWorkItems = useMemo(
    () =>
      workItems.filter((item) => {
        if (item.source.provider === "google-calendar") {
          return false;
        }
        return item.source.provider !== "gmail" || typeof item.source.actionConfidence === "number";
      }),
    [workItems]
  );
  const openWorkItems = useMemo(() => routableWorkItems.filter((item) => item.state !== "done"), [routableWorkItems]);
  const selectedWorkItem = useMemo(
    () => routableWorkItems.find((item) => item.id === selectedWorkItemId) ?? openWorkItems[0] ?? null,
    [openWorkItems, routableWorkItems, selectedWorkItemId]
  );
  const assignmentsByWorkItemId = useMemo(() => {
    const map = new Map<string, WorkAssignment[]>();
    for (const assignment of workAssignments) {
      map.set(assignment.workItemId, [...(map.get(assignment.workItemId) ?? []), assignment]);
    }
    return map;
  }, [workAssignments]);
  const selectedWorkAssignments = useMemo(
    () => (selectedWorkItem ? assignmentsByWorkItemId.get(selectedWorkItem.id) ?? [] : []),
    [assignmentsByWorkItemId, selectedWorkItem]
  );
  const todaysCallPlan = useMemo(
    () =>
      buildTodaysCallPlan({
        workItems: routableWorkItems,
        assignments: workAssignments
      }),
    [routableWorkItems, workAssignments]
  );
  const proactiveWorkPlan = useMemo(
    () =>
      buildProactiveWorkPlan({
        workItems: routableWorkItems,
        assignments: workAssignments
      }),
    [routableWorkItems, workAssignments]
  );
  const selectedProactiveWorkItem = useMemo(
    () => (selectedWorkItem ? proactiveWorkPlan.items.find((item) => item.workItemId === selectedWorkItem.id) ?? null : null),
    [proactiveWorkPlan.items, selectedWorkItem]
  );
  const reviewWorkItems = useMemo(
    () =>
      openWorkItems.filter(
        (item) =>
          isWorkItemRouteBlocked(item) ||
          (assignmentsByWorkItemId.get(item.id) ?? []).some(
            (assignment) =>
              assignment.state === "waiting_for_user" ||
              assignment.state === "completed" ||
              assignment.state === "failed" ||
              assignment.approvalState === "needs_review" ||
              assignment.approvalState === "rejected"
          )
      ),
    [assignmentsByWorkItemId, confirmedRouteWorkItemIds, openWorkItems]
  );
  const reviewWorkItemIds = useMemo(() => new Set(reviewWorkItems.map((item) => item.id)), [reviewWorkItems]);
  const aiWorkingWorkItems = useMemo(
    () =>
      openWorkItems.filter(
        (item) =>
          !reviewWorkItemIds.has(item.id) &&
          (assignmentsByWorkItemId.get(item.id) ?? []).some((assignment) => assignment.state === "running")
      ),
    [assignmentsByWorkItemId, openWorkItems, reviewWorkItemIds]
  );
  const aiWorkingWorkItemIds = useMemo(() => new Set(aiWorkingWorkItems.map((item) => item.id)), [aiWorkingWorkItems]);
  const userMustHandleWorkItems = useMemo(
    () =>
      openWorkItems.filter(
        (item) => getWorkItemOwnership(item) === "user" && !reviewWorkItemIds.has(item.id) && !aiWorkingWorkItemIds.has(item.id)
      ),
    [aiWorkingWorkItemIds, openWorkItems, reviewWorkItemIds]
  );
  const aiCanHandleWorkItems = useMemo(
    () =>
      openWorkItems.filter((item) => {
        if (getWorkItemOwnership(item) !== "ai" || reviewWorkItemIds.has(item.id) || aiWorkingWorkItemIds.has(item.id)) {
          return false;
        }
        const assignments = assignmentsByWorkItemId.get(item.id) ?? [];
        return assignments.length === 0 || assignments.every((assignment) => assignment.state === "queued");
      }),
    [aiWorkingWorkItemIds, assignmentsByWorkItemId, openWorkItems, reviewWorkItemIds]
  );
  const commandCenterStats = useMemo(
    () => [
      {
        label: "Needs doing",
        value: todaysCallPlan.openCount,
        detail: "Synced work items"
      },
      {
        label: "AI working",
        value: todaysCallPlan.aiWorkingCount,
        detail: "Running now"
      },
      {
        label: "Needs approval",
        value: todaysCallPlan.needsApprovalCount,
        detail: "Review before final step"
      },
      {
        label: "You handle",
        value: todaysCallPlan.userMustHandleCount,
        detail: "Requires your judgment"
      }
    ],
    [todaysCallPlan.aiWorkingCount, todaysCallPlan.needsApprovalCount, todaysCallPlan.openCount, todaysCallPlan.userMustHandleCount]
  );
  const onboardingSummary = useMemo(
    () =>
      buildOnboardingSummary({
        emailStatus,
        sourceResults: lastProductivitySourceResults,
        tasks: productivityTasks,
        drafts: productivityDrafts
      }),
    [emailStatus, lastProductivitySourceResults, productivityDrafts, productivityTasks]
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
    () => visibleCodingChats.filter((chat) => !chat.projectRootPath).sort((leftChat, rightChat) => rightChat.updatedAt - leftChat.updatedAt),
    [visibleCodingChats]
  );
  const taskByActionId = useMemo(() => new Map(productivityTasks.map((task) => [task.id, task])), [productivityTasks]);
  const effectiveActionItems = useMemo(() => productivityTasks.map(productivityTaskToActionItem), [productivityTasks]);
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
  const queueOpenActionItems = useMemo(() => {
    const priorityWeight: Record<ProductivityTask["priority"], number> = { high: 0, medium: 1, low: 2 };
    return sourcedOpenActionItems
      .filter((item) => {
        if (item.source === "Calendar") {
          return false;
        }
        const task = taskByActionId.get(item.id);
        return item.source !== "Email" || typeof task?.source.actionConfidence === "number";
      })
      .sort((leftItem, rightItem) => {
        const leftTask = taskByActionId.get(leftItem.id);
        const rightTask = taskByActionId.get(rightItem.id);
        const priorityDelta = priorityWeight[leftTask?.priority ?? "medium"] - priorityWeight[rightTask?.priority ?? "medium"];
        if (priorityDelta !== 0) {
          return priorityDelta;
        }
        const confidenceDelta = (rightTask?.source.actionConfidence ?? 0) - (leftTask?.source.actionConfidence ?? 0);
        if (confidenceDelta !== 0) {
          return confidenceDelta;
        }
        return rightItem.createdAt - leftItem.createdAt;
      });
  }, [sourcedOpenActionItems, taskByActionId]);
  const queueCompletedActionItems = useMemo(
    () =>
      sourcedCompletedActionItems.filter((item) => {
        if (item.source === "Calendar") {
          return false;
        }
        const task = taskByActionId.get(item.id);
        return item.source !== "Email" || typeof task?.source.actionConfidence === "number";
      }),
    [sourcedCompletedActionItems, taskByActionId]
  );
  const urgentActionCount = useMemo(() => queueOpenActionItems.filter(isUrgentActionItem).length, [queueOpenActionItems]);
  const waitingActionCount = useMemo(() => queueOpenActionItems.filter(isWaitingActionItem).length, [queueOpenActionItems]);
  const focusTimeLabel = useMemo(() => formatFocusMinutes(queueOpenActionItems.length * 18), [queueOpenActionItems.length]);
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
    () => (selectedActionSource === "All" ? queueOpenActionItems : queueOpenActionItems.filter((item) => item.source === selectedActionSource)),
    [queueOpenActionItems, selectedActionSource]
  );
  const visibleCompletedActionItems = useMemo(
    () => (selectedActionSource === "All" ? queueCompletedActionItems : queueCompletedActionItems.filter((item) => item.source === selectedActionSource)),
    [queueCompletedActionItems, selectedActionSource]
  );
  const calendarActionItems = useMemo(
    () =>
      sourcedOpenActionItems.filter((item) =>
        item.source === "Calendar" || /\b(meeting|meet|call|deadline|due|schedule|event|interview)\b/iu.test(`${item.title} ${item.context ?? ""}`)
      ),
    [sourcedOpenActionItems]
  );
  const calendarWeekDays = useMemo(() => getCalendarWeekDays(calendarReferenceDate), [calendarReferenceDate]);
  const miniCalendarDays = useMemo(() => getMiniCalendarDays(calendarReferenceDate), [calendarReferenceDate]);
  const calendarWeekEvents = useMemo(() => getCalendarWeekEvents(productivityTasks, localCalendarEvents, calendarWeekDays), [calendarWeekDays, localCalendarEvents, productivityTasks]);
  const calendarSources = useMemo(() => {
    const sources = new Map<string, { label: string; count: number; color: string }>();
    for (const task of productivityTasks) {
      if (task.source.provider !== "google-calendar") {
        continue;
      }
      const label = task.source.calendarName || task.source.label.split(" - ")[0] || "Google Calendar";
      const existingSource = sources.get(label);
      if (existingSource) {
        existingSource.count += 1;
      } else {
        sources.set(label, {
          label,
          count: 1,
          color: getCalendarEventColor(label)
        });
      }
    }
    if (localCalendarEvents.length > 0) {
      sources.set("Autopilot Calendar", {
        label: "Autopilot Calendar",
        count: localCalendarEvents.length,
        color: getCalendarEventColor("Autopilot Calendar")
      });
    }
    return [...sources.values()].sort((leftSource, rightSource) => leftSource.label.localeCompare(rightSource.label));
  }, [localCalendarEvents.length, productivityTasks]);
  const pendingCalendarTasksByDay = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of calendarActionItems) {
      const task = taskByActionId.get(item.id);
      const startAt = task?.source.eventStartAt;
      if (typeof startAt !== "number") {
        continue;
      }
      const key = getStartOfDay(new Date(startAt)).toISOString();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [calendarActionItems, taskByActionId]);
  const calendarHours = useMemo(
    () => Array.from({ length: CALENDAR_WEEK_END_HOUR - CALENDAR_WEEK_START_HOUR + 1 }, (_unused, index) => CALENDAR_WEEK_START_HOUR + index),
    []
  );
  const calendarToday = useMemo(() => getStartOfDay(new Date()), []);
  const calendarWeekRangeLabel = useMemo(() => formatCalendarWeekRange(calendarWeekDays), [calendarWeekDays]);
  const aiHandleActionCount = useMemo(() => queueOpenActionItems.filter((item) => getActionItemHandler(item) === "ai").length, [queueOpenActionItems]);
  const userHandleActionCount = Math.max(0, queueOpenActionItems.length - aiHandleActionCount);
  const actionSourceCounts = useMemo(() => {
    const counts = new Map<ActionItemSource, number>();
    for (const item of queueOpenActionItems) {
      counts.set(item.source, (counts.get(item.source) ?? 0) + 1);
    }

    return counts;
  }, [queueOpenActionItems]);
  const googleCalendarTaskCount = useMemo(
    () => productivityTasks.filter((task) => task.source.provider === "google-calendar").length,
    [productivityTasks]
  );
  const gmailTaskCount = useMemo(
    () => productivityTasks.filter((task) => task.source.provider === "gmail").length,
    [productivityTasks]
  );

  useEffect(() => {
    if (emailMessages.length === 0) {
      setSelectedInboxEmailId(null);
      return;
    }

    if (!selectedInboxEmailId || !emailMessages.some((message) => message.id === selectedInboxEmailId)) {
      setSelectedInboxEmailId(emailMessages[0]?.id ?? null);
    }
  }, [emailMessages, selectedInboxEmailId]);

  useEffect(() => {
    if (view !== "productivity") {
      return;
    }

    function handleProductivityShortcuts(event: globalThis.KeyboardEvent): void {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || isEditableKeyboardTarget(event.target)) {
        return;
      }

      if (event.key === "?") {
        event.preventDefault();
        setProductivityShortcutHelpOpen((isOpen) => !isOpen);
        return;
      }

      if (emailMessages.length === 0) {
        return;
      }

      const selectedIndex = Math.max(
        0,
        emailMessages.findIndex((message) => message.id === selectedInboxEmailId)
      );
      const selectedMessage = emailMessages[selectedIndex] ?? emailMessages[0];
      if (!selectedMessage) {
        return;
      }

      if (event.key.toLowerCase() === "j") {
        event.preventDefault();
        setSelectedInboxEmailId(emailMessages[Math.min(emailMessages.length - 1, selectedIndex + 1)]?.id ?? selectedMessage.id);
        return;
      }

      if (event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSelectedInboxEmailId(emailMessages[Math.max(0, selectedIndex - 1)]?.id ?? selectedMessage.id);
        return;
      }

      if (event.key.toLowerCase() === "e") {
        event.preventDefault();
        ignoreInboxEmail(selectedMessage);
        return;
      }

      if (event.key.toLowerCase() === "r") {
        event.preventDefault();
        const draft = draftByMessageId.get(selectedMessage.id);
        if (draft) {
          openProductivityDraft(draft);
          return;
        }

        void generateArtifactFromEmail(selectedMessage, undefined, { mode: "background", taskIds: [] });
        return;
      }

      if (event.key.toLowerCase() === "c") {
        event.preventDefault();
        showBrowserWorkspace();
        void autopilot.tabs.create("https://mail.google.com/mail/u/0/#inbox?compose=new");
      }
    }

    window.addEventListener("keydown", handleProductivityShortcuts);
    return () => window.removeEventListener("keydown", handleProductivityShortcuts);
  }, [autopilot, draftByMessageId, emailMessages, selectedInboxEmailId, view]);
  const hasGmailData = emailMessages.length > 0 || gmailTaskCount > 0;
  const hasCalendarData = googleCalendarTaskCount > 0;
  const googleSourceLooksConnected = Boolean(emailStatus?.connected || hasGmailData || hasCalendarData);
  const googleConnectionSummary = emailStatus?.connected
    ? `Connected to ${emailStatus.accountEmail ?? "Google"}`
    : hasGmailData || hasCalendarData
      ? "Google data is synced locally. Sync again only if you want fresh Gmail or Calendar updates."
      : emailStatus?.reason ?? "Connect Google to pull Gmail messages and Calendar events.";
  const topPriorityActionItems = useMemo(
    () => [...queueOpenActionItems].sort((left, right) => Number(isUrgentActionItem(right)) - Number(isUrgentActionItem(left))).slice(0, 5),
    [queueOpenActionItems]
  );
  const nextActionItem = topPriorityActionItems[0] ?? null;
  const remainingPriorityActionItems = topPriorityActionItems.slice(1);
  const todaysCallTopMove = todaysCallPlan.topMove;
  const remainingTodaysCallMoves = todaysCallPlan.nextMoves.slice(1);
  const commandCenterOpenCount = todaysCallPlan.openCount > 0 ? todaysCallPlan.openCount : queueOpenActionItems.length;
  const commandCenterUrgentCount = todaysCallPlan.openCount > 0 ? todaysCallPlan.urgentCount : urgentActionCount;
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
    saveLocalCalendarEvents(localCalendarEvents);
  }, [localCalendarEvents]);

  useEffect(() => {
    saveAutoWorkAllEnabled(autoWorkAllEnabled);
  }, [autoWorkAllEnabled]);

  useEffect(() => {
    saveCodingChats(codingChats);
  }, [codingChats]);

  useEffect(() => {
    if (activeCodingTab.kind === "terminal") {
      codingTerminalOutputRef.current?.focus();
    }
  }, [activeCodingTab.kind, codingTerminalLaunch?.success]);

  useEffect(() => {
    const outputElement = codingTerminalOutputRef.current;
    if (outputElement) {
      outputElement.scrollTop = outputElement.scrollHeight;
      const cursorPosition = outputElement.value.length;
      outputElement.setSelectionRange(cursorPosition, cursorPosition);
    }
  }, [codingTerminalOutput, codingCommandDraft, activeCodingTab.kind]);

  useEffect(() => {
    return autopilot.coding.subscribeTerminalOutput((event) => {
      setCodingTerminalOutput(event.output);
      setCodingTerminalLaunch((currentLaunch) => ({
        success: true,
        cwd: event.cwd,
        shell: currentLaunch?.success ? currentLaunch.shell : "powershell.exe",
        shellName: event.shellName,
        output: event.output,
        running: event.running,
        startedAt: currentLaunch?.success ? currentLaunch.startedAt : event.updatedAt,
        updatedAt: event.updatedAt,
        pid: event.pid
      }));
    });
  }, [autopilot]);

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
    try {
      window.localStorage.setItem(GLOBAL_RAIL_EXPANDED_STORAGE_KEY, String(globalRailExpanded));
    } catch {
      // Ignore localStorage failures; the rail can still expand for this session.
    }
  }, [globalRailExpanded]);

  useEffect(() => {
    globalRailWidthRef.current = globalRailWidth;
    try {
      window.localStorage.setItem(GLOBAL_RAIL_WIDTH_STORAGE_KEY, String(globalRailWidth));
    } catch {
      // Ignore localStorage failures; resizing should still work for this session.
    }
  }, [globalRailWidth]);

  useEffect(() => {
    try {
      window.localStorage.setItem(GLOBAL_RAIL_OPEN_STORAGE_KEY, String(globalRailOpen));
    } catch {
      // Ignore localStorage failures; the rail can still hide for this session.
    }
  }, [globalRailOpen]);

  useEffect(() => {
    try {
      window.localStorage.setItem(CODING_ACTIVITY_RAIL_EXPANDED_STORAGE_KEY, String(codingActivityRailExpanded));
    } catch {
      // Ignore localStorage failures; the coding rail can still expand for this session.
    }
  }, [codingActivityRailExpanded]);

  useEffect(() => {
    try {
      window.localStorage.setItem(CODING_EXPLORER_OPEN_STORAGE_KEY, String(codingExplorerOpen));
    } catch {
      // Ignore localStorage failures; the explorer can still collapse for this session.
    }
  }, [codingExplorerOpen]);

  useEffect(() => {
    saveStringArrayToStorage(CODING_ARCHIVED_CHAT_IDS_STORAGE_KEY, archivedCodingChatIds);
  }, [archivedCodingChatIds]);

  useEffect(() => {
    saveStringArrayToStorage(CONFIRMED_ROUTE_WORK_ITEMS_STORAGE_KEY, confirmedRouteWorkItemIds);
  }, [confirmedRouteWorkItemIds]);

  useEffect(() => {
    const projectRoots = codingSnapshot.projects.map((project) => project.rootPath);
    setCodingProjectOrder((currentOrder) => {
      const knownRoots = new Set(projectRoots);
      const keptOrder = currentOrder.filter((rootPath) => knownRoots.has(rootPath));
      const missingRoots = projectRoots.filter((rootPath) => !keptOrder.includes(rootPath));
      const nextOrder = [...keptOrder, ...missingRoots];
      return nextOrder.length === currentOrder.length && nextOrder.every((rootPath, index) => rootPath === currentOrder[index])
        ? currentOrder
        : nextOrder;
    });
  }, [codingSnapshot.projects]);

  useEffect(() => {
    saveStringArrayToStorage(CODING_PROJECT_ORDER_STORAGE_KEY, codingProjectOrder);
  }, [codingProjectOrder]);

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
        setWorkspaceReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setWorkspaceState({
            activeWorkspaceId: "browsing",
            profiles: structuredClone(DEFAULT_WORKSPACE_PROFILES)
          });
          setView("browser");
          setWorkspaceReady(true);
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

    void autopilot.productivity
      .listWorkItems()
      .then((items) => {
        if (!cancelled) {
          setWorkItems(items);
          setSelectedWorkItemId((currentId) => currentId ?? items[0]?.id ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setWorkItems([]);
        }
      });

    void autopilot.productivity
      .listWorkAssignments()
      .then((assignments) => {
        if (!cancelled) {
          setWorkAssignments(assignments);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setWorkAssignments([]);
        }
      });

    void autopilot.automation
      .listRecipes()
      .then((recipes) => {
        if (!cancelled) {
          setAutomationRecipes(recipes);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAutomationRecipes([]);
        }
      });

    void autopilot.automation
      .listRuns()
      .then((runs) => {
        if (!cancelled) {
          setAutomationRuns(runs);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAutomationRuns([]);
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
    void refreshCodingRepoState();
  }, [activeCodingProject?.rootPath]);

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
    setDesignPreviewVersionIndex(null);
  }, [activeArtifact?.id, activeArtifactVersion?.id]);

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

    const pickerPath = activeCodingTab.path ?? activeCodingProject?.rootPath ?? null;
    if (!pickerPath) {
      setCodingPickerEntries([]);
      setCodingPickerError(null);
      setCodingPickerLoading(false);
      return;
    }

    let cancelled = false;
    setCodingPickerLoading(true);
    setCodingPickerError(null);
    void autopilot.coding
      .readPath(pickerPath)
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
          setCodingPickerError("Autopilot could not read this folder.");
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
  }, [activeCodingProject?.rootPath, activeCodingTab.kind, activeCodingTab.path, autopilot]);

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

  function openCalendarCreateAt(day: Date, hour: number): void {
    const startAt = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, 0, 0, 0).getTime();
    const endAt = startAt + 60 * 60 * 1000;
    setCalendarEventForm({
      title: "",
      notes: "",
      date: formatCalendarDateInput(startAt),
      startTime: formatCalendarTimeInput(startAt),
      endTime: formatCalendarTimeInput(endAt),
      recurrence: "none"
    });
    setCalendarEditorState({ mode: "create" });
  }

  function openCalendarEventEditor(event: CalendarWeekEvent): void {
    const sourceEvent = event.localEvent;
    setCalendarEventForm({
      title: event.title,
      notes: sourceEvent?.notes ?? (event.task?.context || event.task?.source.label || ""),
      date: formatCalendarDateInput(event.startAt),
      startTime: formatCalendarTimeInput(event.startAt),
      endTime: formatCalendarTimeInput(event.endAt),
      recurrence: sourceEvent?.recurrence ?? event.recurrence ?? "none"
    });
    setCalendarEditorState({
      mode: "edit",
      eventId: sourceEvent?.id,
      sourceEvent: event
    });
  }

  function closeCalendarEditor(): void {
    setCalendarEditorState(null);
  }

  function saveCalendarEditorEvent(): void {
    const startAt = parseCalendarDateTime(calendarEventForm.date, calendarEventForm.startTime);
    const rawEndAt = parseCalendarDateTime(calendarEventForm.date, calendarEventForm.endTime);
    const endAt = rawEndAt > startAt ? rawEndAt : startAt + 60 * 60 * 1000;
    const title = calendarEventForm.title.trim() || "New event";
    const now = Date.now();

    setLocalCalendarEvents((events) => {
      if (calendarEditorState?.eventId) {
        return events.map((event) =>
          event.id === calendarEditorState.eventId
            ? {
                ...event,
                title,
                notes: calendarEventForm.notes.trim(),
                startAt,
                endAt,
                recurrence: calendarEventForm.recurrence,
                color: event.color || getCalendarEventColor(title),
                updatedAt: now
              }
            : event
        );
      }

      const sourceTaskId = calendarEditorState?.sourceEvent?.task?.id;
      const nextEvent: LocalCalendarEvent = {
        id: `local-calendar-${now}-${Math.random().toString(36).slice(2)}`,
        title,
        notes: calendarEventForm.notes.trim(),
        startAt,
        endAt,
        allDay: false,
        recurrence: calendarEventForm.recurrence,
        color: getCalendarEventColor(title),
        sourceTaskId,
        createdAt: now,
        updatedAt: now
      };
      return [...events, nextEvent].sort((leftEvent, rightEvent) => leftEvent.startAt - rightEvent.startAt);
    });

    setEmailSyncStatus(calendarEditorState?.sourceEvent?.sourceKind === "google" ? "Saved an editable Autopilot copy of that Google Calendar event." : "Saved calendar event in Autopilot.");
    closeCalendarEditor();
  }

  function deleteCalendarEditorEvent(): void {
    if (!calendarEditorState?.eventId) {
      closeCalendarEditor();
      return;
    }

    setLocalCalendarEvents((events) => events.filter((event) => event.id !== calendarEditorState.eventId));
    setEmailSyncStatus("Deleted Autopilot calendar event.");
    closeCalendarEditor();
  }

  const sendWebArea = useCallback(() => {
    const shouldAttachNativeView = workspaceReady && view === "browser" && !isBrowserPreview && shouldUseNativeBrowserView(activeTab?.url);

    if (!shouldAttachNativeView) {
      void autopilot.tabs.setWebArea({ x: 0, y: 0, width: 0, height: 0 }, false);
      return;
    }

    const node = webAreaRef.current;
    if (!node) {
      void autopilot.tabs.setWebArea({ x: 0, y: 0, width: 0, height: 0 }, false);
      return;
    }

    const rect = node.getBoundingClientRect();
    const viewportWidth = Math.max(0, window.innerWidth || document.documentElement.clientWidth || 0);
    const viewportHeight = Math.max(0, window.innerHeight || document.documentElement.clientHeight || 0);
    const left = Math.max(0, Math.min(viewportWidth, Math.round(rect.left)));
    const top = Math.max(0, Math.min(viewportHeight, Math.round(rect.top)));
    const right = Math.max(left, Math.min(viewportWidth, Math.round(rect.right)));
    const bottom = Math.max(top, Math.min(viewportHeight, Math.round(rect.bottom)));
    const frameWidth = Math.max(0, right - left);
    const frameHeight = Math.max(0, bottom - top);
    const sidePanelOpen = view === "browser" && (assistantOpen || browserDownloadsOpen);
    const sidePanelReserve = sidePanelOpen ? Math.min(456, Math.max(320, Math.round(frameWidth * 0.34))) : 0;
    const browserWidth = Math.max(0, Math.round(frameWidth - sidePanelReserve));
    const browserHeight = Math.max(0, Math.round(frameHeight));
    const isUsableArea = browserWidth >= 120 && browserHeight >= 120;
    void autopilot.tabs.setWebArea(
      {
        x: left,
        y: top,
        width: browserWidth,
        height: browserHeight
      },
      isUsableArea
    );
  }, [activeTab?.url, assistantOpen, autopilot, browserDownloadsOpen, isBrowserPreview, view, workspaceReady]);

  useLayoutEffect(() => {
    sendWebArea();
    const firstFrame = window.requestAnimationFrame(sendWebArea);
    const secondFrame = window.setTimeout(sendWebArea, 120);

    const resizeObserver = new ResizeObserver(() => sendWebArea());
    if (webAreaRef.current) {
      resizeObserver.observe(webAreaRef.current);
    }

    window.addEventListener("resize", sendWebArea);
    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.clearTimeout(secondFrame);
      resizeObserver.disconnect();
      window.removeEventListener("resize", sendWebArea);
    };
  }, [
    sendWebArea,
    tabs.length,
    activeTabId,
    activeNavigationErrorKey,
    sidebarOpen,
    sidebarWidth,
    globalRailOpen,
    globalRailWidth,
    assistantOpen,
    browserDownloadsOpen,
    workspaceReady
  ]);

  useEffect(() => {
    if (view === "browser") {
      return;
    }

    void autopilot.tabs.setWebArea({ x: 0, y: 0, width: 0, height: 0 }, false);
  }, [autopilot, view]);

  function navigateTo(input: string): void {
    if (!activeTabId) {
      return;
    }

    const destination = isHistoryAddressInput(input) ? createHistoryUrl(historyEntries, theme) : input;
    void autopilot.tabs
      .navigate(activeTabId, destination)
      .then((snapshot) => {
        setTabs(snapshot.tabs);
        setActiveTabId(snapshot.activeTabId);
      })
      .catch(() => undefined);
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
    void (async () => {
      await switchToBrowserWorkspace();
      await autopilot.tabs.create();
    })();
  }

  async function openEmailInBrowser(message: EmailMessageSummary): Promise<void> {
    try {
      setEmailSyncStatus(`Opening ${message.subject || "email"} in a browser tab...`);
      await switchToBrowserWorkspace();
      await autopilot.tabs.create(message.url);
      setEmailSyncStatus(`Opened ${message.subject || "email"} in a new tab.`);
    } catch {
      setEmailSyncStatus("Autopilot could not open that email. Sync Gmail again and try once more.");
    }
  }

  function toggleInboxEmail(messageId: string): void {
    setExpandedEmailIds((currentIds) => (currentIds.includes(messageId) ? currentIds.filter((id) => id !== messageId) : [...currentIds, messageId]));
  }

  function ignoreInboxEmail(message: EmailMessageSummary): void {
    setIgnoredEmailIds((currentIds) => (currentIds.includes(message.id) ? currentIds : [...currentIds, message.id]));
    setEmailSyncStatus(`Ignored "${message.subject || "email"}" for action suggestions. It will stay in the Inbox.`);
  }

  async function assignInboxEmailToAi(message: EmailMessageSummary, taskIds: string[]): Promise<void> {
    const relatedWorkItem = workItems.find(
      (item) => item.source.provider === "gmail" && item.source.messageId === message.id && item.state !== "done" && typeof item.source.actionConfidence === "number"
    );
    if (relatedWorkItem) {
      setSelectedWorkItemId(relatedWorkItem.id);
      await routeSelectedWorkItem(relatedWorkItem);
      return;
    }

    const built = await generateArtifactFromEmail(message, undefined, {
      mode: "background",
      taskIds
    });
    if (built) {
      setEmailSyncStatus(`Assigned "${message.subject || "email"}" to Autopilot. A reviewable draft is being prepared.`);
    }
  }

  async function openProductivityTaskSource(task: ProductivityTask): Promise<void> {
    if (!task.source.url) {
      setEmailSyncStatus("This action item does not have a source link yet.");
      return;
    }

    try {
      await switchToBrowserWorkspace();
      await autopilot.tabs.create(task.source.url);
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

  function applyThemePreset(themePreset: BrowserTheme): void {
    setTheme({ ...themePreset });
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

  async function switchToBrowserWorkspace(): Promise<void> {
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
    const nextState = await autopilot.workspaces.switch(browsingProfile.id).catch(() => null);
    if (nextState) {
      setWorkspaceState(nextState);
    }
  }

  function showBrowserWorkspace(): void {
    void switchToBrowserWorkspace();
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

  async function loadWorkOrchestrationSnapshot(): Promise<{ items: WorkItem[]; assignments: WorkAssignment[] } | null> {
    const [items, assignments] = await Promise.all([
      autopilot.productivity.listWorkItems().catch(() => null),
      autopilot.productivity.listWorkAssignments().catch(() => null)
    ]);
    if (!items || !assignments) {
      return null;
    }

    setWorkItems(items);
    setWorkAssignments(assignments);
    setSelectedWorkItemId((currentId) => (currentId && items.some((item) => item.id === currentId) ? currentId : items[0]?.id ?? null));
    return { items, assignments };
  }

  async function refreshWorkOrchestration(): Promise<void> {
    await loadWorkOrchestrationSnapshot();
  }

  async function refreshAutomationState(): Promise<void> {
    const [recipes, runs] = await Promise.all([autopilot.automation.listRecipes().catch(() => null), autopilot.automation.listRuns().catch(() => null)]);
    if (recipes) {
      setAutomationRecipes(recipes);
    }
    if (runs) {
      setAutomationRuns(runs);
    }
  }

  async function syncProductivityTasksFromSources(sourceIds: ProductivitySourceId[] = selectedProductivitySources): Promise<ProductivityTaskSyncResult> {
    const result = await autopilot.productivity.sync(sourceIds).catch((error: unknown) => ({
      success: false,
      tasks: productivityTasks,
      addedCount: 0,
      updatedCount: 0,
      model: undefined,
      sourceResults: [],
      reason: error instanceof Error ? error.message : "Productivity task sync failed."
    }));

    const [nextEmailStatus, nextEmailMessages] = await Promise.all([
      autopilot.email.status().catch(() => null),
      autopilot.email.list().catch(() => null)
    ]);
    if (nextEmailStatus) {
      setEmailStatus(nextEmailStatus);
    }
    if (nextEmailMessages) {
      setEmailMessages(nextEmailMessages);
    }
    setProductivityTasks(result.tasks);
    setLastProductivitySourceResults(result.sourceResults ?? []);
    await refreshWorkOrchestration();
    const partialReason = result.success && result.reason ? ` ${result.reason}` : "";
    const sourceSummary = result.sourceResults?.length
      ? ` Sources: ${result.sourceResults
          .map((source) => `${source.label} ${source.success ? "synced" : source.configured ? "needs attention" : "disconnected"}`)
          .join(", ")}.`
      : "";
    const selectedSourceLabel = productivitySourceOptions
      .filter((source) => sourceIds.includes(source.id))
      .map((source) => source.label)
      .join(" and ");
    setEmailSyncStatus(
      result.success
        ? `Built ${result.tasks.length} action ${result.tasks.length === 1 ? "item" : "items"} from ${selectedSourceLabel || "selected sources"}${
            result.model ? ` with ${result.model}` : ""
          }.${partialReason}${sourceSummary}`
        : result.reason ?? "Productivity task sync failed."
    );
    if (result.success && autoWorkAllEnabled) {
      void startProactiveWork("auto");
    }

    return result;
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

    await switchToBrowserWorkspace();
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

    if (await createAndRunAutomationFromWorkspace(prompt, "design")) {
      void refreshAutomationState();
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

    if (await createAndRunAutomationFromWorkspace(prompt, "design")) {
      void refreshAutomationState();
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

  async function openActiveDesignSource(): Promise<void> {
    if (!activeDesignSourceContext?.url) {
      setArtifactStatus("This artifact does not have an openable source link.");
      return;
    }

    try {
      await switchToBrowserWorkspace();
      await autopilot.tabs.create(activeDesignSourceContext.url);
      setArtifactStatus("Opened the original source in Browser.");
    } catch {
      setArtifactStatus("Autopilot could not open the original source.");
    }
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
        addedCount: analysis.actions.length,
        engine: analysis.configured ? "openai" : "local",
        model: analysis.model,
        reason: analysis.reason
      };
    }

    return {
      addedCount: 0,
      engine: "local",
      model: analysis.model,
      reason: analysis.reason || "Email analysis failed, so Autopilot kept messages in the Inbox instead of guessing queue tasks."
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
    await syncProductivityTasksFromSources(["gmail", "google-calendar"]);
    const plannerLabel = actionResult.engine === "openai" ? `OpenAI${actionResult.model ? ` (${actionResult.model})` : ""}` : "inbox review only";
    const fallbackNote = actionResult.reason ? ` ${actionResult.reason}` : "";
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
      await switchToBrowserWorkspace();
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
      reason: mode === "external" ? "Google connection failed in the external browser." : "Google connection failed."
    }));

    setEmailStatus(result.status);
    setEmailMessages(result.messages ?? emailMessages);
    if (!result.success) {
      setEmailSyncStatus(result.reason ?? result.status.reason ?? "Google connection failed.");
      setEmailBusy(false);
      return;
    }

    const syncedMessages = result.messages ?? [];
    setEmailSyncStatus("Google connected. Reading Gmail and Calendar for today's call...");
    const actionResult = await addActionsFromEmailMessages(syncedMessages);
    await syncProductivityTasksFromSources(["gmail", "google-calendar"]);
    const plannerLabel = actionResult.engine === "openai" ? `OpenAI${actionResult.model ? ` (${actionResult.model})` : ""}` : "inbox review only";
    const fallbackNote = actionResult.reason ? ` ${actionResult.reason}` : "";
    setEmailSyncStatus(
      `Connected ${result.status.accountEmail ?? "Google"} and added ${actionResult.addedCount} action ${
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

  async function runOnboardingPrimaryAction(action: OnboardingPrimaryAction = onboardingSummary.primaryAction): Promise<void> {
    if (action === "configure_google") {
      setView("settings");
      return;
    }

    if (action === "connect_google" || action === "reconnect_google") {
      await connectGmailInbox("autopilot");
      return;
    }

    if (action === "sync_sources") {
      await syncSelectedProductivitySources();
      return;
    }

    setSelectedActionSource("All");
    if (!selectedWorkItemId && openWorkItems[0]) {
      setSelectedWorkItemId(openWorkItems[0].id);
    }
  }

  async function syncSelectedProductivitySources(): Promise<void> {
    if (selectedProductivitySources.includes("gmail") || selectedProductivitySources.includes("google-calendar")) {
      const result = await syncProductivityTasksFromSources(selectedProductivitySources);
      const needsGoogleReconnect =
        !result.success &&
        (result.sourceResults ?? []).some(
          (source) =>
            (source.id === "gmail" || source.id === "google-calendar") &&
            /connect|reconnect|permission|scope|authorization|sign-in/i.test(source.reason ?? result.reason ?? "")
        );
      if (needsGoogleReconnect) {
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

  async function syncGoogleCalendarFromPanel(): Promise<void> {
    setEmailBusy(true);
    setEmailSyncStatus("Syncing Google Calendar...");
    const nextSources = selectedProductivitySources.includes("google-calendar")
      ? selectedProductivitySources
      : ([...new Set([...selectedProductivitySources, "google-calendar"])] as ProductivitySourceId[]);
    if (!selectedProductivitySources.includes("google-calendar")) {
      setSelectedProductivitySources(nextSources);
      saveProductivitySources(nextSources);
    }

    const result = await syncProductivityTasksFromSources(nextSources);
    const calendarResult = result.sourceResults?.find((source) => source.id === "google-calendar");
    if (calendarResult?.success) {
      setEmailSyncStatus(
        calendarResult.itemCount > 0
          ? `Synced ${calendarResult.itemCount} Google Calendar event${calendarResult.itemCount === 1 ? "" : "s"}.`
          : `Google Calendar synced, but no events were returned for the visible window.`
      );
      setEmailBusy(false);
      return;
    }

    if (calendarResult?.reason && /connect google|reconnect google|calendar events|scope|permission|insufficient|authorization|sign-in/i.test(calendarResult.reason)) {
      setEmailSyncStatus("Google Calendar needs permission. Opening Google sign-in so you can grant Calendar access.");
      setEmailBusy(false);
      await connectGmailInbox("autopilot");
      return;
    }

    setEmailBusy(false);
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
    const handledAsAutomation = await createAndRunAutomationFromWorkspace(prompt, "browser");
    if (handledAsAutomation) {
      setAssistantPrompt("");
      setAssistantBusy(false);
      return;
    }

    const sources = getAssistantSourcesForPrompt(prompt, assistantSelectedSources);
    if (shouldAutoReadCurrentTab(prompt) && !assistantSelectedSources.includes("current-tab")) {
      setAssistantSelectedSources(sources);
    }

    const response = await autopilot.assistant
      .ask({
        prompt,
        sources,
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

  async function readActiveTabIntoAssistant(): Promise<void> {
    if (!activeTabId || assistantBusy) {
      return;
    }

    setAssistantBusy(true);
    const result = await autopilot.tabs.readPageText(activeTabId).catch((error: unknown) => ({
      success: false as const,
      reason: error instanceof Error ? error.message : "Could not read this tab."
    }));
    if (result.success) {
      setAssistantSelectedSources((sources) => (sources.includes("current-tab") ? sources : ["current-tab", ...sources]));
      setAssistantResponse({
        success: true,
        answer: `I read ${result.text.length.toLocaleString()} characters from this tab. Ask me to summarize it, extract action items, compare it with another source, or turn it into work.`,
        model: "page reader",
        sources: [
          {
            sourceId: "current-tab",
            title: result.title,
            url: result.url,
            text: result.text.slice(0, 1200)
          }
        ]
      });
    } else {
      setAssistantResponse({
        success: false,
        answer: "",
        sources: [],
        reason: result.reason
      });
    }
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

  function openCodingChatTab(chat: CodingChatThread, options: { focus?: boolean } = {}): void {
    const shouldFocusTab = options.focus ?? activeCodingTab.kind === "chat";
    setCodingTabs((currentTabs) => {
      const existingTab = currentTabs.find((tab) => tab.kind === "chat" && tab.chatId === chat.id);
      if (existingTab) {
        if (shouldFocusTab) {
          setActiveCodingTabId(existingTab.id);
        }
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
      if (shouldFocusTab) {
        setActiveCodingTabId(tab.id);
      }
      return [...currentTabs, tab];
    });
  }

  function openCodingAssistant(chat?: CodingChatThread | null): void {
    if (chat) {
      setActiveCodingAssistantChatId(chat.id);
      openCodingChatTab(chat, { focus: false });
    }
    setCodingRightPanel("assistant");
    setCodingRightSidebarOpen(true);
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
    setActiveCodingAssistantChatId(chat.id);
    openCodingAssistant(chat);
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

    openCodingAssistant(chat);
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

  async function openCodingFiles(): Promise<void> {
    setCodingBusy(true);
    setCodingStatus("Choose one or more files on your computer.");
    const result = await autopilot.coding.openFiles().catch(() => ({
      success: false as const,
      reason: "Could not open the file picker.",
      snapshot: codingSnapshot,
      files: []
    }));
    applyCodingSnapshot(result.snapshot, result.success ? `Opened ${result.files.length} file${result.files.length === 1 ? "" : "s"}.` : result.reason);
    if (result.success) {
      const projectRootPath = result.snapshot.activeProject?.rootPath ?? null;
      for (const file of result.files) {
        const tab: CodingWorkbenchTab = {
          id: createCodingTabId("file", file.path),
          kind: "file",
          title: file.name,
          path: file.path,
          projectRootPath,
          file,
          content: file.kind === "text" ? file.content : undefined,
          baseContent: file.kind === "text" ? file.content : undefined,
          savedAt: file.kind === "text" ? file.modifiedAt : undefined
        };
        upsertCodingTab(tab);
      }
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

  async function openCodingPath(
    targetPath: string,
    projectRootPath: string | null = activeCodingProject?.rootPath ?? null,
    options: { baseContent?: string } = {}
  ): Promise<void> {
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
      baseContent: result.kind === "text" ? options.baseContent ?? result.content : undefined,
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
    advanceActiveCodingPlan("inspected");
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

  function openCodingPicker(targetPath?: string | null | ReactMouseEvent): void {
    const requestedPath = typeof targetPath === "string" ? targetPath : null;
    const pickerPath =
      requestedPath ??
      (activeCodingTab.kind === "folder" && activeCodingTab.path ? activeCodingTab.path : null) ??
      (activeCodingTab.kind === "file" && activeCodingTab.path ? getLocalParentPath(activeCodingTab.path) : null) ??
      activeCodingProject?.rootPath ??
      null;
    const tab: CodingWorkbenchTab = {
      id: createCodingTabId("picker"),
      kind: "picker",
      title: pickerPath && pickerPath !== activeCodingProject?.rootPath ? `Open ${getLocalPathName(pickerPath)}` : "Open file",
      path: pickerPath ?? undefined,
      projectRootPath: activeCodingProject?.rootPath ?? null
    };
    setCodingExplorerOpen(true);
    setCodingTabs((currentTabs) => [...currentTabs, tab]);
    setActiveCodingTabId(tab.id);
    setCodingStatus(pickerPath ? `Showing files in ${getLocalPathName(pickerPath)}.` : "Open a project before choosing files.");
  }

  function openCodingPlugins(): void {
    setCodingSection("plugins");
    setCodingRightPanel("plugins");
    setCodingRightSidebarOpen(true);
    setCodingExplorerOpen(true);
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
    setCodingExplorerOpen(true);
    setCodingStatus("Search is filtering the active project file tree.");
  }

  async function launchCodingTerminal(): Promise<void> {
    if (codingTerminalOpening) {
      return;
    }

    setCodingTerminalOpening(true);
    setCodingStatus(`Starting ${autopilot.platform === "win32" ? "Windows PowerShell" : "terminal"} in the app.`);
    const result: CodingTerminalOpenResult = await autopilot.coding
      .openTerminal(activeCodingProject ? { cwd: activeCodingProject.rootPath } : undefined)
      .catch(() => ({
        success: false,
        cwd: activeCodingProject?.rootPath,
        shell: "powershell.exe",
        shellName: "Windows PowerShell",
        reason: "PowerShell could not start from Autopilot."
      }));
    setCodingTerminalOpening(false);
    setCodingTerminalLaunch(result);
    if (result.success) {
      setCodingTerminalOutput(result.output);
    }
    setCodingStatus(result.success ? `${result.shellName} is running in the app.` : result.reason);
  }

  function openCodingTerminal(options: OpenCodingTerminalOptions = {}): void {
    setCodingSection("terminal");
    setCodingRightPanel("terminal");
    setCodingRightSidebarOpen(true);
    setCodingCommandDraft((currentDraft) => (currentDraft === "npm test" ? "" : currentDraft));
    const shouldLaunchShell = options.launchShell !== false;
    const existingTab = codingTabs.find((tab) => tab.kind === "terminal");
    if (existingTab) {
      setActiveCodingTabId(existingTab.id);
      if (shouldLaunchShell && options.forceLaunch) {
        void launchCodingTerminal();
      }
      return;
    }

    const tab: CodingWorkbenchTab = {
      id: createCodingTabId("terminal"),
      kind: "terminal",
      title: "Terminal"
    };
    setCodingTabs((currentTabs) => [...currentTabs, tab]);
    setActiveCodingTabId(tab.id);
    if (shouldLaunchShell) {
      void launchCodingTerminal();
    }
  }

  function openCodingBrowser(): void {
    setCodingSection("browser");
    setCodingExplorerOpen(true);
    const existingTab = codingTabs.find((tab) => tab.kind === "browser");
    if (existingTab) {
      setActiveCodingTabId(existingTab.id);
      return;
    }

    const tab: CodingWorkbenchTab = {
      id: createCodingTabId("browser"),
      kind: "browser",
      title: "Automation"
    };
    setCodingTabs((currentTabs) => [...currentTabs, tab]);
    setActiveCodingTabId(tab.id);
  }

  function toggleCodingFilesPanel(): void {
    if (codingSection !== "files") {
      setCodingSection("files");
      setCodingExplorerOpen(true);
      setCodingStatus("Project files and chats are visible.");
      return;
    }

    setCodingExplorerOpen((isOpen) => {
      setCodingStatus(isOpen ? "Project explorer collapsed. Use the folder button to bring it back." : "Project explorer expanded.");
      return !isOpen;
    });
  }

  function openCodingSummary(): void {
    setCodingRightPanel("summary");
    setCodingRightSidebarOpen(true);
  }

  function openCodingDownloads(): void {
    setCodingRightPanel("downloads");
    setCodingRightSidebarOpen(true);
    void refreshCodingDownloads();
  }

  async function runCodingProjectDefaultCommand(): Promise<void> {
    if (!activeCodingProject) {
      setCodingStatus("Open a project before running code.");
      openCodingTerminal({ launchShell: false });
      return;
    }

    const command = codingCommandDraft.trim() && codingCommandDraft.trim() !== "npm test" ? codingCommandDraft.trim() : "npm run dev";
    setCodingToolMenuOpen(false);
    setCodingStatus(`Running ${command}.`);
    await runCodingCommandText(command);
  }

  async function runCodingProjectTool(command: string, status: string): Promise<void> {
    if (!activeCodingProject) {
      setCodingStatus("Open a project before launching project tools.");
      openCodingTerminal({ launchShell: false });
      return;
    }

    setCodingToolMenuOpen(false);
    setCodingStatus(status);
    await runCodingCommandText(command);
  }

  function customizeCodingProjectTool(): void {
    const command = window.prompt("Command to run from this project", codingCommandDraft.trim() || "code .");
    if (!command?.trim()) {
      return;
    }

    setCodingToolMenuOpen(false);
    void runCodingProjectTool(command.trim(), `Running custom tool: ${command.trim()}.`);
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

  function openCodingCreatePluginChat(kind: "plugin" | "skill" = "plugin"): void {
    const project = activeCodingProject ?? orderedCodingProjects[0] ?? null;
    const title = kind === "skill" ? "Create coding skill" : "Create coding plugin";
    startNewCodingChat(project, title);
    setCodingDraftMessage(
      kind === "skill"
        ? "Build a reusable Autopilot coding skill for this project. Ask me one focused question if the goal is unclear, then scaffold the skill safely."
        : "Build a new Autopilot coding plugin. Start by clarifying what CLI, connector, or workflow it should add, then create the safest implementation plan."
    );
    setCodingStatus(`${title} chat opened${project ? ` in ${project.name}` : ""}.`);
  }

  function openCodingSkillTemplateChat(template: (typeof codingSkillTemplates)[number]): void {
    const project = activeCodingProject ?? orderedCodingProjects[0] ?? null;
    startNewCodingChat(project, template.name);
    setCodingDraftMessage(template.prompt);
    setCodingStatus(`${template.name} chat opened${project ? ` in ${project.name}` : ""}.`);
  }

  function deleteCodingChat(chatId: string): void {
    const deletedChat = codingChats.find((chat) => chat.id === chatId);
    if (activeCodingAssistantChatId === chatId) {
      setActiveCodingAssistantChatId(null);
    }
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

  function archiveCodingChat(chatId: string): void {
    const archivedChat = codingChats.find((chat) => chat.id === chatId);
    if (activeCodingAssistantChatId === chatId) {
      setActiveCodingAssistantChatId(null);
    }
    setArchivedCodingChatIds((currentIds) => (currentIds.includes(chatId) ? currentIds : [chatId, ...currentIds]));
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
    setCodingStatus(archivedChat ? `Archived chat: ${archivedChat.title}` : "Archived chat.");
  }

  function reorderCodingProject(dragRootPath: string | null, dropRootPath: string): void {
    if (!dragRootPath || dragRootPath === dropRootPath) {
      setDraggingCodingProjectRoot(null);
      return;
    }

    const currentRoots = orderedCodingProjects.map((project) => project.rootPath);
    const fromIndex = currentRoots.indexOf(dragRootPath);
    const toIndex = currentRoots.indexOf(dropRootPath);
    if (fromIndex < 0 || toIndex < 0) {
      setDraggingCodingProjectRoot(null);
      return;
    }

    const nextRoots = [...currentRoots];
    const [movedRoot] = nextRoots.splice(fromIndex, 1);
    nextRoots.splice(toIndex, 0, movedRoot);
    setCodingProjectOrder(nextRoots);
    setDraggingCodingProjectRoot(null);
    const movedProject = orderedCodingProjects.find((project) => project.rootPath === dragRootPath);
    setCodingStatus(movedProject ? `Moved ${movedProject.name} in the project list.` : "Project order updated.");
  }

  function updateAutomationSetupSource(source: AutomationSourceKind): void {
    setAutomationSetup((currentSetup) => {
      const sources = currentSetup.sources.includes(source)
        ? currentSetup.sources.filter((currentSource) => currentSource !== source)
        : [...currentSetup.sources, source];
      return {
        ...currentSetup,
        sources: sources.length > 0 ? sources : currentSetup.sources
      };
    });
  }

  function useAutomationTemplate(template: "industry" | "drafts" | "repo"): void {
    setAutomationSetup((currentSetup) => {
      if (template === "drafts") {
        return {
          ...currentSetup,
          title: "Draft important replies",
          prompt: "Every morning, find important emails that need a response and draft concise replies for review.",
          schedule: "daily",
          outputKind: "draft",
          sources: ["gmail"],
          qualityBar: 88,
          requiresApproval: true
        };
      }

      if (template === "repo") {
        return {
          ...currentSetup,
          title: "Repo health watch",
          prompt: "Weekly, inspect this coding project for failing scripts, stale dependencies, and risky changed files. Make a report with recommended next moves.",
          schedule: "weekly",
          outputKind: "brief",
          sources: ["coding", "web"],
          qualityBar: 86,
          requiresApproval: true
        };
      }

      return {
        ...currentSetup,
        title: "Industry brief",
        prompt: "Every morning, research the latest AI browser and AI coding tool news, cite sources, and make a practical brief with opportunities for Autopilot.",
        schedule: "daily",
        outputKind: "research_report",
        sources: ["web", "coding"],
        qualityBar: 90,
        requiresApproval: true
      };
    });
    setCodingStatus("Automation template loaded. Review the setup, then create it.");
  }

  async function createAutomationFromSetup(runFirstPass: boolean): Promise<void> {
    const goal = automationSetup.prompt.trim();
    if (!goal) {
      setAutomationStatus("Automation needs a prompt before it can be created.");
      setCodingStatus("Automation needs a prompt before it can be created.");
      return;
    }

    setAutomationBusy(true);
    setAutomationStatus(runFirstPass ? "Creating automation and running the first pass..." : "Saving automation recipe...");
    const input: AutomationCreateRecipeInput = {
      name: automationSetup.title.trim() || deriveCodingChatTitle(goal),
      goal,
      schedule: automationSetup.schedule,
      outputKind: automationSetup.outputKind,
      artifactKind: getAutomationArtifactKindFromGoal(goal),
      sources: automationSetup.sources,
      sourceWorkspace: "coding",
      qualityBar: automationSetup.qualityBar,
      requiresApproval: automationSetup.requiresApproval,
      enabled: true
    };
    const recipes = await autopilot.automation.createRecipe(input).catch(() => null);
    if (!recipes?.[0]) {
      setAutomationBusy(false);
      setAutomationStatus("Automation setup failed.");
      setCodingStatus("Automation setup failed.");
      return;
    }

    const createdRecipe = recipes[0];
    setAutomationRecipes(recipes);
    setAutomationDraft(goal);
    if (!runFirstPass) {
      setAutomationBusy(false);
      setAutomationStatus(`Saved automation: ${createdRecipe.name}.`);
      setCodingStatus(`Saved automation: ${createdRecipe.name}.`);
      return;
    }

    const result = await autopilot.automation.runNow(createdRecipe.id).catch((error: unknown) => ({
      success: false as const,
      reason: error instanceof Error ? error.message : "Automation run failed."
    }));
    await refreshAutomationState();
    await refreshArtifacts();
    setAutomationBusy(false);
    if (result.success) {
      setSelectedAutomationRunId(result.run.id);
      setAutomationStatus(`Automation finished: ${result.run.outputTitle ?? createdRecipe.name}.`);
      setCodingStatus(`Automation finished with quality ${result.run.qualityScore ?? createdRecipe.qualityBar}/100.`);
      return;
    }

    setAutomationStatus(result.reason);
    setCodingStatus(result.reason);
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
    advanceActiveCodingPlan("edited");
  }

  function openCodingReview(tabId?: string): void {
    setCodingRightPanel("code");
    setCodingRightSidebarOpen(true);
    setCodingReviewMode("review");
    advanceActiveCodingPlan("diff_viewed");
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

  async function refreshCodingPluginStatuses(): Promise<CodingPluginStatus[] | null> {
    const statuses = await autopilot.coding.pluginStatuses().catch(() => null);
    if (statuses) {
      const previousStatusById = new Map(codingPluginStatuses.map((status) => [status.id, status]));
      setCodingPluginStatuses(statuses);
      for (const status of statuses) {
        const previousStatus = previousStatusById.get(status.id);
        if (previousStatus?.status === "installing" && status.status !== "installing") {
          const plugin = codingPluginCatalog.find((candidate) => candidate.id === status.id);
          if (plugin) {
            setCodingStatus(getPluginStatusMessage(plugin, status, codingClock));
          }
          break;
        }
      }
    }
    return statuses;
  }

  async function refreshCodingDownloads(): Promise<void> {
    const downloads = await autopilot.downloads.list().catch(() => null);
    if (downloads) {
      setCodingDownloads(downloads);
    }
  }

  async function refreshCodingRepoState(): Promise<void> {
    if (!activeCodingProject) {
      setCodingRepoOverview(null);
      setCodingGitStatus(null);
      setCodingGitDiff(null);
      setSelectedCodingGitDiffPath(null);
      setCodingAgentPlan(null);
      return;
    }

    setCodingRepoLoading(true);
    const [overviewResult, gitStatusResult] = await Promise.all([
      autopilot.coding.repoOverview().catch(() => null),
      autopilot.coding.gitStatus().catch(() => null)
    ]);
    if (overviewResult?.success) {
      setCodingRepoOverview(overviewResult.overview);
    } else {
      setCodingRepoOverview(null);
    }

    if (gitStatusResult) {
      setCodingGitStatus(gitStatusResult);
    } else {
      setCodingGitStatus(null);
    }

    setCodingRepoLoading(false);
  }

  function advanceActiveCodingPlan(event: Parameters<typeof advanceCodingAgentPlan>[1]): void {
    setCodingAgentPlan((currentPlan) => (currentPlan ? advanceCodingAgentPlan(currentPlan, event) : currentPlan));
  }

  function approveCodingAgentPlan(): void {
    advanceActiveCodingPlan("approved");
    setCodingStatus("Coding work approved locally. Sending, committing, pushing, deleting, and publishing still need their own explicit approval.");
  }

  function rejectCodingAgentPlan(): void {
    advanceActiveCodingPlan("rejected");
    setCodingStatus("Coding work marked for revision. Ask Autopilot for changes before approving.");
  }

  async function createCodingAgentPlan(goalOverride?: string, chatOverride?: CodingChatThread | null): Promise<void> {
    const goal =
      goalOverride?.trim() ||
      codingDraftMessage.trim() ||
      (activeCodingProject ? `Understand ${activeCodingProject.name} and plan the next implementation safely.` : "Understand this project.");
    if (!activeCodingProject) {
      setCodingStatus("Open a project before creating an agent plan.");
      return;
    }

    setCodingBusy(true);
    setCodingStatus("Autopilot is reading the repo and preparing a plan.");
    const result = await autopilot.coding.createAgentPlan(goal).catch(() => ({
      success: false as const,
      reason: "Autopilot could not create a coding plan.",
      generatedAt: Date.now()
    }));
    setCodingBusy(false);
    if (!result.success) {
      setCodingStatus(result.reason);
      return;
    }

    setCodingAgentPlan(result.plan);
    setCodingStatus(`Plan ready for ${result.plan.projectName}.`);
    const chat = chatOverride ?? activeCodingAssistantChat ?? activeCodingChat ?? startNewCodingChat(activeCodingProject, result.plan.goal.slice(0, 64));
    const agentMessage = createCodingChatMessage(
      "agent",
      `${result.plan.summary}

Assessment: ${result.plan.assessment.size} task, ${result.plan.assessment.thinkingDepth} thinking.
Schema: ${result.plan.schema.expectedOutput}
Next step: ${result.plan.steps.find((step) => step.state === "pending")?.title ?? "review the plan"}.`
    );
    setCodingChats((currentChats) =>
      currentChats.map((currentChat) =>
        currentChat.id === chat.id
          ? {
              ...currentChat,
              updatedAt: Date.now(),
              messages: [...currentChat.messages, agentMessage]
            }
          : currentChat
      )
    );
  }

  async function runCodingCommandText(command: string): Promise<void> {
    const request: CodingCommandRequest = {
      command,
      cwd: activeCodingProject?.rootPath,
      approved: false
    };
    setCodingCommandDraft(command);
    setCodingBusy(true);
    setCodingCommandResult(null);
    const result: CodingCommandResult = await autopilot.coding.runCommand(request).catch(() => ({
      success: false,
      command,
      cwd: activeCodingProject?.rootPath,
      reason: "Command runner failed before it could start."
    }));
    setCodingBusy(false);
    openCodingTerminal({ launchShell: false });
    if (!result.success && result.requiresApproval) {
      setPendingCodingCommand(request);
      advanceActiveCodingPlan("command_waiting");
      setCodingStatus("Command is waiting for approval.");
      return;
    }

    setPendingCodingCommand(null);
    setCodingCommandResult(result);
    setCodingTerminalHistory((currentHistory) => [result, ...currentHistory].slice(0, 12));
    advanceActiveCodingPlan(result.success ? "command_succeeded" : "command_failed");
    setCodingStatus(result.success ? `Command finished in ${result.durationMs}ms.` : result.reason);
    await refreshCodingRepoState();
  }

  async function refreshCodingGitDiff(filePath?: string): Promise<void> {
    setCodingRightPanel("code");
    setCodingRightSidebarOpen(true);
    setSelectedCodingGitDiffPath(filePath ?? null);
    const result = await autopilot.coding.gitDiff(filePath).catch(() => ({
      success: false as const,
      filePath,
      reason: "Autopilot could not read git diff.",
      generatedAt: Date.now()
    }));
    setCodingGitDiff(result.success ? result.diff || "No git diff for this selection." : result.reason);
  }

  async function openCodingGitChangedFile(file: CodingGitChangedFile): Promise<void> {
    if (!activeCodingProject) {
      setCodingStatus("Open a project before reviewing git changes.");
      return;
    }

    const filePath = joinLocalPath(activeCodingProject.rootPath, file.path);
    await refreshCodingGitDiff(file.path);
    setCodingReviewMode("review");
    if (/D/u.test(file.status)) {
      setCodingStatus(`${file.path} was deleted. Showing its red removed-line diff in the review panel.`);
      return;
    }

    await openCodingPath(filePath, activeCodingProject.rootPath, file.status === "??" ? { baseContent: "" } : {});
    setCodingRightPanel("code");
    setCodingRightSidebarOpen(true);
    setCodingReviewMode("review");
    setCodingStatus(`Opened ${file.path} with review highlights.`);
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
    const refreshedStatuses = await refreshCodingPluginStatuses();
    const latestStatus = refreshedStatuses?.find((status) => status.id === plugin.id) ?? (result.success ? result.status : undefined);
    if (result.success) {
      setCodingStatus(getPluginStatusMessage(plugin, latestStatus, codingClock));
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
      advanceActiveCodingPlan("command_waiting");
      setCodingStatus("Command is waiting for approval.");
      return;
    }

    setPendingCodingCommand(null);
    setCodingCommandResult(result);
    setCodingTerminalHistory((currentHistory) => [result, ...currentHistory].slice(0, 12));
    advanceActiveCodingPlan(result.success ? "command_succeeded" : "command_failed");
    setCodingStatus(result.success ? `Command finished in ${result.durationMs}ms.` : result.reason);
  }

  async function sendCodingTerminalInput(commandOverride?: string): Promise<void> {
    const input = (commandOverride ?? codingCommandDraft).trim();
    if (!input) {
      return;
    }

    setCodingBusy(true);
    const result: CodingTerminalInputResult = await autopilot.coding.sendTerminalInput({ input }).catch(() => ({
      success: false as const,
      reason: "PowerShell did not accept that command."
    }));
    setCodingBusy(false);
    if (result.success) {
      setCodingCommandDraft("");
      setCodingTerminalOutput(result.output);
      setCodingStatus("Sent command to PowerShell.");
      return;
    }

    setCodingStatus(result.reason);
    if (result.output) {
      setCodingTerminalOutput(result.output);
    }
  }

  function getCodingTerminalDisplay(): string {
    const output = getCodingTerminalOutput();
    if (codingTerminalDraftShouldAttachToPrompt()) {
      return `${output}${codingCommandDraft}`;
    }

    if (codingCommandDraft) {
      return `${output}\n${codingCommandDraft}`;
    }

    return output;
  }

  function codingTerminalDraftShouldAttachToPrompt(): boolean {
    return Boolean(codingCommandDraft && codingTerminalLaunch?.success && codingTerminalLaunch.running);
  }

  function focusCodingTerminal(): void {
    codingTerminalOutputRef.current?.focus();
  }

  function handleCodingTerminalKeyDown(event: ReactKeyboardEvent<HTMLTextAreaElement>): void {
    if (event.defaultPrevented || event.altKey || event.metaKey) {
      return;
    }

    if (event.ctrlKey) {
      if (event.key.toLowerCase() === "c") {
        return;
      }
      if (event.key.toLowerCase() === "v") {
        return;
      }
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const input = codingCommandDraft.trim();
      if (input) {
        void sendCodingTerminalInput(input);
      }
      return;
    }

    if (event.key === "Backspace") {
      event.preventDefault();
      setCodingCommandDraft((currentDraft) => currentDraft.slice(0, -1));
      return;
    }

    if (event.key === "Delete") {
      event.preventDefault();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setCodingCommandDraft("");
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      setCodingCommandDraft((currentDraft) => `${currentDraft}  `);
      return;
    }

    if (event.key.length === 1 && !event.ctrlKey) {
      event.preventDefault();
      setCodingCommandDraft((currentDraft) => `${currentDraft}${event.key}`);
    }
  }

  function handleCodingTerminalPaste(event: ReactClipboardEvent<HTMLTextAreaElement>): void {
    event.preventDefault();
    const text = event.clipboardData.getData("text").replace(/\r?\n/g, " ");
    if (text) {
      setCodingCommandDraft((currentDraft) => `${currentDraft}${text}`);
    }
  }

  function getCodingTerminalOutput(): string {
    if (codingTerminalOutput) {
      return codingTerminalOutput;
    }

    if (codingCommandResult) {
      return [
        "One-off command executed by Windows PowerShell",
        `cwd: ${codingCommandResult.cwd ?? activeCodingProject?.rootPath ?? "~"}`,
        `command: ${codingCommandResult.command ?? codingCommandDraft}`,
        codingCommandResult.success
          ? `exit: ${codingCommandResult.exitCode} (${codingCommandResult.durationMs}ms)`
          : `error: ${codingCommandResult.reason}`,
        "",
        codingCommandResult.stdout ?? "",
        codingCommandResult.stderr ?? ""
      ]
        .filter(Boolean)
        .join("\n");
    }

    if (codingTerminalOpening) {
      return ["Starting Windows PowerShell...", `cwd: ${activeCodingProject?.rootPath ?? "home directory"}`].join("\n");
    }

    if (codingTerminalLaunch) {
      if (codingTerminalLaunch.success) {
        return [
          `${codingTerminalLaunch.shellName} is running, waiting for output...`,
          `cwd: ${codingTerminalLaunch.cwd}`,
          codingTerminalLaunch.pid ? `pid: ${codingTerminalLaunch.pid}` : "",
          "",
          "Type directly in this terminal and press Enter."
        ]
          .filter(Boolean)
          .join("\n");
      }

      return [
        `${codingTerminalLaunch.shellName ?? "PowerShell"} did not open.`,
        codingTerminalLaunch.cwd ? `cwd: ${codingTerminalLaunch.cwd}` : "",
        `reason: ${codingTerminalLaunch.reason}`
      ]
        .filter(Boolean)
        .join("\n");
    }

    return [
      "No PowerShell session is running yet.",
      `cwd: ${activeCodingProject?.rootPath ?? "home directory"}`,
      "",
      "Open PowerShell to start an embedded terminal process."
    ].join("\n");
  }

  async function researchFromCoding(promptOverride?: string): Promise<void> {
    const prompt = (promptOverride ?? codingResearchDraft).trim();
    if (!prompt) {
      setCodingStatus("Ask an automation or research question first.");
      return;
    }

    const userMessage = createCodingResearchMessage("user", prompt);
    const pendingMessage = createCodingResearchMessage("agent", "Running browser-backed research as part of this automation...", { status: "working" });
    setCodingResearchMessages((currentMessages) => [...currentMessages, userMessage, pendingMessage]);
    setCodingBusy(true);
    setCodingStatus(`Researching for automation: ${prompt}.`);
    const result = await autopilot.coding.research(prompt).catch(() => ({
      success: false as const,
      input: prompt,
      reason: "Coding research could not start.",
      generatedAt: Date.now(),
      iterations: [],
      sources: []
    }));
    setCodingResearchMessages((currentMessages) =>
      currentMessages.map((message) =>
        message.id === pendingMessage.id
          ? {
              ...message,
              content: result.success ? result.answer : result.reason,
              result,
              status: result.success ? undefined : "error"
            }
          : message
      )
    );
    setCodingBusy(false);
    setCodingStatus(result.success ? `Research found ${result.sources.length} source${result.sources.length === 1 ? "" : "s"}.` : result.reason);
  }

  function setWorkspaceAutomationStatus(sourceWorkspace: AutomationSourceWorkspace, message: string): void {
    setAutomationStatus(message);
    setBackgroundWorkStatus(message);
    if (sourceWorkspace === "coding") {
      setCodingStatus(message);
    }
    if (sourceWorkspace === "design") {
      setArtifactStatus(message);
    }
    if (sourceWorkspace === "productivity") {
      setProactiveWorkStatus(message);
    }
    if (sourceWorkspace === "browser") {
      setAssistantResponse({
        success: true,
        answer: message,
        model: "Automation",
        sources: []
      });
    }
  }

  async function createAndRunAutomationFromWorkspace(
    goalInput: string,
    sourceWorkspace: AutomationSourceWorkspace,
    options: { explicit?: boolean } = {}
  ): Promise<boolean> {
    const goal = goalInput.trim();
    if (!goal) {
      return false;
    }

    const intent = detectAutomationIntent(goal, sourceWorkspace);
    if (!options.explicit && !intent.isAutomation) {
      return false;
    }

    if (automationBusy) {
      const busyMessage = "Automation is already running. I kept this request in chat; run it after the current automation finishes.";
      setWorkspaceAutomationStatus(sourceWorkspace, busyMessage);
      return true;
    }

    const statusPrefix = options.explicit
      ? "Automation started"
      : `I saved this as an automation from ${getAutomationWorkspaceLabel(sourceWorkspace)} because it looks repeatable`;
    setAutomationBusy(true);
    setWorkspaceAutomationStatus(sourceWorkspace, `${statusPrefix}: ${goal}`);
    const input: AutomationCreateRecipeInput = {
      name: deriveCodingChatTitle(goal),
      goal,
      schedule: intent.isAutomation ? intent.schedule : /\b(daily|every day)\b/iu.test(goal) ? "daily" : /\b(weekly|every week)\b/iu.test(goal) ? "weekly" : "manual",
      sources: getAutomationSourcesForWorkspace(goal, sourceWorkspace),
      outputKind: getAutomationOutputKindFromGoal(goal),
      artifactKind: getAutomationArtifactKindFromGoal(goal),
      sourceWorkspace,
      qualityBar: 84,
      requiresApproval: true
    };
    const recipes = await autopilot.automation.createRecipe(input).catch(() => null);
    if (!recipes?.[0]) {
      setAutomationBusy(false);
      setWorkspaceAutomationStatus(sourceWorkspace, "Automation setup failed.");
      return true;
    }

    setAutomationRecipes(recipes);
    setWorkspaceAutomationStatus(sourceWorkspace, "Running automation with quality checks...");
    const result = await autopilot.automation.runNow(recipes[0].id).catch((error: unknown) => ({
      success: false as const,
      reason: error instanceof Error ? error.message : "Automation run failed."
    }));
    await refreshAutomationState();
    await refreshArtifacts();
    if (result.success) {
      setSelectedAutomationRunId(result.run.id);
      setWorkspaceAutomationStatus(
        sourceWorkspace,
        `Automation finished: ${result.run.outputTitle ?? recipes[0].name}. Quality score ${result.run.qualityScore ?? 0}/100.`
      );
    } else {
      if ("run" in result && result.run?.id) {
        setSelectedAutomationRunId(result.run.id);
      }
      setWorkspaceAutomationStatus(sourceWorkspace, result.reason);
    }
    setAutomationBusy(false);
    return true;
  }

  async function runAutomationFromCoding(promptOverride?: string): Promise<void> {
    const goal = (promptOverride ?? automationDraft).trim();
    if (!goal) {
      setCodingStatus("Describe what Autopilot should automate first.");
      return;
    }

    await createAndRunAutomationFromWorkspace(goal, "coding", { explicit: true });
  }

  async function routeSelectedWorkItem(workItem: WorkItem): Promise<void> {
    if (routingWorkItemIds[workItem.id]) {
      return;
    }

    if (getWorkItemOwnership(workItem) === "user") {
      const reason =
        workItem.source.provider === "google-calendar"
          ? "Calendar events stay on your calendar as user-owned commitments. Autopilot will keep the source visible instead of assigning the event as AI work."
          : `"${workItem.title}" needs your judgment or final action, so Autopilot is keeping it in User must handle.`;
      setBackgroundWorkStatus(reason);
      return;
    }

    if (isWorkItemRouteBlocked(workItem)) {
      setBackgroundWorkStatus(getRouteReviewReason(workItem));
      return;
    }

    setRoutingWorkItemIds((current) => ({ ...current, [workItem.id]: true }));
    setBackgroundWorkStatus(`Routing "${workItem.title}" to ${workItem.assignedRoles.join(", ")}.`);
    const result = await autopilot.productivity.routeWorkItem(workItem.id).catch((error: unknown) => ({
      success: false as const,
      reason: error instanceof Error ? error.message : "Autopilot could not route that work item.",
      workItems,
      allAssignments: workAssignments
    }));
    setWorkItems(result.workItems);
    setWorkAssignments(result.allAssignments);
    const nextDrafts = await autopilot.productivity.listDrafts().catch(() => null);
    if (nextDrafts) {
      productivityDraftsRef.current = nextDrafts;
      setProductivityDrafts(nextDrafts);
      setProductivityDraftsLoaded(true);
    }
    await Promise.all([refreshArtifacts(), refreshAutomationState()]);
    setBackgroundWorkStatus(result.success ? `"${workItem.title}" is now assigned.` : result.reason);
    setRoutingWorkItemIds((current) => {
      const next = { ...current };
      delete next[workItem.id];
      return next;
    });
  }

  function isWorkItemRouteBlocked(workItem: WorkItem): boolean {
    return needsRouteReview(workItem) && !confirmedRouteWorkItemIds.includes(workItem.id);
  }

  function confirmWorkItemRoute(workItem: WorkItem): void {
    setConfirmedRouteWorkItemIds((current) => (current.includes(workItem.id) ? current : [...current, workItem.id]));
    setBackgroundWorkStatus(`Confirmed route for "${workItem.title}". Autopilot can now create the workspace handoff.`);
  }

  async function startProactiveWork(trigger: "manual" | "auto" = "manual"): Promise<void> {
    if (proactiveWorkBusy) {
      return;
    }

    const snapshot = await loadWorkOrchestrationSnapshot();
    if (!snapshot) {
      const message = "Autopilot could not load the current work queue.";
      setProactiveWorkStatus(message);
      setBackgroundWorkStatus(message);
      return;
    }

    const plan = buildProactiveWorkPlan({
      workItems: snapshot.items.filter((item) => item.source.provider !== "google-calendar"),
      assignments: snapshot.assignments
    });
    if (plan.startableItems.length === 0) {
      const message =
        plan.needsReviewCount > 0
          ? `${plan.needsReviewCount} prepared ${plan.needsReviewCount === 1 ? "item needs" : "items need"} review before Autopilot starts more work.`
          : "No safe work is ready to start yet. Sync Gmail, Calendar, or another source to refresh Today's Call.";
      setProactiveWorkStatus(message);
      setBackgroundWorkStatus(message);
      return;
    }

    setProactiveWorkBusy(true);
    setProactiveWorkStatus(`${trigger === "auto" ? "Autopilot noticed" : "Starting"} ${plan.startableItems.length} safe work item${plan.startableItems.length === 1 ? "" : "s"}.`);
    setBackgroundWorkStatus("Autopilot is preparing local work. Final external steps still need approval.");

    let routedCount = 0;
    let failedCount = 0;
    let latestWorkItems = snapshot.items;
    let latestAssignments = snapshot.assignments;

    for (const proactiveItem of plan.startableItems) {
      const workItem = latestWorkItems.find((item) => item.id === proactiveItem.workItemId);
      if (!workItem) {
        failedCount += 1;
        continue;
      }

      setRoutingWorkItemIds((current) => ({ ...current, [workItem.id]: true }));
      setProactiveWorkStatus(`Preparing ${routedCount + 1} of ${plan.startableItems.length}: ${workItem.title}`);
      const result = await autopilot.productivity.routeWorkItem(workItem.id).catch((error: unknown) => ({
        success: false as const,
        reason: error instanceof Error ? error.message : "Autopilot could not route that work item.",
        workItems: latestWorkItems,
        allAssignments: latestAssignments
      }));

      latestWorkItems = result.workItems;
      latestAssignments = result.allAssignments;
      setWorkItems(result.workItems);
      setWorkAssignments(result.allAssignments);
      if (result.success) {
        routedCount += 1;
      } else {
        failedCount += 1;
      }
      setRoutingWorkItemIds((current) => {
        const next = { ...current };
        delete next[workItem.id];
        return next;
      });
    }

    const nextDrafts = await autopilot.productivity.listDrafts().catch(() => null);
    if (nextDrafts) {
      productivityDraftsRef.current = nextDrafts;
      setProductivityDrafts(nextDrafts);
      setProductivityDraftsLoaded(true);
    }
    await Promise.all([refreshArtifacts(), refreshAutomationState()]);

    const finalStatus =
      routedCount > 0
        ? `Started ${routedCount} safe work item${routedCount === 1 ? "" : "s"}${failedCount > 0 ? `; ${failedCount} failed` : ""}. Review outputs before any send, share, submit, publish, delete, or payment.`
        : `Autopilot tried ${failedCount} work item${failedCount === 1 ? "" : "s"}, but none started.`;
    setProactiveWorkStatus(finalStatus);
    setBackgroundWorkStatus(finalStatus);
    setProactiveWorkBusy(false);
  }

  async function startTodaysCallMove(move: TodaysCallMove): Promise<void> {
    const workItem = workItems.find((item) => item.id === move.workItemId);
    if (!workItem) {
      setBackgroundWorkStatus("That work item is no longer available. Refresh Today's Call and try again.");
      return;
    }

    setSelectedWorkItemId(workItem.id);

    if (move.bucket === "ai_can_handle") {
      await routeSelectedWorkItem(workItem);
      return;
    }

    if (move.bucket === "needs_approval") {
      setBackgroundWorkStatus(`Review "${workItem.title}" before Autopilot takes the final external step.`);
      return;
    }

    if (move.bucket === "ai_working") {
      setBackgroundWorkStatus(`Autopilot is already working on "${workItem.title}". Open its assignment trail to monitor output and approval.`);
      return;
    }

    setBackgroundWorkStatus(`"${workItem.title}" needs your judgment. Autopilot can keep the source and context ready for you.`);
  }

  async function setAssignmentReviewState(assignment: WorkAssignment, state: "completed" | "failed"): Promise<void> {
    const actionLabel = state === "completed" ? "approved" : "rejected";
    setBackgroundWorkStatus(`Marking ${getWorkspaceRoleLabel(assignment.role)} work as ${actionLabel}.`);
    const reason =
      state === "completed"
        ? "User approved this output. Sending, sharing, publishing, submitting, deleting, and purchases still require their own final confirmation."
        : "User rejected this output. Autopilot should revise it before any final step.";
    const nextAssignments = await autopilot.productivity.updateWorkAssignment(assignment.id, { state, reason }).catch(() => null);
    if (nextAssignments) {
      setWorkAssignments(nextAssignments);
      setBackgroundWorkStatus(`${getWorkspaceRoleLabel(assignment.role)} work ${actionLabel}.`);
      return;
    }

    setBackgroundWorkStatus(`Could not mark ${getWorkspaceRoleLabel(assignment.role)} work as ${actionLabel}.`);
  }

  async function sendCodingChatMessage(): Promise<void> {
    const message = codingDraftMessage.trim();
    if (!message) {
      return;
    }

    let targetChat = activeCodingAssistantChat;
    if (!targetChat) {
      targetChat = createCodingChatThread(activeCodingProject);
      setCodingChats((currentChats) => [targetChat as CodingChatThread, ...currentChats].slice(0, MAX_CODING_CHATS));
      openCodingAssistant(targetChat);
    } else {
      openCodingAssistant(targetChat);
    }

    setActiveCodingAssistantChatId(targetChat.id);
    const now = Date.now();
    const nextTitle =
      targetChat.messages.filter((chatMessage) => chatMessage.role === "user").length === 0 ? deriveCodingChatTitle(message) : targetChat.title;
    const userMessage = createCodingChatMessage("user", message);
    const automationIntent = detectAutomationIntent(message, "coding");
    const agentMessage = createCodingChatMessage(
      "agent",
      automationIntent.isAutomation
        ? `I saved this as an automation because it looks like a ${automationIntent.triggerReason}. I will run the first pass now, save the output with quality checks, and keep final send/share/publish steps behind approval.`
        : createCodingAgentReply(message, targetChat.projectName)
    );

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
    if (automationIntent.isAutomation) {
      setCodingStatus(`Automation detected from chat: ${nextTitle}`);
      await createAndRunAutomationFromWorkspace(message, "coding");
      return;
    }

    setCodingStatus(`Agent chat updated: ${nextTitle}`);
    if (activeCodingProject) {
      void createCodingAgentPlan(message, targetChat);
    }
  }

  async function openGithubForCoding(): Promise<void> {
    try {
      setBrowserDownloadsOpen(false);
      setAssistantOpen(false);
      await switchToBrowserWorkspace();
      await autopilot.tabs.create("https://github.com/");
      setCodingStatus("Opened GitHub in the Browser workspace.");
    } catch {
      setCodingStatus("Autopilot could not open GitHub in the Browser workspace.");
    }
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

  function startGlobalRailResize(event: ReactPointerEvent<HTMLDivElement>): void {
    if (!globalRailOpen) {
      return;
    }

    event.preventDefault();
    const startX = event.clientX;
    const startWidth = globalRailWidthRef.current;
    setIsGlobalRailResizing(true);

    function handlePointerMove(moveEvent: PointerEvent): void {
      const nextWidth = clampGlobalRailWidth(startWidth + moveEvent.clientX - startX);
      setGlobalRailWidth(nextWidth);
      setGlobalRailExpanded(nextWidth >= GLOBAL_RAIL_LABEL_WIDTH);
    }

    function stopResizing(): void {
      setIsGlobalRailResizing(false);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResizing);
      window.removeEventListener("pointercancel", stopResizing);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResizing);
    window.addEventListener("pointercancel", stopResizing);
  }

  function toggleGlobalRail(): void {
    if (!globalRailOpen) {
      setGlobalRailOpen(true);
      return;
    }

    setGlobalRailOpen(false);
  }

  const bookmarkFolderActionLabel = getFolderCreationParent(bookmarkContextMenu?.target ?? null) ? "Add folder inside" : "Add folder";

  function renderCodingAgentPlanPanel(): JSX.Element {
    return (
      <section className="coding-agent-plan-panel" aria-label="Codex-style coding workflow">
        <div className="coding-agent-plan-heading">
          <span>
            <p className="panel-kicker">Agent workflow</p>
            <h3>{activeCodingProject ? "Plan, run, review" : "Open a project to start"}</h3>
          </span>
          <div>
            <button type="button" disabled={!activeCodingProject || codingRepoLoading} onClick={() => void refreshCodingRepoState()}>
              <RotateCw size={14} aria-hidden="true" />
              Refresh
            </button>
            <button type="button" disabled={!activeCodingProject || codingBusy} onClick={() => void createCodingAgentPlan()}>
              <Sparkles size={14} aria-hidden="true" />
              Plan work
            </button>
          </div>
        </div>

        <div className="coding-repo-intel-grid">
          <span>
            <strong>{codingRepoOverview?.packageManager ?? "No repo"}</strong>
            <small>{codingRepoOverview?.frameworkHints.join(", ") || "Open a local folder so Autopilot can read project structure."}</small>
          </span>
          <span>
            <strong>{codingRepoOverview?.gitBranch ?? "No git state"}</strong>
            <small>{codingGitChangedFiles.length} changed file{codingGitChangedFiles.length === 1 ? "" : "s"} from git</small>
          </span>
          <span>
            <strong>{codingRepoOverview?.scripts.length ?? 0}</strong>
            <small>scripts found</small>
          </span>
        </div>

        <p className="coding-repo-summary">
          {codingRepoLoading
            ? "Reading package scripts, git state, and key files..."
            : codingRepoOverview?.summary ?? "Autopilot will summarize the repo, scripts, stack, and git state here once a project is selected."}
        </p>

        {codingAgentPlan ? (
          <>
            <div className="coding-agent-assessment" aria-label="Task assessment">
              <span>
                <strong>{codingAgentPlan.assessment.size}</strong>
                <small>{codingAgentPlan.assessment.thinkingDepth} thinking</small>
              </span>
              <p>{codingAgentPlan.assessment.reason}</p>
              <b>{codingAgentPlan.phase}</b>
            </div>

            <div className="coding-agent-loop" aria-label="Execution loop">
              {codingAgentPlan.assessment.executionLoop.map((step, index) => (
                <span key={`${codingAgentPlan.id}:${step}`}>
                  <b>{index + 1}</b>
                  {step}
                </span>
              ))}
            </div>

            <div className="coding-agent-schema" aria-label="Implementation schema">
              <span>
                <strong>Schema before edits</strong>
                <small>{codingAgentPlan.schema.expectedOutput}</small>
              </span>
              <div>
                <p>
                  <b>Files</b>
                  {codingAgentPlan.schema.touchedFiles.slice(0, 4).join(", ")}
                </p>
                <p>
                  <b>Tests</b>
                  {codingAgentPlan.schema.testPlan.slice(0, 3).join(", ")}
                </p>
                <p>
                  <b>Safety</b>
                  {codingAgentPlan.schema.safetyRisks.slice(0, 2).join(" ")}
                </p>
              </div>
            </div>

            <ol className="coding-agent-plan-steps">
              {codingAgentPlan.steps.map((step) => (
                <li className={step.state} key={step.id}>
                  <span>{step.state === "completed" ? <Check size={14} aria-hidden="true" /> : <ListChecks size={14} aria-hidden="true" />}</span>
                  <div>
                    <strong>{step.title}</strong>
                    <small>{step.detail}</small>
                  </div>
                  {step.command && (
                    <button
                      type="button"
                      onClick={() => {
                        if (step.command) {
                          void runCodingCommandText(step.command);
                        }
                      }}
                    >
                      <Play size={13} aria-hidden="true" />
                      Run
                    </button>
                  )}
                </li>
              ))}
            </ol>

            {(codingAgentPlan.assessment.ambiguities.length > 0 || codingAgentPlan.risks.length > 0) && (
              <div className="coding-agent-risk-list" aria-label="Ambiguities and risks">
                {codingAgentPlan.assessment.ambiguities.slice(0, 2).map((ambiguity) => (
                  <span key={ambiguity}>{ambiguity}</span>
                ))}
                {codingAgentPlan.risks.slice(0, 3).map((risk) => (
                  <span key={risk}>{risk}</span>
                ))}
              </div>
            )}

            <div className="coding-agent-approval-row" aria-label="Coding approval controls">
              <button type="button" disabled={codingAgentPlan.phase === "approved"} onClick={approveCodingAgentPlan}>
                <ShieldCheck size={14} aria-hidden="true" />
                Approve local work
              </button>
              <button type="button" className="danger" disabled={codingAgentPlan.phase === "approved"} onClick={rejectCodingAgentPlan}>
                <X size={14} aria-hidden="true" />
                Reject and revise
              </button>
            </div>
          </>
        ) : (
          <div className="coding-agent-plan-empty">
            <Sparkles size={18} aria-hidden="true" />
            <span>
              <strong>No active plan yet.</strong>
              <small>Ask Autopilot to plan a change, then run commands and review the diff from here.</small>
            </span>
          </div>
        )}

        {codingPlanVerificationCommands.length > 0 && (
          <div className="coding-plan-command-row" aria-label="Suggested verification commands">
            {codingPlanVerificationCommands.map((command) => (
              <button key={command} type="button" onClick={() => void runCodingCommandText(command)}>
                <Terminal size={13} aria-hidden="true" />
                {command}
              </button>
            ))}
          </div>
        )}

        {codingGitChangedFiles.length > 0 && (
          <div className="coding-git-change-strip" aria-label="Git changed files">
            {codingGitChangedFiles.slice(0, 6).map((file) => (
              <button key={`${file.status}-${file.path}`} type="button" onClick={() => void refreshCodingGitDiff(file.path)}>
                <FileText size={13} aria-hidden="true" />
                <span>{file.path}</span>
                <b>{file.status}</b>
              </button>
            ))}
          </div>
        )}
      </section>
    );
  }

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
    setDesignProjectDrawerOpen(false);
  }

  function openMoreDesignProjects(): void {
    setDesignProjectFilter("");
    setDesignProjectDrawerOpen(false);
    setAllDesignProjectsOpen(true);
  }

  function activateDesignToolSection(section: DesignToolSection, status?: string): void {
    setDesignToolSection(section);
    setArtifactStatus(
      status ??
        {
          projects: "Project picker is active. Choose a project or create a new artifact from the assistant.",
          pages: "Pages shows document pages, deck slides, and website sections for the selected artifact.",
          components: "Components shows reusable sections and blocks Autopilot can revise.",
          assets: "Assets shows source media, generated files, and export-ready resources.",
          styles: "Styles is ready for color, type, spacing, and responsive polish prompts.",
          plugins: "Plugins shows export and handoff actions for this artifact.",
          team: "Team shows review state, source context, and final approval actions.",
          settings: "Design settings shows canvas controls, source disclosure, and local workspace preferences."
        }[section]
    );
  }

  function cycleDesignCanvasWidth(): void {
    setDesignCanvasWidth((currentWidth) => {
      const currentIndex = DESIGN_CANVAS_WIDTHS.indexOf(currentWidth);
      const nextWidth = DESIGN_CANVAS_WIDTHS[(currentIndex + 1) % DESIGN_CANVAS_WIDTHS.length] ?? DESIGN_CANVAS_WIDTHS[0];
      setArtifactStatus(`Canvas frame set to ${nextWidth}px.`);
      return nextWidth;
    });
  }

  function cycleDesignCanvasZoom(): void {
    setDesignCanvasZoom((currentZoom) => {
      const currentIndex = DESIGN_CANVAS_ZOOMS.indexOf(currentZoom);
      const nextZoom = DESIGN_CANVAS_ZOOMS[(currentIndex + 1) % DESIGN_CANVAS_ZOOMS.length] ?? DESIGN_CANVAS_ZOOMS[0];
      setArtifactStatus(`Canvas zoom set to ${nextZoom}%.`);
      return nextZoom;
    });
  }

  function toggleDesignPreviewMode(): void {
    if (!activeArtifact) {
      setArtifactStatus("Create or select an artifact to preview.");
      return;
    }

    setDesignPreviewMode((isPreviewing) => {
      const nextPreviewMode = !isPreviewing;
      setArtifactStatus(nextPreviewMode ? "Preview mode hides editor guides on the canvas." : "Edit mode shows canvas guides and selection outlines.");
      return nextPreviewMode;
    });
  }

  function moveDesignVersionPreview(direction: -1 | 1): void {
    if (!activeArtifact || activeArtifactVersionIndex < 0) {
      setArtifactStatus("Create or select an artifact before using version navigation.");
      return;
    }

    const currentPreviewIndex = designPreviewVersionIndex ?? activeArtifactVersionIndex;
    const nextPreviewIndex = Math.min(Math.max(currentPreviewIndex + direction, 0), activeArtifact.versions.length - 1);
    const nextVersion = activeArtifact.versions[nextPreviewIndex];
    if (!nextVersion || nextPreviewIndex === currentPreviewIndex) {
      setArtifactStatus(direction < 0 ? "No earlier version to preview." : "No newer version to preview.");
      return;
    }

    setDesignPreviewVersionIndex(nextPreviewIndex);
    setArtifactEditorDraft(artifactContentToEditorText(nextVersion.content));
    setArtifactStatus(`${direction < 0 ? "Loaded previous" : "Loaded next"} version: ${nextVersion.summary}`);
  }

  function runDesignPreview(): void {
    if (!activeArtifact || !designCanvasVersion) {
      setArtifactStatus("Create or select an artifact before running preview.");
      return;
    }

    setDesignPreviewMode(true);
    setArtifactStatus(
      designCanvasVersion.content.kind === "website_design"
        ? "Interactive website preview is running on the canvas."
        : `${getArtifactKindLabel(designCanvasVersion.content.kind)} preview is ready on the canvas.`
    );
  }

  function selectDesignVersion(versionIndex: number): void {
    if (!activeArtifact) {
      return;
    }

    const version = activeArtifact.versions[versionIndex];
    if (!version) {
      return;
    }

    setDesignPreviewVersionIndex(versionIndex);
    setArtifactEditorDraft(artifactContentToEditorText(version.content));
    setArtifactStatus(`Loaded version for preview/editing: ${version.summary}`);
  }

  function applyDesignAssistantPreset(section: DesignToolSection, prompt: string): void {
    activateDesignToolSection(section);
    setArtifactPrompt(prompt);
    setDesignAssistantCollapsed(false);
    setArtifactStatus("Prompt loaded in Ask Autopilot. Send it when you are ready.");
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
    const statusLabel = project.exportedProjectPath ? "Exported" : project.needsReview ? "Reviewing" : project.generatedByAi ? "Designing" : null;
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
        {statusLabel && (
          <span className="design-project-status" data-status={statusLabel.toLowerCase()}>
            {statusLabel}
          </span>
        )}
        {project.pinned && <Star size={14} aria-label="Pinned project" />}
      </button>
    );
  }

  function getWorkspaceRoleLabel(role: WorkspaceRole): string {
    switch (role) {
      case "automation":
        return "Automation";
      case "coding":
        return "Coding";
      case "design":
        return "Design";
      case "productivity":
        return "Productivity";
    }
  }

  function getWorkspaceRoleIcon(role: WorkspaceRole): LucideIcon {
    switch (role) {
      case "automation":
        return Sparkles;
      case "coding":
        return Code2;
      case "design":
        return Palette;
      case "productivity":
        return Check;
    }
  }

  function getAssignmentStateLabel(state: WorkAssignment["state"]): string {
    switch (state) {
      case "queued":
        return "Queued";
      case "running":
        return "Running";
      case "waiting_for_user":
        return "Needs review";
      case "completed":
        return "Done";
      case "failed":
        return "Failed";
    }
  }

  function getWorkItemStatusLabel(item: WorkItem): string {
    const assignments = assignmentsByWorkItemId.get(item.id) ?? [];
    if (assignments.some((assignment) => assignment.state === "waiting_for_user")) {
      return "Needs approval";
    }
    if (assignments.some((assignment) => assignment.state === "running")) {
      return "AI working";
    }
    if (assignments.some((assignment) => assignment.state === "failed")) {
      return "Needs revision";
    }
    if (assignments.some((assignment) => assignment.state === "completed")) {
      return "Output ready";
    }
    if (isWorkItemRouteBlocked(item)) {
      return "Review route";
    }
    return getWorkItemOwnership(item) === "ai" ? "Needs doing" : "User must handle";
  }

  function getPermissionCopy(item: WorkItem): string {
    switch (getWorkItemPermissionLevel(item)) {
      case "approval":
        return "Red: final approval required before any send, share, publish, submit, delete, or payment.";
      case "draft":
        return "Yellow: Autopilot can draft, edit, research, and prepare local work.";
      case "read":
        return "Green: Autopilot can read the source and prepare context.";
    }
  }

  function getProactiveSafetyLabel(item: ProactiveWorkItem): string {
    switch (item.safety) {
      case "approval_gated":
        return "Stops for approval";
      case "local_draft":
        return "Local draft only";
      case "read_only":
        return "Read-only prep";
    }
  }

  function getProactiveStatusTone(item: ProactiveWorkItem): "ready" | "working" | "review" | "user" {
    switch (item.status) {
      case "ready_to_start":
        return "ready";
      case "already_working":
        return "working";
      case "needs_review":
        return "review";
      case "user_only":
        return "user";
    }
  }

  function getAssignmentOutputLabel(assignment: WorkAssignment): string {
    if (assignment.linkedDraftId) {
      return "Productivity draft linked";
    }
    if (assignment.linkedArtifactId) {
      return "Artifact linked";
    }
    if (assignment.linkedAutomationRunId) {
      return "Automation run linked";
    }
    if (assignment.linkedCodingProjectPath) {
      return "Coding project linked";
    }
    return assignment.state === "queued" ? "Waiting to start" : "No output linked yet";
  }

  function getWorkItemInstruction(item: WorkItem): string {
    const owner = getWorkItemOwnership(item) === "ai" ? "Ask Autopilot to prepare" : "Handle personally";
    return `${owner}: ${item.title}.`;
  }

  const globalRailWide = globalRailOpen && globalRailWidth >= GLOBAL_RAIL_LABEL_WIDTH;
  const globalRailToggleLabel = "Hide rail";

  return (
    <main
      className={`app-shell ${view === "browser" && sidebarOpen ? "browser-sidebar-open" : "sidebar-collapsed"} ${
        isSidebarResizing ? "sidebar-resizing" : ""
      } ${
        isCodingSidebarResizing ? "coding-sidebar-resizing" : ""
      } ${
        isGlobalRailResizing ? "global-rail-resizing" : ""
      } ${
        globalRailWide ? "rail-expanded" : ""
      } ${
        globalRailOpen ? "" : "rail-hidden"
      }`}
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
          "--coding-sidebar-width": `${codingSidebarWidth}px`,
          "--workspace-rail-width": `${globalRailOpen ? globalRailWidth : 0}px`
        } as CSSProperties
      }
    >
      {globalRailOpen && (
        <>
          <aside className={`workspace-rail ${globalRailWide ? "expanded" : ""}`} aria-label="Workspace switcher">
            <button className="rail-logo-button" type="button" aria-label="Preview Autopilot icon" onClick={() => setIconPreviewOpen(true)}>
              <img className="rail-logo" src="./autopilot-logo.svg" alt="" />
              <span className="rail-label">Autopilot</span>
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
                    <span className="rail-label">{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="rail-bottom-actions">
              <button
                className="rail-workspace-button rail-expand-toggle"
                type="button"
                aria-label="Hide workspace rail"
                title="Hide rail"
                onClick={toggleGlobalRail}
              >
                <ChevronLeft size={18} aria-hidden="true" />
                <span className="rail-label">{globalRailToggleLabel}</span>
              </button>
              <button
                className={`rail-workspace-button rail-settings ${view === "settings" ? "active" : ""}`}
                type="button"
                aria-label={view === "settings" ? "Close settings" : "Settings"}
                title="Settings"
                onClick={() => setView((currentView) => (currentView === "settings" ? "browser" : "settings"))}
              >
                <Settings size={18} aria-hidden="true" />
                <span className="rail-label">Settings</span>
              </button>
            </div>
          </aside>
          <div className="workspace-rail-resize-handle" aria-hidden="true" onPointerDown={startGlobalRailResize} />
        </>
      )}

      {!globalRailOpen && (
        <button className="rail-reopen-button" type="button" aria-label="Show workspace rail" onClick={toggleGlobalRail}>
          <ChevronRight size={17} aria-hidden="true" />
          <span>Workspaces</span>
        </button>
      )}

      {view === "browser" && (
      <aside className="sidebar browser-sidebar" aria-label="Browser navigation">
        <div className="sidebar-scroll">
          <section className="sidebar-brand" aria-label="Autopilot Browser">
            <button className="icon-preview-trigger brand-icon-trigger" type="button" aria-label="Preview Autopilot Browser icon" onClick={() => setIconPreviewOpen(true)}>
              <img className="brand-logo" src="./autopilot-logo.svg" alt="" />
            </button>
            <span>
              <strong>Autopilot Browser</strong>
              <small>AI browser workspace</small>
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

      <section className={`browser-shell ${view === "browser" ? "" : "app-view"}`} aria-label="Autopilot Browser workspace">
        <header className="titlebar">
          <div className="app-title">
            <button className="icon-preview-trigger app-icon-trigger" type="button" aria-label="Preview Autopilot Browser icon" onClick={() => setIconPreviewOpen(true)}>
              <img className="app-logo" src="./autopilot-logo.svg" alt="" />
            </button>
            <strong>Autopilot Browser</strong>
            {view !== "browser" && (
              <span className="app-title-section">
                {view === "productivity"
                  ? "Productivity"
                  : view === "coding"
                    ? "Coding"
                    : view === "settings"
                      ? "Settings"
                      : view === "design"
                        ? "Design"
                        : ""}
              </span>
            )}
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
                placeholder="Search Google or enter address"
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
            {browserShowsHome && (
              <div className="web-content-placeholder">
                <section className="empty-state" aria-label="Autopilot Browser start page">
                  <h1 className="home-wordmark">
                    <span>Autopilot Browser</span>
                    <button className="icon-preview-trigger home-title-icon-trigger" type="button" aria-label="Preview Autopilot Browser icon" onClick={() => setIconPreviewOpen(true)}>
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
            {browserPreviewShowsExternalPage && (
              <div className="web-content-placeholder">
                <section className="browser-preview-state" aria-label="Autopilot Browser preview state">
                  <AutopilotNeedle className="browser-preview-state-icon" />
                  <span className="browser-preview-kicker">Browser preview</span>
                  <h2>{browserPreviewTitle}</h2>
                  <p>
                    The desktop app will load this page in Autopilot's Chromium view. The web preview keeps the tab,
                    address, and search state in sync without showing a broken embedded browser.
                  </p>
                  <code title={browserPreviewUrl}>{getDisplayUrl(browserPreviewUrl)}</code>
                  <div className="browser-preview-actions">
                    <button type="button" onClick={goHome}>
                      Back to Autopilot home
                    </button>
                    {browserPreviewCanOpenUrl && (
                      <a href={browserPreviewUrl} target="_blank" rel="noreferrer">
                        Open page
                      </a>
                    )}
                  </div>
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

              <div className="assistant-workflow-strip" aria-label="Assistant workflow">
                <span>
                  <Sparkles size={13} aria-hidden="true" />
                  Generate
                </span>
                <span>
                  <Eye size={13} aria-hidden="true" />
                  Preview
                </span>
                <span>
                  <ShieldCheck size={13} aria-hidden="true" />
                  Approve
                </span>
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

              <div className="assistant-context-actions">
                <button className="secondary-action" type="button" disabled={!activeTabId || assistantBusy} onClick={() => void readActiveTabIntoAssistant()}>
                  <FileText size={14} aria-hidden="true" />
                  Read this tab
                </button>
                <small>
                  {activeTab ? `Active tab: ${activeTab.title || activeTab.url || "Untitled"}` : "Open a tab first, then ask Autopilot to summarize it."}
                </small>
              </div>

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
            <section
              className={`coding-page ${codingRightSidebarOpen ? "" : "right-sidebar-closed"} ${codingExplorerOpen ? "" : "explorer-closed"} ${
                codingActivityRailExpanded ? "activity-rail-expanded" : ""
              }`}
              aria-labelledby="coding-heading"
            >
              <div className={`coding-activity-rail ${codingActivityRailExpanded ? "expanded" : ""}`} aria-label="Coding tools">
                <button
                  className="coding-activity-brand"
                  type="button"
                  aria-label="Coding workspace tools"
                  onClick={() => setCodingSection("files")}
                >
                  <img className="coding-activity-logo" src="./autopilot-logo.svg" alt="" />
                  <span className="coding-activity-label">Autopilot</span>
                </button>
                <nav className="coding-activity-tools" aria-label="Coding workspace tools">
                  <button className={codingSection === "files" && codingExplorerOpen ? "active" : ""} type="button" aria-label="Toggle project explorer" onClick={toggleCodingFilesPanel}>
                    <FolderOpen size={18} aria-hidden="true" />
                    <span className="coding-activity-label">Files</span>
                  </button>
                  <button type="button" aria-label="New coding chat" onClick={newCodingChat}>
                    <SquarePen size={18} aria-hidden="true" />
                    <span className="coding-activity-label">New chat</span>
                  </button>
                  <button className={codingSection === "search" ? "active" : ""} type="button" aria-label="Search project files" onClick={openCodingSearch}>
                    <Search size={18} aria-hidden="true" />
                    <span className="coding-activity-label">Search</span>
                  </button>
                  <button className={codingSection === "plugins" ? "active" : ""} type="button" aria-label="Plugins" onClick={openCodingPlugins}>
                    <Package size={18} aria-hidden="true" />
                    <span className="coding-activity-label">Plugins</span>
                  </button>
                  <button className={codingSection === "terminal" ? "active" : ""} type="button" aria-label="Terminal" onClick={() => openCodingTerminal()}>
                    <Terminal size={18} aria-hidden="true" />
                    <span className="coding-activity-label">Terminal</span>
                  </button>
                  <button
                    className={`${codingSection === "browser" ? "active" : ""} ${runningAutomationRuns.length > 0 || automationBusy ? "has-activity" : ""}`.trim()}
                    type="button"
                    aria-label="Automation workspace"
                    onClick={openCodingBrowser}
                  >
                    <Clock size={18} aria-hidden="true" />
                    <span className="coding-activity-label">Automations</span>
                  </button>
                  <button
                    className={codingRightPanel === "downloads" && codingRightSidebarOpen ? "active" : ""}
                    type="button"
                    aria-label="Downloads"
                    onClick={openCodingDownloads}
                  >
                    <Download size={18} aria-hidden="true" />
                    <span className="coding-activity-label">Downloads</span>
                  </button>
                </nav>
                <div className="coding-activity-footer">
                  <button
                    className="coding-activity-toggle"
                    type="button"
                    aria-label={codingActivityRailExpanded ? "Collapse coding rail" : "Expand coding rail"}
                    title={codingActivityRailExpanded ? "Collapse rail" : "Expand rail"}
                    onClick={() => setCodingActivityRailExpanded((isExpanded) => !isExpanded)}
                  >
                    {codingActivityRailExpanded ? <ChevronLeft size={18} aria-hidden="true" /> : <ChevronRight size={18} aria-hidden="true" />}
                    <span className="coding-activity-label">{codingActivityRailExpanded ? "Collapse" : "Expand"}</span>
                  </button>
                  <button
                    className="coding-activity-settings"
                    type="button"
                    aria-label="Settings"
                    title="Settings"
                    onClick={() => {
                      setAssistantOpen(false);
                      setBrowserDownloadsOpen(false);
                      setView("settings");
                    }}
                  >
                    <Settings size={18} aria-hidden="true" />
                    <span className="coding-activity-label">Settings</span>
                  </button>
                </div>
              </div>

              <aside className="coding-explorer" aria-label="Project explorer">
                <div className="coding-panel-heading">
                  <div>
                    <p className="panel-kicker">Projects</p>
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
                  <button type="button" onClick={() => void openGithubForCoding()}>
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
                  {orderedCodingProjects.length === 0 ? (
                    <span className="coding-sidebar-empty">No projects yet</span>
                  ) : (
                    <div className="coding-project-list">
                      {orderedCodingProjects.map((project) => {
                        const projectChats = codingChatsByProject.get(project.rootPath) ?? [];
                        const isActiveProject = project.rootPath === activeCodingProject?.rootPath;
                        const isCollapsed = Boolean(collapsedCodingProjects[project.rootPath]);
                        return (
                          <div
                            className={`coding-project-group ${draggingCodingProjectRoot === project.rootPath ? "dragging" : ""}`}
                            key={project.rootPath}
                            draggable
                            onDragStart={() => setDraggingCodingProjectRoot(project.rootPath)}
                            onDragEnd={() => setDraggingCodingProjectRoot(null)}
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={(event) => {
                              event.preventDefault();
                              reorderCodingProject(draggingCodingProjectRoot, project.rootPath);
                            }}
                          >
                            <div className={`coding-project-row ${isActiveProject ? "active" : ""}`}>
                              <button
                                className="coding-project-collapse"
                                type="button"
                                aria-label={isCollapsed ? `Expand ${project.name}` : `Collapse ${project.name}`}
                                onClick={() => toggleCodingProjectGroup(project.rootPath)}
                              >
                                {isCollapsed ? <Folder size={14} aria-hidden="true" /> : <FolderOpen size={14} aria-hidden="true" />}
                              </button>
                              <button type="button" className="coding-project-main" onClick={() => void openCodingProjectDetails(project)}>
                                <GripVertical size={13} aria-hidden="true" />
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
                                <SquarePen size={13} aria-hidden="true" />
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
                                      className={`coding-chat-row-shell ${chat.id === activeCodingAssistantChat?.id ? "active" : ""}`}
                                      key={chat.id}
                                    >
                                      <button className="coding-chat-row" type="button" onClick={() => void openExistingCodingChat(chat)}>
                                        <span>{chat.title}</span>
                                        <small>{formatCodingChatAge(chat.updatedAt)}</small>
                                      </button>
                                      <button
                                        className="coding-chat-delete"
                                        type="button"
                                        aria-label={`Archive ${chat.title}`}
                                        onClick={() => archiveCodingChat(chat.id)}
                                      >
                                        <Archive size={12} aria-hidden="true" />
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
                      <SquarePen size={13} aria-hidden="true" />
                    </button>
                  </div>
                  {globalCodingChats.length === 0 ? (
                    <span className="coding-sidebar-empty">No chats</span>
                  ) : (
                    <div className="coding-project-list">
                      {globalCodingChats.slice(0, 5).map((chat) => (
                        <div className={`coding-chat-row-shell global ${chat.id === activeCodingAssistantChat?.id ? "active" : ""}`} key={chat.id}>
                          <button className="coding-chat-row global" type="button" onClick={() => void openExistingCodingChat(chat)}>
                            <span>{chat.title}</span>
                            <small>{formatCodingChatAge(chat.updatedAt)}</small>
                          </button>
                          <button
                            className="coding-chat-delete"
                            type="button"
                            aria-label={`Archive ${chat.title}`}
                            onClick={() => archiveCodingChat(chat.id)}
                          >
                            <Archive size={12} aria-hidden="true" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {activeProjectOpenTabs.length > 0 && (
                  <div className="coding-open-editors" aria-label="Open editors">
                    <div className="coding-sidebar-section-title compact">
                      <span>Open editors</span>
                      <button type="button" aria-label="Open another file" onClick={() => openCodingPicker()}>
                        <Plus size={13} aria-hidden="true" />
                      </button>
                    </div>
                    <div className="coding-open-editor-list">
                      {activeProjectOpenTabs.slice(0, 8).map((tab) => {
                        const EditorIcon = getCodingTabIcon(tab.kind, tab.file);
                        const changed = isTextCodingTab(tab) && Boolean(codingDiffsByTabId.get(tab.id)?.changed);
                        return (
                          <div className={`coding-open-editor-row ${tab.id === activeCodingTabId ? "active" : ""}`} key={tab.id}>
                            <button type="button" onClick={() => setActiveCodingTabId(tab.id)}>
                              <EditorIcon size={14} aria-hidden="true" />
                              <span>
                                <strong>{tab.title}</strong>
                                <small>{changed ? "Modified" : tab.file?.relativePath ?? tab.path ?? "Open tab"}</small>
                              </span>
                            </button>
                            <button type="button" aria-label={`Close ${tab.title}`} onClick={() => closeCodingTab(tab.id)}>
                              <X size={12} aria-hidden="true" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
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
                            <small>
                              {plugin.category} - {isInstalling ? getPluginInstallRemaining(status, codingClock) : getPluginStatusLabel(status)}
                            </small>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : codingSnapshot.tree ? (
                  <div className="coding-tree-panel">
                    <div className="coding-sidebar-section-title files">
                      <span>Files</span>
                      <button type="button" aria-label="Open files" onClick={openCodingPicker}>
                        <FileText size={13} aria-hidden="true" />
                      </button>
                    </div>
                    {codingSnapshot.tree.children && codingSnapshot.tree.children.length > 0 ? (
                      <div className="coding-tree">
                        {codingSnapshot.tree.children.map((child) => (
                          <CodingTree
                            activePath={activeCodingPath}
                            autoOpenRoot={false}
                            key={child.path}
                            node={child}
                            openFolders={openCodingFolders}
                            onOpen={openCodingNode}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="coding-empty-explorer compact">
                        <FolderOpen size={18} aria-hidden="true" />
                        <span>This project folder is empty.</span>
                      </div>
                    )}
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
                  <div className="coding-toolbar-cluster" aria-label="Coding quick actions">
                    <button className="coding-icon-tool coding-run-tool" type="button" aria-label="Run code" title="Run code" onClick={() => void runCodingProjectDefaultCommand()}>
                      <Play size={15} aria-hidden="true" />
                    </button>
                    <div className="coding-tool-menu-shell">
                      <button
                        className={`coding-icon-tool coding-tool-menu-button ${codingToolMenuOpen ? "active" : ""}`}
                        type="button"
                        aria-label="Open coding tools"
                        aria-expanded={codingToolMenuOpen}
                        title="Open VS Code, GitHub, Git, or other local tools"
                        onClick={() => setCodingToolMenuOpen((isOpen) => !isOpen)}
                      >
                        <Code2 size={16} aria-hidden="true" />
                        <ChevronDown size={12} aria-hidden="true" />
                      </button>
                      {codingToolMenuOpen && (
                        <div className="coding-tool-dropdown" role="menu" aria-label="Coding tools">
                          <button type="button" role="menuitem" onClick={() => void runCodingProjectTool("code .", "Opening this project in VS Code.")}>
                            <Code2 size={14} aria-hidden="true" />
                            <span>
                              <strong>VS Code</strong>
                              <small>Open current project</small>
                            </span>
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setCodingToolMenuOpen(false);
                              void openGithubForCoding();
                            }}
                          >
                            <Github size={14} aria-hidden="true" />
                            <span>
                              <strong>GitHub</strong>
                              <small>Open in Browser workspace</small>
                            </span>
                          </button>
                          <button type="button" role="menuitem" onClick={() => void runCodingProjectTool("git status --short", "Checking git status.")}>
                            <Terminal size={14} aria-hidden="true" />
                            <span>
                              <strong>Git status</strong>
                              <small>Review local changes</small>
                            </span>
                          </button>
                          <button type="button" role="menuitem" onClick={() => void runCodingProjectTool("explorer .", "Opening the project folder on this computer.")}>
                            <FolderOpen size={14} aria-hidden="true" />
                            <span>
                              <strong>File Explorer</strong>
                              <small>Open local folder</small>
                            </span>
                          </button>
                          <button type="button" role="menuitem" onClick={customizeCodingProjectTool}>
                            <Settings size={14} aria-hidden="true" />
                            <span>
                              <strong>Customize</strong>
                              <small>Run any local tool command</small>
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                    <button className="coding-icon-tool" type="button" aria-label="Open terminal" title="Open terminal" onClick={() => openCodingTerminal()}>
                      <Terminal size={15} aria-hidden="true" />
                    </button>
                    <button
                      className={`coding-icon-tool coding-summary-toggle ${codingRightPanel === "summary" && codingRightSidebarOpen ? "active" : ""}`}
                      type="button"
                      aria-label="Open coding summary"
                      title="Open coding summary"
                      onClick={openCodingSummary}
                    >
                      <ListChecks size={15} aria-hidden="true" />
                    </button>
                    <button
                      className={`coding-icon-tool coding-right-sidebar-toggle ${codingRightSidebarOpen ? "active" : ""}`}
                      type="button"
                      aria-label={codingRightSidebarOpen ? "Hide AI assistant" : "Show AI assistant"}
                      title={codingRightSidebarOpen ? "Hide AI assistant" : "Show AI assistant"}
                      onClick={() => setCodingRightSidebarOpen((isOpen) => !isOpen)}
                    >
                      {codingRightSidebarOpen ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                    </button>
                  </div>
                </div>

                <div className="coding-workbench-content">
                  {activeCodingTab.kind === "chat" && (
                    <section className={`coding-chat coding-editor-home ${activeCodingAssistantChat ? "chat-focused" : ""}`} aria-label="Coding workbench">
                      {activeCodingAssistantChat ? (
                        <>
                          <div className="coding-agent-home-shell active-chat">
                            <div className="coding-agent-home-copy">
                              <span className="coding-agent-home-eyebrow">
                                <Sparkles size={14} aria-hidden="true" />
                                Agentic coding workspace
                              </span>
                              <h2>{activeCodingAssistantChat.title}</h2>
                              <p>
                                Autopilot keeps the plan, files, commands, diffs, and approvals visible while you keep code open in the center.
                              </p>
                              <div className="coding-agent-home-actions">
                                <button type="button" onClick={() => openCodingAssistant(activeCodingAssistantChat)}>
                                  <MessageCircle size={15} aria-hidden="true" />
                                  Focus assistant
                                </button>
                                <button type="button" onClick={openCodingSummary}>
                                  <ListChecks size={15} aria-hidden="true" />
                                  Summary
                                </button>
                                <button type="button" onClick={newCodingChat}>
                                  <Plus size={15} aria-hidden="true" />
                                  New chat
                                </button>
                              </div>
                            </div>
                            <div className="coding-agent-home-card" aria-label="Current coding context">
                              <AutopilotNeedle className="coding-agent-needle" />
                              <span>
                                <strong>{activeCodingProject?.name ?? activeCodingAssistantChat.projectName}</strong>
                                <small>{activeCodingAssistantChat.projectRootPath ?? activeCodingProject?.rootPath ?? "General workspace"}</small>
                              </span>
                            </div>
                          </div>

                          <div className="coding-agent-command-center" aria-label="Ask the coding agent">
                            <form
                              className="coding-agent-command-form"
                              onSubmit={(event) => {
                                event.preventDefault();
                                void sendCodingChatMessage();
                              }}
                            >
                              <MessageCircle size={18} aria-hidden="true" />
                              <input
                                value={codingDraftMessage}
                                onChange={(event) => setCodingDraftMessage(event.target.value)}
                                placeholder="Ask Autopilot to inspect, edit, test, automate, or explain this project..."
                                aria-label="Ask Autopilot about this code"
                              />
                              <button type="submit" disabled={!codingDraftMessage.trim()}>
                                <ArrowRight size={17} aria-hidden="true" />
                              </button>
                            </form>
                            <div className="coding-agent-suggestion-row" aria-label="Coding prompt suggestions">
                              {[
                                "Read this repo and explain the architecture",
                                "Plan the safest implementation before edits",
                                "Run tests and summarize failures"
                              ].map((suggestion) => (
                                <button key={suggestion} type="button" onClick={() => setCodingDraftMessage(suggestion)}>
                                  {suggestion}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="coding-agent-status-grid" aria-label="Coding workspace context">
                            <span>
                              <strong>{activeCodingAssistantChat.projectRootPath ? "Project" : "Scope"}</strong>
                              <small>{activeCodingAssistantChat.projectRootPath ? activeCodingAssistantChat.projectName : "General workspace"}</small>
                            </span>
                            <span>
                              <strong>Agent phase</strong>
                              <small>{codingAgentPlan?.phase ?? "Waiting for prompt"}</small>
                            </span>
                            <span>
                              <strong>Access</strong>
                              <small>{codingSnapshot.accessMode === "full" ? "Full access" : "Ask before commands"}</small>
                            </span>
                            <span>
                              <strong>Open files</strong>
                              <small>{activeProjectOpenTabs.length} in project</small>
                            </span>
                          </div>
                          <div className="coding-workflow-strip" aria-label="Coding workflow">
                            <span>
                              <Code2 size={14} aria-hidden="true" />
                              Understand
                            </span>
                            <span>
                              <ListChecks size={14} aria-hidden="true" />
                              Plan/schema
                            </span>
                            <span>
                              <Terminal size={14} aria-hidden="true" />
                              Run/tests
                            </span>
                            <span>
                              <ShieldCheck size={14} aria-hidden="true" />
                              Diff/approve
                            </span>
                          </div>
                          <div className="coding-center-chat-thread" aria-label="Coding chat transcript">
                            {activeCodingAssistantChat.messages.map((message) => (
                              <article className={`coding-chat-message ${message.role}`} key={message.id}>
                                <strong>{message.role === "agent" ? "Autopilot" : "You"}</strong>
                                <p>{message.content}</p>
                              </article>
                            ))}
                          </div>
                          {renderCodingAgentPlanPanel()}
                          <div className="coding-session-actions" aria-label="Coding session actions">
                            <button type="button" onClick={openCodingPicker}>
                              <FolderOpen size={15} aria-hidden="true" />
                              Open file
                            </button>
                            <button type="button" onClick={() => openCodingTerminal()}>
                              <Terminal size={15} aria-hidden="true" />
                              Run command
                            </button>
                            <button type="button" onClick={openCodingBrowser}>
                              <Globe2 size={15} aria-hidden="true" />
                              Automation
                            </button>
                            <button type="button" onClick={openCodingPlugins}>
                              <Package size={15} aria-hidden="true" />
                              Plugins
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="coding-agent-home-shell">
                            <div className="coding-agent-home-copy">
                              <span className="coding-agent-home-eyebrow">
                                <Sparkles size={14} aria-hidden="true" />
                                Agentic AI code editor
                              </span>
                              <h2>What would you like to work on?</h2>
                              <form
                                className="coding-agent-command-form hero"
                                onSubmit={(event) => {
                                  event.preventDefault();
                                  void sendCodingChatMessage();
                                }}
                              >
                                <MessageCircle size={18} aria-hidden="true" />
                                <input
                                  value={codingDraftMessage}
                                  onChange={(event) => setCodingDraftMessage(event.target.value)}
                                  placeholder="Ask Autopilot to build, debug, refactor, explain, or automate..."
                                  aria-label="What would you like to work on?"
                                />
                                <button type="submit" disabled={!codingDraftMessage.trim()}>
                                  <ArrowRight size={17} aria-hidden="true" />
                                </button>
                              </form>
                            </div>
                            <div className="coding-agent-home-card" aria-label="Agent workflow">
                              <AutopilotNeedle className="coding-agent-needle" />
                              <ol>
                                <li>Understand</li>
                                <li>Plan/schema</li>
                                <li>Edit/test</li>
                                <li>Diff/approve</li>
                              </ol>
                            </div>
                          </div>
                          {activeCodingProject && (
                            <div className="coding-agent-status-grid prominent" aria-label="Active project context">
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
                          {renderCodingAgentPlanPanel()}
                          <div className="coding-action-grid agentic">
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
                            <button type="button" onClick={() => void openGithubForCoding()}>
                              <Github size={18} aria-hidden="true" />
                              <span>
                                <strong>Open GitHub</strong>
                                <small>Open repos in the Browser workspace</small>
                              </span>
                            </button>
                            <button type="button" onClick={openCodingPlugins}>
                              <Package size={18} aria-hidden="true" />
                              <span>
                                <strong>Install plugins</strong>
                                <small>Install CLIs and dev tools</small>
                              </span>
                            </button>
                            <button type="button" onClick={() => openCodingTerminal()}>
                              <Terminal size={18} aria-hidden="true" />
                              <span>
                                <strong>Run commands</strong>
                                <small>Approval mode by default</small>
                              </span>
                            </button>
                          </div>
                        </>
                      )}
                    </section>
                  )}

                  {activeCodingTab.kind === "picker" && (
                    <section className="coding-folder-view" aria-label="Choose file">
                      <div className="coding-content-heading">
                        <div>
                          <p className="panel-kicker">Open tab</p>
                          <h2>{activeCodingProject ? `Choose from ${activeCodingPickerLabel ?? activeCodingProject.name}` : "No project open"}</h2>
                          <span>
                            {activeCodingPickerPath
                              ? "This picker is scoped to the current folder. Open a folder to drill in, or open a file to edit/preview it."
                              : "Open a local project before choosing files."}
                          </span>
                        </div>
                        <div className="coding-editor-actions">
                          <button type="button" onClick={() => activeCodingProject?.rootPath && openCodingPicker(activeCodingProject.rootPath)} disabled={!activeCodingProject}>
                            <FolderOpen size={16} aria-hidden="true" />
                            Project root
                          </button>
                          <button type="button" onClick={() => void openCodingFiles()}>
                            <FileText size={16} aria-hidden="true" />
                            Pick from PC
                          </button>
                        </div>
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
                            <button type="button" onClick={() => openCodingPicker(activeCodingTab.path)}>
                              Open files
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
                          <span>Use the plus/open-file flow to choose any file inside this folder without leaving the editor.</span>
                        </div>
                        <div className="coding-editor-actions">
                          <button type="button" onClick={() => openCodingPicker(activeCodingTab.path)}>
                            <Plus size={16} aria-hidden="true" />
                            Open from folder
                          </button>
                          <button type="button" onClick={openCodingSummary}>
                            <ListChecks size={16} aria-hidden="true" />
                            Summary
                          </button>
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
                          <span>Manual edit mode. Changes autosave locally; AI edits are handled through chat and review.</span>
                        </div>
                        <div className="coding-editor-actions">
                          <button type="button" onClick={() => openCodingPicker()}>
                            <Plus size={15} aria-hidden="true" />
                            Open file
                          </button>
                          <button type="button" onClick={openCodingSummary}>
                            <ListChecks size={15} aria-hidden="true" />
                            Summary
                          </button>
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
                      {activeCodingVisibleDiff?.changed && (
                        <div className="coding-inline-diff-panel" aria-label={`Line changes for ${activeCodingTab.file.relativePath}`}>
                          <div className="coding-inline-diff-heading">
                            <span>
                              <strong>Changed lines</strong>
                              <small>
                                Green lines were added. Red lines were deleted. Unhighlighted lines did not change.
                              </small>
                            </span>
                            <button type="button" onClick={() => openCodingReview(activeCodingTab.id)}>
                              Open review
                            </button>
                          </div>
                          <div className="coding-diff-body compact">
                            {activeCodingVisibleDiff.hunks.map((hunk) => (
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
                        </div>
                      )}
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
                      <header className="coding-plugin-market-header">
                        <div className="coding-plugin-tabs" role="tablist" aria-label="Plugin browser tabs">
                          <button className={codingPluginBrowserTab === "plugins" ? "active" : ""} type="button" onClick={() => setCodingPluginBrowserTab("plugins")}>
                            Plugins
                          </button>
                          <button className={codingPluginBrowserTab === "skills" ? "active" : ""} type="button" onClick={() => setCodingPluginBrowserTab("skills")}>
                            Skills
                          </button>
                        </div>
                        <div className="coding-plugin-header-actions">
                          <button type="button" onClick={() => void refreshCodingPluginStatuses()}>
                            <Settings size={14} aria-hidden="true" />
                            Manage
                          </button>
                          <button type="button" onClick={() => openCodingCreatePluginChat(codingPluginBrowserTab === "skills" ? "skill" : "plugin")}>
                            <Plus size={14} aria-hidden="true" />
                            Create
                          </button>
                        </div>
                      </header>

                      <section className="coding-plugin-hero" aria-label="Plugin marketplace introduction">
                        <h2>Make Autopilot code your way</h2>
                        <p>
                          Install CLIs, check what is already available, or open a project chat to build a custom skill/plugin. Installs are real local commands and can be cancelled while running.
                        </p>
                        <div>
                          <span>{installedCodingPluginCount} installed</span>
                          <span>{installingCodingPluginCount} installing</span>
                          <span>{codingPluginCatalog.length} available</span>
                        </div>
                      </section>

                      <div className="coding-plugin-filters" aria-label="Filter plugins">
                        <label>
                          <Search size={15} aria-hidden="true" />
                          <input
                            value={codingPluginSearch}
                            onChange={(event) => setCodingPluginSearch(event.target.value)}
                            placeholder={codingPluginBrowserTab === "skills" ? "Search skills" : "Search plugins"}
                            aria-label={codingPluginBrowserTab === "skills" ? "Search skills" : "Search plugins"}
                          />
                        </label>
                        {codingPluginBrowserTab === "plugins" && (
                          <select value={codingPluginCategory} onChange={(event) => setCodingPluginCategory(event.target.value)} aria-label="Plugin category">
                            {codingPluginCategories.map((category) => (
                              <option key={category} value={category}>
                                {category}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      {codingPluginBrowserTab === "skills" ? (
                        <div className="coding-plugin-grid skills">
                          {codingSkillTemplates
                            .filter((template) =>
                              `${template.name} ${template.category} ${template.description}`.toLowerCase().includes(codingPluginSearch.trim().toLowerCase())
                            )
                            .map((template) => (
                              <article className="coding-plugin-card skill" key={template.id}>
                                <span className="coding-plugin-icon">
                                  <Sparkles size={18} aria-hidden="true" />
                                </span>
                                <div>
                                  <strong>{template.name}</strong>
                                  <small>{template.category} - opens in chat</small>
                                  <p>{template.description}</p>
                                  <code>{template.prompt}</code>
                                </div>
                                <button type="button" onClick={() => openCodingSkillTemplateChat(template)}>
                                  Try in chat
                                </button>
                              </article>
                            ))}
                        </div>
                      ) : (
                        <div className="coding-plugin-grid">
                          {filteredCodingPlugins.map((plugin) => {
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
                                  <small>
                                    {plugin.category} - {isInstalling ? getPluginInstallRemaining(status, codingClock) : getPluginStatusLabel(status)}
                                  </small>
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
                          {filteredCodingPlugins.length === 0 && (
                            <div className="coding-plugin-empty">
                              <Search size={18} aria-hidden="true" />
                              <span>No plugins match that search.</span>
                            </div>
                          )}
                        </div>
                      )}
                    </section>
                  )}

                  {activeCodingTab.kind === "terminal" && (
                    <section className="coding-terminal-panel" aria-label="Command runner">
                      <div className="coding-content-heading">
                        <div>
                          <p className="panel-kicker">Real terminal</p>
                          <h2>Windows PowerShell</h2>
                          <span>{activeCodingProject?.rootPath ?? "Open a project to run commands from its folder."}</span>
                        </div>
                        <div className="coding-terminal-actions">
                          <button className="coding-open-terminal-button" type="button" onClick={() => openCodingTerminal({ forceLaunch: true })} disabled={codingTerminalOpening}>
                            <Terminal size={15} aria-hidden="true" />
                            {codingTerminalOpening ? "Opening..." : "Open PowerShell"}
                          </button>
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
                      </div>
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
                      <textarea
                        ref={codingTerminalOutputRef}
                        className="coding-command-output"
                        role="textbox"
                        aria-label="PowerShell terminal"
                        aria-multiline="true"
                        value={getCodingTerminalDisplay()}
                        spellCheck={false}
                        onClick={focusCodingTerminal}
                        onKeyDown={handleCodingTerminalKeyDown}
                        onPaste={handleCodingTerminalPaste}
                        onChange={() => undefined}
                      />
                    </section>
                  )}

                  {activeCodingTab.kind === "browser" && (
                    <section className="coding-browser-panel automation-workspace-panel" aria-label="Coding automation workspace">
                      <section className="automation-setup-card" aria-label="Automation setup">
                        <header>
                          <div>
                            <p className="panel-kicker">Automation setup</p>
                            <h2>Tell Autopilot what should keep happening.</h2>
                            <span>The title is optional. Goal, schedule, sources, output, quality bar, and approval rules are required.</span>
                          </div>
                          <div className="automation-template-actions">
                            <button type="button" onClick={() => useAutomationTemplate("industry")}>
                              Use industry brief
                            </button>
                            <button type="button" onClick={() => useAutomationTemplate("drafts")}>
                              Use drafts
                            </button>
                            <button type="button" onClick={() => useAutomationTemplate("repo")}>
                              Use repo watch
                            </button>
                          </div>
                        </header>

                        <div className="automation-setup-form">
                          <label>
                            <span>Automation title</span>
                            <input
                              value={automationSetup.title}
                              onChange={(event) => setAutomationSetup((currentSetup) => ({ ...currentSetup, title: event.target.value }))}
                              placeholder="Optional"
                              aria-label="Automation title"
                            />
                          </label>
                          <label className="automation-setup-goal">
                            <span>Prompt</span>
                            <textarea
                              value={automationSetup.prompt}
                              onChange={(event) => setAutomationSetup((currentSetup) => ({ ...currentSetup, prompt: event.target.value }))}
                              placeholder="Example: every Friday, research AI coding tools and make a sourced report with opportunities."
                              aria-label="Automation prompt"
                            />
                          </label>
                          <label>
                            <span>Schedule</span>
                            <select
                              value={automationSetup.schedule}
                              onChange={(event) =>
                                setAutomationSetup((currentSetup) => ({
                                  ...currentSetup,
                                  schedule: event.target.value as CodingAutomationSetupState["schedule"]
                                }))
                              }
                              aria-label="Automation schedule"
                            >
                              <option value="manual">Manual</option>
                              <option value="daily">Daily</option>
                              <option value="weekly">Weekly</option>
                            </select>
                          </label>
                          <label>
                            <span>Output</span>
                            <select
                              value={automationSetup.outputKind}
                              onChange={(event) =>
                                setAutomationSetup((currentSetup) => ({
                                  ...currentSetup,
                                  outputKind: event.target.value as CodingAutomationSetupState["outputKind"]
                                }))
                              }
                              aria-label="Automation output type"
                            >
                              <option value="brief">Brief</option>
                              <option value="document">Document</option>
                              <option value="draft">Draft</option>
                              <option value="research_report">Research report</option>
                            </select>
                          </label>
                          <div className="automation-source-pills" aria-label="Automation sources">
                            {(["coding", "web", "gmail", "calendar", "slack"] as AutomationSourceKind[]).map((source) => (
                              <button
                                className={automationSetup.sources.includes(source) ? "active" : ""}
                                key={source}
                                type="button"
                                onClick={() => updateAutomationSetupSource(source)}
                              >
                                {source}
                              </button>
                            ))}
                          </div>
                          <label className="automation-quality-range">
                            <span>Quality bar {automationSetup.qualityBar}/100</span>
                            <input
                              type="range"
                              min={70}
                              max={98}
                              value={automationSetup.qualityBar}
                              onChange={(event) =>
                                setAutomationSetup((currentSetup) => ({
                                  ...currentSetup,
                                  qualityBar: Number(event.target.value)
                                }))
                              }
                              aria-label="Automation quality bar"
                            />
                          </label>
                          <label className="automation-approval-check">
                            <input
                              type="checkbox"
                              checked={automationSetup.requiresApproval}
                              onChange={(event) =>
                                setAutomationSetup((currentSetup) => ({
                                  ...currentSetup,
                                  requiresApproval: event.target.checked
                                }))
                              }
                            />
                            <span>Require final approval before send, share, publish, submit, delete, or pay.</span>
                          </label>
                          <div className="automation-setup-actions">
                            <button type="button" disabled={automationBusy || !automationSetup.prompt.trim()} onClick={() => void createAutomationFromSetup(false)}>
                              <Save size={15} aria-hidden="true" />
                              Save recipe
                            </button>
                            <button className="primary-action" type="button" disabled={automationBusy || !automationSetup.prompt.trim()} onClick={() => void createAutomationFromSetup(true)}>
                              <Play size={15} aria-hidden="true" />
                              Create and run
                            </button>
                          </div>
                        </div>
                      </section>

                      <div className="automation-workbench">
                        <aside className="automation-run-sidebar" aria-label="Automation runs">
                          <header className="automation-sidebar-heading">
                            <div>
                              <p className="panel-kicker">Automation</p>
                              <h2>Running work</h2>
                              <span>{runningAutomationRuns.length} running, {sortedAutomationRuns.length} total</span>
                            </div>
                            <button type="button" onClick={() => void refreshAutomationState()} aria-label="Refresh automations">
                              <RotateCw size={14} className={automationBusy ? "spin" : ""} aria-hidden="true" />
                            </button>
                          </header>

                          {automationStatus && <p className="automation-inline-status compact">{automationStatus}</p>}

                          <div className="automation-quick-prompts" aria-label="Automation examples">
                            {[
                              "Generate a daily AI browser productivity brief with sources and next steps",
                              "Draft a weekly competitive research report for AI coding tools"
                            ].map((suggestion) => (
                              <button
                                key={suggestion}
                                type="button"
                                onClick={() => {
                                  setAutomationDraft(suggestion);
                                  void runAutomationFromCoding(suggestion);
                                }}
                              >
                                {suggestion}
                              </button>
                            ))}
                            <button
                              type="button"
                              disabled={codingBusy}
                              onClick={() => {
                                setCodingResearchDraft(automationDraft);
                                void researchFromCoding(automationDraft);
                              }}
                            >
                              <Search size={13} aria-hidden="true" />
                              Research only
                            </button>
                          </div>

                          <div className="automation-run-list compact">
                            {sortedAutomationRuns.length === 0 ? (
                              <div className="automation-empty-state compact">
                                <Sparkles size={18} aria-hidden="true" />
                                <span>
                                  <strong>No automations yet.</strong>
                                  <small>Create one above and it will show here.</small>
                                </span>
                              </div>
                            ) : (
                              sortedAutomationRuns.map((run) => (
                                <button
                                  className={`automation-run-row ${run.state} ${activeAutomationRun?.id === run.id ? "active" : ""}`}
                                  key={run.id}
                                  type="button"
                                  onClick={() => setSelectedAutomationRunId(run.id)}
                                >
                                  <span className="automation-run-state-dot" aria-hidden="true" />
                                  <span>
                                    <strong>{getAutomationRunTitle(run)}</strong>
                                    <small>{getAutomationRunStatusLabel(run)} - {formatCodingChatAge(run.startedAt)} ago</small>
                                  </span>
                                </button>
                              ))
                            )}
                          </div>
                        </aside>

                        <main className="automation-detail-panel" aria-label="Automation details">
                          {activeAutomationRun ? (
                            <>
                              <header className="automation-detail-header">
                                <div>
                                  <p className="panel-kicker">{getAutomationRunStatusLabel(activeAutomationRun)}</p>
                                  <h2>{getAutomationRunTitle(activeAutomationRun)}</h2>
                                  <span>
                                    {getAutomationScheduleLabel(activeAutomationRecipe)} {getAutomationOutputLabel(activeAutomationRecipe, activeAutomationRun)} - started {formatCodingChatAge(activeAutomationRun.startedAt)} ago
                                  </span>
                                </div>
                                <div className="automation-detail-actions">
                                  {activeAutomationRun.artifactId && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveArtifactId(activeAutomationRun.artifactId ?? null);
                                        showDesignWorkspace();
                                      }}
                                    >
                                      Open in Design
                                      <ArrowRight size={13} aria-hidden="true" />
                                    </button>
                                  )}
                                  <button type="button" onClick={() => void runAutomationFromCoding(`${activeAutomationRun.recipeName} update with newer information`)}>
                                    Rerun
                                  </button>
                                </div>
                              </header>

                              <div className="automation-detail-metrics" aria-label="Automation summary">
                                <span>
                                  <strong>{activeAutomationRun.qualityScore ?? activeAutomationRecipe?.qualityBar ?? 84}/100</strong>
                                  <small>Quality</small>
                                </span>
                                <span>
                                  <strong>{activeAutomationRun.sources.length}</strong>
                                  <small>References</small>
                                </span>
                                <span>
                                  <strong>{activeAutomationRun.artifactId ? "Saved" : "Run log"}</strong>
                                  <small>Output</small>
                                </span>
                              </div>

                              <article className="automation-readable-report">
                                <pre>{activeAutomationDetailText}</pre>
                              </article>

                              {activeAutomationRun.sources.length > 0 && (
                                <div className="automation-reference-actions" aria-label="Open automation references">
                                  {activeAutomationRun.sources.slice(0, 4).map((source) => (
                                    <button key={`${activeAutomationRun.id}:${source.title}`} type="button" disabled={!source.url} onClick={() => source.url && navigateTo(source.url)}>
                                      <Globe2 size={13} aria-hidden="true" />
                                      {source.title}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="automation-detail-empty">
                              <Sparkles size={24} aria-hidden="true" />
                              <h2>Automate real work, then inspect the result.</h2>
                              <p>Ask for a daily brief, a draft, competitive research, or project prep. The output will appear here as readable text with steps, quality checks, and references.</p>
                            </div>
                          )}
                        </main>
                      </div>
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
                    <h2>{codingRightPanel === "assistant" ? "AI assistant" : codingRightPanel}</h2>
                  </div>
                  <button type="button" aria-label="Minimize inspector" onClick={() => setCodingRightSidebarOpen(false)}>
                    <ChevronRight size={16} aria-hidden="true" />
                  </button>
                </div>

                <div className="coding-right-tabs" role="tablist" aria-label="Inspector panels">
                  <button className={codingRightPanel === "assistant" ? "active" : ""} type="button" onClick={() => openCodingAssistant(activeCodingAssistantChat)}>
                    <MessageCircle size={15} aria-hidden="true" />
                    AI
                  </button>
                  <button className={codingRightPanel === "summary" ? "active" : ""} type="button" onClick={openCodingSummary}>
                    <ListChecks size={15} aria-hidden="true" />
                    Summary
                  </button>
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
                  {codingRightPanel === "assistant" && (
                    <section className="coding-right-panel coding-assistant-panel" aria-label="AI coding assistant">
                      <div className="coding-assistant-head">
                        <span className="coding-assistant-mark">
                          <Sparkles size={16} aria-hidden="true" />
                        </span>
                        <span>
                          <strong>{activeCodingAssistantChat?.title ?? "Autopilot"}</strong>
                          <small>
                            {activeCodingAssistantChat?.projectRootPath
                              ? activeCodingAssistantChat.projectName
                              : activeCodingProject?.name ?? "General coding workspace"}
                          </small>
                        </span>
                        <button type="button" aria-label="Start new coding chat" onClick={newCodingChat}>
                          <Plus size={15} aria-hidden="true" />
                        </button>
                      </div>

                      <div className="coding-assistant-context" aria-label="Current coding context">
                        <span>
                          <strong>{activeCodingProject?.name ?? "No project"}</strong>
                          <small>{activeCodingProject?.rootPath ?? "Open a folder to give Autopilot file context."}</small>
                        </span>
                        <span>
                          <strong>{activeTextCodingTab?.title ?? activeCodingTab.title}</strong>
                          <small>{activeTextCodingTab ? "Center editor" : "Center workbench"}</small>
                        </span>
                      </div>

                      <div className="coding-side-chat-thread" aria-label="Assistant conversation">
                        {activeCodingAssistantChat ? (
                          activeCodingAssistantChat.messages.map((message) => (
                            <article className={`coding-side-chat-message ${message.role}`} key={message.id}>
                              <strong>{message.role === "agent" ? "Autopilot" : "You"}</strong>
                              <p>{message.content}</p>
                            </article>
                          ))
                        ) : (
                          <div className="coding-assistant-empty">
                            <MessageCircle size={20} aria-hidden="true" />
                            <strong>No assistant chat yet.</strong>
                            <span>Start a chat and keep files open in the center while Autopilot plans work here.</span>
                          </div>
                        )}
                      </div>

                      <form
                        className="coding-side-chat-input"
                        onSubmit={(event) => {
                          event.preventDefault();
                          void sendCodingChatMessage();
                        }}
                      >
                        <textarea
                          value={codingDraftMessage}
                          onChange={(event) => setCodingDraftMessage(event.target.value)}
                          placeholder="Ask Autopilot to explain, plan, edit, test, or automate..."
                          aria-label="Coding assistant message"
                          rows={4}
                        />
                        <button type="submit" disabled={!codingDraftMessage.trim()}>
                          <ArrowRight size={16} aria-hidden="true" />
                        </button>
                      </form>

                      <div className="coding-assistant-actions" aria-label="Assistant shortcuts">
                        <button type="button" disabled={!activeCodingProject || codingBusy} onClick={() => void createCodingAgentPlan(undefined, activeCodingAssistantChat)}>
                          <ListChecks size={14} aria-hidden="true" />
                          Plan
                        </button>
                        <button type="button" onClick={openCodingPicker}>
                          <FileText size={14} aria-hidden="true" />
                          Open file
                        </button>
                        <button type="button" onClick={() => openCodingTerminal()}>
                          <Terminal size={14} aria-hidden="true" />
                          Terminal
                        </button>
                        <button type="button" onClick={openCodingSummary}>
                          <Sparkles size={14} aria-hidden="true" />
                          Summary
                        </button>
                      </div>
                    </section>
                  )}

                  {codingRightPanel === "summary" && (
                    <section className="coding-right-panel coding-summary-panel" aria-label="Coding activity summary">
                      <div className="coding-right-summary">
                        <span>
                          <strong>{activeCodingAssistantChat?.title ?? activeCodingProject?.name ?? "No active chat"}</strong>
                          <small>{activeCodingAssistantChat?.projectName ?? activeCodingProject?.rootPath ?? "Open a project or start a chat."}</small>
                        </span>
                        <button type="button" onClick={() => startNewCodingChat(activeCodingProject)}>
                          New chat
                        </button>
                      </div>

                      <div className="coding-summary-grid" aria-label="Agent state">
                        <article>
                          <span>Agent phase</span>
                          <strong>{codingAgentPlan?.phase ?? "Idle"}</strong>
                          <small>{codingAgentPlan?.assessment.reason ?? "Ask Autopilot for a coding task and the plan will show here before edits."}</small>
                          <button type="button" disabled={!activeCodingProject || codingBusy} onClick={() => void createCodingAgentPlan()}>
                            Plan work
                          </button>
                        </article>
                        <article>
                          <span>Changed files</span>
                          <strong>{codingReviewChangedCount}</strong>
                          <small>{codingReviewChangedCount > 0 ? "Ready for PR-style review." : "No editor or git changes detected."}</small>
                          <button
                            type="button"
                            onClick={() => {
                              setCodingRightPanel("code");
                              if (activeCodingReviewTab) {
                                openCodingReview(activeCodingReviewTab.id);
                              }
                            }}
                          >
                            Open review
                          </button>
                        </article>
                        <article>
                          <span>Automations</span>
                          <strong>{runningAutomationRuns.length} running</strong>
                          <small>{sortedAutomationRuns.length} total saved runs and recipes for background work.</small>
                          <button type="button" onClick={openCodingBrowser}>
                            Open setup
                          </button>
                        </article>
                        <article>
                          <span>Plugins</span>
                          <strong>{installedCodingPluginCount}/{codingPluginCatalog.length}</strong>
                          <small>{installingCodingPluginCount > 0 ? `${installingCodingPluginCount} install in progress.` : "Install CLIs and helper plugins from the marketplace."}</small>
                          <button type="button" onClick={openCodingPlugins}>
                            Browse
                          </button>
                        </article>
                      </div>

                      <div className="coding-summary-card">
                        <div>
                          <strong>Recent tool use</strong>
                          <small>Commands, installs, and automation runs that explain what Autopilot has been doing.</small>
                        </div>
                        {codingTerminalHistory.length === 0 && sortedAutomationRuns.length === 0 ? (
                          <span className="coding-right-empty">No tools have run in this coding session yet.</span>
                        ) : (
                          <div className="coding-summary-activity">
                            {codingTerminalHistory.slice(0, 4).map((result, index) => (
                              <button key={`${result.command ?? "command"}-${index}`} type="button" onClick={() => openCodingTerminal({ launchShell: false })}>
                                <Terminal size={14} aria-hidden="true" />
                                <span>
                                  <strong>{result.command ?? "Command"}</strong>
                                  <small>{result.success ? `exit ${result.exitCode} in ${result.durationMs}ms` : result.reason}</small>
                                </span>
                              </button>
                            ))}
                            {sortedAutomationRuns.slice(0, 3).map((run) => (
                              <button
                                key={run.id}
                                type="button"
                                onClick={() => {
                                  setSelectedAutomationRunId(run.id);
                                  openCodingBrowser();
                                }}
                              >
                                <Clock size={14} aria-hidden="true" />
                                <span>
                                  <strong>{getAutomationRunTitle(run)}</strong>
                                  <small>{getAutomationRunStatusLabel(run)} - {formatCodingChatAge(run.startedAt)} ago</small>
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="coding-summary-card">
                        <div>
                          <strong>Current schema</strong>
                          <small>{codingAgentPlan ? codingAgentPlan.summary : "No coding schema yet."}</small>
                        </div>
                        {codingAgentPlan ? (
                          <ul className="coding-summary-list">
                            <li>
                              <b>Files</b>
                              <span>{codingAgentPlan.schema.touchedFiles.slice(0, 4).join(", ") || "Autopilot will inspect first."}</span>
                            </li>
                            <li>
                              <b>Tests</b>
                              <span>{codingAgentPlan.schema.testPlan.slice(0, 3).join(", ") || "No test plan yet."}</span>
                            </li>
                            <li>
                              <b>Risks</b>
                              <span>{codingAgentPlan.risks.slice(0, 3).join(" ") || "No major risks listed."}</span>
                            </li>
                          </ul>
                        ) : (
                          <span className="coding-right-empty">Summary appears after the agent assesses the task.</span>
                        )}
                      </div>
                    </section>
                  )}

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
                          <strong>{codingReviewChangedCount}</strong>
                          <small>Changed</small>
                        </span>
                        <span className="added">
                          <strong>+{codingReviewAddedCount}</strong>
                          <small>New code</small>
                        </span>
                        <span className="removed">
                          <strong>-{codingReviewRemovedCount}</strong>
                          <small>Deleted</small>
                        </span>
                      </div>

                      {codingReviewMode === "summary" && (
                        <div className="coding-review-brief">
                          <span>
                            <strong>{activeCodingProject?.name ?? "No project"}</strong>
                            <small>
                              {activeCodingProject
                                ? `${codingGitStatus?.success ? codingGitStatus.branch : "git unavailable"} | ${activeCodingProject.rootPath}`
                                : "Open a local folder to inspect files."}
                            </small>
                          </span>
                          <button type="button" onClick={() => void refreshCodingRepoState()}>
                            Refresh git
                          </button>
                        </div>
                      )}

                      <div className="coding-change-file-list" aria-label="Changed files">
                        {codingReviewChangedCount === 0 ? (
                          <span className="coding-right-empty">Edits and git changes will appear here after you change a file in the coding workspace.</span>
                        ) : (
                          <>
                            {changedCodingFileTabs.map((tab) => {
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
                                      open editor diff | +{diff?.added ?? 0} -{diff?.removed ?? 0}
                                    </small>
                                  </span>
                                </button>
                              );
                            })}
                            {codingGitChangedFiles.map((file) => (
                              <button
                                key={`${file.status}-${file.path}`}
                                className={
                                  selectedCodingGitDiffPath &&
                                  normalizeCodingRelativePath(file.path) === normalizeCodingRelativePath(selectedCodingGitDiffPath)
                                    ? "active"
                                    : ""
                                }
                                type="button"
                                onClick={() => void openCodingGitChangedFile(file)}
                              >
                                <FileText size={14} aria-hidden="true" />
                                <span>
                                  <strong>{file.path}</strong>
                                  <small>
                                    open file review | {file.staged ? "staged" : "unstaged"} | {file.status}
                                  </small>
                                </span>
                              </button>
                            ))}
                          </>
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

                      {codingReviewMode === "review" && selectedCodingGitDiff?.changed && (
                        <article className="coding-diff-card active" aria-label={`Review git changes for ${selectedCodingGitDiffPath ?? "selected file"}`}>
                          <div className="coding-diff-header">
                            <span>
                              <strong>{selectedCodingGitDiffPath ?? "Git diff"}</strong>
                              <small>
                                Git review | {selectedCodingGitChangedFile?.staged ? "staged" : "unstaged"} | +{selectedCodingGitDiff.added} -
                                {selectedCodingGitDiff.removed}
                              </small>
                            </span>
                            <div>
                              {selectedCodingGitChangedFile && !/D/u.test(selectedCodingGitChangedFile.status) && (
                                <button type="button" onClick={() => void openCodingGitChangedFile(selectedCodingGitChangedFile)}>
                                  Open file
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="coding-diff-body">
                            {selectedCodingGitDiff.hunks.map((hunk) => (
                              <section className="coding-diff-hunk" key={hunk.id} aria-label={`Git changes near line ${hunk.newStart || hunk.oldStart}`}>
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
                      )}

                      {codingReviewMode === "review" && codingGitDiff && !selectedCodingGitDiff?.changed && (
                        <pre className="coding-git-diff-preview" aria-label="Git diff from disk">
                          {codingGitDiff}
                        </pre>
                      )}

                      {codingReviewMode === "review" && codingReviewDiffTabs.length === 0 && !selectedCodingGitDiff?.changed && (
                        <div className="coding-review-empty">
                          <Code2 size={18} aria-hidden="true" />
                          <span>
                            <strong>{codingGitDiff ? "Git diff" : "No editor diff selected."}</strong>
                            <small>
                              {codingGitDiff
                                ? "This is the current git diff from disk. Editor diffs still show red and green line review after manual edits."
                                : "Open a text file, make an edit, or select a git-changed file to review the diff."}
                            </small>
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
                        <button type="button" onClick={() => openCodingTerminal({ forceLaunch: true })} disabled={codingTerminalOpening}>
                          {codingTerminalOpening ? "Opening" : "Open PowerShell"}
                        </button>
                      </div>
                      <div className="coding-right-list terminal-history">
                        {codingTerminalHistory.length === 0 ? (
                          <span className="coding-right-empty">Run a command to see active terminal history here.</span>
                        ) : (
                          codingTerminalHistory.map((result, index) => (
                            <button key={`${result.command ?? "command"}-${index}`} type="button" onClick={() => openCodingTerminal({ launchShell: false })}>
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
                                <small>
                                  {plugin.category} - {isInstalling ? getPluginInstallRemaining(status, codingClock) : getPluginStatusLabel(status)}
                                </small>
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
            <section className="productivity-page productivity-command-page" aria-labelledby="productivity-heading">
              <header className="productivity-hero">
                <div className="productivity-hero-copy">
                  <p className="panel-kicker">{todayLabel}</p>
                  <h1 id="productivity-heading">
                    {todaysCallPlan.openCount > 0
                      ? todaysCallPlan.headline
                      : `${commandCenterOpenCount} ${commandCenterOpenCount === 1 ? "thing needs" : "things need"} action, ${commandCenterUrgentCount} ${
                          commandCenterUrgentCount === 1 ? "is" : "are"
                        } urgent.`}
                  </h1>
                  <p>
                    {todaysCallPlan.openCount > 0
                      ? todaysCallPlan.subheadline
                      : "Connected inbox and calendar sources become a ranked day plan with clear ownership for AI-prepared work and user-only decisions."}
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
                    <strong>{todaysCallTopMove ? todaysCallTopMove.instruction : nextActionItem ? getActionInstruction(nextActionItem) : "Connect a source"}</strong>
                  </div>
                </div>
                <div className="productivity-stats" aria-label="Action item summary">
                  <span>
                    <strong>{todaysCallPlan.openCount > 0 ? todaysCallPlan.aiCanHandleCount + todaysCallPlan.aiWorkingCount : aiHandleActionCount}</strong>
                    <small>Autopilot can start</small>
                  </span>
                  <span>
                    <strong>{todaysCallPlan.openCount > 0 ? todaysCallPlan.userMustHandleCount : userHandleActionCount}</strong>
                    <small>User must handle</small>
                  </span>
                  <span>
                    <strong>{todaysCallPlan.openCount > 0 ? formatFocusMinutes(todaysCallPlan.focusMinutes) : focusTimeLabel}</strong>
                    <small>Focus time</small>
                  </span>
                  <span>
                    <strong>{todaysCallPlan.openCount > 0 ? todaysCallPlan.needsApprovalCount : waitingActionCount}</strong>
                    <small>Waiting</small>
                  </span>
                  <span>
                    <strong>{todaysCallPlan.openCount > 0 ? todaysCallPlan.sourceCount : activeSourceCount}</strong>
                    <small>Sources</small>
                  </span>
                </div>
                <button className="sources-pill-button" type="button" onClick={() => setProductivitySourcesOpen(true)}>
                  <Sparkles size={15} aria-hidden="true" />
                  Sources · {activeSourceCount}
                </button>
              </header>

              <section className="priority-callout" aria-label="Today's priority call">
                <AutopilotNeedle className="priority-callout-needle" />
                <div>
                  <p className="panel-kicker">Today's call</p>
                  <h2>{todaysCallTopMove ? todaysCallTopMove.title : nextActionItem ? "Start here" : "No action items yet."}</h2>
                  {todaysCallTopMove ? (
                    <>
                      <div className="callout-brief">
                        <span>{todaysCallTopMove.status}</span>
                        <strong>{todaysCallTopMove.instruction}</strong>
                        <small>{todaysCallTopMove.reason}</small>
                        <small>Source: {todaysCallTopMove.source}</small>
                      </div>
                      {remainingTodaysCallMoves.length > 0 && (
                        <ol aria-label="Next priority work">
                          {remainingTodaysCallMoves.map((move, index) => (
                            <li key={move.id}>
                              <strong>{`Step ${index + 2}`}</strong>
                              <span>{`${move.status}: ${move.instruction}`}</span>
                            </li>
                          ))}
                        </ol>
                      )}
                    </>
                  ) : nextActionItem ? (
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
                  {!todaysCallTopMove && !nextActionItem && (
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
                  disabled={!todaysCallTopMove && !nextActionItem}
                  onClick={() => {
                    if (todaysCallTopMove) {
                      void startTodaysCallMove(todaysCallTopMove);
                      return;
                    }

                    if (nextActionItem) {
                      setSelectedActionSource(nextActionItem.source);
                    }
                  }}
                >
                  {todaysCallTopMove ? todaysCallTopMove.actionLabel : "Start next task"}
                  <ArrowRight size={17} aria-hidden="true" />
                </button>
              </section>

              <section className={`onboarding-summary-card ${onboardingSummary.complete ? "complete" : "needs-action"}`} aria-label="First sync onboarding">
                <div className="onboarding-summary-copy">
                  <p className="panel-kicker">First sync</p>
                  <h2>{onboardingSummary.headline}</h2>
                  <span>{onboardingSummary.detail}</span>
                </div>
                <div className="onboarding-summary-stats" aria-label="Connected work found">
                  <span>
                    <strong>{onboardingSummary.stats.actionItems}</strong>
                    <small>Actions</small>
                  </span>
                  <span>
                    <strong>{onboardingSummary.stats.calendarEvents}</strong>
                    <small>Calendar</small>
                  </span>
                  <span>
                    <strong>{onboardingSummary.stats.drafts}</strong>
                    <small>Drafts</small>
                  </span>
                  <span>
                    <strong>{onboardingSummary.stats.syncedSources}</strong>
                    <small>Sources</small>
                  </span>
                </div>
                <ol className="onboarding-summary-steps" aria-label="Next onboarding steps">
                  {onboardingSummary.nextSteps.slice(0, 3).map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
                <button
                  className={onboardingSummary.complete ? "secondary-action" : "primary-action"}
                  type="button"
                  disabled={emailBusy && onboardingSummary.primaryAction !== "configure_google"}
                  onClick={() => void runOnboardingPrimaryAction()}
                >
                  {onboardingSummary.primaryAction === "configure_google" ? (
                    <Settings size={15} aria-hidden="true" />
                  ) : onboardingSummary.primaryAction === "sync_sources" ? (
                    <RotateCw size={15} className={emailBusy ? "spin" : ""} aria-hidden="true" />
                  ) : onboardingSummary.primaryAction === "review_work" ? (
                    <Sparkles size={15} aria-hidden="true" />
                  ) : (
                    <Mail size={15} aria-hidden="true" />
                  )}
                  {onboardingSummary.primaryActionLabel}
                </button>
              </section>

              <section className="work-router-panel" aria-label="Autopilot work routing">
                <div className="work-router-heading">
                  <div>
                    <p className="panel-kicker">Command center</p>
                    <h2>Today&apos;s work, routed into the right workspace</h2>
                    <span>Gmail, Google Calendar, Slack when configured, browser context, and manual tasks become visible work with a source, plan, output, quality gate, and final approval.</span>
                  </div>
                  <button className="secondary-action" type="button" onClick={() => void refreshWorkOrchestration()}>
                    <RotateCw size={15} aria-hidden="true" />
                    Refresh
                  </button>
                </div>
                <div className="command-center-metrics" aria-label="Work status summary">
                  {commandCenterStats.map((stat) => (
                    <div className="command-center-metric" key={stat.label}>
                      <span>{stat.label}</span>
                      <strong>{stat.value}</strong>
                      <small>{stat.detail}</small>
                    </div>
                  ))}
                </div>
                <section className="proactive-work-strip" aria-label="Proactive Autopilot work">
                  <span className="proactive-work-orb" aria-hidden="true">
                    <Sparkles size={18} />
                  </span>
                  <div className="proactive-work-copy">
                    <p className="panel-kicker">Proactive Autopilot</p>
                    <h3>{proactiveWorkPlan.headline}</h3>
                    <p>{proactiveWorkPlan.summary}</p>
                    <div className="proactive-work-preview" aria-label="Next proactive work">
                      {proactiveWorkPlan.items.slice(0, 3).map((item) => (
                        <span key={item.id} data-tone={getProactiveStatusTone(item)} title={item.reason}>
                          <strong>{item.statusLabel}</strong>
                          {item.title}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="proactive-work-pills" aria-label="Proactive work counts">
                    <span>
                      <strong>{proactiveWorkPlan.readyCount}</strong>
                      <small>Ready</small>
                    </span>
                    <span>
                      <strong>{proactiveWorkPlan.workingCount}</strong>
                      <small>Working</small>
                    </span>
                    <span>
                      <strong>{proactiveWorkPlan.needsReviewCount}</strong>
                      <small>Review</small>
                    </span>
                    <span>
                      <strong>{proactiveWorkPlan.userOnlyCount}</strong>
                      <small>User</small>
                    </span>
                  </div>
                  <button
                    className="primary-action"
                    type="button"
                    disabled={proactiveWorkBusy || proactiveWorkPlan.readyCount === 0}
                    onClick={() => void startProactiveWork("manual")}
                  >
                    <Sparkles size={16} className={proactiveWorkBusy ? "spin" : ""} aria-hidden="true" />
                    {proactiveWorkBusy ? "Starting" : "Start safe work"}
                  </button>
                </section>
                {proactiveWorkStatus ? <p className="proactive-work-status">{proactiveWorkStatus}</p> : null}
                <div className="work-router-body">
                  <div className="work-command-lanes" aria-label="Open work items">
                    {openWorkItems.length === 0 ? (
                      <div className="work-empty">
                        <ListChecks size={20} aria-hidden="true" />
                        <span>No routed AI work yet. Calendar events stay on the calendar; email and manual tasks appear here when they need Autopilot.</span>
                      </div>
                    ) : (
                      [
                        { title: "Needs doing", items: aiCanHandleWorkItems, empty: "Nothing is ready for Autopilot to prepare." },
                        { title: "AI working", items: aiWorkingWorkItems, empty: "No active runs right now." },
                        { title: "Needs approval", items: reviewWorkItems, empty: "Nothing is waiting on review." },
                        { title: "User must handle", items: userMustHandleWorkItems, empty: "No user-only decisions found." }
                      ].map((lane) => (
                        <section className="work-lane" key={lane.title}>
                          <div className="work-lane-heading">
                            <span>{lane.title}</span>
                            <b>{lane.items.length}</b>
                          </div>
                          {lane.items.length === 0 ? (
                            <p>{lane.empty}</p>
                          ) : (
                            lane.items.slice(0, 5).map((item) => (
                              <button
                                className={`work-item-row ${selectedWorkItem?.id === item.id ? "active" : ""}`}
                                key={`${lane.title}:${item.id}`}
                                type="button"
                                onClick={() => setSelectedWorkItemId(item.id)}
                              >
                                <span>
                                  <strong>{item.title}</strong>
                                  <small>{getWorkItemSourceSummary(item)}</small>
                                  <small className="work-route-summary">{getWorkItemRouteSummary(item)}</small>
                                </span>
                                <span className="work-role-strip">
                                  {item.assignedRoles.map((role) => {
                                    const Icon = getWorkspaceRoleIcon(role);
                                    return (
                                      <b key={role} title={getWorkspaceRoleLabel(role)}>
                                        <Icon size={12} aria-hidden="true" />
                                      </b>
                                    );
                                  })}
                                </span>
                              </button>
                            ))
                          )}
                        </section>
                      ))
                    )}
                  </div>
                  <article className="work-detail-card">
                    {selectedWorkItem ? (
                      <>
                        <div className="work-detail-heading">
                          <div>
                            <span className="work-priority-pill">{selectedWorkItem.priority} priority</span>
                            <h3>{selectedWorkItem.title}</h3>
                            <p>{selectedWorkItem.context}</p>
                          </div>
                          <button
                            className="primary-action"
                            type="button"
                            disabled={Boolean(routingWorkItemIds[selectedWorkItem.id]) || getWorkItemOwnership(selectedWorkItem) === "user" || isWorkItemRouteBlocked(selectedWorkItem)}
                            onClick={() => void routeSelectedWorkItem(selectedWorkItem)}
                          >
                            <Sparkles size={15} className={routingWorkItemIds[selectedWorkItem.id] ? "spin" : ""} aria-hidden="true" />
                            {getWorkItemOwnership(selectedWorkItem) === "user"
                              ? "User-owned"
                              : isWorkItemRouteBlocked(selectedWorkItem)
                                ? "Review route"
                                : routingWorkItemIds[selectedWorkItem.id]
                                  ? "Routing"
                                  : "Assign work"}
                          </button>
                        </div>
                        <div className="work-detail-trail" aria-label="Source and approval trail">
                          <span>
                            <ShieldCheck size={14} aria-hidden="true" />
                            {getPermissionCopy(selectedWorkItem)}
                          </span>
                          <span>
                            <Mail size={14} aria-hidden="true" />
                            Source: {getWorkItemSourceSummary(selectedWorkItem)}
                          </span>
                          <span>
                            <Sparkles size={14} aria-hidden="true" />
                            Status: {getWorkItemStatusLabel(selectedWorkItem)}
                          </span>
                          <span>
                            <ListChecks size={14} aria-hidden="true" />
                            {getWorkItemRouteSummary(selectedWorkItem)}
                          </span>
                        </div>
                        {isWorkItemRouteBlocked(selectedWorkItem) && (
                          <div className="work-route-review-card">
                            <span>
                              <strong>Confirm this route before Autopilot starts.</strong>
                              <small>{getRouteReviewReason(selectedWorkItem)}</small>
                            </span>
                            <button className="secondary-action" type="button" onClick={() => confirmWorkItemRoute(selectedWorkItem)}>
                              Confirm route
                            </button>
                          </div>
                        )}
                        {selectedProactiveWorkItem && (
                          <div className="work-review-path" aria-label="Reviewable Autopilot path">
                            <span data-active={selectedProactiveWorkItem.status === "ready_to_start"}>
                              <strong>Generate</strong>
                              <small>{selectedProactiveWorkItem.nextStep}</small>
                            </span>
                            <span data-active={selectedProactiveWorkItem.status === "needs_review"}>
                              <strong>Preview</strong>
                              <small>Show source, output, run log, and quality check.</small>
                            </span>
                            <span data-active={selectedProactiveWorkItem.reviewRequired}>
                              <strong>Approve</strong>
                              <small>{getProactiveSafetyLabel(selectedProactiveWorkItem)}</small>
                            </span>
                          </div>
                        )}
                        <div className="work-role-cards">
                          {selectedWorkItem.assignedRoles.map((role) => {
                            const Icon = getWorkspaceRoleIcon(role);
                            return (
                              <span key={role}>
                                <Icon size={15} aria-hidden="true" />
                                {getWorkspaceRoleLabel(role)}
                              </span>
                            );
                          })}
                        </div>
                        <div className="work-assignment-list">
                          {selectedWorkAssignments.length === 0 ? (
                            <p>
                             {getWorkItemOwnership(selectedWorkItem) === "user"
                                ? "This stays on your plate. Autopilot keeps the source, timing, and context ready."
                                : isWorkItemRouteBlocked(selectedWorkItem)
                                  ? getRouteReviewReason(selectedWorkItem)
                                  : "Not assigned yet. Click Assign work and Autopilot will create the workspace handoff."}
                            </p>
                          ) : (
                            selectedWorkAssignments.map((assignment) => (
                              <WorkAssignmentCard
                                key={assignment.id}
                                assignment={assignment}
                                outputLabel={getAssignmentOutputLabel(assignment)}
                                stateLabel={getAssignmentStateLabel(assignment.state)}
                                onApprove={() => void setAssignmentReviewState(assignment, "completed")}
                                onReject={() => void setAssignmentReviewState(assignment, "failed")}
                              />
                            ))
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="work-empty detail">
                        <Sparkles size={20} aria-hidden="true" />
                        <span>Choose a routed work item to see its source, plan, run log, output, and approval state.</span>
                      </div>
                    )}
                  </article>
                </div>
              </section>

              <div className="productivity-grid">
                <section className="email-inbox-panel" aria-label="Built-in email inbox">
                  <div className="email-inbox-heading">
                    <div>
                      <p className="panel-kicker">Inbox</p>
                      <h2>Inbox</h2>
                      <span>
                        {googleConnectionSummary}
                      </span>
                    </div>
                    <div className="email-inbox-actions">
                      {googleSourceLooksConnected ? (
                        <>
                          <button className="secondary-action" type="button" onClick={() => void disconnectEmailInbox()} disabled={emailBusy}>
                            Disconnect
                          </button>
                          <button className="primary-action" type="button" onClick={() => void syncEmailInbox()} disabled={emailBusy}>
                            <RotateCw size={16} className={emailBusy ? "spin" : ""} aria-hidden="true" />
                            Sync Google
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
                            Connect Google
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
                  {productivityShortcutHelpOpen && (
                    <div className="productivity-shortcut-help" role="note" aria-label="Inbox keyboard shortcuts">
                      <strong>Inbox shortcuts</strong>
                      <span>
                        <kbd>J</kbd>/<kbd>K</kbd> move
                      </span>
                      <span>
                        <kbd>R</kbd> draft
                      </span>
                      <span>
                        <kbd>E</kbd> ignore
                      </span>
                      <span>
                        <kbd>C</kbd> compose
                      </span>
                      <span>
                        <kbd>?</kbd> hide
                      </span>
                    </div>
                  )}

                  {emailMessages.length === 0 ? (
                    <div className="email-empty">
                      <Mail size={22} aria-hidden="true" />
                      <span>{googleSourceLooksConnected ? "No Gmail messages synced yet. Calendar data may still be showing below." : "Connect Google to show Gmail and Calendar here."}</span>
                    </div>
                  ) : (
                    <div className="productivity-email-list" aria-label={`${Math.min(emailMessages.length, 200)} synced Gmail messages`}>
                      {emailMessages.slice(0, 200).map((message) => {
                        const isBuildingMessage = buildingWorkMessageIds.includes(message.id);
                        const messageDraft = draftByMessageId.get(message.id);
                        const messageTasks = productivityTasks.filter(
                          (task) => task.source.messageId === message.id && task.state !== "done" && typeof task.source.actionConfidence === "number"
                        );
                        const messageTaskIds = messageTasks.map((task) => task.id);
                        const isExpanded = expandedEmailIds.includes(message.id);
                        const isIgnored = ignoredEmailIds.includes(message.id);
                        const senderLabel = getInboxSenderLabel(message);
                        const senderInitials = getInboxSenderInitials(message);
                        const visibleSnippet = message.snippet || message.actionText?.slice(0, 260) || "Open this email to review the full thread.";
                        const fullPreview = message.actionText || message.snippet || "No readable body was included in this sync.";
                        const neededSummary = isIgnored ? "Ignored for action suggestions." : getInboxNeededSummary(message, messageTasks, messageDraft);
                        const actionLabel = messageDraft ? "View draft" : isBuildingMessage ? "Drafting..." : messageTaskIds.length > 0 ? "Build work" : "Create draft";
                        return (
                          <article
                            className={`productivity-email-card ${message.unread ? "unread" : ""} ${messageDraft ? "has-draft" : ""} ${isExpanded ? "expanded" : ""} ${isIgnored ? "ignored" : ""} ${
                              selectedInboxEmailId === message.id ? "selected" : ""
                            }`}
                            key={message.id}
                            onMouseEnter={() => setSelectedInboxEmailId(message.id)}
                          >
                            <button
                              className="productivity-email-main"
                              type="button"
                              aria-label={`Open ${message.subject || "email"} in Gmail`}
                              onClick={() => void openEmailInBrowser(message)}
                            >
                              <span className="productivity-email-avatar" aria-hidden="true">
                                {senderInitials}
                              </span>
                              <span className="productivity-email-copy productivity-email-copy-v2">
                                <span className="productivity-email-default-grid">
                                  <span className="productivity-email-field sender">
                                    <small>Sender</small>
                                    <strong>{senderLabel}</strong>
                                  </span>
                                  <span className="productivity-email-field subject">
                                    <small>Subject</small>
                                    <strong>{message.subject || "(No subject)"}</strong>
                                  </span>
                                  <span className="productivity-email-field contact">
                                    <small>Contact</small>
                                    <strong>{message.fromEmail || message.provider}</strong>
                                  </span>
                                  <span className="productivity-email-field date">
                                    <small>Date</small>
                                    <time dateTime={new Date(message.receivedAt).toISOString()}>{formatInboxReceivedAt(message.receivedAt)}</time>
                                  </span>
                                </span>
                                <span className="productivity-email-snippet">{visibleSnippet}</span>
                                <span className="productivity-email-needed">{neededSummary}</span>
                                <span className="productivity-email-chip-row" aria-label="Email status">
                                  {message.unread && <small>Unread</small>}
                                  {messageDraft && <small>Draft ready</small>}
                                  {messageTaskIds.length > 0 && <small>{messageTaskIds.length} action{messageTaskIds.length === 1 ? "" : "s"}</small>}
                                  {isIgnored && <small>Ignored</small>}
                                  {!message.unread && !messageDraft && messageTaskIds.length === 0 && <small>Synced</small>}
                                </span>
                              </span>
                            </button>
                            {isExpanded && (
                              <div className="productivity-email-expanded">
                                <div className="productivity-email-detail-grid">
                                  <div>
                                    <p className="detail-label">From</p>
                                    <strong>{senderLabel}</strong>
                                    <span>{message.fromEmail || "No address available"}</span>
                                  </div>
                                  <div>
                                    <p className="detail-label">Received</p>
                                    <strong>{formatInboxReceivedAt(message.receivedAt)}</strong>
                                    <span>{new Date(message.receivedAt).toLocaleString()}</span>
                                  </div>
                                  <div>
                                    <p className="detail-label">Detected need</p>
                                    <strong>{neededSummary}</strong>
                                    <span>{messageTasks[0]?.source.routeReason || messageTasks[0]?.context || "Expand this email, then generate a draft or assign it to AI."}</span>
                                  </div>
                                </div>
                                <div className="productivity-email-body">
                                  <p className="detail-label">Email preview</p>
                                  <p>{fullPreview}</p>
                                </div>
                                {messageDraft && (
                                  <div className="productivity-email-draft-preview">
                                    <p className="detail-label">Generated draft</p>
                                    <strong>{messageDraft.title}</strong>
                                    <span>{messageDraft.preview}</span>
                                  </div>
                                )}
                                {messageTasks.length > 0 && (
                                  <div className="productivity-email-task-list">
                                    <p className="detail-label">Queue tasks from this email</p>
                                    {messageTasks.map((task) => (
                                      <span key={task.id}>
                                        <strong>{task.title}</strong>
                                        <small>
                                          {task.priority.toUpperCase()} · {task.source.recommendedAssistant ?? "productivity"} ·{" "}
                                          {typeof task.source.actionConfidence === "number" ? `${task.source.actionConfidence}%` : "needs review"}
                                        </small>
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                            <div className="productivity-email-actions">
                              <button
                                className="secondary-action productivity-email-action"
                                type="button"
                                aria-expanded={isExpanded}
                                onClick={() => toggleInboxEmail(message.id)}
                              >
                                {isExpanded ? "Hide details" : "Details"}
                              </button>
                              <button
                                className={`secondary-action productivity-email-action ${messageDraft ? "ready" : ""}`}
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
                                {actionLabel}
                                <Sparkles size={16} className={isBuildingMessage ? "spin" : ""} aria-hidden="true" />
                              </button>
                              <button
                                className="secondary-action productivity-email-action"
                                type="button"
                                disabled={isBuildingMessage}
                                onClick={() => void assignInboxEmailToAi(message, messageTaskIds)}
                              >
                                Assign to AI
                                <Sparkles size={16} aria-hidden="true" />
                              </button>
                              <button className="secondary-action productivity-email-action" type="button" onClick={() => ignoreInboxEmail(message)}>
                                Ignore
                              </button>
                              <button className="secondary-action productivity-email-action" type="button" onClick={() => void openEmailInBrowser(message)}>
                                Open in Gmail
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
                            <span className="draft-status-pill" data-status={draft.status}>
                              {draft.status === "approved" && <Check size={12} aria-hidden="true" />}
                              {draft.status === "needs_review" && <Eye size={12} aria-hidden="true" />}
                              {draft.status === "draft" && <Sparkles size={12} aria-hidden="true" />}
                              {getDraftStatusLabel(draft.status)}
                            </span>
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
                        const handler = getActionItemHandler(item);
                        const isChecklistItemExpanded = selectedChecklistActionId === item.id;
                        return (
                          <article
                            className={`checklist-item ${isChecklistItemExpanded ? "expanded" : ""}`}
                            key={item.id}
                            onClick={() => setSelectedChecklistActionId((currentId) => (currentId === item.id ? null : item.id))}
                          >
                            <label>
                              <input
                                type="checkbox"
                                checked={false}
                                onClick={(event) => event.stopPropagation()}
                                onChange={() => toggleActionItem(item.id)}
                                aria-label={`Mark ${item.title} done`}
                              />
                              <span className="checklist-copy">
                                <span className="checklist-title-row">
                                  <strong>{item.title}</strong>
                                </span>
                                <small>
                                  {item.source}
                                  {item.context ? ` - ${item.context}` : ""}
                                </small>
                              </span>
                            </label>
                            {isChecklistItemExpanded && (
                              <div className="checklist-detail-row">
                                <span
                                  className="action-handler-pill"
                                  data-handler={handler}
                                  title={handler === "ai" ? "Autopilot can prepare a draft for your approval" : "This needs you directly"}
                                >
                                  {handler === "ai" ? <Sparkles size={11} aria-hidden="true" /> : <Eye size={11} aria-hidden="true" />}
                                  {getActionHandlerLabel(handler)}
                                </span>
                                {task && (
                                  <div className="task-state-actions" aria-label={`${task.title} state`} onClick={(event) => event.stopPropagation()}>
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
                              </div>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>

                <section className="calendar-panel calendar-week-panel" aria-label="Integrated Google Calendar week view">
                  <aside className="calendar-side-panel" aria-label="Calendar controls">
                    <button className="calendar-create-button" type="button" onClick={() => void syncGoogleCalendarFromPanel()} disabled={emailBusy}>
                      {googleSourceLooksConnected ? <RotateCw size={18} className={emailBusy ? "spin" : ""} aria-hidden="true" /> : <Plus size={18} aria-hidden="true" />}
                      {googleSourceLooksConnected ? "Sync Calendar" : "Connect Google"}
                    </button>

                    <div className="mini-calendar">
                      <div className="mini-calendar-heading">
                        <strong>{formatCalendarMonthLabel(calendarReferenceDate)}</strong>
                        <span>
                          <button type="button" aria-label="Previous month" onClick={() => setCalendarReferenceDate(addCalendarDays(calendarReferenceDate, -28))}>
                            <ChevronLeft size={15} aria-hidden="true" />
                          </button>
                          <button type="button" aria-label="Next month" onClick={() => setCalendarReferenceDate(addCalendarDays(calendarReferenceDate, 28))}>
                            <ChevronRight size={15} aria-hidden="true" />
                          </button>
                        </span>
                      </div>
                      <div className="mini-calendar-grid" aria-label="Mini month">
                        {["M", "T", "W", "T", "F", "S", "S"].map((dayLabel, index) => (
                          <b key={`${dayLabel}-${index}`}>{dayLabel}</b>
                        ))}
                        {miniCalendarDays.map((day) => {
                          const isCurrentMonth = day.getMonth() === calendarReferenceDate.getMonth();
                          const isSelectedWeek = day >= calendarWeekDays[0] && day <= calendarWeekDays[6];
                          const isToday = isSameCalendarDay(day, calendarToday);
                          return (
                            <button
                              className={`${isCurrentMonth ? "" : "muted"} ${isSelectedWeek ? "selected-week" : ""} ${isToday ? "today" : ""}`}
                              key={day.toISOString()}
                              type="button"
                              onClick={() => setCalendarReferenceDate(day)}
                            >
                              {day.getDate()}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="calendar-source-list">
                      <div className="calendar-source-heading">
                        <strong>My calendars</strong>
                        <small>{calendarSources.length} source{calendarSources.length === 1 ? "" : "s"}</small>
                      </div>
                      {calendarSources.length === 0 ? (
                        <span className="calendar-source-empty">Connect Google Calendar to list your calendars here.</span>
                      ) : (
                        calendarSources.map((source) => (
                          <label key={source.label}>
                            <span style={{ "--calendar-source-color": source.color } as CSSProperties} />
                            <input type="checkbox" checked readOnly />
                            <em>{source.label}</em>
                            <small>{source.count}</small>
                          </label>
                        ))
                      )}
                    </div>
                  </aside>

                  <div className="calendar-week-main">
                    <div className="calendar-toolbar">
                      <div>
                        <p className="panel-kicker">Calendar</p>
                        <h2>My Calendar</h2>
                        <span className="calendar-range-label">{calendarWeekRangeLabel}</span>
                      </div>
                      <div className="calendar-toolbar-actions">
                        <button type="button" onClick={() => setCalendarReferenceDate(calendarToday)}>
                          Today
                        </button>
                        <button type="button" aria-label="Previous week" onClick={() => setCalendarReferenceDate(addCalendarDays(calendarReferenceDate, -7))}>
                          <ChevronLeft size={16} aria-hidden="true" />
                        </button>
                        <button type="button" aria-label="Next week" onClick={() => setCalendarReferenceDate(addCalendarDays(calendarReferenceDate, 7))}>
                          <ChevronRight size={16} aria-hidden="true" />
                        </button>
                        <span>Week</span>
                        <button type="button" onClick={() => void syncGoogleCalendarFromPanel()} disabled={emailBusy}>
                          {googleSourceLooksConnected ? <RotateCw size={15} className={emailBusy ? "spin" : ""} aria-hidden="true" /> : <Plus size={15} aria-hidden="true" />}
                          {googleSourceLooksConnected ? "Sync" : "Connect"}
                        </button>
                      </div>
                    </div>

                    <div
                      className="calendar-week-board"
                      style={
                        {
                          "--calendar-hour-count": CALENDAR_WEEK_END_HOUR - CALENDAR_WEEK_START_HOUR,
                          "--calendar-hour-label-count": calendarHours.length,
                          "--calendar-hour-height": `${CALENDAR_HOUR_HEIGHT}px`
                        } as CSSProperties
                      }
                    >
                      <div className="calendar-time-zone">Local</div>
                      {calendarWeekDays.map((day) => {
                        const pendingCount = pendingCalendarTasksByDay.get(getStartOfDay(day).toISOString()) ?? 0;
                        return (
                          <div className={`calendar-day-heading ${isSameCalendarDay(day, calendarToday) ? "today" : ""}`} key={day.toISOString()}>
                            <span>{new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(day)}</span>
                            <strong>{day.getDate()}</strong>
                            {pendingCount > 0 && <small>{pendingCount} pending task{pendingCount === 1 ? "" : "s"}</small>}
                          </div>
                        );
                      })}
                      <div className="calendar-time-column">
                        {calendarHours.map((hour) => (
                          <span key={hour}>{formatCalendarTime(new Date(calendarWeekDays[0].getFullYear(), calendarWeekDays[0].getMonth(), calendarWeekDays[0].getDate(), hour).getTime())}</span>
                        ))}
                      </div>
                      <div className="calendar-week-lanes">
                        {calendarWeekDays.map((day) => (
                          <div className="calendar-day-lane" key={day.toISOString()} />
                        ))}
                        {calendarWeekDays.flatMap((day, dayIndex) =>
                          calendarHours
                            .filter((hour) => hour < CALENDAR_WEEK_END_HOUR)
                            .map((hour) => (
                              <button
                                className="calendar-create-slot"
                                key={`${day.toISOString()}-${hour}`}
                                type="button"
                                aria-label={`Add event on ${new Intl.DateTimeFormat(undefined, { weekday: "long", month: "short", day: "numeric" }).format(day)} at ${formatCalendarTime(new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour).getTime())}`}
                                style={
                                  {
                                    "--calendar-day-index": dayIndex,
                                    "--calendar-start-offset": hour - CALENDAR_WEEK_START_HOUR
                                  } as CSSProperties
                                }
                                onClick={() => openCalendarCreateAt(day, hour)}
                              />
                            ))
                        )}
                        {calendarWeekEvents.map((event) => {
                          const leftPercent = event.dayIndex * (100 / 7);
                          const widthPercent = 100 / 7;
                          return (
                            <button
                              className={`calendar-week-event ${event.compact ? "compact" : ""} ${event.allDay ? "all-day" : ""} ${
                                event.sourceKind === "local" ? "local" : "synced"
                              }`}
                              key={event.id}
                              type="button"
                              style={
                                {
                                  "--calendar-event-color": event.color,
                                  "--calendar-left-percent": `${leftPercent}%`,
                                  "--calendar-width-percent": `${widthPercent}%`,
                                  "--calendar-start-offset": event.startOffset,
                                  "--calendar-duration": event.durationHours,
                                  "--calendar-lane-index": event.laneIndex,
                                  "--calendar-lane-count": event.laneCount
                                } as CSSProperties
                              }
                              onClick={() => openCalendarEventEditor(event)}
                              title={`${event.title} - ${event.timeLabel}. Click to edit in Autopilot.`}
                            >
                              <strong>{event.title}</strong>
                              <span>{event.timeLabel}</span>
                              {event.recurrenceLabel && <em>{event.recurrenceLabel}</em>}
                            </button>
                          );
                        })}
                        {calendarWeekEvents.length === 0 && (
                          <div className="calendar-week-empty">
                            <Clock size={22} aria-hidden="true" />
                            <strong>No events in this week.</strong>
                            <span>Sync Google Calendar or click any time slot to add an Autopilot event.</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </section>

                {calendarEditorState && (
                  <div className="calendar-editor-backdrop" role="presentation" onMouseDown={closeCalendarEditor}>
                    <section
                      className="calendar-editor-modal"
                      aria-label={calendarEditorState.mode === "create" ? "Create calendar event" : "Edit calendar event"}
                      role="dialog"
                      aria-modal="true"
                      onMouseDown={(event) => event.stopPropagation()}
                    >
                      <header>
                        <div>
                          <p className="panel-kicker">Autopilot Calendar</p>
                          <h2>{calendarEditorState.mode === "create" ? "Create event" : "Edit event"}</h2>
                          <span>
                            {calendarEditorState.sourceEvent?.sourceKind === "google"
                              ? "This creates an editable Autopilot copy instead of sending you to Google Calendar."
                              : "Saved locally in Autopilot and shown on this calendar."}
                          </span>
                        </div>
                        <button className="icon-button small" type="button" aria-label="Close event editor" onClick={closeCalendarEditor}>
                          <X size={15} aria-hidden="true" />
                        </button>
                      </header>
                      <form
                        className="calendar-editor-form"
                        onSubmit={(event) => {
                          event.preventDefault();
                          saveCalendarEditorEvent();
                        }}
                      >
                        <label className="calendar-editor-field full">
                          <span>Event title</span>
                          <input
                            value={calendarEventForm.title}
                            onChange={(event) => setCalendarEventForm((form) => ({ ...form, title: event.target.value }))}
                            placeholder="Name this event"
                            autoFocus
                          />
                        </label>
                        <label className="calendar-editor-field">
                          <span>Date</span>
                          <input
                            type="date"
                            value={calendarEventForm.date}
                            onChange={(event) => setCalendarEventForm((form) => ({ ...form, date: event.target.value }))}
                          />
                        </label>
                        <label className="calendar-editor-field">
                          <span>Starts</span>
                          <input
                            type="time"
                            value={calendarEventForm.startTime}
                            onChange={(event) => setCalendarEventForm((form) => ({ ...form, startTime: event.target.value }))}
                          />
                        </label>
                        <label className="calendar-editor-field">
                          <span>Ends</span>
                          <input
                            type="time"
                            value={calendarEventForm.endTime}
                            onChange={(event) => setCalendarEventForm((form) => ({ ...form, endTime: event.target.value }))}
                          />
                        </label>
                        <label className="calendar-editor-field">
                          <span>Repeats</span>
                          <select
                            value={calendarEventForm.recurrence}
                            onChange={(event) => setCalendarEventForm((form) => ({ ...form, recurrence: event.target.value as CalendarRecurrence }))}
                          >
                            <option value="none">Never</option>
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly on this date</option>
                            <option value="monthly-day">Monthly on this weekday</option>
                          </select>
                        </label>
                        {calendarEditorState.sourceEvent?.sourceKind === "google" && calendarEditorState.sourceEvent.recurrenceLabel && (
                          <div className="calendar-editor-note">
                            Google Calendar reports this as: <strong>{calendarEditorState.sourceEvent.recurrenceLabel}</strong>.
                          </div>
                        )}
                        <label className="calendar-editor-field full">
                          <span>Notes</span>
                          <textarea
                            value={calendarEventForm.notes}
                            onChange={(event) => setCalendarEventForm((form) => ({ ...form, notes: event.target.value }))}
                            placeholder="Add context, prep notes, or what needs to happen."
                          />
                        </label>
                        <footer>
                          {calendarEditorState.eventId && (
                            <button className="secondary-action danger" type="button" onClick={deleteCalendarEditorEvent}>
                              Delete
                            </button>
                          )}
                          <span />
                          <button className="secondary-action" type="button" onClick={closeCalendarEditor}>
                            Cancel
                          </button>
                          <button className="primary-action" type="submit">
                            Save event
                          </button>
                        </footer>
                      </form>
                    </section>
                  </div>
                )}

                {productivitySourcesOpen && (
                  <div className="sources-popover-backdrop" role="presentation" onMouseDown={() => setProductivitySourcesOpen(false)}>
                    <section
                      className="sources-panel sources-modal"
                      aria-label="Productivity sources"
                      role="dialog"
                      aria-modal="true"
                      onMouseDown={(event) => event.stopPropagation()}
                    >
                  <div className="sources-heading">
                    <div>
                      <p className="panel-kicker">Sources</p>
                      <h2>Choose what Autopilot reads</h2>
                    </div>
                    <span className="sources-modal-actions">
                      <button className="secondary-action" type="button" onClick={() => void syncSelectedProductivitySources()}>
                        Sync selected
                      </button>
                      <button className="icon-button small" type="button" aria-label="Close sources" onClick={() => setProductivitySourcesOpen(false)}>
                        <X size={15} aria-hidden="true" />
                      </button>
                    </span>
                  </div>
                  <div className="source-grid">
                    {productivitySourceOptions.map((source) => {
                      const Icon = source.icon;
                      const isSelected = selectedProductivitySourceSet.has(source.id);
                      const sourceResult = lastProductivitySourceResults.find((result) => result.id === source.id);
                      const isGmailSource = source.id === "gmail";
                      const isCalendarSource = source.id === "google-calendar";
                      const count = isCalendarSource
                        ? googleCalendarTaskCount
                        : isGmailSource
                          ? Math.max(emailMessages.length, actionSourceCounts.get(source.source) ?? 0)
                          : actionSourceCounts.get(source.source) ?? 0;
                      const calendarPermissionReady = Boolean((emailStatus?.connected && emailStatus.capabilities?.calendar) || hasCalendarData);
                      const calendarNeedsReconnect = Boolean(emailStatus?.connected && emailStatus.capabilities && !emailStatus.capabilities.calendar && !hasCalendarData);
                      const gmailReady = Boolean(emailStatus?.connected || hasGmailData || googleSourceLooksConnected);
                      const calendarReady = Boolean(hasCalendarData || sourceResult?.success || calendarPermissionReady);
                      const sourceStatusClass =
                        (isGmailSource && gmailReady) || (isCalendarSource && calendarReady)
                          ? "ready"
                          : Boolean(sourceResult && !sourceResult.success) || (isCalendarSource && calendarNeedsReconnect)
                            ? "soon"
                            : source.status;
                      const sourceStatusLabel = isGmailSource
                        ? gmailReady
                          ? "Connected"
                          : emailStatus?.configured === false
                            ? "Setup needed"
                            : isSelected
                              ? "Selected"
                              : "Connect"
                        : isCalendarSource
                          ? hasCalendarData
                            ? "Synced"
                            : calendarNeedsReconnect
                            ? "Reconnect"
                            : sourceResult?.success
                            ? sourceResult.itemCount > 0
                              ? "Synced"
                              : "No events"
                            : sourceResult?.reason
                              ? /reconnect|scope|permission/i.test(sourceResult.reason)
                                ? "Reconnect"
                                : "Issue"
                              : googleSourceLooksConnected
                                ? "Sync"
                                : "Connect"
                        : isSelected
                          ? "Selected"
                          : source.status === "ready"
                            ? "Ready"
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
                            <small>
                              {isCalendarSource && hasCalendarData
                                ? "Calendar events are synced and shown below."
                                : isGmailSource && hasGmailData
                                  ? "Gmail data is cached locally."
                                  : isGmailSource && googleSourceLooksConnected
                                    ? "Google is connected. Sync to pull Gmail messages."
                                  : isCalendarSource && sourceResult?.reason
                                    ? sourceResult.reason
                                    : source.detail}
                            </small>
                          </span>
                          <span className={`source-status ${sourceStatusClass}`}>{sourceStatusLabel}</span>
                          <b>{count}</b>
                        </button>
                      );
                    })}
                  </div>
                      {captureStatus ? <p className="capture-status">{captureStatus}</p> : null}
                    </section>
                  </div>
                )}

                <section className={`action-list-panel ${visibleOpenActionItems.length === 0 && visibleCompletedActionItems.length === 0 ? "is-empty" : ""}`} aria-label="Action items">
                  <div className="action-list-heading">
                    <div>
                      <p className="panel-kicker">Queue</p>
                      <h2>{selectedActionSource === "All" ? "Action Queue" : `${selectedActionSource} actions`}</h2>
                      <span>{visibleOpenActionItems.length} open</span>
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
                              <div className="action-meta-row">
                                {task && <small>{getTaskStateLabel(task.state)}</small>}
                                <span
                                  className="action-handler-pill compact"
                                  data-handler={getActionItemHandler(item)}
                                  title={getActionItemHandler(item) === "ai" ? "Autopilot can prepare this before you approve final action" : "This requires the user directly"}
                                >
                                  {getActionItemHandler(item) === "ai" ? <Sparkles size={11} aria-hidden="true" /> : <Eye size={11} aria-hidden="true" />}
                                  {getActionHandlerLabel(getActionItemHandler(item))}
                                </span>
                              </div>
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

                  <section className="queue-source-summary" aria-label="Productivity sources">
                    <div className="queue-source-heading">
                      <div>
                        <p className="panel-kicker">Sources</p>
                        <h3>Connected signals</h3>
                      </div>
                      <button className="secondary-action compact" type="button" onClick={() => setProductivitySourcesOpen(true)}>
                        Sources · {activeSourceCount}
                      </button>
                    </div>
                    <div className="queue-source-list">
                      {productivitySourceOptions.map((source) => {
                        const Icon = source.icon;
                        const isSelected = selectedProductivitySourceSet.has(source.id);
                        const sourceResult = lastProductivitySourceResults.find((result) => result.id === source.id);
                        const isGmailSource = source.id === "gmail";
                        const isCalendarSource = source.id === "google-calendar";
                        const count = isCalendarSource
                          ? googleCalendarTaskCount
                          : isGmailSource
                            ? Math.max(emailMessages.length, actionSourceCounts.get(source.source) ?? 0)
                            : actionSourceCounts.get(source.source) ?? 0;
                        const sourceReady =
                          (isGmailSource && (emailStatus?.connected || hasGmailData || googleSourceLooksConnected)) ||
                          (isCalendarSource && (hasCalendarData || sourceResult?.success || Boolean(emailStatus?.connected && emailStatus.capabilities?.calendar)));
                        const sourceLabel = sourceReady ? "Synced" : isSelected ? "Selected" : "Off";

                        return (
                          <button
                            className={`queue-source-row ${isSelected ? "selected" : ""}`}
                            key={source.id}
                            type="button"
                            onClick={() => toggleProductivitySource(source.id)}
                          >
                            <span className="queue-source-icon">
                              <Icon size={16} aria-hidden="true" />
                            </span>
                            <span>
                              <strong>{source.label}</strong>
                              <small>{source.detail}</small>
                            </span>
                            <em>{sourceLabel}</em>
                            <b>{count}</b>
                          </button>
                        );
                      })}
                    </div>
                    <button className="primary-action queue-sync-button" type="button" onClick={() => void syncSelectedProductivitySources()} disabled={emailBusy}>
                      <RotateCw size={15} className={emailBusy ? "spin" : ""} aria-hidden="true" />
                      Sync selected
                    </button>
                  </section>
                </section>
              </div>
            </section>
          )}

          {view === "design" && (
            <section className={`design-studio-page ${designAssistantCollapsed ? "assistant-collapsed" : ""}`} aria-labelledby="design-studio-heading">
              <div className="design-floating-controls" aria-label="Design workspace controls">
                <button type="button" className={designProjectDrawerOpen ? "active" : ""} onClick={() => setDesignProjectDrawerOpen((isOpen) => !isOpen)}>
                  <FolderOpen size={16} aria-hidden="true" />
                  Projects
                </button>
                <button type="button" className={designAiPanelOpen ? "active ai" : "ai"} onClick={() => setDesignAiPanelOpen((isOpen) => !isOpen)}>
                  <Sparkles size={16} aria-hidden="true" />
                  Ask Autopilot
                </button>
              </div>

              {designProjectDrawerOpen && (
                <aside className="design-project-drawer" aria-label="Design project drawer">
                  <header>
                    <div>
                      <p className="panel-kicker">Design</p>
                      <h2>Projects</h2>
                    </div>
                    <button className="icon-button small" type="button" aria-label="Close projects" onClick={() => setDesignProjectDrawerOpen(false)}>
                      <X size={15} aria-hidden="true" />
                    </button>
                  </header>
                  <label className="design-search-field compact">
                    <Search size={14} aria-hidden="true" />
                    <input
                      value={designProjectFilter}
                      onChange={(event) => setDesignProjectFilter(event.target.value)}
                      placeholder="Search projects..."
                      aria-label="Search design projects"
                    />
                  </label>
                  <div className="design-project-tabs" role="tablist" aria-label="Design drawer filters">
                    <button className={designProjectTab === "mine" ? "active" : ""} type="button" onClick={() => setDesignProjectTab("mine")}>
                      Mine
                    </button>
                    <button className={designProjectTab === "ai" ? "active" : ""} type="button" onClick={() => setDesignProjectTab("ai")}>
                      AI Working
                    </button>
                  </div>
                  <div className="design-drawer-list">
                    {designBrowserProjects.map((project) => renderDesignProjectItem(project, "sidebar"))}
                    {designBrowserProjects.length === 0 && (
                      <div className="design-project-empty compact">
                        <Sparkles size={18} aria-hidden="true" />
                        <span>{designProjectTab === "mine" ? "User-created projects appear here." : "AI-created, review-pending, and archived work appears here."}</span>
                      </div>
                    )}
                  </div>
                </aside>
              )}

              {designAiPanelOpen && (
                <aside className="design-floating-ai-panel" aria-label="Ask Autopilot design chat">
                  <header>
                    <div>
                      <p className="panel-kicker">AI Designer</p>
                      <h2>Ask Autopilot</h2>
                    </div>
                    <button className="icon-button small" type="button" aria-label="Refresh prompt ideas" disabled={designPromptBusy} onClick={() => void generateDesignPromptSuggestions()}>
                      <RotateCw size={14} className={designPromptBusy ? "spin" : ""} aria-hidden="true" />
                    </button>
                  </header>
                  <form className="design-assistant-form floating" onSubmit={(event) => void submitDesignAssistantPrompt(event)}>
                    <textarea
                      value={artifactPrompt}
                      onChange={(event) => setArtifactPrompt(event.target.value)}
                      placeholder={activeArtifact ? "Tell Autopilot what to change..." : "Describe the artifact to create..."}
                      aria-label="Design assistant prompt"
                    />
                    <button className="primary-action" type="submit" disabled={artifactBusy || artifactPrompt.trim().length === 0}>
                      <ArrowRight size={16} aria-hidden="true" />
                    </button>
                  </form>
                  <div className="design-prompt-suggestions compact">
                    {(designPromptSuggestions.length > 0
                      ? designPromptSuggestions.slice(0, 3)
                      : ["Simplify the layout", "Increase contrast", "Make this export-ready"]
                    ).map((suggestion) => (
                      <button type="button" key={suggestion} onClick={() => setArtifactPrompt(suggestion)}>
                        {suggestion}
                      </button>
                    ))}
                  </div>
                  {workingDesignItems.length > 0 && (
                    <div className="design-live-work-list" aria-label="Design work currently running">
                      <strong>Working now</strong>
                      {workingDesignItems.map((item) => (
                        <button
                          type="button"
                          key={item.id}
                          onClick={() => {
                            if (item.source) {
                              void openEmailInBrowser(item.source);
                            }
                          }}
                        >
                          <Sparkles size={13} className="spin" aria-hidden="true" />
                          <span>
                            <b>{item.title}</b>
                            <small>{item.detail}</small>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="design-floating-actions">
                    <button type="button" disabled={!activeArtifact || artifactBusy || artifactPrompt.trim().length === 0} onClick={() => void reviseActiveArtifactWithAi()}>
                      <Sparkles size={14} aria-hidden="true" />
                      Revise
                    </button>
                    <button type="button" disabled={!activeArtifact || artifactBusy} onClick={() => void exportActiveArtifact()}>
                      <Download size={14} aria-hidden="true" />
                      Export
                    </button>
                    <button type="button" disabled={!activeArtifact || activeArtifact.kind !== "website_design" || artifactBusy} onClick={() => void exportActiveArtifactToCoding()}>
                      <Code2 size={14} aria-hidden="true" />
                      To Coding
                    </button>
                  </div>
                  {activeDesignSourceContext && activeGeneratedArtifactReview ? (
                    <div className="design-review-stack">
                      <details className="design-review-card" open>
                        <summary>Original source</summary>
                        <div className="design-review-card-body">
                          <strong>{activeDesignSourceContext.heading}</strong>
                          <p>{activeDesignSourceContext.description}</p>
                          {activeDesignSourceContext.meta.length > 0 && (
                            <div className="design-review-meta">
                              {activeDesignSourceContext.meta.map((item) => (
                                <span key={item}>{item}</span>
                              ))}
                            </div>
                          )}
                          <ul>
                            {activeDesignSourceContext.requirements.map((requirement, index) => (
                              <li key={`${requirement}-${index}`}>{requirement}</li>
                            ))}
                          </ul>
                          {activeDesignSourceContext.url && (
                            <button className="design-source-open-button" type="button" onClick={() => void openActiveDesignSource()}>
                              <Globe2 size={13} aria-hidden="true" />
                              Open source
                            </button>
                          )}
                        </div>
                      </details>

                      <details className="design-review-card" open>
                        <summary>Generated work</summary>
                        <div className="design-review-card-body">
                          <div className="design-review-metrics">
                            <span>
                              <strong>{activeGeneratedArtifactReview.kindLabel}</strong>
                              <small>Kind</small>
                            </span>
                            <span>
                              <strong>{activeGeneratedArtifactReview.qualityReport.score}/100</strong>
                              <small>Quality</small>
                            </span>
                            <span>
                              <strong>{activeGeneratedArtifactReview.revisionCount}</strong>
                              <small>Versions</small>
                            </span>
                            <span>
                              <strong>{activeGeneratedArtifactReview.approvalState.replace("_", " ")}</strong>
                              <small>Status</small>
                            </span>
                          </div>
                          <div
                            className="design-quality-bar"
                            data-passed={activeGeneratedArtifactReview.qualityReport.passed}
                            aria-label={`Quality score ${activeGeneratedArtifactReview.qualityReport.score} out of 100`}
                          >
                            <span style={{ width: `${activeGeneratedArtifactReview.qualityReport.score}%` }} />
                          </div>
                          <p>{activeGeneratedArtifactReview.latestPrompt}</p>
                          <div className="design-quality-checks">
                            {activeGeneratedArtifactReview.qualityReport.checks.map((check) => (
                              <span key={check.id} data-passed={check.passed}>
                                {check.passed ? "Pass" : "Review"}: {check.label}
                              </span>
                            ))}
                          </div>
                          {activeGeneratedArtifactReview.qualityReport.failedChecks.length > 0 ? (
                            <div className="design-quality-failures">
                              <strong>Quality gate needs review</strong>
                              <small>
                                Source-copy ratio: {Math.round(activeGeneratedArtifactReview.qualityReport.sourceCopyRatio * 100)}%. Regeneration:{" "}
                                {activeGeneratedArtifactReview.qualityReport.regeneration.replace("_", " ")}.
                              </small>
                              {activeGeneratedArtifactReview.qualityReport.failedChecks.map((check) => (
                                <span key={`failed-${check.id}`}>
                                  <b>{check.label}</b>
                                  <small>{check.detail}</small>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <div className="design-quality-pass">
                              <ShieldCheck size={14} aria-hidden="true" />
                              Quality checks passed. This artifact is ready for preview or export approval.
                            </div>
                          )}
                          <ul>
                            {activeGeneratedArtifactReview.notes.map((note, index) => (
                              <li key={`${note}-${index}`}>{note}</li>
                            ))}
                          </ul>
                          <div className="design-export-targets">
                            {activeGeneratedArtifactReview.exportTargets.map((target) => (
                              <button
                                type="button"
                                key={target.id}
                                disabled={!target.available || artifactBusy}
                                onClick={() => {
                                  if (target.action === "to_coding") {
                                    void exportActiveArtifactToCoding();
                                  } else {
                                    void exportActiveArtifact();
                                  }
                                }}
                              >
                                <span>{target.label}</span>
                                <small>{target.available ? target.detail : "Needs more structure first"}</small>
                              </button>
                            ))}
                          </div>
                        </div>
                      </details>
                    </div>
                  ) : (
                    <div className="design-source-disclosure">
                      <strong>Context</strong>
                      <span>{activeArtifact ? activeArtifact.source.label : "No artifact selected yet."}</span>
                    </div>
                  )}
                  {(designPromptStatus || backgroundWorkStatus) && <p className="design-ai-status" role="status">{backgroundWorkStatus || designPromptStatus}</p>}
                </aside>
              )}

              <aside className="design-tool-rail" aria-label="Design tool navigation">
                <button className="design-tool-mark" type="button" aria-label="Design home" onClick={() => activateDesignToolSection("projects", "Design home is active.")}>
                  <AutopilotNeedle className="design-tool-mark-icon" />
                </button>
                <div className="design-tool-rail-items">
                  {DESIGN_TOOL_SECTIONS.slice(0, 6).map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        className={designToolSection === item.id ? "active" : ""}
                        key={item.id}
                        type="button"
                        onClick={() => activateDesignToolSection(item.id)}
                        title={item.label}
                      >
                        <Icon size={17} aria-hidden="true" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="design-tool-rail-bottom">
                  {DESIGN_TOOL_SECTIONS.slice(6).map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        className={designToolSection === item.id ? "active" : ""}
                        key={item.id}
                        type="button"
                        onClick={() => activateDesignToolSection(item.id)}
                        title={item.label}
                      >
                        <Icon size={17} aria-hidden="true" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                  <button type="button" title="Profile" onClick={() => activateDesignToolSection("settings", "Profile and local Design workspace preferences are open.")}>
                    <KeyRound size={17} aria-hidden="true" />
                    <span>Me</span>
                  </button>
                </div>
              </aside>

              <aside className="design-my-projects-panel" aria-label="My design projects">
                <header className="design-panel-heading">
                  <h2>{designToolSection === "projects" ? "My Projects" : DESIGN_TOOL_SECTIONS.find((item) => item.id === designToolSection)?.label}</h2>
                  <button
                    className="design-mini-button"
                    type="button"
                    onClick={() => {
                      activateDesignToolSection("projects", "Prompt loaded for a new design project. Use Ask Autopilot to build it.");
                      setArtifactPrompt("Create a new website design project with responsive sections, component states, and export-ready HTML/CSS.");
                    }}
                    aria-label="Create design project"
                  >
                    <Plus size={15} aria-hidden="true" />
                  </button>
                </header>

                <label className="design-search-field">
                  <Search size={14} aria-hidden="true" />
                  <input
                    value={designProjectFilter}
                    onChange={(event) => setDesignProjectFilter(event.target.value)}
                    placeholder="Search projects..."
                    aria-label="Search projects"
                  />
                </label>

                {designToolSection === "projects" ? (
                  <div className="design-compact-project-list">
                    {filteredVisibleDesignProjects.map((project) => renderDesignProjectItem(project))}
                    {filteredVisibleDesignProjects.length === 0 && (
                      <div className="design-project-empty compact">
                        <FolderOpen size={18} aria-hidden="true" />
                        <span>{visibleDesignProjects.length === 0 ? "Create from your own prompt and it will live here." : "No projects match that search."}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="design-tool-section-card">
                    <strong>{DESIGN_TOOL_SECTIONS.find((item) => item.id === designToolSection)?.label}</strong>
                    <span>
                      {designToolSection === "pages" && "Review document pages, deck slides, and website sections for the selected artifact."}
                      {designToolSection === "components" && "Extract, revise, or simplify reusable sections and blocks in the current artifact."}
                      {designToolSection === "assets" && "Prepare source media notes, export names, and generated asset requirements for the artifact."}
                      {designToolSection === "styles" && "Tune color, type, spacing, contrast, and responsive behavior while keeping the Autopilot brand."}
                      {designToolSection === "plugins" && "Export the artifact, send website designs to Coding, or prepare integration prompts."}
                      {designToolSection === "team" && "Review source context, approval state, and handoff notes before external sharing."}
                      {designToolSection === "settings" && `Canvas is ${designCanvasWidth}px at ${designCanvasZoom}% with ${designGuidesVisible ? "guides visible" : "guides hidden"}.`}
                    </span>
                    {activeGeneratedArtifactReview && (
                      <div className="design-tool-metrics" aria-label="Selected artifact details">
                        <span>{activeGeneratedArtifactReview.kindLabel}</span>
                        <span>{activeGeneratedArtifactReview.revisionCount} version{activeGeneratedArtifactReview.revisionCount === 1 ? "" : "s"}</span>
                        <span>{activeGeneratedArtifactReview.exportReady ? "Export ready" : "Needs review"}</span>
                      </div>
                    )}
                    <button
                      className="design-section-action"
                      type="button"
                      onClick={() => {
                        const nextPrompt =
                          designToolSection === "pages"
                            ? "Break this artifact into cleaner pages, slides, or responsive sections and name each part clearly."
                            : designToolSection === "components"
                              ? "Extract reusable components from this artifact and improve their states, spacing, and hierarchy."
                              : designToolSection === "assets"
                                ? "Create or organize the visual assets this artifact needs, including image notes and export names."
                                : designToolSection === "styles"
                                  ? "Tune the colors, type, spacing, and component styles while keeping Autopilot's familiar brand colors."
                                  : designToolSection === "plugins"
                                    ? "Suggest the best design plugins or export integrations for this artifact and explain why."
                                    : designToolSection === "team"
                                      ? "Prepare a concise review handoff for collaborators, including what changed and what needs approval."
                                      : "Set practical export defaults and design workspace preferences for this artifact.";
                        setArtifactPrompt(nextPrompt);
                        setArtifactStatus("Prompt loaded in Ask Autopilot. Send it to generate a reviewable revision.");
                      }}
                    >
                      <Sparkles size={14} aria-hidden="true" />
                      Create prompt for this
                    </button>
                    {designToolSection === "plugins" && (
                      <>
                        <button className="design-section-action" type="button" disabled={!activeArtifact || artifactBusy} onClick={() => void exportActiveArtifact()}>
                          <Download size={14} aria-hidden="true" />
                          Export artifact
                        </button>
                        <button
                          className="design-section-action"
                          type="button"
                          disabled={!activeArtifact || activeArtifact.kind !== "website_design" || artifactBusy}
                          onClick={() => void exportActiveArtifactToCoding()}
                        >
                          <Code2 size={14} aria-hidden="true" />
                          Send to Coding
                        </button>
                      </>
                    )}
                    {designToolSection === "team" && activeActionPlan && (
                      <button
                        className="design-section-action"
                        type="button"
                        disabled={artifactBusy || !activeActionPlan.finalApproval.required || Boolean(activeActionPlan.finalApproval.approvedAt)}
                        onClick={() => void approveFinalActionPlan(activeActionPlan)}
                      >
                        <ShieldCheck size={14} aria-hidden="true" />
                        {activeActionPlan.finalApproval.approvedAt ? "Already approved" : "Approve final step"}
                      </button>
                    )}
                    {designToolSection === "team" && activeDesignSourceContext?.url && (
                      <button className="design-section-action" type="button" onClick={() => void openActiveDesignSource()}>
                        <Mail size={14} aria-hidden="true" />
                        Open source
                      </button>
                    )}
                    {designToolSection === "settings" && (
                      <button className="design-section-action" type="button" onClick={() => setDesignAssistantCollapsed((isCollapsed) => !isCollapsed)}>
                        <Sparkles size={14} aria-hidden="true" />
                        Toggle AI panel
                      </button>
                    )}
                    <button className="design-plain-link" type="button" onClick={() => activateDesignToolSection("projects")}>
                      Back to projects
                    </button>
                  </div>
                )}

                <button className="design-more-project-card" type="button" onClick={openMoreDesignProjects}>
                  <FolderOpen size={16} aria-hidden="true" />
                  <span>
                    <strong>More Projects</strong>
                    <small>{moreDesignProjects.length > 0 ? `${moreDesignProjects.length} AI-started or archived` : "No AI-started projects yet"}</small>
                  </span>
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              </aside>

              <aside className="design-projects-panel" aria-label="Design project browser">
                <header className="design-panel-heading">
                  <h2>Projects</h2>
                  <button className="design-mini-button" type="button" onClick={() => setDesignProjectFilter("")} aria-label="Clear project search">
                    <X size={15} aria-hidden="true" />
                  </button>
                </header>
                <div className="design-project-tabs" role="tablist" aria-label="Design project filters">
                  <button className={designProjectTab === "mine" ? "active" : ""} type="button" onClick={() => setDesignProjectTab("mine")}>
                    Mine
                  </button>
                  <button className={designProjectTab === "ai" ? "active" : ""} type="button" onClick={() => setDesignProjectTab("ai")}>
                    AI Working
                  </button>
                </div>
                <div className="design-project-browser-list">
                  <section className={`design-project-browser-section ${designProjectTab === "mine" ? "active" : ""}`} aria-label="My projects">
                    <p className="design-list-label">Mine</p>
                    {filteredVisibleDesignProjects.map((project) => renderDesignProjectItem(project))}
                    {filteredVisibleDesignProjects.length === 0 && (
                      <div className="design-project-empty compact">
                        <FolderOpen size={18} aria-hidden="true" />
                        <span>No user projects yet.</span>
                      </div>
                    )}
                  </section>
                  <section className={`design-project-browser-section ${designProjectTab === "ai" ? "active" : ""}`} aria-label="AI working projects">
                    <p className="design-list-label">AI Working</p>
                    {aiWorkingDesignProjects.map((project) => renderDesignProjectItem(project))}
                    {aiWorkingDesignProjects.length === 0 && (
                      <div className="design-project-empty compact">
                        <Sparkles size={18} aria-hidden="true" />
                        <span>No AI work is currently waiting here.</span>
                      </div>
                    )}
                  </section>
                </div>
                <button className="design-view-all-button" type="button" onClick={openMoreDesignProjects}>
                  View All Projects
                  <ArrowRight size={14} aria-hidden="true" />
                </button>
              </aside>

              <section className="design-canvas-workspace" aria-label="Artifact canvas">
                <header className="design-canvas-toolbar">
                  <div className="design-toolbar-group">
                    <button className={designToolSection === "projects" ? "active" : ""} type="button" aria-label="Select tool" onClick={() => activateDesignToolSection("projects")}>
                      <Sparkles size={15} aria-hidden="true" />
                    </button>
                    <button className={designToolSection === "components" ? "active" : ""} type="button" aria-label="Layout tool" onClick={() => activateDesignToolSection("components")}>
                      <Package size={15} aria-hidden="true" />
                    </button>
                    <button className={designToolSection === "pages" ? "active" : ""} type="button" aria-label="Frame tool" onClick={() => activateDesignToolSection("pages")}>
                      <FolderOpen size={15} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label="Text tool"
                      onClick={() => applyDesignAssistantPreset("pages", "Improve the headings, labels, body copy, and calls to action in this artifact.")}
                    >
                      <FileText size={15} aria-hidden="true" />
                    </button>
                    <button className={designToolSection === "styles" ? "active" : ""} type="button" aria-label="Style tool" onClick={() => activateDesignToolSection("styles")}>
                      <Palette size={15} aria-hidden="true" />
                    </button>
                    <button className={designToolSection === "team" ? "active" : ""} type="button" aria-label="Comment tool" onClick={() => activateDesignToolSection("team")}>
                      <MessageCircle size={15} aria-hidden="true" />
                    </button>
                  </div>

                  <div className="design-toolbar-group center">
                    <button className={designPreviewMode ? "active" : ""} type="button" onClick={toggleDesignPreviewMode}>
                      <Eye size={15} aria-hidden="true" />
                      Preview
                    </button>
                    <button type="button" onClick={cycleDesignCanvasWidth} aria-label="Cycle canvas width">
                      {designCanvasWidth}px
                      <ChevronDown size={13} aria-hidden="true" />
                    </button>
                    <button type="button" onClick={cycleDesignCanvasZoom} aria-label="Cycle canvas zoom">
                      {designCanvasZoom}%
                      <ChevronDown size={13} aria-hidden="true" />
                    </button>
                  </div>

                  <div className="design-toolbar-group end">
                    <button
                      type="button"
                      aria-label="Preview previous version"
                      disabled={!activeArtifact || activeArtifact.versions.length < 2 || (designPreviewVersionIndex ?? activeArtifactVersionIndex) <= 0}
                      onClick={() => moveDesignVersionPreview(-1)}
                    >
                      <ArrowLeft size={15} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label="Preview next version"
                      disabled={
                        !activeArtifact ||
                        activeArtifact.versions.length < 2 ||
                        (designPreviewVersionIndex ?? activeArtifactVersionIndex) >= activeArtifact.versions.length - 1
                      }
                      onClick={() => moveDesignVersionPreview(1)}
                    >
                      <ArrowRight size={15} aria-hidden="true" />
                    </button>
                    <span className="design-user-avatar">V</span>
                    <button type="button" onClick={() => setArtifactStatus("Share is staged behind final approval. Export or approve the artifact before sending it outside Autopilot.")}>Share</button>
                    <button className="design-export-button" type="button" disabled={!activeArtifact || artifactBusy} onClick={() => void exportActiveArtifact()}>
                      <Download size={14} aria-hidden="true" />
                      Export
                    </button>
                    <button type="button" aria-label="Run preview" disabled={!activeArtifact || !designCanvasVersion} onClick={runDesignPreview}>
                      <Play size={15} aria-hidden="true" />
                    </button>
                  </div>
                </header>

                <div className={`design-status-row ${artifactStatus || artifactExportResult?.success || exportToCodingStatus ? "" : "empty"}`} role="status" aria-live="polite">
                  {artifactStatus && (
                    <span className={artifactBusy ? "ai-busy" : ""}>
                      {artifactBusy && <Sparkles size={13} className="spin" aria-hidden="true" />}
                      {artifactStatus}
                    </span>
                  )}
                  {artifactExportResult?.success && <span>Export saved at {artifactExportResult.path}</span>}
                  {exportToCodingStatus && <span>{exportToCodingStatus}</span>}
                </div>

                <div
                  className={`design-canvas-stage ${designPreviewMode ? "preview-mode" : "edit-mode"} ${designGuidesVisible ? "guides-visible" : "guides-hidden"}`}
                  style={
                    {
                      "--design-canvas-width": `${designCanvasWidth}px`,
                      "--design-canvas-scale": designCanvasZoom / 100
                    } as CSSProperties
                  }
                >
                  {!activeArtifact || !designCanvasVersion ? (
                    <div className="design-empty-artboard">
                      <AutopilotNeedle className="artifact-empty-needle" />
                      <h1 id="design-studio-heading">Create your first artifact.</h1>
                      <p>Ask Autopilot for a website design, slide deck, report, or document. It will appear on this canvas ready to preview, edit, export, or send to Coding.</p>
                    </div>
                  ) : (
                    <article className="design-artboard" aria-labelledby="design-studio-heading">
                      <div className="design-artboard-header">
                        <div>
                          <span>Dashboard / Main</span>
                          <h1 id="design-studio-heading">{activeArtifact.title}</h1>
                          <p>{activeArtifact.summary}</p>
                        </div>
                        <span className="artifact-source">
                          <Mail size={14} aria-hidden="true" />
                          {activeArtifact.source.label}
                        </span>
                      </div>

                      <div className="design-selected-frame">
                        {designCanvasVersion.content.kind === "document" && (
                          <article className="document-preview design-document-preview">
                            {designCanvasVersion.content.markdown.split("\n").map((line, index) => {
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

                        {designCanvasVersion.content.kind === "slide_deck" && (
                          <div className="slide-preview-grid design-slide-grid">
                            {designCanvasVersion.content.slides.map((slide, index) => {
                              const variant = getSlidePreviewVariant(slide);
                              const firstBlock = slide.bullets.slice(0, 3);
                              const secondBlock = slide.bullets.slice(3, 6);
                              return (
                                <article className={`slide-preview-card ${variant}`} key={slide.id}>
                                  <span>{String(index + 1).padStart(2, "0")}</span>
                                  <h3>{slide.title}</h3>
                                  {variant === "title-only" ? (
                                    <p>{slide.bullets[0] ?? slide.speakerNotes ?? "A focused title slide ready for speaker notes."}</p>
                                  ) : variant === "content-blocks" ? (
                                    <div className="slide-content-blocks">
                                      <section>
                                        <strong>Main points</strong>
                                        {firstBlock.map((bullet) => (
                                          <small key={bullet}>{bullet}</small>
                                        ))}
                                      </section>
                                      <section>
                                        <strong>Details</strong>
                                        {(secondBlock.length > 0 ? secondBlock : [slide.speakerNotes ?? "Use this slide to expand the argument."]).map((bullet) => (
                                          <small key={bullet}>{bullet}</small>
                                        ))}
                                      </section>
                                    </div>
                                  ) : (
                                    <ul>
                                      {slide.bullets.map((bullet) => (
                                        <li key={bullet}>{bullet}</li>
                                      ))}
                                    </ul>
                                  )}
                                </article>
                              );
                            })}
                          </div>
                        )}

                        {designCanvasVersion.content.kind === "website_design" && (
                          <div className="website-preview-shell design-website-preview">
                            <div className="website-preview-topbar">
                              <span />
                              <span />
                              <span />
                            </div>
                            <iframe title={`${activeArtifact.title} preview`} sandbox="" srcDoc={getArtifactPreviewSrcDoc(designCanvasVersion.content)} />
                          </div>
                        )}
                      </div>
                    </article>
                  )}
                </div>

                <footer className="design-canvas-footer">
                  <span>Frame {designCanvasWidth}</span>
                  <span>{designCanvasVersion ? getArtifactKindLabel(designCanvasVersion.content.kind) : "No frame selected"}</span>
                  <span>{designCanvasVersion ? `${artifactEditorDraft.length.toLocaleString()} editable characters` : "Ready"}</span>
                  {designPreviewVersionIndex !== null && activeArtifact?.versions[designPreviewVersionIndex] && <span>Previewing: {activeArtifact.versions[designPreviewVersionIndex].summary}</span>}
                  <div>
                    <button
                      className={designGuidesVisible ? "active" : ""}
                      type="button"
                      aria-label="Toggle guides"
                      onClick={() => {
                        setDesignGuidesVisible((areVisible) => !areVisible);
                        setArtifactStatus(designGuidesVisible ? "Canvas guides hidden." : "Canvas guides visible.");
                      }}
                    >
                      {designGuidesVisible ? <Eye size={14} aria-hidden="true" /> : <EyeOff size={14} aria-hidden="true" />}
                    </button>
                    <button type="button" aria-label="Canvas options" onClick={() => activateDesignToolSection("settings", "Canvas options are open in the left settings panel.")}>
                      <ChevronDown size={14} aria-hidden="true" />
                    </button>
                  </div>
                </footer>
              </section>

              {designAssistantCollapsed && (
                <button className="design-assistant-reopen" type="button" onClick={() => setDesignAssistantCollapsed(false)}>
                  <Sparkles size={15} aria-hidden="true" />
                  AI Assistant
                </button>
              )}

              <aside className="design-ai-sidebar" aria-label="Design AI assistant">
                <div className="design-ai-heading reference">
                  <div>
                    <p className="panel-kicker">AI Assistant</p>
                    <h2>Ask Autopilot</h2>
                  </div>
                  <div className="design-ai-heading-actions">
                    <button className="icon-button small" type="button" aria-label="Refresh prompt ideas" disabled={designPromptBusy} onClick={() => void generateDesignPromptSuggestions()}>
                      <RotateCw size={14} className={designPromptBusy ? "spin" : ""} aria-hidden="true" />
                    </button>
                    <button className="icon-button small" type="button" aria-label="Collapse AI assistant" onClick={() => setDesignAssistantCollapsed(true)}>
                      <ChevronRight size={15} aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <div className="design-assistant-welcome">
                  <Sparkles size={20} aria-hidden="true" />
                  <h3>Hi Vikram.</h3>
                  <p>How can I help you adjust this design?</p>
                </div>

                <div className="design-inspector-actions">
                  <button
                    type="button"
                    onClick={() => applyDesignAssistantPreset("styles", "Refine the color palette while keeping Autopilot's parchment, forest, and clay brand system.")}
                  >
                    <Palette size={16} aria-hidden="true" />
                    <span>
                      <strong>Colors</strong>
                      <small>Adjust the color palette</small>
                    </span>
                    <ChevronRight size={15} aria-hidden="true" />
                  </button>
                  <button type="button" onClick={() => applyDesignAssistantPreset("components", "Improve layout spacing, alignment, hierarchy, and responsive behavior for this artifact.")}>
                    <Package size={16} aria-hidden="true" />
                    <span>
                      <strong>Layout</strong>
                      <small>Improve spacing and layout</small>
                    </span>
                    <ChevronRight size={15} aria-hidden="true" />
                  </button>
                  <button type="button" onClick={() => applyDesignAssistantPreset("pages", "Rewrite the copy to be sharper, clearer, and more action-oriented.")}>
                    <FileText size={16} aria-hidden="true" />
                    <span>
                      <strong>Copy</strong>
                      <small>Refine text and tone</small>
                    </span>
                    <ChevronRight size={15} aria-hidden="true" />
                  </button>
                  <button type="button" onClick={() => applyDesignAssistantPreset("components", "Update components, states, sections, and reusable blocks in this artifact.")}>
                    <FolderOpen size={16} aria-hidden="true" />
                    <span>
                      <strong>Components</strong>
                      <small>Update components</small>
                    </span>
                    <ChevronRight size={15} aria-hidden="true" />
                  </button>
                </div>

                <section className="design-ai-section compact" aria-label="Prompt suggestions">
                  <div className="design-ai-section-heading">
                    <span>Suggestions for this screen</span>
                  </div>
                  <div className="design-prompt-suggestions compact">
                    {designPromptSuggestions.slice(0, 3).map((suggestion) => (
                      <button
                        type="button"
                        key={suggestion}
                        onClick={() => {
                          setArtifactPrompt(suggestion);
                          setArtifactStatus("Suggestion loaded in Ask Autopilot.");
                        }}
                      >
                        {suggestion}
                      </button>
                    ))}
                    {designPromptSuggestions.length === 0 && (
                      <>
                        <button
                          type="button"
                          onClick={() => applyDesignAssistantPreset("styles", "Increase the contrast and tighten the hierarchy without changing the brand colors.")}
                        >
                          Increase contrast
                        </button>
                        <button
                          type="button"
                          onClick={() => applyDesignAssistantPreset("components", "Simplify the layout and remove unnecessary decoration while preserving functionality.")}
                        >
                          Simplify layout
                        </button>
                      </>
                    )}
                  </div>
                </section>

                <form className="design-assistant-form reference" onSubmit={(event) => void submitDesignAssistantPrompt(event)}>
                  <textarea
                    value={artifactPrompt}
                    onChange={(event) => setArtifactPrompt(event.target.value)}
                    placeholder={activeArtifact ? "Ask AI to adjust the design..." : "Ask AI to create a design..."}
                    aria-label="Design assistant prompt"
                  />
                  <button className="primary-action" type="submit" disabled={artifactBusy || artifactPrompt.trim().length === 0} aria-label="Send design prompt">
                    <ArrowRight size={16} aria-hidden="true" />
                  </button>
                </form>

                <details className="design-inspector-details">
                  <summary>Manual editor</summary>
                  <p className="panel-helper">Manual edits save a version directly. AI changes create a reviewable revision.</p>
                  <textarea value={artifactEditorDraft} disabled={!activeArtifact || !activeArtifactVersion} onChange={(event) => setArtifactEditorDraft(event.target.value)} aria-label="Edit artifact content" />
                  <div className="artifact-editor-actions">
                    <button className="secondary-action" type="button" disabled={!activeArtifact || !activeArtifactVersion || artifactBusy} onClick={() => void reviseActiveArtifact()}>
                      <Save size={15} aria-hidden="true" />
                      Save
                    </button>
                    <button className="primary-action ai-action" type="button" disabled={!activeArtifact || !activeArtifactVersion || artifactBusy || artifactPrompt.trim().length === 0} onClick={() => void reviseActiveArtifactWithAi()}>
                      <Sparkles size={15} aria-hidden="true" />
                      Apply AI
                    </button>
                  </div>
                </details>

                {activeArtifact && (
                  <section className="design-ai-section compact" aria-label="Artifact actions">
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
                )}

                {activeActionPlan && activeArtifact && activeActionPlan.artifactId === activeArtifact.id && (
                  <details className="design-inspector-details">
                    <summary>Action plan</summary>
                    <p>{activeActionPlan.summary}</p>
                    <ol className="artifact-plan-list">
                      {activeActionPlan.steps.map((step) => (
                        <li key={step.id}>
                          <strong>{step.title}</strong>
                          <span className="step-status-pill" data-state={step.state}>
                            {step.state === "running" && <Sparkles size={11} className="spin" aria-hidden="true" />}
                            {step.state === "completed" && <Check size={11} aria-hidden="true" />}
                            {step.state === "needs_user" && <Eye size={11} aria-hidden="true" />}
                            {step.state === "blocked" && <AlertTriangle size={11} aria-hidden="true" />}
                            {step.state === "pending" && <Clock size={11} aria-hidden="true" />}
                            {getActionStepStateLabel(step.state)}
                          </span>
                        </li>
                      ))}
                    </ol>
                    {activeActionPlan.finalApproval.required && !activeActionPlan.finalApproval.approvedAt && (
                      <button className="primary-action compact-action" type="button" disabled={artifactBusy} onClick={() => void approveFinalActionPlan(activeActionPlan)}>
                        <ShieldCheck size={14} aria-hidden="true" />
                        Approve final
                      </button>
                    )}
                  </details>
                )}

                {activeArtifact && (
                  <details className="design-inspector-details">
                    <summary>Version history</summary>
                    <div className="artifact-version-list">
                      {activeArtifact.versions
                        .slice()
                        .reverse()
                        .map((version) => {
                          const versionIndex = activeArtifact.versions.findIndex((candidateVersion) => candidateVersion.id === version.id);
                          return (
                            <button
                              className={version.id === designCanvasVersion?.id ? "active" : ""}
                              key={version.id}
                              type="button"
                              onClick={() => selectDesignVersion(versionIndex)}
                            >
                              <strong>{version.summary}</strong>
                              <span>{formatCredentialDate(version.createdAt)}</span>
                            </button>
                          );
                        })}
                    </div>
                  </details>
                )}

                {(designPromptStatus || backgroundWorkStatus) && <p className="design-ai-status" role="status">{backgroundWorkStatus || designPromptStatus}</p>}
              </aside>
            </section>
          )}

          {view === "design" && allDesignProjectsOpen && (
            <div className="design-project-modal-backdrop" role="presentation" onClick={() => setAllDesignProjectsOpen(false)}>
              <section className="design-project-modal" role="dialog" aria-modal="true" aria-labelledby="design-project-modal-heading" onClick={(event) => event.stopPropagation()}>
                <header className="design-project-modal-heading">
                  <div>
                    <p className="panel-kicker">More projects</p>
                    <h2 id="design-project-modal-heading">AI-started and archived work</h2>
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
                    placeholder="Search AI-started projects and archived artifacts..."
                    aria-label="Search design projects"
                  />
                </label>
                <div className="design-project-modal-list">
                  {filteredMoreDesignProjects.map((project) => renderDesignProjectItem(project, "modal"))}
                  {filteredMoreDesignProjects.length === 0 && (
                    <div className="design-project-empty">
                      <Search size={18} aria-hidden="true" />
                      <span>No AI-started or archived projects match that search.</span>
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

              <section className="theme-preset-panel" aria-label="Theme presets">
                <div>
                  <p className="panel-kicker">Theme presets</p>
                  <h2>Choose the app color direction</h2>
                </div>
                <div className="theme-preset-list">
                  {THEME_PRESETS.map((preset) => {
                    const isActive = colorControls.every((control) => theme[control.key].toLowerCase() === preset.theme[control.key].toLowerCase());
                    return (
                      <button
                        className={`theme-preset-card ${isActive ? "active" : ""}`}
                        key={preset.id}
                        type="button"
                        aria-pressed={isActive}
                        onClick={() => applyThemePreset(preset.theme)}
                      >
                        <span className="theme-preset-swatches" aria-hidden="true">
                          {preset.swatches.map((swatch) => (
                            <i key={`${preset.id}:${swatch}`} style={{ background: swatch }} />
                          ))}
                        </span>
                        <span>
                          <strong>{preset.label}</strong>
                          <small>{preset.description}</small>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>

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
                      Autopilot can prepare safe local work from Today&apos;s Call, including drafts, documents, decks, designs, automations, and coding handoffs.
                      It still asks before sending, sharing, submitting, deleting, paying, or publishing.
                    </p>
                  </div>
                </div>
                <label className="automation-toggle">
                  <input type="checkbox" checked={autoWorkAllEnabled} onChange={(event) => setAutoWorkAllEnabled(event.target.checked)} />
                  <span>
                    <strong>Automatically prepare work after inbox sync</strong>
                    <small>
                      {autoWorkAllEnabled
                        ? "New AI-handleable items will start preparing locally after sync."
                        : "Leave this off if you want Today's Call to ask before starting work."}
                    </small>
                  </span>
                </label>
                <div className="automation-settings-actions">
                  <button
                    className="primary-action"
                    type="button"
                    disabled={proactiveWorkBusy || proactiveWorkPlan.readyCount === 0}
                    onClick={() => void startProactiveWork("manual")}
                  >
                    <Sparkles size={16} className={proactiveWorkBusy ? "spin" : ""} aria-hidden="true" />
                    {proactiveWorkBusy ? "Starting..." : "Start all safe work"}
                  </button>
                  <span>
                    {proactiveWorkPlan.readyCount} ready, {proactiveWorkPlan.workingCount} working, {proactiveWorkPlan.needsReviewCount + waitingForApprovalCount} waiting for review
                  </span>
                </div>
                {proactiveWorkStatus ? <p className="automation-status">{proactiveWorkStatus}</p> : null}
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

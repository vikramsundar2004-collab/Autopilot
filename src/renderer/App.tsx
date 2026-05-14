import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Archive,
  Bookmark,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  Clock,
  Code2,
  Copy,
  CreditCard,
  Download,
  Eye,
  EyeOff,
  FileText,
  Folder,
  FolderOpen,
  Github,
  Globe2,
  Hash,
  Home,
  Image as ImageIcon,
  KeyRound,
  ListChecks,
  LockKeyhole,
  Mail,
  MessageCircle,
  MoreHorizontal,
  MousePointer2,
  Package,
  Palette,
  Pencil,
  Play,
  Plus,
  Printer,
  RotateCw,
  Save,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  SquarePen,
  Star,
  Terminal,
  Trash2,
  UserPlus,
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
  type CodingAgentRun,
  type CodingAgentRunResult,
  type CodingAgentPlan,
  type CodingAccessMode,
  type CodingClarificationAnswer,
  type CodingClarificationQuestion,
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
  type CodingRunHeartbeat,
  type CodingRunStatus,
  type CodingRunTimeoutState,
  type CodingSearchResult,
  type CodingSnapshot,
  type CodingTerminalInputResult,
  type CodingTerminalOpenResult,
  type CodingTreeNode
} from "../shared/coding";
import { CODING_PLUGIN_CATALOG } from "../shared/codingPlugins";
import {
  EMAIL_ORGANIZATION_MODE_OPTIONS,
  classifyEmailReplyWorthiness,
  filterBlockedEmailMessages,
  listEmailSenders,
  normalizeEmailSenderAddress,
  normalizeEmailOrganizationMode,
  type EmailConnectionStatus,
  type EmailMessageSummary,
  type EmailOrganizationAction,
  type EmailOrganizationMode
} from "../shared/email";
import type { PasswordAvailability, PasswordCredentialSummary, PendingPasswordSave } from "../shared/passwords";
import type { AssistantContextSource, AssistantContextSourceId, AssistantResponse } from "../shared/assistant";
import type { ActionPlan, AgentRun } from "../shared/agent";
import type { AgentTrace, ConnectorDescriptor, ToolDescriptor } from "../shared/agentRuntime";
import { getPermissionPolicySummary } from "../shared/permissionPolicy";
import type { InvoiceCandidate, MoneyMovementSettings, PaymentReceipt } from "../shared/highImpactActions";
import {
  buildDesignSourceContext,
  buildGeneratedArtifactReview,
  createDesignProjectFromArtifact,
  getActiveArtifactVersion,
  isAiDesignProject,
  sanitizeDesignProjectRecords,
  type Artifact,
  type ArtifactContent,
  type ArtifactExportResult,
  type ArtifactExportToCodingResult,
  type ArtifactKind,
  type DesignRecoveryState,
  type DesignProjectRecord,
  type DesignProject,
  type SlideArtifactSlide
} from "../shared/artifacts";
import {
  DEFAULT_WORKSPACE_PROFILES,
  type WorkspaceProfile,
  type WorkspaceView,
  type WorkspaceState
} from "../shared/workspaces";
import type { CalendarRecurrence, LocalCalendarEvent } from "../shared/localCalendar";
import type { ProductivityDraft, ProductivitySourceSyncResult, ProductivityTask, ProductivityTaskInput, ProductivityTaskState, ProductivityTaskSyncResult } from "../shared/productivity";
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
import {
  buildChatWorkTwinItems,
  buildProofModeReport,
  buildWorkTwinReplay,
  getWorkGraphCounts,
  type ProofModeReport,
  type WorkGraphItem,
  type WorkGraphSnapshot
} from "../shared/workGraph";
import { evaluateEmailDraftQuality } from "../shared/outputQuality";
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
  getCalendarWeekEventLayout,
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
import {
  CodingWorkspaceRebuild,
  type CodingAiFilePatchView,
  type CodingChatThreadView,
  type CodingProjectBoardItemView,
  type CodingTextWorkbenchTabView,
  type CodingWorkbenchTabView
} from "./components/CodingWorkspaceRebuild";
import { CodingTree } from "./components/CodingTree";
import { DesignFilesLibrary, type DesignFileSectionId, type DesignGeneratedFile } from "./components/DesignFilesLibrary";
import {
  HomeAttentionBoard,
  HomeAgentRuntimeCard,
  HomeCommandHero,
  HomeCommandStrip,
  HomeOverviewCards,
  HomeWorkTwinCard,
  type HomeActivityItem,
  type HomeAttentionLane,
  type HomePaymentItem,
  type HomeSourceHealthItem
} from "./components/HomeCommandCenter";
import { WorkAssignmentCard } from "./components/WorkAssignmentCard";
import { addHistoryEntry, loadHistoryEntries, saveHistoryEntries, type BrowserHistoryEntry } from "./history";
import {
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
import type { AccountStatus } from "../shared/account";

type AppView = "home" | "browser" | "coding" | "productivity" | "chatting" | "design" | "settings";
type DesignToolSection = "projects" | "pages" | "history" | "components" | "assets" | "styles" | "plugins" | "team" | "settings";
type AccountLinkOpenMode = "autopilot" | "external";
type DesignProjectTab = "mine" | "ai";

type DesignStarterProject = {
  id: string;
  title: string;
  summary: string;
  kind: ArtifactKind;
  timeLabel: string;
  prompt: string;
};

type FinanceInvoiceCandidate = {
  id: string;
  sourceKind: "gmail" | "browser";
  sourceId: string;
  messageId?: string;
  title: string;
  sender: string;
  senderEmail: string;
  amountCents?: number;
  amountLabel: string;
  dueLabel: string;
  invoiceNumber?: string;
  reason: string;
  sourceEvidence: string;
  sourceUrl: string;
};

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
const CHAT_WORKSPACE_STORAGE_KEY = "autopilot:chatting-workspace";
const CHAT_WORKSPACE_ACCOUNT_STORAGE_KEY = "autopilot:chatting-account-email";
const CONFIRMED_ROUTE_WORK_ITEMS_STORAGE_KEY = "autopilot:confirmed-route-work-items";
const PRODUCTIVITY_SHORTCUT_HINT_SEEN_STORAGE_KEY = "autopilot:productivity-shortcut-hint-seen";
const EMAIL_ORGANIZATION_MODE_STORAGE_KEY = "autopilot:email-organization-mode";
const INBOX_ORGANIZATION_CONSENT_STORAGE_KEY = "autopilot:inbox-organization-consent";
const CALENDAR_LAYOUT_STORAGE_KEY = "autopilot:calendar-layout";
const BLOCKED_EMAIL_SENDERS_STORAGE_KEY = "autopilot:blocked-email-senders";
const ACCOUNT_LINK_OPEN_MODE_STORAGE_KEY = "autopilot:account-link-open-mode";
const DEFAULT_AUTOPILOT_GMAIL_LABEL = "Autopilot/Needs review";
const ARTIFACT_QUALITY_OVERRIDE_IDS_STORAGE_KEY = "autopilot:artifact-quality-override-ids";
const DESIGN_PROJECT_RECORDS_STORAGE_KEY = "autopilot:design-project-records";
const AUTO_WORK_ALL_STORAGE_KEY = "autopilot:auto-work-all-actions";
const MAX_CODING_CHATS = 120;

const DESIGN_CANVAS_WIDTHS = [960, 1200, 1440, 1728];
const DESIGN_CANVAS_ZOOMS = [50, 75, 100, 125];

type ProductivityInboxOrganizationConsent = "unset" | "allowed" | "declined";
type CalendarLayoutPreference = "hybrid_split" | "google_lanes" | "agenda_first";

const DESIGN_STARTER_PROJECTS: DesignStarterProject[] = [
  {
    id: "launch-week-homepage",
    title: "Launch Week - homepage",
    summary: "Website, doc, and slideshow starter for a new launch.",
    kind: "website_design",
    timeLabel: "6p",
    prompt: "Create a Launch Week homepage with a focused hero, day-by-day rollout plan, proof section, and one primary CTA."
  },
  {
    id: "q2-investor-review",
    title: "Q2 Investor Review",
    summary: "Investor-ready deck and narrative document.",
    kind: "slide_deck",
    timeLabel: "24p",
    prompt: "Create a Q2 investor review slideshow with a strong cover, shipped highlights, metrics, risks, and a clear ask."
  },
  {
    id: "sync-engine-rfc",
    title: "Sync Engine RFC",
    summary: "Technical RFC with decision points and next steps.",
    kind: "document",
    timeLabel: "8p",
    prompt: "Write a Sync Engine RFC with context, design options, tradeoffs, risks, recommendation, and rollout steps."
  },
  {
    id: "press-kit-one-pager",
    title: "Press kit & one-pager",
    summary: "Launch copy, press notes, and polished doc.",
    kind: "document",
    timeLabel: "5p",
    prompt: "Create a press kit one-pager with product positioning, audience, proof points, launch quote, and media-ready summary."
  },
  {
    id: "onboarding-flow-v3",
    title: "Onboarding flow v3",
    summary: "Website flow and checklist for first-run activation.",
    kind: "website_design",
    timeLabel: "14p",
    prompt: "Design an onboarding flow page with setup steps, account connections, demo mode, readiness states, and a clean finish screen."
  }
];

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

type CodingSection = "files" | "search" | "plugins" | "skills" | "board" | "terminal" | "browser";

type CodingRightPanel = "assistant" | "summary" | "access" | "code" | "terminal" | "downloads" | "plugins";
type CodingAssistantPanelMode = "normal" | "wide" | "focus";
type CodingProjectSection = "chats" | "code";

type CodingProjectBoardAction = "plan" | "openProject" | "reviewDiff" | "runTests" | "newChat";

type CodingProjectBoardItem = {
  id: string;
  title: string;
  detail: string;
  meta: string;
  status: "draft" | "active" | "ready" | "done";
  agent: string;
  branch: string;
  action: CodingProjectBoardAction;
  actionLabel: string;
  prompt?: string;
};

type CodingProjectBoardColumn = {
  id: "drafts" | "active" | "ready" | "done";
  title: string;
  description: string;
  items: CodingProjectBoardItem[];
};

type OpenCodingTerminalOptions = {
  launchShell?: boolean;
  forceLaunch?: boolean;
};

const CODING_PROJECT_ACCENTS = ["#31d38b", "#e7bd53", "#7bd66f", "#d5a64a", "#5fcf9a", "#f2cf69"];

type SlidePreviewVariant = "cover" | "bullets" | "two-column" | "quote" | "closing";

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
  kind: "chat" | "project" | "file" | "folder" | "picker" | "plugins" | "board" | "terminal" | "browser";
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

type CodingRecentCodeItem = {
  id: string;
  title: string;
  detail: string;
  path: string;
  kind: CodingTreeNode["kind"];
  openedTabId?: string;
  modifiedAt?: number;
  dirty?: boolean;
};

type EnterpriseChatMessage = {
  id: string;
  channelId: string;
  authorId: string;
  author: string;
  body: string;
  createdAt: number;
  mentionMemberIds: string[];
};

type EnterpriseChatChannel = {
  id: string;
  name: string;
  kind: "channel" | "dm";
  aiNotesEnabled: boolean;
  memberIds: string[];
  unreadCount: number;
};

type EnterpriseChatMember = {
  id: string;
  email: string;
  displayName: string;
  role: "owner" | "admin" | "member";
  status: "active" | "removed";
  joinedAt: number;
  removedAt?: number;
};

type EnterpriseChatAuditEvent = {
  id: string;
  actorId: string;
  action: string;
  createdAt: number;
};

type EnterpriseChatState = {
  organizationId: string;
  organizationName: string;
  inviteKey: string;
  inviteKeyVersion: number;
  inviteKeyUpdatedAt: number;
  currentUserId: string;
  members: EnterpriseChatMember[];
  activeChannelId: string;
  channels: EnterpriseChatChannel[];
  messages: EnterpriseChatMessage[];
  aiNotes: string[];
  auditLog: EnterpriseChatAuditEvent[];
  actionSuggestions: Array<{
    id: string;
    title: string;
    summary: string;
    route: WorkspaceRole;
    confidence: number;
    sourceMessageId: string | null;
    assigneeId: string | null;
    acceptedAt: number | null;
  }>;
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

type CodingAiFilePatch = {
  id: string;
  tabId: string;
  path: string;
  relativePath: string;
  explanation: string;
  originalContent: string;
  nextContent: string;
  status: "pending" | "applied" | "dismissed";
  createdAt: number;
};

function isTextCodingTab(tab: CodingWorkbenchTab | null | undefined): tab is CodingTextWorkbenchTab {
  return Boolean(tab && tab.kind === "file" && tab.file?.kind === "text");
}

function getCodingTabContent(tab: CodingTextWorkbenchTab): string {
  return tab.content ?? tab.file.content;
}

const CODING_CHAT_TAB_ID = "coding-chat-home";
const CODING_RUN_WATCHDOG_MS = 125_000;

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

const codingBuilderGuides = [
  {
    id: "agent-builder-guide",
    name: "Build an agent",
    category: "Agent runtime",
    description: "Design a real agent with instructions, model choice, scoped tools, state, guardrails, and a visible run trace.",
    checklist: ["Define the job and success criteria", "Register only the tools this agent needs", "Add approvals, evals, and trace output"],
    prompt:
      "Help me build a production Autopilot agent. Start with the agent contract, model, tool list, state, approvals, trace events, and tests before writing code."
  },
  {
    id: "plugin-builder-guide",
    name: "Create a plugin",
    category: "Connector/plugin",
    description: "Plan a plugin that connects Autopilot to an external tool without leaking secrets or creating shell buttons.",
    checklist: ["Describe the external source or action", "Define auth, scopes, tools, and disabled states", "Add install, smoke, and permission tests"],
    prompt:
      "Help me create an Autopilot plugin. Ask what external tool it connects to, define auth/scopes/tools, then scaffold the plugin with tests and safe disabled states."
  },
  {
    id: "skill-builder-guide",
    name: "Build a skill",
    category: "Reusable workflow",
    description: "Turn a repeated workflow into a skill playbook with triggers, instructions, scripts, references, and QA steps.",
    checklist: ["Write the SKILL.md trigger and workflow", "Add scripts/references/assets only when useful", "Test the skill on one real task"],
    prompt:
      "Help me build a reusable Autopilot skill. Draft the SKILL.md, trigger rules, workflow steps, optional scripts/references/assets, and a verification checklist."
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

function createTryItNowEmailMessage(): EmailMessageSummary {
  const receivedAt = Date.now();
  return {
    id: `demo-email:acme-q4:${receivedAt}`,
    provider: "gmail",
    threadId: `demo-thread:acme-q4:${receivedAt}`,
    from: "Maya Chen",
    fromEmail: "maya.chen@acme.example",
    subject: "Q4 customer update for Acme leadership",
    snippet:
      "Can you turn the Q4 customer update into a leadership-ready deck? Please include renewal risks, key wins, open decisions, and next steps before Friday.",
    actionText:
      "Hi team - for Friday's leadership review, can you turn the Q4 customer update into a concise deck for Acme? People involved: Maya Chen, Jordan Lee, Priya Shah. Date: Friday, Dec 13. Decisions needed: whether to expand the pilot to the enterprise tier, who owns renewal-risk follow-up, and which customer proof points belong in the exec story. Include key wins, renewal risks, open questions, recommended next moves, and a final approval slide before anything is sent to the client.",
    receivedAt,
    unread: true,
    url: ""
  };
}

const workspaceIconMap: Record<WorkspaceProfile["icon"], LucideIcon> = {
  home: Home,
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
        : task.source.provider === "slack" || task.source.provider === "chat"
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

function isResponseDraft(draft: ProductivityDraft): boolean {
  return draft.artifactKind === "reply" || (!draft.artifactId && (draft.source.provider === "gmail" || draft.source.provider === "chat" || draft.source.provider === "slack"));
}

function hasExplicitArtifactRequest(text: string): boolean {
  return /\b(slide|slides|deck|presentation|pitch|document|doc|report|proposal|memo|writeup|write up|client brief|project brief|website|landing page|homepage|mockup|design|figma)\b/iu.test(
    text
  );
}

function shouldPrepareResponseDraftForEmail(message: EmailMessageSummary, tasks: ProductivityTask[], preferredKind?: ArtifactKind): boolean {
  if (preferredKind) {
    return false;
  }
  const taskText = tasks
    .map((task) => `${task.title} ${task.context} ${task.source.requestedOutput ?? ""} ${task.source.recommendedAssistant ?? ""}`)
    .join(" ");
  const text = `${message.subject} ${message.snippet} ${message.actionText ?? ""} ${taskText}`;
  return !hasExplicitArtifactRequest(text);
}

function shouldAutoPrepareResponseDraft(message: EmailMessageSummary): boolean {
  return classifyEmailReplyWorthiness(message).status === "reply_worthy";
}

function buildResponseDraftBodyFromEmail(message: EmailMessageSummary, tasks: ProductivityTask[]): string {
  const senderFirstName = (message.from || "there").replace(/[<>().,]/gu, " ").trim().split(/\s+/u)[0] || "there";
  const primaryTask = tasks.find((task) => task.source.messageId === message.id);
  const sourceAsk = primaryTask?.context || message.actionText || message.snippet || message.subject || "your note";
  const cleanedAsk = sourceAsk.replace(/\s+/gu, " ").replace(/^re:\s*/iu, "").trim().replace(/[.?!]*$/u, "");
  const text = `${message.subject} ${message.snippet} ${message.actionText ?? ""} ${primaryTask?.title ?? ""} ${primaryTask?.context ?? ""}`.toLowerCase();
  const contextSentence = cleanedAsk
    ? `I saw your note about ${cleanedAsk.slice(0, 180)}${cleanedAsk.length > 180 ? "..." : ""}.`
    : "I saw your note and will take it from here.";
  const nextSentence = /\b(schedule|meeting|call|calendar|available|availability|reschedule)\b/u.test(text)
    ? "I can help coordinate timing. Send over the windows that work best for you, and I will confirm the final slot before anything is added to the calendar."
    : /\b(confirm|approve|approval)\b/u.test(text)
      ? "I will review the details carefully and confirm the next step after I have checked everything."
      : /\b(question|help|clarify|what do you think|thoughts)\b/u.test(text)
        ? "I will look through the details and come back with a clear answer or the next concrete step."
        : "I will take a look and follow up with the next concrete step.";

  return [
    `Hi ${senderFirstName},`,
    "",
    `Thanks for reaching out. ${contextSentence}`,
    "",
    nextSentence,
    "",
    "I will review the details before anything is sent, shared, submitted, or approved.",
    "",
    "Best,"
  ].join("\n");
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
  return handler === "ai" ? "AI can prep" : "User must handle";
}

function getChatRouteForText(text: string): WorkspaceRole {
  const normalized = text.toLowerCase();
  if (/\b(code|repo|bug|build|debug|deploy|test|api|pull request|github)\b/u.test(normalized)) {
    return "coding";
  }
  if (/\b(design|slide|deck|website|mockup|document|doc|report|presentation)\b/u.test(normalized)) {
    return "design";
  }
  if (/\b(daily|weekly|monitor|recurring|every morning|whenever|keep checking|report every)\b/u.test(normalized)) {
    return "automation";
  }
  return "productivity";
}

function getChatSuggestionIdFromWorkTwinItem(item: WorkGraphItem): string | null {
  return item.source.kind === "chat" && item.id.startsWith("chat-suggestion:") ? item.id.replace(/^chat-suggestion:/u, "") : null;
}

function getChatRequestedOutput(route: WorkspaceRole, text: string): string {
  const normalized = text.toLowerCase();
  if (route === "coding") {
    return "coding plan or patch";
  }
  if (route === "automation") {
    return "automation suggestion";
  }
  if (route === "design") {
    if (/\b(slide|slides|deck|presentation)\b/u.test(normalized)) {
      return "slide deck";
    }
    if (/\b(website|landing page|html|css)\b/u.test(normalized)) {
      return "website design";
    }
    return "document or design artifact";
  }
  return /\b(reply|respond|follow up|follow-up)\b/u.test(normalized) ? "reply draft" : "productivity follow-up";
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

function getProductivityDraftKindLabel(kind: ProductivityDraft["artifactKind"]): string {
  if (kind === "reply") {
    return "Response";
  }
  return getArtifactKindLabel(kind);
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

function artifactContentToShareText(artifact: Artifact, content: ArtifactContent): string {
  const heading = `${artifact.title}\n${artifact.summary}`.trim();

  switch (content.kind) {
    case "document":
      return `${heading}\n\n${content.markdown}`.trim();
    case "slide_deck":
      return `${heading}\n\n${content.slides
        .map((slide, index) => {
          const bullets = slide.bullets.slice(0, 5).map((bullet) => `- ${bullet}`).join("\n");
          return `Slide ${index + 1}: ${slide.title}${bullets ? `\n${bullets}` : ""}`;
        })
        .join("\n\n")}`.trim();
    case "website_design":
      return `${heading}\n\nWebsite sections:\n${content.sections.map((section) => `- ${section.name}: ${section.summary}`).join("\n")}`.trim();
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

function loadEmailOrganizationMode(): EmailOrganizationMode {
  if (typeof window === "undefined") {
    return "suggest_only";
  }

  try {
    return normalizeEmailOrganizationMode(window.localStorage.getItem(EMAIL_ORGANIZATION_MODE_STORAGE_KEY));
  } catch {
    return "suggest_only";
  }
}

function saveEmailOrganizationMode(mode: EmailOrganizationMode): void {
  try {
    window.localStorage.setItem(EMAIL_ORGANIZATION_MODE_STORAGE_KEY, mode);
  } catch {
    // Mail organization preferences should not block the Productivity workspace.
  }
}

function loadInboxOrganizationConsent(): ProductivityInboxOrganizationConsent {
  if (typeof window === "undefined") {
    return "unset";
  }

  try {
    const value = window.localStorage.getItem(INBOX_ORGANIZATION_CONSENT_STORAGE_KEY);
    return value === "allowed" || value === "declined" ? value : "unset";
  } catch {
    return "unset";
  }
}

function saveInboxOrganizationConsent(consent: ProductivityInboxOrganizationConsent): void {
  try {
    window.localStorage.setItem(INBOX_ORGANIZATION_CONSENT_STORAGE_KEY, consent);
  } catch {
    // This prompt is a convenience layer; source sync must keep working if storage is unavailable.
  }
}

function loadCalendarLayoutPreference(): CalendarLayoutPreference {
  if (typeof window === "undefined") {
    return "hybrid_split";
  }

  try {
    const value = window.localStorage.getItem(CALENDAR_LAYOUT_STORAGE_KEY);
    return value === "google_lanes" || value === "agenda_first" ? value : "hybrid_split";
  } catch {
    return "hybrid_split";
  }
}

function saveCalendarLayoutPreference(preference: CalendarLayoutPreference): void {
  try {
    window.localStorage.setItem(CALENDAR_LAYOUT_STORAGE_KEY, preference);
  } catch {
    // Calendar layout is cosmetic and should not block scheduling.
  }
}

function loadAccountLinkOpenMode(): AccountLinkOpenMode {
  if (typeof window === "undefined") {
    return "autopilot";
  }

  try {
    return window.localStorage.getItem(ACCOUNT_LINK_OPEN_MODE_STORAGE_KEY) === "external" ? "external" : "autopilot";
  } catch {
    return "autopilot";
  }
}

function saveAccountLinkOpenMode(mode: AccountLinkOpenMode): void {
  try {
    window.localStorage.setItem(ACCOUNT_LINK_OPEN_MODE_STORAGE_KEY, mode);
  } catch {
    // Connector setup should still work for this session.
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

function makeDesignProjectRecordId(): string {
  const randomPart = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `design-project-record:${randomPart}`;
}

function createBlankDesignProjectRecord(title: string, origin: DesignProjectRecord["origin"] = "user", prompt = ""): DesignProjectRecord {
  const now = Date.now();
  return {
    id: makeDesignProjectRecordId(),
    origin,
    title: title.slice(0, 160),
    summary: prompt.trim() ? `Project brief: ${prompt.trim().slice(0, 220)}` : "Blank Design project waiting for its first artifact.",
    artifactKindHint: "website_design",
    artifactIds: [],
    draftIds: [],
    status: "queued",
    createdAt: now,
    updatedAt: now,
    sourceLabel: origin === "ai" ? "AI-routed work" : "Manual prompt"
  };
}

function loadDesignProjectRecords(): DesignProjectRecord[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(DESIGN_PROJECT_RECORDS_STORAGE_KEY);
    return sanitizeDesignProjectRecords(raw ? JSON.parse(raw) : []);
  } catch {
    return [];
  }
}

function saveDesignProjectRecords(records: DesignProjectRecord[]): void {
  try {
    window.localStorage.setItem(DESIGN_PROJECT_RECORDS_STORAGE_KEY, JSON.stringify(sanitizeDesignProjectRecords(records).slice(0, 120)));
  } catch {
    // Design project autosave should not block the studio for this session.
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

function isLikelyCodingCodeFile(name: string): boolean {
  const lowerName = name.toLowerCase();
  return (
    /\.(ts|tsx|js|jsx|mjs|cjs|css|scss|sass|html|json|md|mdx|py|rb|rs|go|java|kt|swift|cs|c|cc|cpp|h|hpp|php|sql|yml|yaml|toml|xml|env|ini|sh|ps1|bat|cmd)$/u.test(
      lowerName
    ) ||
    /^(readme|autopilot|dockerfile|makefile|package-lock|package|tsconfig|vite\.config|electron\.vite|netlify|supabase)\b/u.test(lowerName)
  );
}

function getCodingEditTargetScore(relativePath: string, prompt = ""): number {
  const normalizedPath = normalizeCodingRelativePath(relativePath);
  const lowerPrompt = prompt.toLowerCase();
  let score = 0;

  if (/(^|\/)src\/app\.(tsx|jsx|ts|js)$/u.test(normalizedPath)) {
    score += 140;
  }
  if (/(^|\/)(app\/page|pages\/index)\.(tsx|jsx|ts|js)$/u.test(normalizedPath)) {
    score += 130;
  }
  if (/(^|\/)(src\/main|src\/index)\.(tsx|jsx|ts|js)$/u.test(normalizedPath)) {
    score += 90;
  }
  if (/(^|\/)index\.html$/u.test(normalizedPath)) {
    score += 80;
  }
  if (/\.(tsx|jsx)$/u.test(normalizedPath)) {
    score += 48;
  } else if (/\.(ts|js|mjs|cjs)$/u.test(normalizedPath)) {
    score += 34;
  } else if (/\.(css|scss|sass)$/u.test(normalizedPath)) {
    score += /\b(style|css|layout|visual|ui|theme)\b/u.test(lowerPrompt) ? 70 : 22;
  } else if (/\.(html|md|mdx|py)$/u.test(normalizedPath)) {
    score += 18;
  }

  if (/\b(snake|game|app|component|page|screen|ui|interface)\b/u.test(lowerPrompt) && /(^|\/)(src\/app|app\/page|pages\/index)\./u.test(normalizedPath)) {
    score += 55;
  }
  if (/\b(readme|docs?|explain)\b/u.test(lowerPrompt) && /(^|\/)readme(\.md)?$/u.test(normalizedPath)) {
    score += 60;
  }
  if (/(^|\/)(__tests__|tests?|spec|fixtures?)\//u.test(normalizedPath) || /\.(test|spec)\./u.test(normalizedPath)) {
    score -= 70;
  }
  if (/(^|\/)(package-lock|pnpm-lock|yarn\.lock|tsconfig|vite\.config|electron\.vite|netlify|supabase)\b/u.test(normalizedPath)) {
    score -= 55;
  }
  if (/\.(env|pem|key|crt|p12|pfx)$/u.test(normalizedPath)) {
    score -= 120;
  }

  return score;
}

function collectCodingCodeNodes(nodes: CodingTreeNode[] | undefined, bucket: CodingTreeNode[], maxItems = 80): void {
  if (!nodes || bucket.length >= maxItems) {
    return;
  }

  for (const node of nodes) {
    if (bucket.length >= maxItems) {
      return;
    }

    if (node.kind === "file" && isLikelyCodingCodeFile(node.name)) {
      bucket.push(node);
      continue;
    }

    if (node.kind === "folder" && node.children?.length) {
      collectCodingCodeNodes(node.children, bucket, maxItems);
    }
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

function parseMoneyAmountCents(text: string): { amountCents?: number; amountLabel: string } {
  const match = text.match(/(?:usd\s*)?\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\d+(?:\.\d{2})?)/iu);
  if (!match?.[1]) {
    return { amountLabel: "Amount to confirm" };
  }

  const amount = Number.parseFloat(match[1].replace(/,/gu, ""));
  if (!Number.isFinite(amount) || amount <= 0) {
    return { amountLabel: "Amount to confirm" };
  }

  return {
    amountCents: Math.round(amount * 100),
    amountLabel: new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(amount)
  };
}

function extractInvoiceNumber(text: string): string | undefined {
  return text.match(/\b(?:invoice|inv|reference|ref)\s*(?:#|no\.?|number|id)?\s*[:\-]?\s*([a-z0-9][a-z0-9_-]{2,32})\b/iu)?.[1]?.toUpperCase();
}

function extractFinanceDueLabel(text: string): string {
  const dueMatch = text.match(/\b(?:due|pay by|payment due|before)\s+([A-Z][a-z]+\.?\s+\d{1,2}(?:,\s*\d{4})?|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|tomorrow|today|friday|monday|tuesday|wednesday|thursday)\b/iu);
  return dueMatch?.[1] ? `Due ${dueMatch[1]}` : "Due date to confirm";
}

function formatPaymentReceiptAmount(receipt: PaymentReceipt): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: receipt.currency || "USD" }).format(receipt.totalCents / 100);
}

function formatReceiptPaymentMethod(receipt: PaymentReceipt): string {
  return receipt.paymentMethodLabel || receipt.paymentMethodKind?.replace(/_/gu, " ") || receipt.providerKind.replace(/_/gu, " ");
}

function getFinanceInvoiceCandidateFromEmail(message: EmailMessageSummary): FinanceInvoiceCandidate | null {
  const sourceEvidence = `${message.subject}\n${message.snippet}\n${message.actionText ?? ""}`.trim();
  const normalized = sourceEvidence.toLowerCase();
  const looksInvoice = /\b(invoice|bill|billing|payment due|pay this|amount due|statement|past due|remittance)\b/u.test(normalized);
  const looksAlreadyHandled = /\b(receipt|paid|payment received|no payment due|auto-pay successful)\b/u.test(normalized);
  if (!looksInvoice || looksAlreadyHandled) {
    return null;
  }

  const { amountCents, amountLabel } = parseMoneyAmountCents(sourceEvidence);
  const sender = getInboxSenderLabel(message);
  return {
    id: `finance:${message.id}`,
    sourceKind: "gmail",
    sourceId: message.id,
    messageId: message.id,
    title: message.subject || `Invoice from ${sender}`,
    sender,
    senderEmail: normalizeEmailSenderAddress(message.fromEmail || message.from),
    amountCents,
    amountLabel,
    dueLabel: extractFinanceDueLabel(sourceEvidence),
    invoiceNumber: extractInvoiceNumber(sourceEvidence),
    reason: "Possible invoice found in Gmail. Autopilot will verify invoice details and vendor identity before preparing any payment proposal.",
    sourceEvidence,
    sourceUrl: message.url
  };
}

function getFinanceInvoiceCandidateFromBrowserTab(tab: Tab | null): FinanceInvoiceCandidate | null {
  if (!tab || tab.isLoading || tab.navigationError || isHomeUrl(tab.url) || isHistoryPageUrl(tab.url)) {
    return null;
  }

  const sourceEvidence = `${tab.title}\n${tab.url}`.trim();
  const normalized = sourceEvidence.toLowerCase();
  const looksPaymentPage = /\b(invoice|bill|billing|payment due|pay invoice|checkout|statement|amount due|remittance)\b/u.test(normalized);
  const looksAlreadyHandled = /\b(receipt|paid|payment received|no payment due|auto-pay successful)\b/u.test(normalized);
  if (!looksPaymentPage || looksAlreadyHandled) {
    return null;
  }

  let host = "Browser page";
  try {
    host = new URL(tab.url).hostname.replace(/^www\./u, "");
  } catch {
    host = tab.title || "Browser page";
  }

  const { amountCents, amountLabel } = parseMoneyAmountCents(sourceEvidence);
  return {
    id: `finance:browser:${tab.id}`,
    sourceKind: "browser",
    sourceId: tab.id,
    title: tab.title || `Possible invoice on ${host}`,
    sender: host,
    senderEmail: "",
    amountCents,
    amountLabel,
    dueLabel: extractFinanceDueLabel(sourceEvidence),
    invoiceNumber: extractInvoiceNumber(sourceEvidence),
    reason: "Possible invoice or payment page found in Browser. Autopilot will verify invoice details and vendor identity before preparing any payment proposal.",
    sourceEvidence,
    sourceUrl: tab.url
  };
}

function getFinanceCandidateVendorDomains(candidate: FinanceInvoiceCandidate): string[] {
  if (candidate.senderEmail) {
    return [candidate.senderEmail.split("@").at(-1) ?? ""].filter(Boolean);
  }

  if (!candidate.sourceUrl) {
    return [];
  }

  try {
    return [new URL(candidate.sourceUrl).hostname.replace(/^www\./u, "")].filter(Boolean);
  } catch {
    return [];
  }
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

function getDisplayInitials(value: string): string {
  const words = value
    .replace(/[<>()[\]{}]/g, " ")
    .split(/\s+/u)
    .map((word) => word.trim())
    .filter(Boolean);
  if (words.length === 0) {
    return "A";
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
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

function shouldAttemptCodingFileEdit(prompt: string): boolean {
  return /\b(edit|change|update|fix|refactor|rewrite|replace|implement|add|remove|clean up|cleanup|make it|make|build|create|generate|code|scaffold|write|convert|turn .* into)\b/iu.test(prompt);
}

function getCodingGeneratedFileRelativePath(prompt: string, existingCodeNodes: CodingTreeNode[]): string | null {
  if (!/\b(build|create|generate|scaffold|write|make|implement)\b/iu.test(prompt)) {
    return null;
  }

  const normalizedPaths = new Set(existingCodeNodes.map((node) => normalizeCodingRelativePath(node.relativePath)));
  if (normalizedPaths.has("src/app.tsx")) {
    return "src/App.tsx";
  }
  if (normalizedPaths.has("src/app.jsx")) {
    return "src/App.jsx";
  }
  if (normalizedPaths.has("app/page.tsx")) {
    return "app/page.tsx";
  }
  if (normalizedPaths.has("pages/index.tsx")) {
    return "pages/index.tsx";
  }
  if (normalizedPaths.has("index.html")) {
    return "index.html";
  }

  const lowerPrompt = prompt.toLowerCase();
  if (/\b(snake|game|playable|browser|website|landing page|html)\b/u.test(lowerPrompt)) {
    return "index.html";
  }
  if (/\b(react|component|tsx|frontend|ui|screen)\b/u.test(lowerPrompt)) {
    return "src/App.tsx";
  }

  return "src/autopilot-generated.ts";
}

function getCodingLanguageFromPath(relativePath: string): string {
  const extension = relativePath.split(".").pop()?.toLowerCase() ?? "";
  if (extension === "tsx" || extension === "ts") {
    return "typescript";
  }
  if (extension === "jsx" || extension === "js") {
    return "javascript";
  }
  if (extension === "md") {
    return "markdown";
  }
  return extension || "text";
}

function extractJsonObjectFromText(value: string): string | null {
  const fenced = value.match(/```(?:json)?\s*([\s\S]*?)```/iu);
  const candidate = fenced?.[1] ?? value;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  return start >= 0 && end > start ? candidate.slice(start, end + 1) : null;
}

function parseCodingFilePatchResponse(answer: string): { explanation: string; nextContent: string } | null {
  const json = extractJsonObjectFromText(answer);
  if (!json) {
    return null;
  }

  try {
    const parsed = JSON.parse(json) as { explanation?: unknown; newContent?: unknown; nextContent?: unknown };
    const nextContent = typeof parsed.newContent === "string" ? parsed.newContent : typeof parsed.nextContent === "string" ? parsed.nextContent : "";
    if (!nextContent) {
      return null;
    }

    return {
      explanation: typeof parsed.explanation === "string" ? parsed.explanation.trim().slice(0, 480) : "Autopilot prepared a file edit.",
      nextContent
    };
  } catch {
    return null;
  }
}

function buildLocalCodingFallbackPatch(
  prompt: string,
  relativePath: string,
  originalContent: string
): { explanation: string; nextContent: string } | null {
  const lowerPrompt = prompt.toLowerCase();
  const lowerPath = relativePath.toLowerCase();
  const asksForSnake = /\b(snake|snake game)\b/u.test(lowerPrompt);
  const asksForTetris = /\b(tetris|tetromino|tetrominoes|line clear|line clears)\b/u.test(lowerPrompt);
  const asksForWebsite = /\b(website|web page|homepage|landing page|html|browser app|front[- ]?end)\b/u.test(lowerPrompt);

  if (asksForSnake && /\.html?$/u.test(lowerPath)) {
    return {
      explanation:
        "Local starter template because the AI backend is unavailable. It creates a playable Snake game with scoring, keyboard controls, restart, and a clean single-file layout. Review it before applying.",
      nextContent: `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Autopilot Snake</title>
  <style>
    :root {
      color-scheme: light;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #f7f3e8;
      color: #0b2a20;
    }

    * {
      box-sizing: border-box;
    }

    body {
      min-height: 100vh;
      margin: 0;
      display: grid;
      place-items: center;
      padding: 32px;
      background:
        radial-gradient(circle at 18% 12%, rgba(40, 205, 168, 0.22), transparent 34%),
        linear-gradient(135deg, #fffaf0 0%, #edf8ef 100%);
    }

    .game-shell {
      width: min(94vw, 760px);
      display: grid;
      gap: 20px;
      padding: 28px;
      border: 1px solid rgba(5, 82, 60, 0.18);
      border-radius: 28px;
      background: rgba(255, 255, 255, 0.82);
      box-shadow: 0 28px 80px rgba(7, 50, 37, 0.16);
      backdrop-filter: blur(18px);
    }

    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }

    h1 {
      margin: 0;
      font-size: clamp(2rem, 6vw, 4.8rem);
      line-height: 0.92;
      letter-spacing: 0;
    }

    p {
      margin: 8px 0 0;
      color: #496359;
      max-width: 46ch;
    }

    .score-card {
      min-width: 140px;
      padding: 14px 18px;
      border-radius: 18px;
      background: #0b3d2e;
      color: #eafff6;
      text-align: right;
    }

    .score-card span {
      display: block;
      font-size: 0.76rem;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: #88ead0;
    }

    .score-card strong {
      display: block;
      font-size: 2.2rem;
      line-height: 1;
    }

    .board-wrap {
      position: relative;
      overflow: hidden;
      border-radius: 24px;
      border: 1px solid rgba(3, 65, 47, 0.18);
      background: #09251d;
    }

    canvas {
      display: block;
      width: 100%;
      aspect-ratio: 1;
      background:
        linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
        #09251d;
      background-size: 24px 24px;
    }

    .game-over {
      position: absolute;
      inset: 0;
      display: none;
      place-items: center;
      padding: 24px;
      background: rgba(4, 20, 16, 0.72);
      color: #ffffff;
      text-align: center;
    }

    .game-over.active {
      display: grid;
    }

    .controls {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    button {
      border: 0;
      border-radius: 999px;
      padding: 12px 18px;
      background: #13c7a3;
      color: #06271e;
      font-weight: 800;
      cursor: pointer;
      box-shadow: 0 12px 28px rgba(19, 199, 163, 0.28);
    }

    kbd {
      display: inline-flex;
      align-items: center;
      min-width: 30px;
      justify-content: center;
      padding: 6px 8px;
      border-radius: 8px;
      background: #ecf3ed;
      border: 1px solid #ccded2;
      font-weight: 700;
      color: #173e31;
    }
  </style>
</head>
<body>
  <main class="game-shell">
    <header>
      <div>
        <h1>Snake</h1>
        <p>Use arrow keys or WASD to steer. Eat the mint squares, avoid the walls, and keep your run alive.</p>
      </div>
      <div class="score-card" aria-live="polite">
        <span>Score</span>
        <strong id="score">0</strong>
      </div>
    </header>

    <section class="board-wrap" aria-label="Snake game board">
      <canvas id="board" width="480" height="480"></canvas>
      <div class="game-over" id="gameOver">
        <div>
          <h2>Game over</h2>
          <p id="finalScore">Final score: 0</p>
        </div>
      </div>
    </section>

    <div class="controls">
      <div aria-label="Keyboard controls">
        <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd>
        <span>or arrow keys</span>
      </div>
      <button id="restart" type="button">Restart game</button>
    </div>
  </main>

  <script>
    const canvas = document.getElementById("board");
    const context = canvas.getContext("2d");
    const scoreElement = document.getElementById("score");
    const finalScoreElement = document.getElementById("finalScore");
    const gameOverElement = document.getElementById("gameOver");
    const restartButton = document.getElementById("restart");

    const cells = 20;
    const cellSize = canvas.width / cells;
    let snake;
    let food;
    let velocity;
    let nextVelocity;
    let score;
    let gameOver;

    function randomCell() {
      return Math.floor(Math.random() * cells);
    }

    function placeFood() {
      let nextFood;
      do {
        nextFood = { x: randomCell(), y: randomCell() };
      } while (snake.some(function (part) {
        return part.x === nextFood.x && part.y === nextFood.y;
      }));
      food = nextFood;
    }

    function resetGame() {
      snake = [
        { x: 9, y: 10 },
        { x: 8, y: 10 },
        { x: 7, y: 10 }
      ];
      velocity = { x: 1, y: 0 };
      nextVelocity = { x: 1, y: 0 };
      score = 0;
      gameOver = false;
      scoreElement.textContent = "0";
      gameOverElement.classList.remove("active");
      placeFood();
      draw();
    }

    function drawCell(x, y, color, inset) {
      const drawX = x * cellSize + inset;
      const drawY = y * cellSize + inset;
      const drawSize = cellSize - inset * 2;
      context.fillStyle = color;
      if (typeof context.roundRect !== "function") {
        context.fillRect(drawX, drawY, drawSize, drawSize);
        return;
      }
      context.beginPath();
      context.roundRect(drawX, drawY, drawSize, drawSize, 7);
      context.fill();
    }

    function draw() {
      context.clearRect(0, 0, canvas.width, canvas.height);
      drawCell(food.x, food.y, "#f7d35c", 4);
      snake.forEach(function (part, index) {
        drawCell(part.x, part.y, index === 0 ? "#26e7bc" : "#17a987", 3);
      });
    }

    function step() {
      if (gameOver) {
        return;
      }

      velocity = nextVelocity;
      const head = snake[0];
      const nextHead = { x: head.x + velocity.x, y: head.y + velocity.y };
      const hitsWall = nextHead.x < 0 || nextHead.y < 0 || nextHead.x >= cells || nextHead.y >= cells;
      const hitsSelf = snake.some(function (part) {
        return part.x === nextHead.x && part.y === nextHead.y;
      });

      if (hitsWall || hitsSelf) {
        gameOver = true;
        finalScoreElement.textContent = "Final score: " + score;
        gameOverElement.classList.add("active");
        return;
      }

      snake.unshift(nextHead);
      if (nextHead.x === food.x && nextHead.y === food.y) {
        score += 10;
        scoreElement.textContent = String(score);
        placeFood();
      } else {
        snake.pop();
      }

      draw();
    }

    function setDirection(x, y) {
      if (velocity.x + x === 0 && velocity.y + y === 0) {
        return;
      }
      nextVelocity = { x: x, y: y };
    }

    document.addEventListener("keydown", function (event) {
      const key = event.key.toLowerCase();
      if (key === "arrowup" || key === "w") setDirection(0, -1);
      if (key === "arrowdown" || key === "s") setDirection(0, 1);
      if (key === "arrowleft" || key === "a") setDirection(-1, 0);
      if (key === "arrowright" || key === "d") setDirection(1, 0);
    });

    restartButton.addEventListener("click", resetGame);
    resetGame();
    window.setInterval(step, 115);
  </script>
</body>
</html>`
    };
  }

  if ((asksForSnake || asksForTetris || asksForWebsite) && /\.(tsx|jsx)$/u.test(lowerPath)) {
    if (asksForSnake) {
      const snakeIsEntryFile = /(^|\/)(main|index)\.(tsx|jsx)$/u.test(lowerPath);
      const snakeRenderLine = snakeIsEntryFile
        ? `
const rootElement = document.getElementById("root") ?? (() => {
  const element = document.createElement("div");
  element.id = "root";
  document.body.appendChild(element);
  return element;
})();

createRoot(rootElement).render(<SnakeGame />);
`
        : "";
      const snakeExportPrefix = snakeIsEntryFile ? "" : "export default ";
      const snakeRootImport = snakeIsEntryFile ? 'import { createRoot } from "react-dom/client";\n' : "";
      return {
        explanation:
          "Local starter template because the AI backend is unavailable. It creates a visible canvas-based React Snake game that paints immediately, moves on its own, supports keyboard controls, scoring, and restart.",
        nextContent: `import React, { useEffect, useRef, useState } from "react";
${snakeRootImport}
type Point = {
  x: number;
  y: number;
};

const boardCells = 20;
const canvasSize = 520;
const cellSize = canvasSize / boardCells;
const tickMs = 120;

function makeInitialSnake(): Point[] {
  return [{ x: 9, y: 10 }, { x: 8, y: 10 }, { x: 7, y: 10 }];
}

function makeFood(snake: Point[]): Point {
  let food: Point;
  do {
    food = {
      x: Math.floor(Math.random() * boardCells),
      y: Math.floor(Math.random() * boardCells)
    };
  } while (snake.some((part) => part.x === food.x && part.y === food.y));
  return food;
}

function drawRoundedCell(context: CanvasRenderingContext2D, point: Point, color: string, inset: number): void {
  const x = point.x * cellSize + inset;
  const y = point.y * cellSize + inset;
  const size = cellSize - inset * 2;
  context.fillStyle = color;

  if (typeof context.roundRect === "function") {
    context.beginPath();
    context.roundRect(x, y, size, size, 7);
    context.fill();
    return;
  }

  context.fillRect(x, y, size, size);
}

${snakeExportPrefix}function SnakeGame(): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const snakeRef = useRef<Point[]>(makeInitialSnake());
  const foodRef = useRef<Point>(makeFood(snakeRef.current));
  const directionRef = useRef<Point>({ x: 1, y: 0 });
  const queuedDirectionRef = useRef<Point>({ x: 1, y: 0 });
  const gameOverRef = useRef(false);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState("Game running");

  function draw(): void {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) {
      setStatus("Canvas unavailable");
      return;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#09251d";
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.strokeStyle = "rgba(255, 255, 255, 0.05)";
    for (let index = 0; index <= boardCells; index += 1) {
      const offset = index * cellSize;
      context.beginPath();
      context.moveTo(offset, 0);
      context.lineTo(offset, canvasSize);
      context.moveTo(0, offset);
      context.lineTo(canvasSize, offset);
      context.stroke();
    }

    drawRoundedCell(context, foodRef.current, "#f7d35c", 4);
    snakeRef.current.forEach((part, index) => {
      drawRoundedCell(context, part, index === 0 ? "#26e7bc" : "#17a987", 3);
    });
  }

  function resetGame(): void {
    const nextSnake = makeInitialSnake();
    snakeRef.current = nextSnake;
    foodRef.current = makeFood(nextSnake);
    directionRef.current = { x: 1, y: 0 };
    queuedDirectionRef.current = { x: 1, y: 0 };
    gameOverRef.current = false;
    setScore(0);
    setStatus("Game running");
    window.requestAnimationFrame(draw);
  }

  function step(): void {
    if (gameOverRef.current) {
      return;
    }

    directionRef.current = queuedDirectionRef.current;
    const head = snakeRef.current[0];
    const nextHead = {
      x: head.x + directionRef.current.x,
      y: head.y + directionRef.current.y
    };
    const hitsWall = nextHead.x < 0 || nextHead.y < 0 || nextHead.x >= boardCells || nextHead.y >= boardCells;
    const hitsSelf = snakeRef.current.some((part) => part.x === nextHead.x && part.y === nextHead.y);

    if (hitsWall || hitsSelf) {
      gameOverRef.current = true;
      setStatus("Game over");
      draw();
      return;
    }

    const ateFood = nextHead.x === foodRef.current.x && nextHead.y === foodRef.current.y;
    snakeRef.current = ateFood ? [nextHead, ...snakeRef.current] : [nextHead, ...snakeRef.current.slice(0, -1)];

    if (ateFood) {
      setScore((currentScore) => currentScore + 10);
      foodRef.current = makeFood(snakeRef.current);
    }

    draw();
  }

  useEffect(() => {
    function setDirection(nextDirection: Point): void {
      const currentDirection = directionRef.current;
      if (currentDirection.x + nextDirection.x === 0 && currentDirection.y + nextDirection.y === 0) {
        return;
      }
      queuedDirectionRef.current = nextDirection;
    }

    function onKeyDown(event: KeyboardEvent): void {
      const key = event.key.toLowerCase();
      if (key === "arrowup" || key === "w") setDirection({ x: 0, y: -1 });
      if (key === "arrowdown" || key === "s") setDirection({ x: 0, y: 1 });
      if (key === "arrowleft" || key === "a") setDirection({ x: -1, y: 0 });
      if (key === "arrowright" || key === "d") setDirection({ x: 1, y: 0 });
    }

    draw();
    const timer = window.setInterval(step, tickMs);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <main style={styles.page}>
      <section style={styles.shell}>
        <header style={styles.header}>
          <div>
            <p style={styles.kicker}>Autopilot game draft</p>
            <h1 style={styles.title}>Snake</h1>
            <p style={styles.copy}>The board paints immediately. Use WASD or arrow keys to steer the moving snake.</p>
          </div>
          <div style={styles.scoreCard} aria-live="polite">
            <span style={styles.scoreLabel}>Score</span>
            <strong style={styles.score}>{score}</strong>
          </div>
        </header>

        <canvas ref={canvasRef} width={canvasSize} height={canvasSize} style={styles.canvas} aria-label="Snake game board" />

        <footer style={styles.footer}>
          <span>{status}</span>
          <button style={styles.button} type="button" onClick={resetGame}>Restart game</button>
        </footer>
      </section>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: 32,
    background: "linear-gradient(135deg, #fff8e8, #eaf8ef)",
    color: "#0b2a20",
    fontFamily: "Inter, system-ui, sans-serif"
  },
  shell: {
    width: "min(94vw, 760px)",
    display: "grid",
    gap: 22,
    padding: 30,
    border: "1px solid rgba(4, 79, 58, 0.18)",
    borderRadius: 28,
    background: "rgba(255, 255, 255, 0.88)",
    boxShadow: "0 28px 80px rgba(7, 50, 37, 0.16)"
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 18
  },
  kicker: {
    margin: 0,
    color: "#05745f",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.12em"
  },
  title: {
    margin: "8px 0",
    fontSize: "clamp(3rem, 8vw, 6rem)",
    lineHeight: 0.9
  },
  copy: {
    margin: 0,
    maxWidth: 480,
    color: "#4d655c"
  },
  scoreCard: {
    minWidth: 120,
    padding: "14px 18px",
    borderRadius: 18,
    background: "#0b3d2e",
    color: "#eafff6",
    textAlign: "right"
  },
  scoreLabel: {
    display: "block",
    color: "#88ead0",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.12em"
  },
  score: {
    display: "block",
    fontSize: 34
  },
  canvas: {
    width: "100%",
    aspectRatio: "1",
    borderRadius: 24,
    background: "#09251d",
    border: "1px solid rgba(3, 65, 47, 0.18)",
    boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.04)"
  },
  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    color: "#4d655c"
  },
  button: {
    border: 0,
    borderRadius: 999,
    padding: "12px 18px",
    background: "#13c7a3",
    color: "#06271e",
    fontWeight: 800,
    cursor: "pointer"
  }
} satisfies Record<string, React.CSSProperties>;
${snakeRenderLine}`
      };

      const isEntryFile = /(^|\/)(main|index)\.(tsx|jsx)$/u.test(lowerPath);
      const renderLine = isEntryFile ? '\ncreateRoot(document.getElementById("root")!).render(<SnakeGame />);\n' : "";
      const exportPrefix = isEntryFile ? "" : "export default ";
      const rootImport = isEntryFile ? 'import { createRoot } from "react-dom/client";\n' : "";
      return {
        explanation:
          "Local starter template because the AI backend is unavailable. It creates a playable React Snake game with scoring, keyboard controls, restart, and a reviewable single-file implementation.",
        nextContent: `import React, { useEffect, useMemo, useState } from "react";
${rootImport}
type Point = {
  x: number;
  y: number;
};

const boardSize = 18;
const tickMs = 120;

function createFood(snake: Point[]): Point {
  let candidate: Point;
  do {
    candidate = {
      x: Math.floor(Math.random() * boardSize),
      y: Math.floor(Math.random() * boardSize)
    };
  } while (snake.some((part) => part.x === candidate.x && part.y === candidate.y));

  return candidate;
}

${exportPrefix}function SnakeGame(): JSX.Element {
  const initialSnake = useMemo<Point[]>(() => [{ x: 8, y: 8 }, { x: 7, y: 8 }, { x: 6, y: 8 }], []);
  const [snake, setSnake] = useState<Point[]>(initialSnake);
  const [food, setFood] = useState<Point>(() => createFood(initialSnake));
  const [direction, setDirection] = useState<Point>({ x: 1, y: 0 });
  const [nextDirection, setNextDirection] = useState<Point>({ x: 1, y: 0 });
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  function resetGame(): void {
    const nextSnake = [{ x: 8, y: 8 }, { x: 7, y: 8 }, { x: 6, y: 8 }];
    setSnake(nextSnake);
    setFood(createFood(nextSnake));
    setDirection({ x: 1, y: 0 });
    setNextDirection({ x: 1, y: 0 });
    setScore(0);
    setGameOver(false);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      const key = event.key.toLowerCase();
      const requested =
        key === "arrowup" || key === "w" ? { x: 0, y: -1 } :
        key === "arrowdown" || key === "s" ? { x: 0, y: 1 } :
        key === "arrowleft" || key === "a" ? { x: -1, y: 0 } :
        key === "arrowright" || key === "d" ? { x: 1, y: 0 } :
        null;

      if (!requested) {
        return;
      }
      event.preventDefault();
      setNextDirection((current) => {
        if (direction.x + requested.x === 0 && direction.y + requested.y === 0) {
          return current;
        }
        return requested;
      });
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [direction]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (gameOver) {
        return;
      }

      setSnake((currentSnake) => {
        const activeDirection = nextDirection;
        setDirection(activeDirection);
        const head = currentSnake[0];
        const nextHead = { x: head.x + activeDirection.x, y: head.y + activeDirection.y };
        const hitsWall = nextHead.x < 0 || nextHead.y < 0 || nextHead.x >= boardSize || nextHead.y >= boardSize;
        const hitsSelf = currentSnake.some((part) => part.x === nextHead.x && part.y === nextHead.y);

        if (hitsWall || hitsSelf) {
          setGameOver(true);
          return currentSnake;
        }

        const ateFood = nextHead.x === food.x && nextHead.y === food.y;
        const nextSnake = ateFood ? [nextHead, ...currentSnake] : [nextHead, ...currentSnake.slice(0, -1)];
        if (ateFood) {
          setScore((currentScore) => currentScore + 10);
          setFood(createFood(nextSnake));
        }
        return nextSnake;
      });
    }, tickMs);

    return () => window.clearInterval(timer);
  }, [food, gameOver, nextDirection]);

  return (
    <main style={styles.page}>
      <section style={styles.shell}>
        <header style={styles.header}>
          <div>
            <p style={styles.kicker}>Autopilot game draft</p>
            <h1 style={styles.title}>Snake</h1>
            <p style={styles.copy}>Use WASD or arrow keys. Eat the gold squares, avoid the walls, and restart anytime.</p>
          </div>
          <div style={styles.scoreCard} aria-live="polite">
            <span style={styles.scoreLabel}>Score</span>
            <strong style={styles.score}>{score}</strong>
          </div>
        </header>

        <div style={styles.board} aria-label="Snake game board">
          {Array.from({ length: boardSize * boardSize }).map((_, index) => {
            const x = index % boardSize;
            const y = Math.floor(index / boardSize);
            const snakeIndex = snake.findIndex((part) => part.x === x && part.y === y);
            const isFood = food.x === x && food.y === y;
            const style = snakeIndex === 0 ? styles.headCell : snakeIndex > 0 ? styles.snakeCell : isFood ? styles.foodCell : styles.emptyCell;
            return <span key={index} style={style} />;
          })}
        </div>

        <footer style={styles.footer}>
          <span>{gameOver ? "Game over. Try a cleaner route." : "Game running"}</span>
          <button style={styles.button} type="button" onClick={resetGame}>Restart game</button>
        </footer>
      </section>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: 32,
    background: "linear-gradient(135deg, #fff8e8, #eaf8ef)",
    color: "#0b2a20",
    fontFamily: "Inter, system-ui, sans-serif"
  },
  shell: {
    width: "min(94vw, 760px)",
    display: "grid",
    gap: 22,
    padding: 30,
    border: "1px solid rgba(4, 79, 58, 0.18)",
    borderRadius: 28,
    background: "rgba(255, 255, 255, 0.86)",
    boxShadow: "0 28px 80px rgba(7, 50, 37, 0.16)"
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 18
  },
  kicker: {
    margin: 0,
    color: "#05745f",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.12em"
  },
  title: {
    margin: "8px 0",
    fontSize: "clamp(3rem, 8vw, 6rem)",
    lineHeight: 0.9
  },
  copy: {
    margin: 0,
    maxWidth: 460,
    color: "#4d655c"
  },
  scoreCard: {
    minWidth: 120,
    padding: "14px 18px",
    borderRadius: 18,
    background: "#0b3d2e",
    color: "#eafff6",
    textAlign: "right"
  },
  scoreLabel: {
    display: "block",
    color: "#88ead0",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.12em"
  },
  score: {
    display: "block",
    fontSize: 34
  },
  board: {
    display: "grid",
    gridTemplateColumns: "repeat(18, 1fr)",
    gap: 4,
    padding: 12,
    aspectRatio: "1",
    borderRadius: 24,
    background: "#09251d",
    border: "1px solid rgba(3, 65, 47, 0.18)"
  },
  emptyCell: {
    borderRadius: 7,
    background: "rgba(255, 255, 255, 0.04)"
  },
  snakeCell: {
    borderRadius: 7,
    background: "#17a987",
    boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.14)"
  },
  headCell: {
    borderRadius: 7,
    background: "#26e7bc",
    boxShadow: "0 0 18px rgba(38, 231, 188, 0.4)"
  },
  foodCell: {
    borderRadius: 7,
    background: "#f7d35c",
    boxShadow: "0 0 18px rgba(247, 211, 92, 0.4)"
  },
  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    color: "#4d655c"
  },
  button: {
    border: 0,
    borderRadius: 999,
    padding: "12px 18px",
    background: "#13c7a3",
    color: "#06271e",
    fontWeight: 800,
    cursor: "pointer"
  }
} satisfies Record<string, React.CSSProperties>;
${renderLine}`
      };
    }

    if (asksForTetris) {
      const isEntryFile = /(^|\/)(main|index)\.(tsx|jsx)$/u.test(lowerPath);
      const renderLine = isEntryFile ? '\ncreateRoot(document.getElementById("root")!).render(<TetrisGame />);\n' : "";
      const exportPrefix = isEntryFile ? "" : "export default ";
      const rootImport = isEntryFile ? 'import { createRoot } from "react-dom/client";\n' : "";
      return {
        explanation:
          "Local starter template because the AI backend is unavailable. It creates a playable React Tetris game with tetrominoes, rotation, line clears, scoring, keyboard controls, and restart.",
        nextContent: `import React, { useEffect, useMemo, useState } from "react";
${rootImport}
type Cell = "" | "cyan" | "blue" | "orange" | "yellow" | "green" | "purple" | "red";

type Point = {
  x: number;
  y: number;
};

type Piece = {
  shape: number[][];
  color: Exclude<Cell, "">;
  position: Point;
};

const boardWidth = 10;
const boardHeight = 20;
const fallMs = 520;

const pieces: Array<{ color: Exclude<Cell, "">; shape: number[][] }> = [
  { color: "cyan", shape: [[1, 1, 1, 1]] },
  { color: "blue", shape: [[1, 0, 0], [1, 1, 1]] },
  { color: "orange", shape: [[0, 0, 1], [1, 1, 1]] },
  { color: "yellow", shape: [[1, 1], [1, 1]] },
  { color: "green", shape: [[0, 1, 1], [1, 1, 0]] },
  { color: "purple", shape: [[0, 1, 0], [1, 1, 1]] },
  { color: "red", shape: [[1, 1, 0], [0, 1, 1]] }
];

function createBoard(): Cell[][] {
  return Array.from({ length: boardHeight }, () => Array.from({ length: boardWidth }, () => ""));
}

function createPiece(): Piece {
  const template = pieces[Math.floor(Math.random() * pieces.length)];
  return {
    color: template.color,
    shape: template.shape.map((row) => [...row]),
    position: { x: Math.floor(boardWidth / 2) - 2, y: 0 }
  };
}

function rotateShape(shape: number[][]): number[][] {
  return shape[0].map((_, columnIndex) => shape.map((row) => row[columnIndex]).reverse());
}

function collides(board: Cell[][], piece: Piece, position = piece.position, shape = piece.shape): boolean {
  return shape.some((row, y) =>
    row.some((value, x) => {
      if (!value) {
        return false;
      }
      const boardX = position.x + x;
      const boardY = position.y + y;
      return boardX < 0 || boardX >= boardWidth || boardY >= boardHeight || Boolean(board[boardY]?.[boardX]);
    })
  );
}

function mergePiece(board: Cell[][], piece: Piece): Cell[][] {
  const nextBoard = board.map((row) => [...row]);
  piece.shape.forEach((row, y) => {
    row.forEach((value, x) => {
      if (!value) {
        return;
      }
      const boardY = piece.position.y + y;
      const boardX = piece.position.x + x;
      if (nextBoard[boardY]?.[boardX] !== undefined) {
        nextBoard[boardY][boardX] = piece.color;
      }
    });
  });
  return nextBoard;
}

function clearLines(board: Cell[][]): { board: Cell[][]; cleared: number } {
  const remainingRows = board.filter((row) => row.some((cell) => !cell));
  const cleared = boardHeight - remainingRows.length;
  while (remainingRows.length < boardHeight) {
    remainingRows.unshift(Array.from({ length: boardWidth }, () => ""));
  }
  return { board: remainingRows, cleared };
}

${exportPrefix}function TetrisGame(): JSX.Element {
  const [board, setBoard] = useState<Cell[][]>(() => createBoard());
  const [piece, setPiece] = useState<Piece>(() => createPiece());
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const visibleBoard = useMemo(() => mergePiece(board, piece), [board, piece]);

  function resetGame(): void {
    setBoard(createBoard());
    setPiece(createPiece());
    setScore(0);
    setLines(0);
    setGameOver(false);
  }

  function lockPiece(currentPiece: Piece): void {
    const merged = mergePiece(board, currentPiece);
    const result = clearLines(merged);
    const nextPiece = createPiece();
    setBoard(result.board);
    setLines((currentLines) => currentLines + result.cleared);
    setScore((currentScore) => currentScore + result.cleared * result.cleared * 100 + 10);
    if (collides(result.board, nextPiece)) {
      setGameOver(true);
      return;
    }
    setPiece(nextPiece);
  }

  function movePiece(deltaX: number, deltaY: number): void {
    if (gameOver) {
      return;
    }
    const nextPosition = { x: piece.position.x + deltaX, y: piece.position.y + deltaY };
    if (collides(board, piece, nextPosition)) {
      if (deltaY > 0) {
        lockPiece(piece);
      }
      return;
    }
    setPiece({ ...piece, position: nextPosition });
  }

  function rotatePiece(): void {
    if (gameOver) {
      return;
    }
    const rotated = rotateShape(piece.shape);
    if (!collides(board, piece, piece.position, rotated)) {
      setPiece({ ...piece, shape: rotated });
    }
  }

  function hardDrop(): void {
    if (gameOver) {
      return;
    }
    let dropped = piece;
    while (!collides(board, dropped, { x: dropped.position.x, y: dropped.position.y + 1 })) {
      dropped = { ...dropped, position: { x: dropped.position.x, y: dropped.position.y + 1 } };
    }
    lockPiece(dropped);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
        event.preventDefault();
        movePiece(-1, 0);
      }
      if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
        event.preventDefault();
        movePiece(1, 0);
      }
      if (event.key === "ArrowDown" || event.key.toLowerCase() === "s") {
        event.preventDefault();
        movePiece(0, 1);
      }
      if (event.key === "ArrowUp" || event.key.toLowerCase() === "w") {
        event.preventDefault();
        rotatePiece();
      }
      if (event.key === " ") {
        event.preventDefault();
        hardDrop();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  useEffect(() => {
    const timer = window.setInterval(() => movePiece(0, 1), fallMs);
    return () => window.clearInterval(timer);
  });

  return (
    <main style={styles.page}>
      <section style={styles.shell}>
        <header style={styles.header}>
          <div>
            <p style={styles.kicker}>Autopilot game draft</p>
            <h1 style={styles.title}>Tetris</h1>
            <p style={styles.copy}>Move with arrows or WASD, rotate with Up/W, hard drop with Space, and clear lines for points.</p>
          </div>
          <div style={styles.stats} aria-live="polite">
            <span>Score <strong>{score}</strong></span>
            <span>Lines <strong>{lines}</strong></span>
          </div>
        </header>

        <div style={styles.gameArea}>
          <div style={styles.board} aria-label="Tetris board">
            {visibleBoard.flatMap((row, y) =>
              row.map((cell, x) => <span key={String(y) + ":" + String(x)} style={{ ...styles.cell, background: getCellColor(cell) }} />)
            )}
          </div>
          <aside style={styles.help}>
            <strong>{gameOver ? "Game over" : "Playing"}</strong>
            <p>Clear full rows to score. The game stops when new tetrominoes cannot spawn.</p>
            <button style={styles.button} type="button" onClick={resetGame}>Restart game</button>
          </aside>
        </div>
      </section>
    </main>
  );
}

function getCellColor(cell: Cell): string {
  switch (cell) {
    case "cyan":
      return "#35d8d1";
    case "blue":
      return "#4f7cff";
    case "orange":
      return "#f59e42";
    case "yellow":
      return "#f7d35c";
    case "green":
      return "#42d07d";
    case "purple":
      return "#a78bfa";
    case "red":
      return "#ef5b72";
    default:
      return "rgba(255, 255, 255, 0.06)";
  }
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: 32,
    background: "linear-gradient(135deg, #fff8e8, #eaf8ef)",
    color: "#0b2a20",
    fontFamily: "Inter, system-ui, sans-serif"
  },
  shell: {
    width: "min(96vw, 980px)",
    display: "grid",
    gap: 22,
    padding: 30,
    border: "1px solid rgba(4, 79, 58, 0.18)",
    borderRadius: 28,
    background: "rgba(255, 255, 255, 0.88)",
    boxShadow: "0 28px 80px rgba(7, 50, 37, 0.16)"
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 18
  },
  kicker: {
    margin: 0,
    color: "#05745f",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.12em"
  },
  title: {
    margin: "8px 0",
    fontSize: "clamp(3rem, 8vw, 6rem)",
    lineHeight: 0.9
  },
  copy: {
    margin: 0,
    maxWidth: 560,
    color: "#4d655c"
  },
  stats: {
    minWidth: 150,
    display: "grid",
    gap: 8,
    padding: "14px 18px",
    borderRadius: 18,
    background: "#0b3d2e",
    color: "#eafff6"
  },
  gameArea: {
    display: "grid",
    gridTemplateColumns: "minmax(280px, 480px) minmax(180px, 1fr)",
    gap: 20,
    alignItems: "start"
  },
  board: {
    display: "grid",
    gridTemplateColumns: "repeat(10, 1fr)",
    gap: 4,
    padding: 12,
    borderRadius: 24,
    background: "#09251d",
    border: "1px solid rgba(3, 65, 47, 0.18)"
  },
  cell: {
    aspectRatio: "1",
    borderRadius: 6,
    boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.12)"
  },
  help: {
    display: "grid",
    gap: 12,
    padding: 18,
    borderRadius: 20,
    background: "#f4f0e5",
    color: "#244439"
  },
  button: {
    border: 0,
    borderRadius: 999,
    padding: "12px 18px",
    background: "#13c7a3",
    color: "#06271e",
    fontWeight: 800,
    cursor: "pointer"
  }
} satisfies Record<string, React.CSSProperties>;
${renderLine}`
      };
    }

    const componentName = "AutopilotGeneratedApp";
    return {
      explanation:
        "Local starter template because the AI backend is unavailable. It gives you real React code to review and revise instead of leaving the coding run empty.",
      nextContent: `import React from "react";

export default function ${componentName}(): JSX.Element {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 32,
        background: "linear-gradient(135deg, #fff8e8, #eaf8ef)",
        color: "#0b2a20",
        fontFamily: "Inter, system-ui, sans-serif"
      }}
    >
      <section
        style={{
          width: "min(92vw, 760px)",
          padding: 32,
          border: "1px solid rgba(4, 79, 58, 0.18)",
          borderRadius: 28,
          background: "rgba(255, 255, 255, 0.82)",
          boxShadow: "0 28px 80px rgba(7, 50, 37, 0.16)"
        }}
      >
        <p style={{ margin: 0, color: "#05745f", fontWeight: 800 }}>Generated by Autopilot</p>
        <h1 style={{ margin: "12px 0", fontSize: "clamp(2.5rem, 7vw, 5rem)", lineHeight: 0.95 }}>Autopilot Website</h1>
        <p style={{ margin: 0, maxWidth: 560, color: "#4d655c", fontSize: 18 }}>A starter landing page shell. Ask Autopilot to refine copy, sections, or visuals next.</p>
      </section>
    </main>
  );
}
`
    };
  }

  if ((asksForWebsite || /\b(create|build|generate|make)\b/u.test(lowerPrompt)) && /\.html?$/u.test(lowerPath)) {
    return {
      explanation:
        originalContent.trim().length > 0
          ? "Local starter template because the AI backend is unavailable. It replaces the current file with a clean reviewable web page draft."
          : "Local starter template because the AI backend is unavailable. It creates a clean reviewable web page draft.",
      nextContent: `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Autopilot Draft</title>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 40px;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: linear-gradient(135deg, #fff8e8, #eaf8ef);
      color: #0b2a20;
    }

    main {
      width: min(94vw, 960px);
      padding: 44px;
      border-radius: 30px;
      border: 1px solid rgba(4, 79, 58, 0.18);
      background: rgba(255, 255, 255, 0.82);
      box-shadow: 0 28px 80px rgba(7, 50, 37, 0.16);
    }

    h1 {
      margin: 0;
      max-width: 12ch;
      font-size: clamp(3rem, 9vw, 7rem);
      line-height: 0.9;
      letter-spacing: 0;
    }

    p {
      max-width: 58ch;
      color: #4d655c;
      font-size: 1.1rem;
      line-height: 1.7;
    }

    a {
      display: inline-flex;
      margin-top: 18px;
      padding: 13px 18px;
      border-radius: 999px;
      background: #13c7a3;
      color: #06271e;
      text-decoration: none;
      font-weight: 800;
    }
  </style>
</head>
<body>
  <main>
    <h1>Autopilot draft</h1>
    <p>This is a real starter page generated locally because the AI backend is not available. Ask Autopilot to refine the content, sections, interactions, or style once the model is connected.</p>
    <a href="#">Review the draft</a>
  </main>
</body>
</html>`
    };
  }

  return null;
}

function createChatMessageId(): string {
  return `chat-message:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`;
}

function createEnterpriseInviteKey(): string {
  return `AUTO-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function getEnterpriseMemberIdForEmail(email: string): string {
  return `member:${email.trim().toLowerCase()}`;
}

function getEnterpriseDisplayName(email: string): string {
  const localPart = email.split("@")[0] || "Member";
  return localPart
    .replace(/[._-]+/gu, " ")
    .replace(/\b\w/gu, (letter) => letter.toUpperCase())
    .slice(0, 42);
}

function createEnterpriseAuditEvent(actorId: string, action: string): EnterpriseChatAuditEvent {
  return {
    id: `chat-audit:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`,
    actorId,
    action,
    createdAt: Date.now()
  };
}

function ensureEnterpriseMember(state: EnterpriseChatState, email: string): EnterpriseChatState {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    return state;
  }

  const memberId = getEnterpriseMemberIdForEmail(normalizedEmail);
  const existing = state.members.find((member) => member.id === memberId);
  const currentUserId = memberId;
  if (existing && existing.status === "active") {
    return existing.displayName === getEnterpriseDisplayName(normalizedEmail) && state.currentUserId === currentUserId
      ? state
      : {
          ...state,
          currentUserId,
          members: state.members.map((member) =>
            member.id === memberId
              ? {
                  ...member,
                  email: normalizedEmail,
                  displayName: getEnterpriseDisplayName(normalizedEmail)
                }
              : member
          )
        };
  }

  const member: EnterpriseChatMember = {
    id: memberId,
    email: normalizedEmail,
    displayName: getEnterpriseDisplayName(normalizedEmail),
    role: state.members.some((candidate) => candidate.role === "owner") ? "member" : "owner",
    status: "active",
    joinedAt: Date.now()
  };

  return {
    ...state,
    currentUserId,
    members: [member, ...state.members.filter((candidate) => candidate.id !== memberId)],
    channels: state.channels.map((channel) =>
      channel.memberIds.includes(member.id)
        ? channel
        : {
            ...channel,
            memberIds: [...channel.memberIds, member.id]
          }
    ),
    auditLog: [createEnterpriseAuditEvent(member.id, `${member.displayName} joined ${state.organizationName}.`), ...state.auditLog].slice(0, 80)
  };
}

function getMentionMemberIds(body: string, members: EnterpriseChatMember[]): string[] {
  const normalizedMentions = new Set([...body.matchAll(/@([a-z0-9._-]+)/giu)].map((match) => match[1].toLowerCase()));
  if (normalizedMentions.size === 0) {
    return [];
  }

  return members
    .filter((member) => {
      const displayKey = member.displayName.toLowerCase().replace(/\s+/gu, "");
      const emailKey = member.email.split("@")[0]?.toLowerCase() ?? "";
      return normalizedMentions.has(displayKey) || normalizedMentions.has(emailKey);
    })
    .map((member) => member.id)
    .slice(0, 8);
}

function getEnterpriseChatActionTitle(body: string): string {
  const cleaned = body.replace(/\s+/gu, " ").trim();
  if (!cleaned) {
    return "Review team ask";
  }

  const directAsk = cleaned.match(/(?:please|can you|could you|need(?:ed)?|todo|action item|follow up|ship|fix|draft|design|build|review|schedule)\b[:,\s-]*(?<ask>[^.?!\n]{8,110})/iu)?.groups?.ask;
  const title = (directAsk ?? cleaned).trim();
  return title.length > 78 ? `${title.slice(0, 75)}...` : title;
}

function getEnterpriseChatInsightSummary(body: string, mentionMemberIds: string[], members: EnterpriseChatMember[]): string {
  const mentionedNames = mentionMemberIds
    .map((memberId) => members.find((member) => member.id === memberId)?.displayName)
    .filter((name): name is string => Boolean(name));
  const hasDeadline = /\b(by|before|due|deadline|tomorrow|today|tonight|friday|monday|tuesday|wednesday|thursday|next week)\b/iu.test(body);
  const hasBlocker = /\b(blocked|stuck|risk|issue|problem|glitch|failed|failing|broken)\b/iu.test(body);
  const parts = [
    mentionedNames.length > 0 ? `Owner signal: ${mentionedNames.join(", ")}.` : "No explicit owner detected.",
    hasDeadline ? "Deadline language detected." : "No deadline detected.",
    hasBlocker ? "Blocker or risk language detected." : "No blocker language detected."
  ];
  return parts.join(" ");
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

function createDefaultChatState(ownerEmail = "you@autopilot.local"): EnterpriseChatState {
  const safeOwnerEmail = ownerEmail.trim() || "you@autopilot.local";
  const ownerName = safeOwnerEmail.includes("@") ? safeOwnerEmail.split("@")[0].replace(/[._-]+/gu, " ") : "You";
  const owner: EnterpriseChatMember = {
    id: getEnterpriseMemberIdForEmail(safeOwnerEmail),
    email: safeOwnerEmail,
    displayName: titleCaseName(ownerName) || "You",
    role: "owner",
    status: "active",
    joinedAt: Date.now()
  };
  const generalChannel: EnterpriseChatChannel = {
    id: "general",
    name: "general",
    kind: "channel",
    aiNotesEnabled: true,
    memberIds: [owner.id],
    unreadCount: 0
  };
  const leadershipChannel: EnterpriseChatChannel = {
    id: "leadership",
    name: "leadership",
    kind: "channel",
    aiNotesEnabled: true,
    memberIds: [owner.id],
    unreadCount: 0
  };
  return {
    organizationId: "org:local-autopilot-team",
    organizationName: "Autopilot Team",
    inviteKey: createEnterpriseInviteKey(),
    inviteKeyVersion: 1,
    inviteKeyUpdatedAt: Date.now(),
    currentUserId: owner.id,
    members: [owner],
    activeChannelId: generalChannel.id,
    channels: [generalChannel, leadershipChannel],
    messages: [],
    aiNotes: ["AI notes are enabled in #general. Autopilot will summarize decisions and suggested action items after messages arrive."],
    auditLog: [createEnterpriseAuditEvent(owner.id, "Autopilot Team workspace created.")],
    actionSuggestions: []
  };
}

function titleCaseName(value: string): string {
  return value
    .split(/\s+/u)
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function loadEnterpriseChatState(): EnterpriseChatState {
  try {
    const raw = window.localStorage.getItem(CHAT_WORKSPACE_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<EnterpriseChatState>) : null;
    if (!parsed || !Array.isArray(parsed.channels)) {
      return createDefaultChatState();
    }

    const fallback = createDefaultChatState();
    const members = Array.isArray(parsed.members)
      ? parsed.members
          .filter(
            (member): member is EnterpriseChatMember =>
              typeof member?.id === "string" &&
              typeof member.email === "string" &&
              typeof member.displayName === "string" &&
              ["owner", "admin", "member"].includes(member.role) &&
              ["active", "removed"].includes(member.status) &&
              typeof member.joinedAt === "number"
          )
          .slice(0, 250)
      : fallback.members;
    const safeMembers = members.some((member) => member.status === "active") ? members : fallback.members;
    const activeMemberIds = safeMembers.filter((member) => member.status === "active").map((member) => member.id);
    const currentUserId =
      typeof parsed.currentUserId === "string" && activeMemberIds.includes(parsed.currentUserId)
        ? parsed.currentUserId
        : activeMemberIds[0] ?? fallback.currentUserId;
    const channels = parsed.channels
      .filter((channel): channel is EnterpriseChatChannel => typeof channel?.id === "string" && typeof channel.name === "string")
      .map((channel): EnterpriseChatChannel => ({
        id: channel.id,
        name: channel.name,
        kind: channel.kind === "dm" ? "dm" : "channel",
        aiNotesEnabled: channel.aiNotesEnabled !== false,
        memberIds:
          Array.isArray(channel.memberIds) && channel.memberIds.some((memberId) => activeMemberIds.includes(memberId))
            ? channel.memberIds.filter((memberId) => activeMemberIds.includes(memberId)).slice(0, 250)
            : activeMemberIds,
        unreadCount: typeof channel.unreadCount === "number" ? Math.max(0, Math.round(channel.unreadCount)) : 0
      }));
    const safeChannels = channels.length > 0 ? channels : fallback.channels;
    const activeChannelId =
      typeof parsed.activeChannelId === "string" && safeChannels.some((channel) => channel.id === parsed.activeChannelId)
        ? parsed.activeChannelId
        : safeChannels[0].id;

    return {
      organizationId: typeof parsed.organizationId === "string" && parsed.organizationId.trim() ? parsed.organizationId.trim().slice(0, 120) : fallback.organizationId,
      organizationName: typeof parsed.organizationName === "string" && parsed.organizationName.trim() ? parsed.organizationName.trim().slice(0, 80) : "Autopilot Team",
      inviteKey: typeof parsed.inviteKey === "string" && parsed.inviteKey.trim() ? parsed.inviteKey.trim().slice(0, 80) : createEnterpriseInviteKey(),
      inviteKeyVersion: typeof parsed.inviteKeyVersion === "number" ? Math.max(1, Math.round(parsed.inviteKeyVersion)) : 1,
      inviteKeyUpdatedAt: typeof parsed.inviteKeyUpdatedAt === "number" ? parsed.inviteKeyUpdatedAt : Date.now(),
      currentUserId,
      members: safeMembers,
      activeChannelId,
      channels: safeChannels,
      messages: Array.isArray(parsed.messages)
        ? parsed.messages
            .filter(
              (message): message is EnterpriseChatMessage =>
                typeof message?.id === "string" &&
                typeof message.channelId === "string" &&
                typeof message.author === "string" &&
                typeof message.body === "string" &&
                typeof message.createdAt === "number"
            )
            .map((message) => ({
              ...message,
              authorId:
                typeof message.authorId === "string"
                  ? message.authorId
                  : safeMembers.find((member) => member.displayName === message.author || member.email.split("@")[0] === message.author)?.id ?? fallback.currentUserId,
              mentionMemberIds: Array.isArray(message.mentionMemberIds)
                ? message.mentionMemberIds.filter((memberId) => safeMembers.some((member) => member.id === memberId)).slice(0, 8)
                : []
            }))
            .slice(-500)
        : [],
      aiNotes: Array.isArray(parsed.aiNotes) ? parsed.aiNotes.filter((note): note is string => typeof note === "string").slice(-40) : [],
      auditLog: Array.isArray(parsed.auditLog)
        ? parsed.auditLog
            .filter(
              (event): event is EnterpriseChatAuditEvent =>
                typeof event?.id === "string" &&
                typeof event.actorId === "string" &&
                typeof event.action === "string" &&
                typeof event.createdAt === "number"
            )
            .slice(0, 80)
        : fallback.auditLog,
      actionSuggestions: Array.isArray(parsed.actionSuggestions)
        ? parsed.actionSuggestions
            .filter(
              (suggestion): suggestion is EnterpriseChatState["actionSuggestions"][number] =>
                typeof suggestion?.id === "string" &&
                typeof suggestion.title === "string" &&
                typeof suggestion.summary === "string" &&
                ["productivity", "design", "coding", "automation"].includes(suggestion.route) &&
                typeof suggestion.confidence === "number"
            )
            .map((suggestion) => ({
              ...suggestion,
              sourceMessageId: typeof suggestion.sourceMessageId === "string" ? suggestion.sourceMessageId : null,
              assigneeId: typeof suggestion.assigneeId === "string" ? suggestion.assigneeId : null,
              acceptedAt: typeof suggestion.acceptedAt === "number" ? suggestion.acceptedAt : null
            }))
            .slice(-80)
        : []
    };
  } catch {
    return createDefaultChatState();
  }
}

function saveEnterpriseChatState(state: EnterpriseChatState): void {
  try {
    window.localStorage.setItem(CHAT_WORKSPACE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Enterprise chat can continue in-memory if local persistence fails.
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

function getSlidePreviewVariant(slide: SlideArtifactSlide, index: number, total: number): SlidePreviewVariant {
  const text = `${slide.title} ${slide.bullets.join(" ")} ${slide.speakerNotes ?? ""}`;
  if (index === 0) {
    return "cover";
  }

  if (index === total - 1) {
    return "closing";
  }

  if (/"[^"]{12,}"/u.test(text) || /\baccording to\b/iu.test(text)) {
    return "quote";
  }

  if (slide.bullets.length >= 6 || /\b(vs\.?|versus|compared to|before\b.*\bafter|current\b.*\bproposed)\b/iu.test(text)) {
    return "two-column";
  }

  return "bullets";
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

function createCodingNoProjectReply(): string {
  return "Open a local project first. I cannot inspect files, propose edits, run commands, or show a real diff until a folder is selected.";
}

function formatCodingAgentRunMessage(plan: CodingAgentPlan, run: CodingAgentRun, modelAnswer?: string): string {
  const pendingStep = plan.steps.find((step) => step.state === "pending" || step.state === "running" || step.state === "blocked");
  const touchedFiles = plan.schema.touchedFiles.length > 0 ? plan.schema.touchedFiles.slice(0, 5).join(", ") : "Autopilot will inspect files first.";
  const verification = plan.schema.testPlan.length > 0 ? plan.schema.testPlan.slice(0, 3).join(", ") : "No verification command detected yet.";
  const changedFiles = run.changedFiles.length > 0 ? run.changedFiles.slice(0, 5).map((file) => file.path).join(", ") : "No git changes yet.";
  const memory = plan.projectMemory?.present ? `\nProject memory: ${plan.projectMemory.relativePath} - ${plan.projectMemory.summary}` : "";
  const progress =
    run.progress && run.progress.length > 0
      ? `\nProgress:\n${run.progress.slice(0, 5).map((event) => `- ${event.phase}: ${event.message}`).join("\n")}`
      : "";
  const aiPart = modelAnswer?.trim() ? `\n\nImplementation notes:\n${modelAnswer.trim()}` : "";

  return `I read the project context and prepared a reviewable coding run.

What I understood:
${plan.goal}

What I will touch:
${touchedFiles}

How I will prove it:
${verification}

Review status:
${changedFiles}

Next step:
${pendingStep?.title ?? "review the plan"}.${memory}${progress}

I will only call work done when there is a real changed-file diff in the Review panel. Commands, commits, pushes, deletes, publishing, and external actions stay approval-gated.${aiPart}`;
}

function formatCodingAiUnavailableReply(reason: string | undefined, plan: CodingAgentPlan, run: CodingAgentRun): string {
  return `AI unavailable: ${reason ?? "The secure AI backend is not ready."}

I still created a local repo-aware plan from the project structure, scripts, and git state. This is not a model-backed edit. Review the schema below, open files, and run approved commands from the Coding workspace.

${formatCodingAgentRunMessage(plan, run)}`;
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

  if (kind === "board") {
    return ListChecks;
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

type MoneyMovementSetupCard = {
  id: string;
  title: string;
  description: string;
  meta: string;
  status: "complete" | "current" | "locked" | "next";
  Icon: LucideIcon;
};

function getMoneyMovementSetupCards(settings: MoneyMovementSettings | null, accountStatus: AccountStatus | null): MoneyMovementSetupCard[] {
  const signedIn = accountStatus?.signedIn === true;
  const verificationPending = settings?.status === "verification_pending" && settings.emailVerifiedForPayments !== true;
  const emailVerified = settings?.emailVerifiedForPayments === true;
  const stripeConnected = settings?.stripeConnection.status === "connected" && Boolean(settings.stripeConnection.connectedAccountId);
  const testReady = emailVerified && stripeConnected;
  const liveReady = settings?.liveModeEnabled === true && settings.stripeConnection.chargesEnabled === true;

  return [
    {
      id: "account",
      title: "Signed-in account",
      description: signedIn ? accountStatus?.userEmail ?? "Autopilot account ready" : "Sign in before enabling money movement.",
      meta: signedIn ? "Ready" : "Required",
      status: signedIn ? "complete" : "current",
      Icon: UserPlus
    },
    {
      id: "email",
      title: "Email verification",
      description: emailVerified
        ? `Verified for ${settings?.verifiedEmail ?? settings?.accountEmail ?? "this account"}`
        : verificationPending
          ? "A payment verification email is waiting for your code."
          : "Click Enable money movement to send a payment-specific verification email.",
      meta: emailVerified ? "Verified" : verificationPending ? "Check email" : "Send code",
      status: emailVerified ? "complete" : signedIn ? "current" : "locked",
      Icon: Mail
    },
    {
      id: "provider",
      title: "Connect provider",
      description: stripeConnected ? settings?.stripeConnection.connectedAccountId ?? "Stripe connected" : "Connect your own Stripe account before any payment can be prepared.",
      meta: stripeConnected ? "Connected" : "Stripe required",
      status: stripeConnected ? "complete" : emailVerified ? "current" : "locked",
      Icon: KeyRound
    },
    {
      id: "test",
      title: "Run test payment",
      description: testReady ? "Test-mode approval can create a provider-confirmed receipt." : "Test payments unlock after email verification and provider connection.",
      meta: testReady ? "Test ready" : "Locked",
      status: testReady ? "current" : "locked",
      Icon: ShieldCheck
    },
    {
      id: "live",
      title: "Live payments",
      description: liveReady ? "Live mode is server-enabled. Every payment still needs approval." : "Live payments stay locked until server safety checks and release approval pass.",
      meta: liveReady ? "Live ready" : "Server locked",
      status: liveReady ? "complete" : "locked",
      Icon: LockKeyhole
    }
  ];
}

export function App(): JSX.Element {
  const autopilot = useMemo(() => getAutopilotApi(), []);
  const [theme, setTheme] = useState<BrowserTheme>(() => loadTheme());
  const [accountStatus, setAccountStatus] = useState<AccountStatus | null>(null);
  const [accountEmailInput, setAccountEmailInput] = useState("");
  const [accountPasswordInput, setAccountPasswordInput] = useState("");
  const [accountActionStatus, setAccountActionStatus] = useState("");
  const [accountLinkOpenMode, setAccountLinkOpenModeState] = useState<AccountLinkOpenMode>(() => loadAccountLinkOpenMode());
  const [moneyMovementSettings, setMoneyMovementSettings] = useState<MoneyMovementSettings | null>(null);
  const [moneyMovementStatus, setMoneyMovementStatus] = useState("");
  const [moneyMovementCodeInput, setMoneyMovementCodeInput] = useState("");
  const [moneyMovementBusy, setMoneyMovementBusy] = useState(false);
  const [paymentReceipts, setPaymentReceipts] = useState<PaymentReceipt[]>([]);
  const [paymentReceiptStatusById, setPaymentReceiptStatusById] = useState<Record<string, string>>({});
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
  const [tryItNowEmail, setTryItNowEmail] = useState<EmailMessageSummary | null>(null);
  const [tryItNowArtifactId, setTryItNowArtifactId] = useState<string | null>(null);
  const [productivityShortcutHelpOpen, setProductivityShortcutHelpOpen] = useState(false);
  const [productivityCommandPaletteOpen, setProductivityCommandPaletteOpen] = useState(false);
  const [emailOrganizationMode, setEmailOrganizationMode] = useState<EmailOrganizationMode>(() => loadEmailOrganizationMode());
  const [inboxOrganizationConsent, setInboxOrganizationConsent] = useState<ProductivityInboxOrganizationConsent>(() => loadInboxOrganizationConsent());
  const [calendarLayoutPreference, setCalendarLayoutPreference] = useState<CalendarLayoutPreference>(() => loadCalendarLayoutPreference());
  const [blockedEmailSenders, setBlockedEmailSenders] = useState<string[]>(() =>
    loadStringArrayFromStorage(BLOCKED_EMAIL_SENDERS_STORAGE_KEY).map(normalizeEmailSenderAddress).filter(Boolean)
  );
  const [financeReviewStatus, setFinanceReviewStatus] = useState("");
  const [productivityShortcutHintSeen, setProductivityShortcutHintSeen] = useState(() => {
    try {
      return window.localStorage.getItem(PRODUCTIVITY_SHORTCUT_HINT_SEEN_STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [emailSyncStatus, setEmailSyncStatus] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [lastProductivitySourceResults, setLastProductivitySourceResults] = useState<ProductivitySourceSyncResult[]>([]);
  const [productivityTasks, setProductivityTasks] = useState<ProductivityTask[]>([]);
  const [productivityDrafts, setProductivityDrafts] = useState<ProductivityDraft[]>([]);
  const [productivityDraftsLoaded, setProductivityDraftsLoaded] = useState(false);
  const [selectedResponseDraftId, setSelectedResponseDraftId] = useState<string | null>(null);
  const [productivityDraftReaderOpen, setProductivityDraftReaderOpen] = useState(false);
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
  const [enterpriseChat, setEnterpriseChat] = useState<EnterpriseChatState>(() => loadEnterpriseChatState());
  const [chatMessageDraft, setChatMessageDraft] = useState("");
  const [chatChannelDraft, setChatChannelDraft] = useState("");
  const [chatJoinEmailDraft, setChatJoinEmailDraft] = useState("");
  const [chatJoinKeyDraft, setChatJoinKeyDraft] = useState("");
  const [chatOrganizationDraft, setChatOrganizationDraft] = useState(() => loadEnterpriseChatState().organizationName);
  const [chatStatus, setChatStatus] = useState("Chatting is ready.");
  const [activeCodingAssistantChatId, setActiveCodingAssistantChatId] = useState<string | null>(null);
  const [archivedCodingChatIds, setArchivedCodingChatIds] = useState<string[]>(() => loadStringArrayFromStorage(CODING_ARCHIVED_CHAT_IDS_STORAGE_KEY));
  const [codingProjectOrder, setCodingProjectOrder] = useState<string[]>(() => loadStringArrayFromStorage(CODING_PROJECT_ORDER_STORAGE_KEY));
  const [codingProjectSearch, setCodingProjectSearch] = useState("");
  const [confirmedRouteWorkItemIds, setConfirmedRouteWorkItemIds] = useState<string[]>(() => loadStringArrayFromStorage(CONFIRMED_ROUTE_WORK_ITEMS_STORAGE_KEY));
  const [draggingCodingProjectRoot, setDraggingCodingProjectRoot] = useState<string | null>(null);
  const [openCodingFolders, setOpenCodingFolders] = useState<Record<string, boolean>>({});
  const [collapsedCodingProjects, setCollapsedCodingProjects] = useState<Record<string, boolean>>({});
  const [collapsedCodingProjectSections, setCollapsedCodingProjectSections] = useState<Record<string, Partial<Record<CodingProjectSection, boolean>>>>({});
  const [codingSection, setCodingSection] = useState<CodingSection>("files");
  const [codingStatus, setCodingStatus] = useState("Open a folder or create a project to start editing local files.");
  const [codingBusy, setCodingBusy] = useState(false);
  const [codingRunStatus, setCodingRunStatus] = useState<CodingRunStatus>("idle");
  const [codingRunHeartbeat, setCodingRunHeartbeat] = useState<CodingRunHeartbeat | null>(null);
  const [codingRunTimeout, setCodingRunTimeout] = useState<CodingRunTimeoutState | null>(null);
  const [codingClarificationQuestion, setCodingClarificationQuestion] = useState<CodingClarificationQuestion | null>(null);
  const [lastCodingRunPrompt, setLastCodingRunPrompt] = useState("");
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
  const [codingAssistantPanelMode, setCodingAssistantPanelMode] = useState<CodingAssistantPanelMode>("normal");
  const [codingBrowserTestSessionActive, setCodingBrowserTestSessionActive] = useState(false);
  const [codingBrowserFeedbackDraft, setCodingBrowserFeedbackDraft] = useState("");
  const [codingClickSuggestMode, setCodingClickSuggestMode] = useState(false);
  const [codingToolMenuOpen, setCodingToolMenuOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantSources, setAssistantSources] = useState<AssistantContextSource[]>([]);
  const [assistantSelectedSources, setAssistantSelectedSources] = useState<AssistantContextSourceId[]>(["current-tab"]);
  const [assistantPrompt, setAssistantPrompt] = useState("");
  const [assistantResponse, setAssistantResponse] = useState<AssistantResponse | null>(null);
  const [assistantBusy, setAssistantBusy] = useState(false);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [activeArtifactId, setActiveArtifactId] = useState<string | null>(null);
  const [artifactQualityOverrideIds, setArtifactQualityOverrideIds] = useState<string[]>(() => loadStringArrayFromStorage(ARTIFACT_QUALITY_OVERRIDE_IDS_STORAGE_KEY));
  const [artifactPrompt, setArtifactPrompt] = useState("");
  const [artifactEditorDraft, setArtifactEditorDraft] = useState("");
  const [artifactStatus, setArtifactStatus] = useState("");
  const [artifactBusy, setArtifactBusy] = useState(false);
  const [allDesignProjectsOpen, setAllDesignProjectsOpen] = useState(false);
  const [designProjectFilter, setDesignProjectFilter] = useState("");
  const [designPromptSuggestions, setDesignPromptSuggestions] = useState<string[]>([]);
  const [designPromptStatus, setDesignPromptStatus] = useState("");
  const [designPromptBusy, setDesignPromptBusy] = useState(false);
  const [designToolSection, setDesignToolSection] = useState<DesignToolSection>("projects");
  const [designProjectTab, setDesignProjectTab] = useState<DesignProjectTab>("mine");
  const [designProjectRecords, setDesignProjectRecords] = useState<DesignProjectRecord[]>(() => loadDesignProjectRecords());
  const [activeDesignProjectRecordId, setActiveDesignProjectRecordId] = useState<string | null>(null);
  const [blankDesignProjectName, setBlankDesignProjectName] = useState("");
  const [selectedDesignStarterProjectId, setSelectedDesignStarterProjectId] = useState(DESIGN_STARTER_PROJECTS[0]?.id ?? "");
  const [designFileDraftId, setDesignFileDraftId] = useState<string | null>(null);
  const [designProjectDrawerOpen, setDesignProjectDrawerOpen] = useState(true);
  const [designSourcePanelOpen, setDesignSourcePanelOpen] = useState(false);
  const [designAiPanelOpen, setDesignAiPanelOpen] = useState(true);
  const [designCanvasWidth, setDesignCanvasWidth] = useState(1440);
  const [designCanvasZoom, setDesignCanvasZoom] = useState(75);
  const [designPreviewMode, setDesignPreviewMode] = useState(true);
  const [designGuidesVisible, setDesignGuidesVisible] = useState(false);
  const [designCanvasEditMode, setDesignCanvasEditMode] = useState(false);
  const [designPreviewVersionIndex, setDesignPreviewVersionIndex] = useState<number | null>(null);
  const [designRecoveryState, setDesignRecoveryState] = useState<DesignRecoveryState | null>(null);
  const [exportToCodingStatus, setExportToCodingStatus] = useState("");
  const [agentRuns, setAgentRuns] = useState<AgentRun[]>([]);
  const [actionPlans, setActionPlans] = useState<ActionPlan[]>([]);
  const [buildingWorkMessageIds, setBuildingWorkMessageIds] = useState<string[]>([]);
  const [backgroundWorkStatus, setBackgroundWorkStatus] = useState("");
  const [autoWorkAllEnabled, setAutoWorkAllEnabled] = useState(loadAutoWorkAllEnabled);
  const [proactiveWorkBusy, setProactiveWorkBusy] = useState(false);
  const [proactiveWorkStatus, setProactiveWorkStatus] = useState("");
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [workAssignments, setWorkAssignments] = useState<WorkAssignment[]>([]);
  const [selectedWorkItemId, setSelectedWorkItemId] = useState<string | null>(null);
  const [routingWorkItemIds, setRoutingWorkItemIds] = useState<Record<string, boolean>>({});
  const [workGraphSnapshot, setWorkGraphSnapshot] = useState<WorkGraphSnapshot | null>(null);
  const [selectedWorkGraphItemId, setSelectedWorkGraphItemId] = useState<string | null>(null);
  const [workGraphBusyIds, setWorkGraphBusyIds] = useState<Record<string, boolean>>({});
  const [workGraphStatus, setWorkGraphStatus] = useState("");
  const [workTwinProof, setWorkTwinProof] = useState<ProofModeReport | null>(null);
  const [runtimeTools, setRuntimeTools] = useState<ToolDescriptor[]>([]);
  const [runtimeConnectors, setRuntimeConnectors] = useState<ConnectorDescriptor[]>([]);
  const [agentRuntimeTrace, setAgentRuntimeTrace] = useState<AgentTrace | null>(null);
  const [agentRuntimeBusy, setAgentRuntimeBusy] = useState(false);
  const [agentRuntimeStatus, setAgentRuntimeStatus] = useState("");
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
  const [codingAgentRun, setCodingAgentRun] = useState<CodingAgentRun | null>(null);
  const [codingAiFilePatch, setCodingAiFilePatch] = useState<CodingAiFilePatch | null>(null);
  const [codingGitStatus, setCodingGitStatus] = useState<CodingGitStatusResult | null>(null);
  const [codingGitDiff, setCodingGitDiff] = useState<string | null>(null);
  const [selectedCodingGitDiffPath, setSelectedCodingGitDiffPath] = useState<string | null>(null);
  const [codingRepoLoading, setCodingRepoLoading] = useState(false);
  const [codingResearchDraft, setCodingResearchDraft] = useState("What is the latest in AI coding tools?");
  const webAreaRef = useRef<HTMLDivElement | null>(null);
  const sidebarWidthRef = useRef(sidebarWidth);
  const codingSidebarWidthRef = useRef(codingSidebarWidth);
  const globalRailWidthRef = useRef(globalRailWidth);
  const codingRunTokenRef = useRef(0);
  const codingRunInFlightRef = useRef(false);
  const codingRunWatchdogRef = useRef<number | null>(null);
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
  const productivityDraftReaderMode = view === "productivity" && productivityDraftReaderOpen;
  const activeChatChannel = enterpriseChat.channels.find((channel) => channel.id === enterpriseChat.activeChannelId) ?? enterpriseChat.channels[0] ?? null;
  const activeChatMessages = useMemo(
    () => enterpriseChat.messages.filter((message) => message.channelId === activeChatChannel?.id).sort((left, right) => left.createdAt - right.createdAt),
    [activeChatChannel?.id, enterpriseChat.messages]
  );
  const activeEnterpriseMembers = useMemo(
    () => enterpriseChat.members.filter((member) => member.status === "active"),
    [enterpriseChat.members]
  );
  const activeChatMembers = useMemo(
    () =>
      activeEnterpriseMembers.filter((member) =>
        activeChatChannel ? activeChatChannel.memberIds.includes(member.id) : member.id === enterpriseChat.currentUserId
      ),
    [activeChatChannel, activeEnterpriseMembers, enterpriseChat.currentUserId]
  );
  const currentEnterpriseMember =
    activeEnterpriseMembers.find((member) => member.id === enterpriseChat.currentUserId) ?? activeEnterpriseMembers[0] ?? null;
  const currentEnterpriseCanAdmin = currentEnterpriseMember?.role === "owner" || currentEnterpriseMember?.role === "admin";
  const activeChatLabel = activeChatChannel ? (activeChatChannel.kind === "dm" ? activeChatChannel.name : `#${activeChatChannel.name}`) : "channel";
  const pendingChatActionSuggestions = useMemo(
    () => enterpriseChat.actionSuggestions.filter((suggestion) => !suggestion.acceptedAt).sort((left, right) => right.confidence - left.confidence),
    [enterpriseChat.actionSuggestions]
  );
  const localChatWorkTwinItems = useMemo(
    () =>
      buildChatWorkTwinItems(
        pendingChatActionSuggestions.map((suggestion) => {
          const sourceMessage = suggestion.sourceMessageId
            ? enterpriseChat.messages.find((message) => message.id === suggestion.sourceMessageId)
            : null;
          const sourceChannel = sourceMessage
            ? enterpriseChat.channels.find((channel) => channel.id === sourceMessage.channelId)
            : activeChatChannel;
          const assignee = suggestion.assigneeId
            ? enterpriseChat.members.find((member) => member.id === suggestion.assigneeId)
            : null;
          return {
            id: suggestion.id,
            title: suggestion.title,
            summary: suggestion.summary,
            routeWorkspace: suggestion.route,
            confidence: suggestion.confidence,
            organizationName: enterpriseChat.organizationName,
            channelLabel: sourceChannel ? (sourceChannel.kind === "dm" ? sourceChannel.name : `#${sourceChannel.name}`) : "chat",
            sourceMessageId: suggestion.sourceMessageId,
            sourceMessageBody: sourceMessage?.body,
            authorLabel: sourceMessage?.author,
            assigneeLabel: assignee?.displayName,
            createdAt: sourceMessage?.createdAt ?? Date.now(),
            acceptedAt: suggestion.acceptedAt
          };
        })
      ),
    [activeChatChannel, enterpriseChat.channels, enterpriseChat.members, enterpriseChat.messages, enterpriseChat.organizationName, pendingChatActionSuggestions]
  );
  const remoteWorkGraphItems = workGraphSnapshot?.items ?? [];
  const workGraphItems = useMemo(() => {
    const localIds = new Set(localChatWorkTwinItems.map((item) => item.id));
    return [...localChatWorkTwinItems, ...remoteWorkGraphItems.filter((item) => !localIds.has(item.id))];
  }, [localChatWorkTwinItems, remoteWorkGraphItems]);
  const selectedWorkGraphItem = useMemo(
    () => workGraphItems.find((item) => item.id === selectedWorkGraphItemId) ?? workGraphItems[0] ?? null,
    [selectedWorkGraphItemId, workGraphItems]
  );
  const shadowModeRuns = workGraphSnapshot?.shadowRuns ?? [];
  const shadowModeRules = workGraphSnapshot?.rules ?? [];
  const workTwinCounts = useMemo(() => getWorkGraphCounts(workGraphItems, shadowModeRules), [shadowModeRules, workGraphItems]);
  const selectedRuntimeWorkspace = selectedWorkGraphItem?.route.workspace ?? null;
  const selectedRuntimeTools = useMemo(
    () =>
      selectedRuntimeWorkspace
        ? runtimeTools.filter((tool) => tool.workspace === selectedRuntimeWorkspace || (selectedRuntimeWorkspace === "design" && tool.name === "coding.proposeEdit"))
        : runtimeTools.slice(0, 8),
    [runtimeTools, selectedRuntimeWorkspace]
  );
  const activeRuntimeConnectors = useMemo(() => {
    const connectorIds = new Set(selectedRuntimeTools.map((tool) => tool.connector));
    return runtimeConnectors.filter((connector) => connectorIds.has(connector.id)).slice(0, 6);
  }, [runtimeConnectors, selectedRuntimeTools]);
  const runtimePermissionPolicy = useMemo(() => getPermissionPolicySummary(), []);
  const blockedRuntimeDecisions = agentRuntimeTrace?.permissionDecisions.filter((decision) => !decision.allowed) ?? [];
  const allowedRuntimeDecisionCount = agentRuntimeTrace?.permissionDecisions.filter((decision) => decision.allowed).length ?? 0;
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
  const codingAssistantUserName = useMemo(() => {
    const emailName = accountStatus?.userEmail?.split("@")[0]?.trim() ?? "";
    if (emailName.toLowerCase() === "preview") {
      return "Vikram";
    }
    const cleaned = emailName.replace(/[._-]+/gu, " ").replace(/\s+/gu, " ").trim();
    return cleaned ? titleCaseName(cleaned).split(/\s+/u)[0] : "there";
  }, [accountStatus?.userEmail]);
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
  const visibleCodingProjects = useMemo(() => {
    const query = codingProjectSearch.trim().toLowerCase();
    if (!query) {
      return orderedCodingProjects;
    }

    return orderedCodingProjects.filter((project) => {
      const projectChats = codingChatsByProject.get(project.rootPath) ?? [];
      return (
        project.name.toLowerCase().includes(query) ||
        project.rootPath.toLowerCase().includes(query) ||
        projectChats.some((chat) => chat.title.toLowerCase().includes(query))
      );
    });
  }, [codingChatsByProject, codingProjectSearch, orderedCodingProjects]);
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
  const codingAssistantDisplayChat = useMemo<CodingChatThread>(
    () =>
      activeCodingAssistantChat ?? {
        id: "coding-empty-assistant",
        projectRootPath: activeCodingProject?.rootPath ?? null,
        projectName: activeCodingProject?.name ?? "No project",
        title: "Casual greeting",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: []
      },
    [activeCodingAssistantChat, activeCodingProject?.name, activeCodingProject?.rootPath]
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
  const activeCodingProjectCodeNodes = useMemo(() => {
    const codeNodes: CodingTreeNode[] = [];
    collectCodingCodeNodes(codingSnapshot.tree?.children, codeNodes, 160);
    return codeNodes;
  }, [codingSnapshot.tree]);
  const activeProjectRecentCodeItems = useMemo<CodingRecentCodeItem[]>(() => {
    const seenPaths = new Set<string>();
    const items: CodingRecentCodeItem[] = [];

    for (const tab of activeProjectOpenTabs) {
      if (!tab.path) {
        continue;
      }
      const isChanged = isTextCodingTab(tab) && Boolean(codingDiffsByTabId.get(tab.id)?.changed);
      seenPaths.add(tab.path);
      items.push({
        id: `tab:${tab.id}`,
        title: tab.title,
        detail: isChanged ? `Open editor - modified - ${tab.file?.relativePath ?? tab.path}` : `Open editor - ${tab.file?.relativePath ?? tab.path}`,
        path: tab.path,
        kind: tab.kind === "folder" ? "folder" : "file",
        openedTabId: tab.id,
        modifiedAt: tab.savedAt ?? (tab.file && "modifiedAt" in tab.file ? tab.file.modifiedAt : undefined),
        dirty: isChanged || tab.dirty
      });
    }

    for (const node of [...activeCodingProjectCodeNodes].sort((left, right) => right.modifiedAt - left.modifiedAt)) {
      if (seenPaths.has(node.path)) {
        continue;
      }
      seenPaths.add(node.path);
      items.push({
        id: `node:${node.path}`,
        title: node.name,
        detail: `${node.relativePath} - changed ${formatCodingChatAge(node.modifiedAt)} ago`,
        path: node.path,
        kind: node.kind,
        modifiedAt: node.modifiedAt
      });
      if (items.length >= 10) {
        break;
      }
    }

    return items.slice(0, 10);
  }, [activeCodingProjectCodeNodes, activeProjectOpenTabs, codingDiffsByTabId]);
  const changedCodingFileTabs = useMemo(
    () => textCodingTabs.filter((tab) => codingDiffsByTabId.get(tab.id)?.changed),
    [codingDiffsByTabId, textCodingTabs]
  );
  const activeTextCodingTab = isTextCodingTab(activeCodingTab) ? activeCodingTab : null;
  const codingCursorEditorTabs = useMemo(
    () => {
      const activeProjectTextTabs = activeProjectOpenTabs.filter(isTextCodingTab);
      const fallbackTextTabs = textCodingTabs.filter((tab) => !activeCodingProject || tab.projectRootPath === activeCodingProject.rootPath);
      return (activeProjectTextTabs.length > 0 ? activeProjectTextTabs : fallbackTextTabs).slice(0, 5);
    },
    [activeCodingProject, activeProjectOpenTabs, textCodingTabs]
  );
  const codingCursorPrimaryEditorTab =
    codingCursorEditorTabs.find((tab) => tab.id === activeCodingTabId) ?? codingCursorEditorTabs[0] ?? null;
  const codingCursorEditorLines = useMemo(() => {
    const content =
      codingCursorPrimaryEditorTab
        ? getCodingTabContent(codingCursorPrimaryEditorTab)
        : [
            "// Open a project file to start editing with Autopilot.",
            "// The agent can inspect code, generate patches, run approved commands,",
            "// and show a diff before anything is accepted.",
            "",
            "export function startAutopilotCodingSession() {",
            "  return {",
            "    files: \"left explorer\",",
            "    editor: \"center workbench\",",
            "    assistant: \"right AI sidebar\"",
            "  };",
            "}"
          ].join("\n");
    return content.split(/\r?\n/u).slice(0, 120);
  }, [codingCursorPrimaryEditorTab]);
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
  const codingAgenticEditReadyCount =
    codingReviewChangedCount + (codingAiFilePatch?.status === "pending" ? 1 : 0);
  const codingProjectFileCount = activeCodingProjectCodeNodes.length;
  const codingBranchLabel = codingGitStatus?.success ? codingGitStatus.branch : "main";
  const codingLastCommandText = codingCommandResult?.command ?? "";
  const codingTestsLabel =
    codingCommandResult?.success && /test|check|build/u.test(codingLastCommandText)
      ? "Tests passing"
      : codingCommandResult && !codingCommandResult.success && /test|check|build/u.test(codingLastCommandText)
        ? "Tests need review"
        : codingBusy
          ? "Agent running"
          : "Ready";
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
  const codingProjectBoardColumns = useMemo<CodingProjectBoardColumn[]>(() => {
    const projectName = activeCodingProject?.name ?? "Autopilot";
    const fileCount = Math.max(codingProjectFileCount, activeProjectRecentCodeItems.length, activeProjectOpenTabs.length);
    const changeCount = codingGitChangedFiles.length + (codingAiFilePatch?.status === "pending" ? 1 : 0);
    const boardBranch = codingBranchLabel === "No git repo" ? "local workspace" : codingBranchLabel;
    const draftPrompt = activeCodingProject
      ? `Inspect ${projectName}, propose the next safest implementation task, and create a patch only after the plan is clear.`
      : "Open a local project, inspect the files, then propose the first safe coding task.";

    return [
      {
        id: "drafts",
        title: "Drafts",
        description: "Agent-proposed work that still needs a clean plan.",
        items: [
          {
            id: "draft-next-task",
            title: activeCodingProject ? `Plan next change in ${projectName}` : "Open a project first",
            detail: activeCodingProject
              ? `${fileCount} project file${fileCount === 1 ? "" : "s"} available. Turn the request into one reviewable coding task.`
              : "Choose a folder so Autopilot can inspect real files before creating work.",
            meta: activeCodingProject ? "Needs plan" : "Setup required",
            status: "draft",
            agent: "Agent: Code",
            branch: boardBranch,
            action: activeCodingProject ? "plan" : "openProject",
            actionLabel: activeCodingProject ? "Start" : "Open",
            prompt: draftPrompt
          }
        ]
      },
      {
        id: "active",
        title: "Active",
        description: "Work Autopilot is currently inspecting, editing, or testing.",
        items: [
          {
            id: "active-agent-run",
            title: codingAgentPlan?.goal ?? activeCodingAssistantChat?.title ?? "Coding assistant session",
            detail: codingAgentPlan
              ? codingAgentPlan.summary
              : activeCodingAssistantChat
                ? "Continue the current project chat with files, tests, and diffs attached."
                : "Start a focused agent chat for this project.",
            meta: codingBusy ? "Running" : "Ready for prompt",
            status: "active",
            agent: "Agent: Code",
            branch: boardBranch,
            action: codingAgentPlan ? "reviewDiff" : "newChat",
            actionLabel: codingAgentPlan ? "Review" : "Chat",
            prompt: "Continue this coding task, show progress, and keep changes behind review."
          }
        ]
      },
      {
        id: "ready",
        title: "Ready",
        description: "Diffs, tests, and reviews waiting for the user.",
        items: [
          {
            id: "ready-review",
            title: changeCount > 0 ? `${changeCount} change${changeCount === 1 ? "" : "s"} ready` : "No diff ready yet",
            detail:
              changeCount > 0
                ? "Review proposed edits before applying or approving them."
                : "Ask Autopilot for a change and the diff will appear here before anything final happens.",
            meta: changeCount > 0 ? "Needs review" : "Waiting",
            status: "ready",
            agent: "Agent: Review",
            branch: boardBranch,
            action: "reviewDiff",
            actionLabel: "Review"
          }
        ]
      },
      {
        id: "done",
        title: "Done",
        description: "Verified work with tests or an explicit completion signal.",
        items: [
          {
            id: "done-tests",
            title: codingTestsLabel === "Tests passing" ? "Tests passing" : "Run verification",
            detail:
              codingTestsLabel === "Tests passing"
                ? "The latest test/check command passed in this workspace."
                : "Run the project test command and keep the result attached to the task.",
            meta: codingTestsLabel,
            status: "done",
            agent: "Agent: QA",
            branch: boardBranch,
            action: "runTests",
            actionLabel: codingTestsLabel === "Tests passing" ? "Rerun" : "Test"
          }
        ]
      }
    ];
  }, [
    activeCodingAssistantChat,
    activeCodingProject,
    activeProjectOpenTabs.length,
    activeProjectRecentCodeItems.length,
    codingAgentPlan,
    codingAiFilePatch,
    codingBranchLabel,
    codingBusy,
    codingGitChangedFiles.length,
    codingProjectFileCount,
    codingTestsLabel
  ]);
  const installingCodingPluginCount = useMemo(
    () => codingPluginStatuses.filter((status) => status.status === "installing").length,
    [codingPluginStatuses]
  );
  const installedCodingPluginCount = useMemo(
    () => codingPluginStatuses.filter((status) => status.status === "installed").length,
    [codingPluginStatuses]
  );
  const activeArtifact = useMemo(
    () => {
      if (blankDesignProjectName && activeArtifactId === null) {
        return null;
      }
      return activeArtifactId ? artifacts.find((artifact) => artifact.id === activeArtifactId) ?? artifacts[0] ?? null : artifacts[0] ?? null;
    },
    [activeArtifactId, artifacts, blankDesignProjectName]
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
  const activeDesignSourceContext = useMemo(
    () => (activeArtifact ? buildDesignSourceContext(activeArtifact) : null),
    [activeArtifact]
  );
  const activeGeneratedArtifactReview = useMemo(
    () => (activeArtifact ? buildGeneratedArtifactReview(activeArtifact) : null),
    [activeArtifact]
  );
  const activeArtifactQualityGateBlocked = Boolean(
    activeArtifact &&
      activeGeneratedArtifactReview &&
      !activeGeneratedArtifactReview.qualityReport.passed &&
      !artifactQualityOverrideIds.includes(activeArtifact.id)
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
  const designProjectRecordArtifactIds = useMemo(() => {
    const artifactIds = new Set<string>();
    for (const record of designProjectRecords) {
      for (const artifactId of record.artifactIds) {
        artifactIds.add(artifactId);
      }
    }
    return artifactIds;
  }, [designProjectRecords]);
  const activeDesignProjectRecord = useMemo(
    () => designProjectRecords.find((record) => record.id === activeDesignProjectRecordId) ?? null,
    [activeDesignProjectRecordId, designProjectRecords]
  );
  const userDesignProjects = useMemo(
    () => designProjects.filter((project) => !isAiDesignProject(project) && !designProjectRecordArtifactIds.has(project.artifactId)),
    [designProjectRecordArtifactIds, designProjects]
  );
  const aiDesignProjects = useMemo(
    () => designProjects.filter((project) => isAiDesignProject(project) && !designProjectRecordArtifactIds.has(project.artifactId)),
    [designProjectRecordArtifactIds, designProjects]
  );
  const userDesignProjectRecords = useMemo(
    () => designProjectRecords.filter((record) => record.origin === "user"),
    [designProjectRecords]
  );
  const aiDesignProjectRecords = useMemo(
    () => designProjectRecords.filter((record) => record.origin === "ai"),
    [designProjectRecords]
  );
  const filteredVisibleDesignProjectRecords = useMemo(() => {
    const query = designProjectFilter.trim().toLowerCase();
    const records = userDesignProjectRecords.filter((record) =>
      query
        ? [record.title, record.summary, record.sourceLabel, record.artifactKindHint, record.status].join(" ").toLowerCase().includes(query)
        : true
    );
    return records.slice(0, 10);
  }, [designProjectFilter, userDesignProjectRecords]);
  const filteredVisibleDesignProjects = useMemo(() => {
    const query = designProjectFilter.trim().toLowerCase();
    const seenArtifactIds = new Set<string>();
    const projects = userDesignProjects
      .filter((project) => project.visibility !== "archived")
      .filter((project) => {
        if (seenArtifactIds.has(project.artifactId)) {
          return false;
        }
        seenArtifactIds.add(project.artifactId);
        return true;
      });
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
  }, [designProjectFilter, userDesignProjects]);
  const filteredDesignStarterProjects = useMemo(() => {
    const query = designProjectFilter.trim().toLowerCase();
    if (!query) {
      return DESIGN_STARTER_PROJECTS;
    }

    return DESIGN_STARTER_PROJECTS.filter((project) =>
      [project.title, project.summary, getArtifactKindLabel(project.kind)]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [designProjectFilter]);
  const moreDesignProjects = useMemo(
    () => aiDesignProjects,
    [aiDesignProjects]
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
  const aiWorkingDesignProjectRecords = useMemo(() => {
    const query = designProjectFilter.trim().toLowerCase();
    return aiDesignProjectRecords.filter((record) =>
      query
        ? [record.title, record.summary, record.sourceLabel, record.artifactKindHint, record.status].join(" ").toLowerCase().includes(query)
        : true
    );
  }, [aiDesignProjectRecords, designProjectFilter]);
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
  const responseDrafts = useMemo(() => productivityDrafts.filter(isResponseDraft), [productivityDrafts]);
  const selectedResponseDraft = useMemo(
    () => responseDrafts.find((draft) => draft.id === selectedResponseDraftId) ?? responseDrafts[0] ?? null,
    [responseDrafts, selectedResponseDraftId]
  );
  const selectedDesignFileDraft = useMemo(
    () => (designFileDraftId ? productivityDrafts.find((draft) => draft.id === designFileDraftId) ?? null : null),
    [designFileDraftId, productivityDrafts]
  );
  const activeDesignSourceEmail = useMemo(() => {
    const messageId = activeArtifact?.source.messageId;
    if (!messageId) {
      return null;
    }

    return emailMessages.find((message) => message.id === messageId) ?? null;
  }, [activeArtifact?.source.messageId, emailMessages]);
  const activeDesignDraft = activeArtifact?.source.messageId ? draftByMessageId.get(activeArtifact.source.messageId) ?? null : null;
  const designGeneratedFiles = useMemo(() => {
    const draftFiles: DesignGeneratedFile[] = productivityDrafts.map((draft) => ({
      id: `draft:${draft.id}`,
      section: "drafts",
      origin: "ai",
      title: draft.title,
      summary: draft.preview || draft.body.slice(0, 220) || "Saved email draft.",
      meta: `${getProductivityDraftKindLabel(draft.artifactKind)} draft`,
      sourceLabel: draft.source.from || draft.source.label || "Productivity",
      status: draft.status === "needs_review" ? "Needs review" : draft.status === "approved" ? "Approved" : "Draft",
      updatedAt: draft.updatedAt,
      artifactId: draft.artifactId,
      draftId: draft.id,
      kind: draft.artifactKind === "reply" ? undefined : draft.artifactKind,
      sourceUrl: draft.source.url
    }));
    const artifactFiles: DesignGeneratedFile[] = artifacts.map((artifact) => {
      const plan = actionPlanByArtifactId.get(artifact.id);
      const section: DesignFileSectionId =
        artifact.kind === "document" ? "documents" : artifact.kind === "slide_deck" ? "slides" : "artifacts";
      return {
        id: `artifact:${artifact.id}`,
        section,
        origin: artifact.visibility === "user_project" && !plan ? "user" : "ai",
        title: artifact.title,
        summary: artifact.summary || getArtifactKindLabel(artifact.kind),
        meta: getArtifactKindLabel(artifact.kind),
        sourceLabel: artifact.source.from || artifact.source.label || "Manual prompt",
        status: artifact.exportedProjectPath
          ? "Exported"
          : plan?.finalApproval.required && !plan.finalApproval.approvedAt
            ? "Needs review"
            : artifact.visibility === "ai_generated"
              ? "AI built"
              : "Saved",
        updatedAt: artifact.updatedAt,
        artifactId: artifact.id,
        kind: artifact.kind,
        sourceUrl: artifact.source.url
      };
    });

    const seen = new Set<string>();
    return [...draftFiles, ...artifactFiles]
      .filter((file) => {
        const dedupeKey = file.draftId ? file.id : file.artifactId ? `artifact:${file.artifactId}` : file.id;
        if (seen.has(dedupeKey)) {
          return false;
        }
        seen.add(dedupeKey);
        return true;
      })
      .sort((left, right) => right.updatedAt - left.updatedAt);
  }, [actionPlanByArtifactId, artifacts, productivityDrafts]);
  const designFilesBySection = useMemo<Record<DesignFileSectionId, DesignGeneratedFile[]>>(
    () => ({
      drafts: designGeneratedFiles.filter((file) => file.section === "drafts"),
      documents: designGeneratedFiles.filter((file) => file.section === "documents"),
      slides: designGeneratedFiles.filter((file) => file.section === "slides"),
      artifacts: designGeneratedFiles.filter((file) => file.section === "artifacts"),
      other: designGeneratedFiles.filter((file) => file.section === "other")
    }),
    [designGeneratedFiles]
  );
  const designGeneratedFileCount = designGeneratedFiles.length;
  const activeDesignProjectArtifacts = useMemo(
    () => {
      if (activeDesignProjectRecord) {
        const artifactIds = new Set(activeDesignProjectRecord.artifactIds);
        const draftIds = new Set(activeDesignProjectRecord.draftIds);
        return designGeneratedFiles
          .filter((file) => (file.artifactId ? artifactIds.has(file.artifactId) : false) || (file.draftId ? draftIds.has(file.draftId) : false))
          .slice(0, 12);
      }

      if (!activeArtifact) {
        return [];
      }

      const activeSourceLabel = activeArtifact.source.from || activeArtifact.source.label;
      return designGeneratedFiles
        .filter((file) => file.artifactId === activeArtifact.id || file.sourceLabel === activeSourceLabel)
        .slice(0, 8);
    },
    [activeArtifact, activeDesignProjectRecord, designGeneratedFiles]
  );
  const normalizedBlockedEmailSenders = useMemo(() => blockedEmailSenders.map(normalizeEmailSenderAddress).filter(Boolean), [blockedEmailSenders]);
  const emailSenderOptions = useMemo(() => listEmailSenders(emailMessages), [emailMessages]);
  const visibleEmailMessages = useMemo(
    () => filterBlockedEmailMessages(emailMessages, normalizedBlockedEmailSenders),
    [emailMessages, normalizedBlockedEmailSenders]
  );
  const blockedEmailMessageCount = emailMessages.length - visibleEmailMessages.length;
  const financeInvoiceCandidates = useMemo(
    () =>
      [
        ...visibleEmailMessages.map(getFinanceInvoiceCandidateFromEmail),
        getFinanceInvoiceCandidateFromBrowserTab(activeTab)
      ]
        .filter((candidate): candidate is FinanceInvoiceCandidate => Boolean(candidate))
        .slice(0, 8),
    [activeTab, visibleEmailMessages]
  );
  const financeReady = Boolean(moneyMovementSettings?.moneyMovementEnabled && moneyMovementSettings.emailVerifiedForPayments);
  const financeProviderReady = Boolean(
    financeReady && moneyMovementSettings?.stripeConnection.status === "connected" && moneyMovementSettings.stripeConnection.connectedAccountId
  );
  const financeLockedReason = !accountStatus?.signedIn
    ? "Sign into Autopilot before enabling financial tools."
    : !financeReady
      ? "Enable money management and verify your email in Settings."
      : !financeProviderReady
        ? "Connect your own Stripe account before payment proposals can be prepared."
        : "";
  const selectedInboxEmail = useMemo(
    () => visibleEmailMessages.find((message) => message.id === selectedInboxEmailId) ?? tryItNowEmail ?? visibleEmailMessages[0] ?? null,
    [selectedInboxEmailId, tryItNowEmail, visibleEmailMessages]
  );
  const selectedInboxDraft = selectedInboxEmail ? draftByMessageId.get(selectedInboxEmail.id) ?? null : null;
  const selectedInboxArtifact = useMemo(() => {
    if (selectedInboxDraft?.artifactId) {
      return artifacts.find((artifact) => artifact.id === selectedInboxDraft.artifactId) ?? null;
    }
    if (tryItNowArtifactId) {
      return artifacts.find((artifact) => artifact.id === tryItNowArtifactId) ?? null;
    }
    return null;
  }, [artifacts, selectedInboxDraft?.artifactId, tryItNowArtifactId]);
  const selectedInboxArtifactVersion = selectedInboxArtifact ? getActiveArtifactVersion(selectedInboxArtifact) : null;
  const selectedInboxActionPlan = useMemo(
    () => (selectedInboxArtifact ? actionPlans.find((plan) => plan.artifactId === selectedInboxArtifact.id) ?? null : null),
    [actionPlans, selectedInboxArtifact]
  );
  const selectedInboxArtifactReview = useMemo(
    () => (selectedInboxArtifact ? buildGeneratedArtifactReview(selectedInboxArtifact) : null),
    [selectedInboxArtifact]
  );
  const selectedInboxAgentRun = useMemo(
    () => (selectedInboxActionPlan ? agentRuns.find((run) => run.planId === selectedInboxActionPlan.id) ?? null : null),
    [agentRuns, selectedInboxActionPlan]
  );
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
  const codingRoutedWorkItems = useMemo(
    () =>
      openWorkItems
        .filter(
          (item) =>
            item.assignedRoles.includes("coding") ||
            item.source.recommendedAssistant === "coding" ||
            item.requestedOutput.toLowerCase().includes("code")
        )
        .slice(0, 6),
    [openWorkItems]
  );
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
  const workItemByTaskId = useMemo(() => new Map(routableWorkItems.map((item) => [item.taskId, item])), [routableWorkItems]);
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
  const needsUserActionQueueItems = useMemo(
    () => visibleOpenActionItems.filter((item) => getActionItemHandler(item) === "user"),
    [visibleOpenActionItems]
  );
  const aiWorkingActionQueueItems = useMemo(
    () =>
      visibleOpenActionItems.filter((item) => {
        const workItem = workItemByTaskId.get(item.id);
        return getActionItemHandler(item) === "ai" && Boolean(workItem && (workItem.state === "working" || /working|output ready|ai working/iu.test(getWorkItemStatusLabel(workItem))));
      }),
    [visibleOpenActionItems, workItemByTaskId]
  );
  const waitingActionQueueItems = useMemo(
    () =>
      visibleOpenActionItems.filter((item) => {
        const workItem = workItemByTaskId.get(item.id);
        return getActionItemHandler(item) === "ai" && !aiWorkingActionQueueItems.some((workingItem) => workingItem.id === item.id) && (isWaitingActionItem(item) || workItem?.state === "waiting_for_user" || !workItem);
      }),
    [aiWorkingActionQueueItems, visibleOpenActionItems, workItemByTaskId]
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
  const calendarMaxLaneCount = useMemo(() => Math.max(1, ...calendarWeekEvents.map((event) => event.laneCount)), [calendarWeekEvents]);
  const calendarBoardMinWidth = useMemo(() => {
    const laneReadableWidth = 108;
    const baseDayWidth = 150;
    const readableDayWidth = Math.max(baseDayWidth, Math.min(calendarMaxLaneCount, 6) * laneReadableWidth);
    return 66 + readableDayWidth * 7;
  }, [calendarMaxLaneCount]);
  const calendarOverlapGroups = useMemo(() => {
    const groups = new Map<
      string,
      {
        id: string;
        dayIndex: number;
        startAt: number;
        dayLabel: string;
        timeLabel: string;
        events: CalendarWeekEvent[];
      }
    >();

    for (const event of calendarWeekEvents) {
      if (event.laneCount < 2 || event.allDay) {
        continue;
      }
      const day = calendarWeekDays[event.dayIndex] ?? new Date(event.startAt);
      const key = `${event.dayIndex}:${event.startAt}:${event.endAt}`;
      const existing = groups.get(key);
      if (existing) {
        existing.events.push(event);
        continue;
      }
      groups.set(key, {
        id: key,
        dayIndex: event.dayIndex,
        startAt: event.startAt,
        dayLabel: new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(day),
        timeLabel: event.timeLabel,
        events: [event]
      });
    }

    return Array.from(groups.values())
      .filter((group) => group.events.length > 1)
      .map((group) => ({
        ...group,
        events: group.events.sort((leftEvent, rightEvent) => leftEvent.title.localeCompare(rightEvent.title))
      }))
      .sort((leftGroup, rightGroup) => leftGroup.startAt - rightGroup.startAt || leftGroup.dayIndex - rightGroup.dayIndex);
  }, [calendarWeekDays, calendarWeekEvents]);
  const calendarOverlapEventIds = useMemo(
    () => new Set(calendarOverlapGroups.flatMap((group) => group.events.map((event) => event.id))),
    [calendarOverlapGroups]
  );
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
    if (visibleEmailMessages.length === 0) {
      setSelectedInboxEmailId(null);
      return;
    }

    if (!selectedInboxEmailId || !visibleEmailMessages.some((message) => message.id === selectedInboxEmailId)) {
      setSelectedInboxEmailId(visibleEmailMessages[0]?.id ?? null);
    }
  }, [selectedInboxEmailId, visibleEmailMessages]);

  useEffect(() => {
    if (view !== "productivity") {
      return;
    }

    function handleProductivityShortcuts(event: globalThis.KeyboardEvent): void {
      if (event.defaultPrevented || event.altKey || isEditableKeyboardTarget(event.target)) {
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setProductivityCommandPaletteOpen((isOpen) => !isOpen);
        return;
      }

      if (event.ctrlKey || event.metaKey) {
        return;
      }

      if (event.key === "?") {
        event.preventDefault();
        setProductivityShortcutHelpOpen((isOpen) => !isOpen);
        return;
      }

      if (visibleEmailMessages.length === 0) {
        return;
      }

      const selectedIndex = Math.max(
        0,
        visibleEmailMessages.findIndex((message) => message.id === selectedInboxEmailId)
      );
      const selectedMessage = visibleEmailMessages[selectedIndex] ?? visibleEmailMessages[0];
      if (!selectedMessage) {
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        toggleInboxEmail(selectedMessage.id);
        return;
      }

      if (event.key.toLowerCase() === "j") {
        event.preventDefault();
        setSelectedInboxEmailId(visibleEmailMessages[Math.min(visibleEmailMessages.length - 1, selectedIndex + 1)]?.id ?? selectedMessage.id);
        return;
      }

      if (event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSelectedInboxEmailId(visibleEmailMessages[Math.max(0, selectedIndex - 1)]?.id ?? selectedMessage.id);
        return;
      }

      if (event.key.toLowerCase() === "e") {
        event.preventDefault();
        void applyInboxOrganizationCommand(selectedMessage, "archive");
        return;
      }

      if (event.key.toLowerCase() === "u") {
        event.preventDefault();
        void applyInboxOrganizationCommand(selectedMessage, selectedMessage.unread ? "mark_read" : "mark_unread");
        return;
      }

      if (event.key.toLowerCase() === "s") {
        event.preventDefault();
        void applyInboxOrganizationCommand(selectedMessage, "star");
        return;
      }

      if (event.key.toLowerCase() === "l") {
        event.preventDefault();
        void applyInboxOrganizationCommand(selectedMessage, "label");
        return;
      }

      if (event.key.toLowerCase() === "h") {
        event.preventDefault();
        void applyInboxOrganizationCommand(selectedMessage, "snooze");
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
        return;
      }

      if (event.key === "/") {
        event.preventDefault();
        setProductivityCommandPaletteOpen(true);
      }
    }

    window.addEventListener("keydown", handleProductivityShortcuts);
    return () => window.removeEventListener("keydown", handleProductivityShortcuts);
  }, [autopilot, draftByMessageId, selectedInboxEmailId, view, visibleEmailMessages]);
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
  const homeNeedsApprovalItems = useMemo(
    () => workGraphItems.filter((item) => item.approval.state === "needs_approval" || item.run.state === "needs_approval").slice(0, 5),
    [workGraphItems]
  );
  const homeAiWorkingItems = useMemo(
    () => workGraphItems.filter((item) => item.run.state === "ai_working" || item.shadow.active).slice(0, 5),
    [workGraphItems]
  );
  const homeUserMustHandleItems = useMemo(
    () => workGraphItems.filter((item) => item.run.state === "user_must_handle" || item.run.state === "blocked").slice(0, 5),
    [workGraphItems]
  );
  const homeAttentionLanes = useMemo<HomeAttentionLane[]>(
    () => [
      {
        id: "needs-approval",
        title: "Needs approval",
        detail: "External-impact work stays parked here until you approve it.",
        empty: "No approvals waiting.",
        items: homeNeedsApprovalItems
      },
      {
        id: "ai-working",
        title: "AI working",
        detail: "Safe background runs and active Work Twin jobs.",
        empty: "No AI run is active right now.",
        items: homeAiWorkingItems
      },
      {
        id: "user-must-handle",
        title: "You must handle",
        detail: "Judgment calls, blocked sources, or missing permissions.",
        empty: "Nothing is blocked on you.",
        items: homeUserMustHandleItems
      }
    ],
    [homeAiWorkingItems, homeNeedsApprovalItems, homeUserMustHandleItems]
  );
  const homePrimaryReviewItem =
    homeNeedsApprovalItems[0] ?? workGraphItems.find((item) => item.run.state === "ready_to_start" || item.shadow.eligible) ?? selectedWorkGraphItem;
  const homePaymentItems = useMemo<HomePaymentItem[]>(() => {
    const paymentRecipeIds = new Set(automationRecipes.filter((recipe) => recipe.outputKind === "payment_proposal").map((recipe) => recipe.id));
    const receiptItems = [...paymentReceipts]
      .sort((left, right) => right.createdAt - left.createdAt)
      .slice(0, 4)
      .map((receipt): HomePaymentItem => ({
        id: `receipt:${receipt.id}`,
        title: `${receipt.payeeName} paid`,
        detail: `${formatPaymentReceiptAmount(receipt)} ${receipt.currency.toUpperCase()} via ${formatReceiptPaymentMethod(receipt)}. Provider id ${receipt.providerConfirmationId ?? receipt.providerPaymentId}.`,
        status: paymentReceiptStatusById[receipt.id]?.startsWith("Provider confirmation") ? "verified" : "completed",
        actionLabel: "Verify receipt",
        action: "verify_receipt",
        receiptId: receipt.id,
        amountLabel: formatPaymentReceiptAmount(receipt),
        createdAt: receipt.createdAt
      }));
    const recurringRunItems = sortedAutomationRuns
      .filter((run) => paymentRecipeIds.has(run.recipeId))
      .slice(0, 3)
      .map((run): HomePaymentItem => ({
        id: `payment-automation-run:${run.id}`,
        title: run.outputTitle ?? run.recipeName,
        detail: run.outputSummary ?? "Recurring payment proposal is ready for Finance review before any money can move.",
        status: "needs-review",
        actionLabel: "Open automation",
        action: "open_automation",
        automationRunId: run.id,
        automationRecipeId: run.recipeId,
        createdAt: run.completedAt ?? run.startedAt
      }));
    const recurringRecipeItems = automationRecipes
      .filter((recipe) => recipe.outputKind === "payment_proposal" && !sortedAutomationRuns.some((run) => run.recipeId === recipe.id))
      .slice(0, 3)
      .map((recipe): HomePaymentItem => ({
        id: `payment-automation-recipe:${recipe.id}`,
        title: recipe.name,
        detail: `${recipe.schedule === "manual" ? "Manual" : recipe.schedule} recurring payment proposal. Every payment still requires invoice verification and approval.`,
        status: "scheduled",
        actionLabel: "Open automation",
        action: "open_automation",
        automationRecipeId: recipe.id,
        createdAt: recipe.updatedAt
      }));
    const invoiceItems = financeInvoiceCandidates.slice(0, 2).map((candidate): HomePaymentItem => ({
      id: `invoice:${candidate.id}`,
      title: candidate.title,
      detail: `${candidate.amountLabel} from ${candidate.sender}. Verify invoice and vendor before creating any payment proposal.`,
      status: "needs-review",
      actionLabel: financeReady ? "Review invoice" : "Enable finance",
      action: "open_finances",
      amountLabel: candidate.amountLabel,
      createdAt: Date.now()
    }));

    return [...receiptItems, ...recurringRunItems, ...recurringRecipeItems, ...invoiceItems].slice(0, 8);
  }, [automationRecipes, financeInvoiceCandidates, financeReady, paymentReceiptStatusById, paymentReceipts, sortedAutomationRuns]);
  const homeLatestActivity = useMemo<HomeActivityItem[]>(() => {
    const items: HomeActivityItem[] = [];
    const latestEmail = [...visibleEmailMessages].sort((left, right) => right.receivedAt - left.receivedAt)[0];
    const latestDraft = [...productivityDrafts].sort((left, right) => right.updatedAt - left.updatedAt)[0];
    const latestCodingChat = [...visibleCodingChats].sort((left, right) => right.updatedAt - left.updatedAt)[0];
    const latestAutomationRun = sortedAutomationRuns[0];
    const topInvoice = financeInvoiceCandidates[0];

    if (pendingChatActionSuggestions[0]) {
      items.push({
        id: `chat:${pendingChatActionSuggestions[0].id}`,
        title: pendingChatActionSuggestions[0].title,
        detail: `${pendingChatActionSuggestions[0].route} suggestion at ${pendingChatActionSuggestions[0].confidence}% confidence`,
        workspace: "chatting",
        actionLabel: "Open chat",
        icon: MessageCircle
      });
    }
    if (latestDraft) {
      items.push({
        id: `draft:${latestDraft.id}`,
        title: latestDraft.title,
        detail: `${latestDraft.artifactKind.replace(/_/gu, " ")} draft updated ${formatSaveTime(latestDraft.updatedAt)}`,
        workspace: "design",
        actionLabel: "Open design",
        icon: FileText
      });
    }
    if (activeArtifact) {
      items.push({
        id: `artifact:${activeArtifact.id}`,
        title: activeArtifact.title,
        detail: activeGeneratedArtifactReview
          ? `Quality ${activeGeneratedArtifactReview.qualityReport.score}/100, ${activeArtifact.versions.length} version${activeArtifact.versions.length === 1 ? "" : "s"}`
          : "Artifact is ready for editing or generation.",
        workspace: "design",
        actionLabel: "Open artifact",
        icon: Palette
      });
    }
    if (latestCodingChat) {
      items.push({
        id: `coding:${latestCodingChat.id}`,
        title: latestCodingChat.title,
        detail: `${latestCodingChat.projectName} updated ${formatSaveTime(latestCodingChat.updatedAt)}`,
        workspace: "coding",
        actionLabel: "Open coding",
        icon: Code2
      });
    }
    if (latestAutomationRun) {
      items.push({
        id: `automation:${latestAutomationRun.id}`,
        title: latestAutomationRun.recipeName,
        detail: `${latestAutomationRun.state.replace(/_/gu, " ")} - ${getAutomationRunDetailText(latestAutomationRun)}`,
        workspace: "coding",
        actionLabel: "Open runs",
        icon: Clock
      });
    }
    if (topInvoice) {
      items.push({
        id: topInvoice.id,
        title: topInvoice.title,
        detail: `${topInvoice.amountLabel} from ${topInvoice.sender}. Verification required before any payment proposal.`,
        workspace: "productivity",
        actionLabel: financeReady ? "Review invoice" : "Enable finance",
        icon: CreditCard
      });
    }
    if (latestEmail) {
      items.push({
        id: `email:${latestEmail.id}`,
        title: latestEmail.subject || "Latest email",
        detail: `${getInboxSenderLabel(latestEmail)} - ${formatInboxReceivedAt(latestEmail.receivedAt)}`,
        workspace: "productivity",
        actionLabel: "Open inbox",
        icon: Mail
      });
    }

    return items.slice(0, 6);
  }, [
    activeArtifact,
    activeGeneratedArtifactReview,
    financeInvoiceCandidates,
    financeReady,
    pendingChatActionSuggestions,
    productivityDrafts,
    sortedAutomationRuns,
    visibleEmailMessages,
    visibleCodingChats
  ]);
  const homeSourceHealth = useMemo<HomeSourceHealthItem[]>(() => {
    const gmailResult = lastProductivitySourceResults.find((source) => source.id === "gmail");
    const calendarResult = lastProductivitySourceResults.find((source) => source.id === "google-calendar");
    const gmailReady = Boolean(emailStatus?.connected || gmailResult?.success || hasGmailData);
    const calendarReady = Boolean((emailStatus?.connected && emailStatus.capabilities?.calendar) || calendarResult?.success || hasCalendarData || localCalendarEvents.length > 0);
    const aiReady = Boolean(accountStatus?.signedIn && accountStatus.backend.aiProxyReady);

    return [
      {
        id: "gmail",
        label: "Gmail",
        detail: gmailReady
          ? `${visibleEmailMessages.length} readable email${visibleEmailMessages.length === 1 ? "" : "s"} cached${
              blockedEmailMessageCount > 0 ? `, ${blockedEmailMessageCount} blocked by privacy controls` : ""
            }${emailStatus?.accountEmail ? ` for ${emailStatus.accountEmail}` : ""}`
          : emailStatus?.reason ?? "Connect Gmail so Autopilot can find inbox work.",
        status: gmailReady ? "Ready" : emailStatus?.configured === false ? "Missing config" : "Connect",
        workspace: "productivity",
        actionLabel: gmailReady ? "Open inbox" : "Connect",
        icon: Mail,
        state: gmailReady ? "ready" : "needs-action"
      },
      {
        id: "finances",
        label: "Finances",
        detail:
          financeInvoiceCandidates.length > 0
            ? `${financeInvoiceCandidates.length} possible invoice${financeInvoiceCandidates.length === 1 ? "" : "s"} waiting for verification.`
            : financeReady
              ? "Money management is enabled; invoice candidates will appear here after sync."
              : "Locked until you enable money management and verify your email.",
        status: financeProviderReady ? "Provider ready" : financeReady ? "Connect Stripe" : "Locked",
        workspace: "productivity",
        actionLabel: financeReady ? "Review invoice" : "Enable finance",
        icon: CreditCard,
        state: financeInvoiceCandidates.length > 0 ? "working" : financeProviderReady ? "ready" : "needs-action"
      },
      {
        id: "calendar",
        label: "Calendar",
        detail: calendarReady
          ? `${calendarSources.reduce((total, source) => total + source.count, 0)} calendar event${calendarSources.reduce((total, source) => total + source.count, 0) === 1 ? "" : "s"} available`
          : "Reconnect Google Calendar to see/write commitments.",
        status: calendarReady ? "Ready" : "Reconnect",
        workspace: "productivity",
        actionLabel: "Open calendar",
        icon: Clock,
        state: calendarReady ? "ready" : "needs-action"
      },
      {
        id: "chatting",
        label: "Chatting",
        detail: `${activeEnterpriseMembers.length} active member${activeEnterpriseMembers.length === 1 ? "" : "s"} and ${pendingChatActionSuggestions.length} AI suggestion${pendingChatActionSuggestions.length === 1 ? "" : "s"}`,
        status: pendingChatActionSuggestions.length > 0 ? "Review" : "Ready",
        workspace: "chatting",
        actionLabel: "Open chat",
        icon: MessageCircle,
        state: pendingChatActionSuggestions.length > 0 ? "working" : "ready"
      },
      {
        id: "design",
        label: "Design",
        detail: activeArtifact ? `${activeArtifact.title} is selected for review.` : "Create an artifact from an email or prompt.",
        status: activeGeneratedArtifactReview ? `${activeGeneratedArtifactReview.qualityReport.score}/100` : activeArtifact ? "Open" : "Ready",
        workspace: "design",
        actionLabel: "Open studio",
        icon: Palette,
        state: activeGeneratedArtifactReview && !activeGeneratedArtifactReview.qualityReport.passed ? "needs-action" : "ready"
      },
      {
        id: "coding",
        label: "Coding",
        detail: codingSnapshot.activeProject ? `${codingSnapshot.activeProject.name} is active.` : `${visibleCodingChats.length} coding chat${visibleCodingChats.length === 1 ? "" : "s"} ready.`,
        status: activeCodingDownloads > 0 ? "Downloading" : codingSnapshot.activeProject ? "Ready" : "Open project",
        workspace: "coding",
        actionLabel: "Open coding",
        icon: Code2,
        state: activeCodingDownloads > 0 ? "working" : codingSnapshot.activeProject ? "ready" : "needs-action"
      },
      {
        id: "ai-backend",
        label: "AI backend",
        detail: aiReady
          ? `Signed in as ${accountStatus?.userEmail ?? "user"} with ${accountStatus?.backend.model ?? "AI"} ready.`
          : accountStatus?.backend.aiProxyHealthReason ?? accountStatus?.reason ?? "Sign in and configure the Supabase AI endpoint.",
        status: aiReady ? "Ready" : "Needs setup",
        workspace: "settings",
        actionLabel: "Open settings",
        icon: ShieldCheck,
        state: aiReady ? "ready" : "needs-action"
      }
    ];
  }, [
    accountStatus,
    activeArtifact,
    activeCodingDownloads,
    activeEnterpriseMembers.length,
    activeGeneratedArtifactReview,
    calendarSources,
    codingSnapshot.activeProject,
    blockedEmailMessageCount,
    emailStatus,
    financeInvoiceCandidates.length,
    financeProviderReady,
    financeReady,
    hasCalendarData,
    hasGmailData,
    lastProductivitySourceResults,
    localCalendarEvents.length,
    pendingChatActionSuggestions.length,
    visibleEmailMessages.length,
    visibleCodingChats.length
  ]);
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
    let cancelled = false;
    const unsubscribe = autopilot.account.subscribe((status) => {
      if (!cancelled) {
        setAccountStatus(status);
        if (status.signedIn) {
          setAccountActionStatus("Signed into Autopilot.");
        }
      }
    });
    void autopilot.account.status().then((status) => {
      if (!cancelled) {
        setAccountStatus(status);
      }
    });
    void autopilot.settings?.getMoneyMovement().then((settings) => {
      if (!cancelled) {
        setMoneyMovementSettings(settings);
      }
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [autopilot]);

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
    saveEmailOrganizationMode(emailOrganizationMode);
  }, [emailOrganizationMode]);

  useEffect(() => {
    saveInboxOrganizationConsent(inboxOrganizationConsent);
  }, [inboxOrganizationConsent]);

  useEffect(() => {
    saveCalendarLayoutPreference(calendarLayoutPreference);
  }, [calendarLayoutPreference]);

  useEffect(() => {
    saveStringArrayToStorage(BLOCKED_EMAIL_SENDERS_STORAGE_KEY, blockedEmailSenders);
  }, [blockedEmailSenders]);

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
    saveEnterpriseChatState(enterpriseChat);
  }, [enterpriseChat]);

  useEffect(() => {
    if (!accountStatus?.signedIn || !accountStatus.userEmail) {
      return;
    }

    const signedInEmail = accountStatus.userEmail;
    let previousChatAccountEmail: string | null = null;
    try {
      previousChatAccountEmail = window.localStorage.getItem(CHAT_WORKSPACE_ACCOUNT_STORAGE_KEY);
    } catch {
      previousChatAccountEmail = null;
    }

    if (previousChatAccountEmail !== signedInEmail) {
      const freshState = createDefaultChatState(signedInEmail);
      setEnterpriseChat(freshState);
      setChatOrganizationDraft(freshState.organizationName);
      saveEnterpriseChatState(freshState);
      try {
        window.localStorage.setItem(CHAT_WORKSPACE_ACCOUNT_STORAGE_KEY, signedInEmail);
      } catch {
        // Account scoping is a privacy guard; the in-memory reset above still prevents stale member display.
      }
      return;
    }

    setEnterpriseChat((currentState) => ensureEnterpriseMember(currentState, signedInEmail));
  }, [accountStatus?.signedIn, accountStatus?.userEmail]);

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
    return () => clearCodingRunWatchdog();
  }, []);

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
    saveStringArrayToStorage(ARTIFACT_QUALITY_OVERRIDE_IDS_STORAGE_KEY, artifactQualityOverrideIds);
  }, [artifactQualityOverrideIds]);

  useEffect(() => {
    saveDesignProjectRecords(designProjectRecords);
  }, [designProjectRecords]);

  useEffect(() => {
    if (!productivityShortcutHintSeen) {
      return;
    }

    try {
      window.localStorage.setItem(PRODUCTIVITY_SHORTCUT_HINT_SEEN_STORAGE_KEY, "true");
    } catch {
      // Shortcut hints are convenience state; the inbox still works without persistence.
    }
  }, [productivityShortcutHintSeen]);

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

    void autopilot.payments
      .listReceipts()
      .then((receipts) => {
        if (!cancelled) {
          setPaymentReceipts(receipts);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPaymentReceipts([]);
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

    void autopilot.workGraph
      .list()
      .then((snapshot) => {
        if (!cancelled) {
          setWorkGraphSnapshot(snapshot);
          setSelectedWorkGraphItemId((currentId) =>
            currentId && snapshot.items.some((item) => item.id === currentId) ? currentId : snapshot.items[0]?.id ?? null
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setWorkGraphSnapshot(null);
          setWorkGraphStatus("Work Twin could not load the current source trail.");
        }
      });

    void refreshAgentRuntime();

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
    let cancelled = false;

    if (!selectedWorkGraphItem) {
      setWorkTwinProof(null);
      return () => {
        cancelled = true;
      };
    }

    if (selectedWorkGraphItem.source.kind === "chat") {
      setWorkTwinProof(buildProofModeReport(selectedWorkGraphItem));
      return () => {
        cancelled = true;
      };
    }

    void autopilot.workTwin
      .getProof(selectedWorkGraphItem.id)
      .then((proof) => {
        if (!cancelled) {
          setWorkTwinProof(proof);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setWorkTwinProof(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [autopilot, selectedWorkGraphItem?.id]);

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
    let cancelled = false;
    const unsubscribe = autopilot.tabs.subscribe((snapshot) => {
      if (!cancelled) {
        setTabs(snapshot.tabs);
        setActiveTabId(snapshot.activeTabId);
      }
    });

    void autopilot.tabs.getSnapshot().then((snapshot) => {
      if (!cancelled) {
        setTabs(snapshot.tabs);
        setActiveTabId(snapshot.activeTabId);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [autopilot]);

  useEffect(() => {
    const activeProfile = workspaceProfiles.find((profile) => profile.id === activeWorkspaceId);
    if (activeProfile?.view !== "browser" || tabs.length === 0) {
      return;
    }

    let cancelled = false;
    const timeout = window.setTimeout(() => {
      void autopilot.workspaces
        .persistBrowserSnapshot(activeWorkspaceId)
        .then((state) => {
          if (!cancelled) {
            setWorkspaceState(state);
          }
        })
        .catch(() => undefined);
    }, 500);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [activeWorkspaceId, autopilot, tabs, workspaceProfiles]);

  useEffect(() => {
    let cancelled = false;
    void autopilot.bookmarks
      .list()
      .then((nextBookmarks) => {
        if (!cancelled) {
          applyBookmarks(nextBookmarks);
          setOpenBookmarkFolders({});
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBookmarks(DEFAULT_BOOKMARKS);
        }
      });
    return () => {
      cancelled = true;
    };
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
        shouldAutoPrepareResponseDraft(message) &&
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

  function blockEmailSenderFromMessage(message: EmailMessageSummary): void {
    const normalizedSender = normalizeEmailSenderAddress(message.fromEmail || message.from);
    if (!normalizedSender) {
      setEmailSyncStatus("This email does not include a sender address Autopilot can block.");
      return;
    }

    setBlockedEmailSenders((currentSenders) => (currentSenders.includes(normalizedSender) ? currentSenders : [...currentSenders, normalizedSender]));
    setSelectedInboxEmailId((currentId) => (currentId === message.id ? null : currentId));
    setEmailSyncStatus(`Blocked ${normalizedSender}. Productivity will hide and skip that sender before AI analysis.`);
  }

  function unblockEmailSender(senderEmail: string): void {
    const normalizedSender = normalizeEmailSenderAddress(senderEmail);
    setBlockedEmailSenders((currentSenders) => currentSenders.filter((sender) => sender !== normalizedSender));
    setEmailSyncStatus(`Unblocked ${normalizedSender || senderEmail}. Future syncs can include that sender again.`);
  }

  async function reviewFinanceInvoiceCandidate(candidate: FinanceInvoiceCandidate): Promise<void> {
    const input: InvoiceCandidate = {
      payeeName: candidate.sender,
      payeeEmail: candidate.senderEmail,
      senderEmail: candidate.senderEmail,
      amountCents: candidate.amountCents ?? 0,
      currency: "USD",
      invoiceNumber: candidate.invoiceNumber,
      dueDate: candidate.dueLabel === "Due date to confirm" ? undefined : candidate.dueLabel.replace(/^Due\s+/u, ""),
      sourceEvidence: candidate.sourceEvidence,
      sourceUrl: candidate.sourceUrl,
      knownVendorDomains: getFinanceCandidateVendorDomains(candidate)
    };

    setFinanceReviewStatus(`Checking invoice safety for "${candidate.title}"...`);
    const report = await autopilot.payments.verifyInvoice(input).catch((error: unknown) => ({
      id: `invoice-review-error:${candidate.sourceId}`,
      status: "needs_user_review" as const,
      candidate: input,
      confidence: 0,
      missingEvidence: ["Payment destination", "Invoice reference"],
      scamSignals: [error instanceof Error ? error.message : "Invoice safety check could not complete."],
      checks: [],
      createdAt: Date.now()
    }));

    setFinanceReviewStatus(
      report.status === "verified"
        ? `Invoice check passed for "${candidate.title}". Review provider destination before any payment proposal.`
        : `Invoice needs review: ${report.scamSignals[0] ?? "More evidence is required."} ${
            report.missingEvidence.length > 0 ? `Missing ${report.missingEvidence.join(", ")}.` : ""
          }`
    );
  }

  async function verifyHomePaymentReceipt(receiptId: string): Promise<void> {
    setPaymentReceiptStatusById((current) => ({ ...current, [receiptId]: "Verifying provider receipt..." }));
    const result = await autopilot.payments.verifyReceipt(receiptId).catch((error: unknown) => ({
      success: false as const,
      providerConfirmed: false as const,
      verifiedAt: Date.now(),
      reason: error instanceof Error ? error.message : "Receipt verification could not complete.",
      nextStep: "Refresh Home and verify the payment inside the connected provider dashboard."
    }));

    if (result.success) {
      setPaymentReceiptStatusById((current) => ({ ...current, [receiptId]: `${result.message} Verified ${new Date(result.verifiedAt).toLocaleString()}.` }));
    } else {
      setPaymentReceiptStatusById((current) => ({
        ...current,
        [receiptId]: `${result.reason} ${result.nextStep}`
      }));
    }
    await Promise.all([refreshPaymentReceipts(), refreshMoneyMovementSettings()]);
  }

  async function applyInboxOrganizationCommand(
    message: EmailMessageSummary,
    actionKind: "archive" | "mark_unread" | "mark_read" | "star" | "unstar" | "label" | "snooze"
  ): Promise<void> {
    type InboxOrganizationActionKind = "archive" | "mark_unread" | "mark_read" | "star" | "unstar" | "label" | "snooze";
    const actionLabels: Record<InboxOrganizationActionKind, string> = {
      archive: "Archive",
      mark_unread: "Mark unread",
      mark_read: "Mark read",
      star: "Star",
      unstar: "Unstar",
      label: "Label",
      snooze: "Snooze"
    };
    const action: EmailOrganizationAction = {
      kind: actionKind,
      messageId: message.id,
      label: actionKind === "label" ? DEFAULT_AUTOPILOT_GMAIL_LABEL : actionKind === "snooze" ? "Autopilot/Snoozed" : undefined,
      snoozeUntil: actionKind === "snooze" ? Date.now() + 24 * 60 * 60 * 1000 : undefined,
      requiresUserCommand: true
    };

    setEmailBusy(true);
    setEmailSyncStatus(`${actionLabels[actionKind]} requested for "${message.subject || "email"}". Applying only this user-commanded Gmail action...`);
    const result = await autopilot.email.organize([action]).catch((error: unknown) => ({
      success: false,
      appliedCount: 0,
      skippedCount: 1,
      reason: error instanceof Error ? error.message : "Gmail organization failed.",
      details: [
        {
          messageId: message.id,
          action: action.kind,
          success: false,
          reason: error instanceof Error ? error.message : "Gmail organization failed."
        }
      ]
    }));
    setEmailBusy(false);

    const detailReason = result.details.find((detail) => !detail.success)?.reason;
    if (!result.success || result.appliedCount === 0) {
      setEmailSyncStatus(
        `${actionLabels[actionKind]} was not applied. ${
          detailReason ?? result.reason ?? "Reconnect Google with Gmail modify scope, then try again."
        }`
      );
      return;
    }

    setEmailMessages((currentMessages) =>
      currentMessages
        .map((currentMessage) => {
          if (currentMessage.id !== message.id) {
            return currentMessage;
          }
          if (actionKind === "mark_unread") {
            return { ...currentMessage, unread: true };
          }
          if (actionKind === "mark_read" || actionKind === "archive") {
            return { ...currentMessage, unread: false };
          }
          return currentMessage;
        })
        .filter((currentMessage) => (actionKind === "archive" ? currentMessage.id !== message.id : true))
    );
    setEmailSyncStatus(
      `${actionLabels[actionKind]} applied to "${message.subject || "email"}". ${
        actionKind === "label" ? `Gmail label: ${DEFAULT_AUTOPILOT_GMAIL_LABEL}. ` : ""
      }Autopilot never sends, deletes, or unsubscribes from this control.`
    );
    await refreshWorkGraph();
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

  function refreshAccountStatus(): void {
    void autopilot.account.status().then(setAccountStatus);
    void refreshMoneyMovementSettings();
  }

  async function handleAccountSignIn(action: "sign-in" | "sign-up" | "magic-link"): Promise<void> {
    const email = accountEmailInput.trim();
    const password = accountPasswordInput;
    if (!email) {
      setAccountActionStatus("Enter an email address first.");
      return;
    }
    if (action !== "magic-link" && !password) {
      setAccountActionStatus("Enter a password, or send a magic link.");
      return;
    }

    setAccountActionStatus(action === "sign-up" ? "Creating Autopilot account..." : action === "magic-link" ? "Sending magic link..." : "Signing into Autopilot...");
    const result =
      action === "sign-up"
        ? await autopilot.account.signUp({ provider: "email", email, password })
        : await autopilot.account.signIn({ provider: "email", email, password: action === "magic-link" ? undefined : password });
    setAccountStatus(result.status);
    void refreshMoneyMovementSettings();
    setAccountActionStatus([result.reason, result.nextStep].filter(Boolean).join(" ") || (result.success ? "Account updated." : "Account action failed."));
    if (result.success && action !== "magic-link") {
      setAccountPasswordInput("");
    }
  }

  async function handleAccountSignOut(): Promise<void> {
    setAccountActionStatus("Signing out...");
    const status = await autopilot.account.signOut();
    setAccountStatus(status);
    setAccountActionStatus("Signed out of Autopilot.");
    void refreshMoneyMovementSettings();
  }

  async function refreshMoneyMovementSettings(): Promise<void> {
    const [settings, receipts] = await Promise.all([
      autopilot.settings.getMoneyMovement(),
      autopilot.payments.listReceipts().catch(() => null)
    ]);
    setMoneyMovementSettings(settings);
    if (receipts) {
      setPaymentReceipts(receipts);
    }
  }

  function setAccountLinkOpenMode(mode: AccountLinkOpenMode): void {
    setAccountLinkOpenModeState(mode);
    saveAccountLinkOpenMode(mode);
  }

  async function openAccountLinkUrl(url: string): Promise<void> {
    if (accountLinkOpenMode === "external") {
      const result = await autopilot.system.openExternalUrl(url);
      if (!result.success) {
        throw new Error(result.reason ?? "Autopilot could not open the link in your external browser.");
      }
      return;
    }
    await switchToBrowserWorkspace();
    await autopilot.tabs.create(url);
  }

  async function handleStartMoneyVerification(): Promise<void> {
    setMoneyMovementBusy(true);
    setMoneyMovementCodeInput("");
    setMoneyMovementStatus("Sending payment verification email...");
    try {
      const result = await autopilot.settings.startMoneyVerification(true);
      setMoneyMovementSettings(result.settings);
      setMoneyMovementStatus(
        [
          result.reason ?? "Payment verification email sent.",
          result.nextStep ?? "Open your email, copy the 6-digit code, and enter it here.",
          result.debugVerificationCode ? `Development code: ${result.debugVerificationCode}` : ""
        ]
          .filter(Boolean)
          .join(" ")
      );
    } catch (error) {
      setMoneyMovementStatus(error instanceof Error ? error.message : "Payment verification email could not be sent.");
    } finally {
      setMoneyMovementBusy(false);
    }
  }

  async function handleConfirmMoneyVerification(): Promise<void> {
    const verificationCode = moneyMovementCodeInput.replace(/\D/gu, "").slice(0, 6);
    if (!/^\d{6}$/u.test(verificationCode)) {
      setMoneyMovementStatus("Enter the 6-digit payment verification key from your email.");
      return;
    }
    setMoneyMovementBusy(true);
    setMoneyMovementStatus("Confirming the 6-digit payment verification key...");
    try {
      const result = await autopilot.settings.confirmMoneyVerification(verificationCode);
      setMoneyMovementSettings(result.settings);
      setMoneyMovementStatus([result.reason, result.nextStep].filter(Boolean).join(" ") || (result.success ? "Money management is on." : "Verification failed."));
      if (result.success) {
        setMoneyMovementCodeInput("");
      }
    } catch (error) {
      setMoneyMovementStatus(error instanceof Error ? error.message : "Money movement verification could not be confirmed.");
    } finally {
      setMoneyMovementBusy(false);
    }
  }

  async function handleDisableMoneyMovement(): Promise<void> {
    setMoneyMovementBusy(true);
    setMoneyMovementStatus("Disabling money movement...");
    try {
      const result = await autopilot.settings.disableMoneyMovement();
      setMoneyMovementSettings(result.settings);
      setMoneyMovementStatus(result.reason ?? (result.success ? "Money movement disabled." : result.nextStep ?? "Money movement could not be disabled."));
    } catch (error) {
      setMoneyMovementStatus(error instanceof Error ? error.message : "Money movement could not be disabled.");
    } finally {
      setMoneyMovementBusy(false);
    }
  }

  async function handleStartStripeConnect(): Promise<void> {
    setMoneyMovementBusy(true);
    setMoneyMovementStatus("Opening Stripe Connect inside Autopilot Browser...");
    try {
      const result = await autopilot.settings.startStripeConnect();
      setMoneyMovementSettings(result.settings);
      if (result.success && result.url) {
        await openAccountLinkUrl(result.url);
        setMoneyMovementStatus(
          [
            result.reason,
            accountLinkOpenMode === "external"
              ? "Finish Stripe authorization in your external browser, then return here and refresh Stripe status."
              : "Finish Stripe authorization in the Browser workspace. Autopilot will ask to save credentials if you sign in with a username and password."
          ]
            .filter(Boolean)
            .join(" ")
        );
        return;
      }
      setMoneyMovementStatus([result.reason, result.nextStep].filter(Boolean).join(" ") || "Stripe Connect setup updated.");
    } catch (error) {
      setMoneyMovementStatus(error instanceof Error ? error.message : "Stripe Connect setup could not start.");
    } finally {
      setMoneyMovementBusy(false);
    }
  }

  async function handleRefreshStripeConnection(): Promise<void> {
    setMoneyMovementBusy(true);
    setMoneyMovementStatus("Refreshing Stripe connection...");
    try {
      const result = await autopilot.settings.refreshStripeConnection();
      setMoneyMovementSettings(result.settings);
      setMoneyMovementStatus([result.reason, result.nextStep].filter(Boolean).join(" ") || "Stripe connection refreshed.");
    } catch (error) {
      setMoneyMovementStatus(error instanceof Error ? error.message : "Stripe connection could not be refreshed.");
    } finally {
      setMoneyMovementBusy(false);
    }
  }

  async function handleDisconnectStripeAccount(): Promise<void> {
    setMoneyMovementBusy(true);
    setMoneyMovementStatus("Disconnecting Stripe account...");
    try {
      const result = await autopilot.settings.disconnectStripeAccount();
      setMoneyMovementSettings(result.settings);
      setMoneyMovementStatus([result.reason, result.nextStep].filter(Boolean).join(" ") || "Stripe account disconnected.");
    } catch (error) {
      setMoneyMovementStatus(error instanceof Error ? error.message : "Stripe account could not be disconnected.");
    } finally {
      setMoneyMovementBusy(false);
    }
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
    if (nextView !== "productivity") {
      setProductivityDraftReaderOpen(false);
    }
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

  function openWorkspaceByView(nextView: AppView): void {
    if (nextView !== "productivity") {
      setProductivityDraftReaderOpen(false);
    }
    const profile = workspaceProfiles.find((candidate) => getBuiltInWorkspaceView(candidate) === nextView);
    if (profile) {
      void switchWorkspace(profile);
      return;
    }
    setView(nextView);
  }

  function updateEnterpriseChat(mutator: (currentState: EnterpriseChatState) => EnterpriseChatState): void {
    setEnterpriseChat((currentState) => mutator(currentState));
  }

  function createEnterpriseChannel(): void {
    const name = chatChannelDraft.trim().replace(/^#/u, "").slice(0, 40);
    if (!name) {
      setChatStatus("Name the channel before creating it.");
      return;
    }

    updateEnterpriseChat((currentState) => {
      const existing = currentState.channels.find((channel) => channel.name.toLowerCase() === name.toLowerCase());
      if (existing) {
        return { ...currentState, activeChannelId: existing.id };
      }
      const channel: EnterpriseChatChannel = {
        id: `channel:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 7)}`,
        name,
        kind: "channel",
        aiNotesEnabled: true,
        memberIds: currentState.members.filter((member) => member.status === "active").map((member) => member.id),
        unreadCount: 0
      };
      return {
        ...currentState,
        activeChannelId: channel.id,
        channels: [...currentState.channels, channel],
        aiNotes: [`#${name} created. AI notes are on until you turn them off.`, ...currentState.aiNotes].slice(0, 40),
        auditLog: [createEnterpriseAuditEvent(currentState.currentUserId, `Created #${name}.`), ...currentState.auditLog].slice(0, 80)
      };
    });
    setChatChannelDraft("");
    setChatStatus(`#${name} created.`);
  }

  function rotateEnterpriseInviteKey(): void {
    updateEnterpriseChat((currentState) => ({
      ...currentState,
      inviteKey: createEnterpriseInviteKey(),
      inviteKeyVersion: currentState.inviteKeyVersion + 1,
      inviteKeyUpdatedAt: Date.now(),
      auditLog: [
        createEnterpriseAuditEvent(currentState.currentUserId, `Rotated enterprise invite key to version ${currentState.inviteKeyVersion + 1}.`),
        ...currentState.auditLog
      ].slice(0, 80)
    }));
    setChatStatus("Invite key rotated. Existing members stay; future joins need the new key.");
  }

  function updateEnterpriseOrganizationName(): void {
    const nextName = chatOrganizationDraft.trim().replace(/\s+/gu, " ").slice(0, 80);
    if (!nextName) {
      setChatStatus("Name the organization before saving it.");
      return;
    }
    if (!currentEnterpriseCanAdmin) {
      setChatStatus("Only organization owners and admins can rename the workspace.");
      return;
    }

    updateEnterpriseChat((currentState) => ({
      ...currentState,
      organizationName: nextName,
      auditLog: [createEnterpriseAuditEvent(currentState.currentUserId, `Renamed the organization to ${nextName}.`), ...currentState.auditLog].slice(0, 80)
    }));
    setChatOrganizationDraft(nextName);
    setChatStatus(`Organization renamed to ${nextName}.`);
  }

  function joinEnterpriseOrganizationWithKey(): void {
    const email = chatJoinEmailDraft.trim().toLowerCase();
    const key = chatJoinKeyDraft.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) {
      setChatStatus("Enter a teammate email before joining with an enterprise key.");
      return;
    }
    if (key !== enterpriseChat.inviteKey) {
      setChatStatus("Invite key rejected. Rotated or old keys cannot add new members.");
      return;
    }

    updateEnterpriseChat((currentState) => ensureEnterpriseMember(currentState, email));
    setChatJoinEmailDraft("");
    setChatJoinKeyDraft("");
    setChatStatus(`${getEnterpriseDisplayName(email)} joined ${enterpriseChat.organizationName}. Existing members stayed in place.`);
  }

  function toggleEnterpriseMemberAdmin(memberId: string): void {
    const member = enterpriseChat.members.find((candidate) => candidate.id === memberId);
    if (!member || member.role === "owner") {
      return;
    }
    if (currentEnterpriseMember?.role !== "owner") {
      setChatStatus("Only the organization owner can change admin roles.");
      return;
    }

    const nextRole: EnterpriseChatMember["role"] = member.role === "admin" ? "member" : "admin";
    updateEnterpriseChat((currentState) => ({
      ...currentState,
      members: currentState.members.map((candidate) => (candidate.id === memberId ? { ...candidate, role: nextRole } : candidate)),
      auditLog: [createEnterpriseAuditEvent(currentState.currentUserId, `${member.displayName} is now ${nextRole}.`), ...currentState.auditLog].slice(0, 80)
    }));
    setChatStatus(`${member.displayName} is now ${nextRole}.`);
  }

  function createEnterpriseDirectMessage(memberId: string): void {
    const member = activeEnterpriseMembers.find((candidate) => candidate.id === memberId);
    if (!member || !currentEnterpriseMember) {
      setChatStatus("Choose an active member before starting a DM.");
      return;
    }

    const dmMemberIds = [currentEnterpriseMember.id, member.id].sort();
    const existingDm = enterpriseChat.channels.find(
      (channel) => channel.kind === "dm" && dmMemberIds.every((id) => channel.memberIds.includes(id)) && channel.memberIds.length === dmMemberIds.length
    );
    if (existingDm) {
      updateEnterpriseChat((currentState) => ({ ...currentState, activeChannelId: existingDm.id }));
      setChatStatus(`Opened DM with ${member.displayName}.`);
      return;
    }

    const channel: EnterpriseChatChannel = {
      id: `dm:${dmMemberIds.join(":")}:${Date.now().toString(36)}`,
      name: member.displayName,
      kind: "dm",
      aiNotesEnabled: false,
      memberIds: dmMemberIds,
      unreadCount: 0
    };
    updateEnterpriseChat((currentState) => ({
      ...currentState,
      activeChannelId: channel.id,
      channels: [...currentState.channels, channel],
      auditLog: [createEnterpriseAuditEvent(currentState.currentUserId, `Started a DM with ${member.displayName}.`), ...currentState.auditLog].slice(0, 80)
    }));
    setChatStatus(`DM with ${member.displayName} created.`);
  }

  function removeEnterpriseMember(memberId: string): void {
    const member = enterpriseChat.members.find((candidate) => candidate.id === memberId);
    if (!member) {
      return;
    }
    if (!currentEnterpriseCanAdmin) {
      setChatStatus("Only organization owners and admins can remove members.");
      return;
    }
    if (member.role === "owner") {
      setChatStatus("The organization owner cannot be removed here.");
      return;
    }

    updateEnterpriseChat((currentState) => ({
      ...currentState,
      members: currentState.members.map((candidate) =>
        candidate.id === memberId
          ? {
              ...candidate,
              status: "removed",
              removedAt: Date.now()
            }
          : candidate
      ),
      channels: currentState.channels.map((channel) => ({
        ...channel,
        memberIds: channel.memberIds.filter((id) => id !== memberId)
      })),
      auditLog: [createEnterpriseAuditEvent(currentState.currentUserId, `Removed ${member.displayName} from the organization.`), ...currentState.auditLog].slice(0, 80)
    }));
    setChatStatus(`${member.displayName} was removed. They lose access to organization channels and messages.`);
  }

  function markActiveChatRead(): void {
    if (!activeChatChannel) {
      return;
    }

    updateEnterpriseChat((currentState) => ({
      ...currentState,
      channels: currentState.channels.map((channel) =>
        channel.id === activeChatChannel.id
          ? {
              ...channel,
              unreadCount: 0
            }
          : channel
      )
    }));
    setChatStatus(`${activeChatChannel.kind === "dm" ? activeChatChannel.name : `#${activeChatChannel.name}`} marked read.`);
  }

  function analyzeEnterpriseChatChannel(): void {
    if (!activeChatChannel) {
      setChatStatus("Choose a channel before analyzing chat.");
      return;
    }
    if (!activeChatChannel.aiNotesEnabled) {
      setChatStatus("AI notes are paused for this channel. Enable AI notes before analyzing it.");
      return;
    }
    if (activeChatMessages.length === 0) {
      setChatStatus("Send messages first, then Autopilot can analyze this channel.");
      return;
    }

    const recentMessages = activeChatMessages.slice(-50);
    const actionableMessages = recentMessages.filter((message) =>
      /\b(please|can you|need|todo|deadline|ship|fix|draft|design|build|review|schedule|follow up|decision|blocked|stuck|risk)\b/iu.test(message.body)
    );
    const decisionCount = recentMessages.filter((message) => /\b(decided|decision|approved|we will|let'?s|next step|agreed)\b/iu.test(message.body)).length;
    const deadlineCount = recentMessages.filter((message) => /\b(by|before|due|deadline|tomorrow|today|tonight|friday|monday|tuesday|wednesday|thursday|next week)\b/iu.test(message.body)).length;
    const blockerCount = recentMessages.filter((message) => /\b(blocked|stuck|risk|issue|problem|glitch|failed|failing|broken)\b/iu.test(message.body)).length;
    const existingSuggestionMessageIds = new Set(enterpriseChat.actionSuggestions.map((suggestion) => suggestion.sourceMessageId).filter(Boolean));

    updateEnterpriseChat((currentState) => {
      const generatedSuggestions = actionableMessages
        .filter((message) => !existingSuggestionMessageIds.has(message.id))
        .slice(-4)
        .map((message) => {
          const mentionMemberIds = getMentionMemberIds(message.body, currentState.members.filter((member) => member.status === "active"));
          return {
            id: `chat-action:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 7)}`,
            title: getEnterpriseChatActionTitle(message.body),
            summary: getEnterpriseChatInsightSummary(message.body, mentionMemberIds, currentState.members),
            route: getChatRouteForText(message.body),
            confidence: mentionMemberIds.length > 0 || deadlineCount > 0 ? 88 : 79,
            sourceMessageId: message.id,
            assigneeId: mentionMemberIds[0] ?? null,
            acceptedAt: null
          };
        });
      const channelName = activeChatChannel.kind === "dm" ? activeChatChannel.name : `#${activeChatChannel.name}`;
      const note = `AI analyzed ${channelName}: ${actionableMessages.length} ask${actionableMessages.length === 1 ? "" : "s"}, ${decisionCount} decision signal${decisionCount === 1 ? "" : "s"}, ${deadlineCount} deadline signal${deadlineCount === 1 ? "" : "s"}, ${blockerCount} blocker signal${blockerCount === 1 ? "" : "s"}.`;
      return {
        ...currentState,
        aiNotes: [note, ...currentState.aiNotes].slice(0, 40),
        actionSuggestions: [...generatedSuggestions, ...currentState.actionSuggestions].slice(0, 80)
      };
    });
    setChatStatus(`AI analysis complete: ${actionableMessages.length} ask${actionableMessages.length === 1 ? "" : "s"} reviewed, ${Math.min(actionableMessages.length, 4)} suggestion${Math.min(actionableMessages.length, 4) === 1 ? "" : "s"} prepared.`);
  }

  function sendEnterpriseChatMessage(): void {
    const body = chatMessageDraft.trim();
    if (!body || !activeChatChannel || !currentEnterpriseMember) {
      return;
    }

    const mentionMemberIds = getMentionMemberIds(body, activeEnterpriseMembers);
    const message: EnterpriseChatMessage = {
      id: createChatMessageId(),
      channelId: activeChatChannel.id,
      authorId: currentEnterpriseMember.id,
      author: currentEnterpriseMember.displayName,
      body,
      createdAt: Date.now(),
      mentionMemberIds
    };
    const looksActionable = /\b(please|can you|need|todo|deadline|ship|fix|draft|design|build|review|schedule|follow up)\b/iu.test(body);
    const shouldSuggest = activeChatChannel.aiNotesEnabled && looksActionable;
    updateEnterpriseChat((currentState) => {
      const nextSuggestions = shouldSuggest
        ? [
            {
              id: `chat-action:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 7)}`,
              title: getEnterpriseChatActionTitle(body),
              summary: getEnterpriseChatInsightSummary(body, mentionMemberIds, currentState.members),
              route: getChatRouteForText(body),
              confidence: mentionMemberIds.length > 0 ? 88 : 82,
              sourceMessageId: message.id,
              assigneeId: mentionMemberIds[0] ?? null,
              acceptedAt: null
            },
            ...currentState.actionSuggestions
          ].slice(0, 80)
        : currentState.actionSuggestions;

      return {
        ...currentState,
        messages: [...currentState.messages, message].slice(-300),
        aiNotes: activeChatChannel.aiNotesEnabled
          ? [
              shouldSuggest
                ? `Action candidate detected in ${activeChatLabel}: ${body.slice(0, 120)}`
                : `Message logged in ${activeChatLabel}${mentionMemberIds.length > 0 ? ` with ${mentionMemberIds.length} mention${mentionMemberIds.length === 1 ? "" : "s"}` : ""}.`,
              ...currentState.aiNotes
            ].slice(0, 40)
          : currentState.aiNotes,
        channels: currentState.channels.map((channel) =>
          channel.id === activeChatChannel.id
            ? { ...channel, unreadCount: 0 }
            : channel
        ),
        actionSuggestions: nextSuggestions
      };
    });
    setChatMessageDraft("");
    setChatStatus(
      shouldSuggest
        ? "Message sent and an action suggestion is ready for review."
        : activeChatChannel.aiNotesEnabled
          ? "Message sent."
          : "Message sent. AI notes are paused, so no suggestion was created."
    );
  }

  async function acceptEnterpriseChatSuggestion(id: string): Promise<boolean> {
    const suggestion = enterpriseChat.actionSuggestions.find((candidate) => candidate.id === id);
    if (!suggestion) {
      setChatStatus("That chat suggestion no longer exists.");
      return false;
    }

    const sourceMessage = suggestion.sourceMessageId
      ? enterpriseChat.messages.find((message) => message.id === suggestion.sourceMessageId)
      : undefined;
    const sourceChannel = sourceMessage
      ? enterpriseChat.channels.find((channel) => channel.id === sourceMessage.channelId)
      : activeChatChannel;
    const assignee = suggestion.assigneeId ? enterpriseChat.members.find((member) => member.id === suggestion.assigneeId) : undefined;
    const channelLabel = sourceChannel ? (sourceChannel.kind === "dm" ? sourceChannel.name : `#${sourceChannel.name}`) : "chat";
    const taskInput: ProductivityTaskInput = {
      id: `chat:${suggestion.id}`,
      title: suggestion.title,
      context: `${enterpriseChat.organizationName} / ${channelLabel} - ${suggestion.summary}${assignee ? ` Assigned to ${assignee.displayName}.` : ""}`,
      priority: suggestion.confidence >= 88 ? "high" : "medium",
      state: "todo",
      source: {
        provider: "chat",
        label: `${enterpriseChat.organizationName} / ${channelLabel}`.slice(0, 120),
        messageId: suggestion.sourceMessageId ?? suggestion.id,
        from: sourceMessage?.author,
        subject: suggestion.title,
        actionSummary: sourceMessage?.body ?? suggestion.summary,
        actionConfidence: suggestion.confidence,
        requestedOutput: getChatRequestedOutput(suggestion.route, `${suggestion.title} ${suggestion.summary} ${sourceMessage?.body ?? ""}`),
        recommendedAssistant: suggestion.route,
        routeReason: `Accepted enterprise chat ask from ${channelLabel}; route to ${suggestion.route} with ${suggestion.confidence}% confidence.`
      }
    };

    setChatStatus(`Routing "${suggestion.title}" into Productivity...`);
    const tasks = await autopilot.productivity.upsertTask(taskInput).catch(() => null);
    if (!tasks) {
      setChatStatus("Autopilot could not create a durable Productivity task from that chat ask.");
      return false;
    }

    setProductivityTasks(tasks);
    if (suggestion.route === "productivity" && !hasExplicitArtifactRequest(`${suggestion.title} ${suggestion.summary} ${sourceMessage?.body ?? ""}`)) {
      const body = [
        sourceChannel?.kind === "dm" ? `Hi ${sourceMessage?.author || "there"},` : `Team,`,
        "",
        `Quick update on "${suggestion.title}": ${suggestion.summary}`,
        "",
        "I will review the details and follow up before anything is sent, shared, or marked complete.",
        "",
        "Best,"
      ].join("\n");
      const drafts = await autopilot.productivity
        .upsertDraft({
          id: `response-draft:chat:${suggestion.id}`,
          title: `Chat response: ${suggestion.title}`,
          body,
          preview: `Response draft from ${channelLabel}.`,
          status: "needs_review",
          artifactKind: "reply",
          source: {
            provider: "chat",
            label: `${enterpriseChat.organizationName} / ${channelLabel}`.slice(0, 120),
            messageId: suggestion.sourceMessageId ?? suggestion.id,
            from: sourceMessage?.author,
            subject: suggestion.title,
            actionSummary: sourceMessage?.body ?? suggestion.summary
          }
        })
        .catch(() => null);
      if (drafts) {
        productivityDraftsRef.current = drafts;
        setProductivityDrafts(drafts);
        setSelectedResponseDraftId(`response-draft:chat:${suggestion.id}`);
      }
    }
    updateEnterpriseChat((currentState) => ({
      ...currentState,
      actionSuggestions: currentState.actionSuggestions.map((suggestion) =>
        suggestion.id === id ? { ...suggestion, acceptedAt: Date.now() } : suggestion
      )
    }));
    await refreshWorkOrchestration();
    setChatStatus(`Suggestion accepted. "${suggestion.title}" is now a routed Productivity task.`);
    return true;
  }

  function ignoreEnterpriseChatSuggestion(id: string): void {
    updateEnterpriseChat((currentState) => ({
      ...currentState,
      actionSuggestions: currentState.actionSuggestions.filter((suggestion) => suggestion.id !== id)
    }));
    setChatStatus("Suggestion ignored.");
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

  async function refreshWorkGraph(): Promise<void> {
    const snapshot = await autopilot.workGraph.list().catch(() => null);
    if (!snapshot) {
      setWorkGraphStatus("Work Twin could not load the current source trail.");
      return;
    }

    setWorkGraphSnapshot(snapshot);
    setSelectedWorkGraphItemId((currentId) =>
      currentId && snapshot.items.some((item) => item.id === currentId) ? currentId : snapshot.items[0]?.id ?? null
    );
    setWorkGraphStatus("");
  }

  async function refreshAgentRuntime(): Promise<void> {
    const [tools, connectors] = await Promise.all([
      autopilot.runtimeAgent.listTools().catch(() => null),
      autopilot.connectors.list().catch(() => null)
    ]);

    if (tools) {
      setRuntimeTools(tools);
    }
    if (connectors) {
      setRuntimeConnectors(connectors);
    }
    if (!tools || !connectors) {
      setAgentRuntimeStatus("Agent Runtime could not read tool and connector readiness.");
      return;
    }
    setAgentRuntimeStatus("");
  }

  async function refreshWorkOrchestration(): Promise<void> {
    await loadWorkOrchestrationSnapshot();
    await refreshWorkGraph();
  }

  async function refreshAutomationState(): Promise<void> {
    const [recipes, runs] = await Promise.all([autopilot.automation.listRecipes().catch(() => null), autopilot.automation.listRuns().catch(() => null)]);
    if (recipes) {
      setAutomationRecipes(recipes);
    }
    if (runs) {
      setAutomationRuns(runs);
    }
    await refreshWorkGraph();
  }

  async function refreshPaymentReceipts(): Promise<void> {
    const receipts = await autopilot.payments.listReceipts().catch(() => null);
    if (receipts) {
      setPaymentReceipts(receipts);
    }
  }

  async function syncProductivityTasksFromSources(sourceIds: ProductivitySourceId[] = selectedProductivitySources): Promise<ProductivityTaskSyncResult> {
    const result = await autopilot.productivity.sync({ sourceIds, blockedEmailSenders: normalizedBlockedEmailSenders }).catch((error: unknown) => ({
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
    const readableTasks = result.tasks.filter((task) => {
      if (task.source.provider !== "gmail") {
        return true;
      }
      const sender = normalizeEmailSenderAddress(task.source.from ?? task.source.label);
      return !sender || !normalizedBlockedEmailSenders.includes(sender);
    });
    setProductivityTasks(readableTasks);
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
        ? `Built ${readableTasks.length} action ${readableTasks.length === 1 ? "item" : "items"} from ${selectedSourceLabel || "selected sources"}${
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
    await refreshWorkGraph();
  }

  async function saveProductivityDraftFromEmail(message: EmailMessageSummary, artifact: Artifact, plan: ActionPlan): Promise<void> {
    const body = artifact.emailDraftMarkdown?.trim() || buildEmailReplyDraftFromArtifact(message, artifact, plan);
    const draftQuality = evaluateEmailDraftQuality({
      draft: body,
      sourceText: buildEmailDraftQualitySource(message, artifact),
      requiresSendApproval: true
    });
    const preview = `Draft quality ${draftQuality.score}/100: ${draftQuality.summary}`;
    const nextDrafts = await autopilot.productivity
      .upsertDraft({
        id: `email-draft:${message.id}:${artifact.id}`,
        title: `Reply draft: ${artifact.title}`,
        body,
        preview,
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

  function showProductivityDraftReader(draftId?: string): void {
    if (draftId) {
      setSelectedResponseDraftId(draftId);
    }
    const productivityProfile = workspaceProfiles.find((profile) => profile.id === "productivity") ?? workspaceProfiles.find((profile) => profile.view === "productivity");
    setView("productivity");
    setProductivityDraftReaderOpen(true);
    if (!productivityProfile) {
      setWorkspaceState((currentState) => ({
        ...currentState,
        activeWorkspaceId: "productivity"
      }));
      return;
    }
    setWorkspaceState((currentState) => ({
      ...currentState,
      activeWorkspaceId: productivityProfile.id
    }));
    void autopilot.workspaces.switch(productivityProfile.id).then(setWorkspaceState).catch(() => undefined);
  }

  function closeProductivityDraftReader(): void {
    setProductivityDraftReaderOpen(false);
    setEmailSyncStatus("Back to the Productivity inbox.");
  }

  async function saveResponseDraftFromEmail(message: EmailMessageSummary, relatedTaskIds: string[] = []): Promise<boolean> {
    const relatedTasks = productivityTasks.filter((task) => relatedTaskIds.includes(task.id) || task.source.messageId === message.id);
    const body = buildResponseDraftBodyFromEmail(message, relatedTasks);
    const draftQuality = evaluateEmailDraftQuality({
      draft: body,
      sourceText: [message.from, message.fromEmail, message.subject, message.snippet, message.actionText, ...relatedTasks.map((task) => `${task.title} ${task.context}`)]
        .filter(Boolean)
        .join("\n"),
      requiresSendApproval: true
    });
    const nextDrafts = await autopilot.productivity
      .upsertDraft({
        id: `response-draft:${message.id}`,
        title: `Response: ${message.subject || message.from || "Email"}`,
        body,
        preview: `Response quality ${draftQuality.score}/100: ${draftQuality.summary}`,
        status: draftQuality.passed ? "needs_review" : "draft",
        artifactKind: "reply",
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

    if (!nextDrafts) {
      setEmailSyncStatus("Autopilot could not save that response draft.");
      return false;
    }

    productivityDraftsRef.current = nextDrafts;
    setProductivityDrafts(nextDrafts);
    setSelectedResponseDraftId(`response-draft:${message.id}`);
    if (relatedTaskIds.length > 0) {
      await markProductivityTasksWaiting(relatedTaskIds);
    }
    setEmailSyncStatus(`Response draft saved for ${message.from || "this sender"} without generating a Design artifact.`);
    setBackgroundWorkStatus("Saved a reply draft in Productivity. No document or slideshow credits were spent.");
    return true;
  }

  function buildEmailReplyDraftFromArtifact(message: EmailMessageSummary, artifact: Artifact, plan: ActionPlan): string {
    const senderFirstName = (message.from || "there").replace(/[<>().,]/gu, " ").trim().split(/\s+/u)[0] || "there";
    const activeVersion = getActiveArtifactVersion(artifact);
    const deliverable =
      artifact.kind === "slide_deck"
        ? "the deck"
        : artifact.kind === "website_design"
          ? "the website design"
          : "the document";
    const nextStep =
      plan.finalApproval.required
        ? "I will review it and confirm before anything is sent or shared externally."
        : "I will review the final wording and send the next update once approved.";
    return `Hi ${senderFirstName},

Thanks for sending this over. I prepared ${deliverable} for review and turned the request into a cleaner next step.

The current version is "${artifact.title}". ${artifact.summary || activeVersion.summary}

Next step: ${nextStep}

Best,

---
Draft quality: generated from the artifact review path. Please review before sending.`;
  }

  function buildEmailDraftQualitySource(message: EmailMessageSummary, artifact: Artifact): string {
    return [
      message.from,
      message.fromEmail,
      message.subject,
      message.snippet,
      message.actionText,
      artifact.title,
      artifact.summary
    ]
      .filter(Boolean)
      .join("\n");
  }

  function openProductivityDraft(draft: ProductivityDraft): void {
    if (draft.artifactId) {
      setActiveArtifactId(draft.artifactId);
      setArtifactStatus(`Opened "${draft.title}" from Productivity drafts.`);
      showDesignWorkspace();
      return;
    }

    setSelectedResponseDraftId(draft.id);
    showProductivityDraftReader(draft.id);
    setEmailSyncStatus(`Opened "${draft.title}" for draft review.`);
  }

  async function copyProductivityDraftBody(draft: ProductivityDraft): Promise<void> {
    if (!navigator.clipboard?.writeText) {
      setEmailSyncStatus("Clipboard is unavailable in this preview. Open the draft and copy the text manually.");
      return;
    }

    await navigator.clipboard
      .writeText(draft.body)
      .then(() => setEmailSyncStatus(`Copied "${draft.title}" to the clipboard.`))
      .catch(() => setEmailSyncStatus("Autopilot could not copy that draft."));
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

  function clearDesignRecovery(): void {
    setDesignRecoveryState(null);
  }

  function recordDesignRecovery(input: Omit<DesignRecoveryState, "lastAttemptAt" | "status"> & { status?: DesignRecoveryState["status"] }): void {
    setDesignRecoveryState({
      ...input,
      status: input.status ?? "retry_available",
      lastAttemptAt: Date.now()
    });
    setDesignAiPanelOpen(true);
  }

  async function retryDesignRecovery(): Promise<void> {
    if (!designRecoveryState || artifactBusy) {
      return;
    }

    if (designRecoveryState.source === "email" && designRecoveryState.messageId) {
      const message = emailMessages.find((candidate) => candidate.id === designRecoveryState.messageId) ?? tryItNowEmail;
      if (message?.id === designRecoveryState.messageId) {
        await generateArtifactFromEmail(message, undefined, { mode: "open-design" });
        return;
      }
    }

    if (designRecoveryState.source === "revision" && activeArtifact) {
      await reviseActiveArtifactWithAi();
      return;
    }

    setArtifactPrompt(designRecoveryState.prompt);
    await generateArtifactFromPrompt();
  }

  async function generateArtifactFromEmail(message: EmailMessageSummary, preferredKind?: ArtifactKind, options: EmailWorkOptions = {}): Promise<boolean> {
    const mode = options.mode ?? "background";
    const isAutoDraft = mode === "auto-draft";
    const shouldOpenDesign = mode === "open-design";
    const taskIds = options.taskIds ?? productivityTasks.filter((task) => task.source.messageId === message.id && task.state !== "done").map((task) => task.id);
    const relatedTasks = productivityTasks.filter((task) => taskIds.includes(task.id) || task.source.messageId === message.id);

    if (shouldPrepareResponseDraftForEmail(message, relatedTasks, preferredKind)) {
      setBuildingWorkMessageIds((messageIds) => (messageIds.includes(message.id) ? messageIds : [...messageIds, message.id]));
      const saved = await saveResponseDraftFromEmail(message, taskIds);
      setBuildingWorkMessageIds((messageIds) => messageIds.filter((messageId) => messageId !== message.id));
      if (!isAutoDraft && saved) {
        showProductivityDraftReader(`response-draft:${message.id}`);
        setBackgroundWorkStatus("Response draft ready for review. Autopilot skipped the expensive artifact path because no deck, document, or website was requested.");
      }
      return saved;
    }

    if (!isAutoDraft) {
      setArtifactBusy(true);
      setArtifactStatus(`Autopilot is building work from "${message.subject || "email"}"...`);
      setBackgroundWorkStatus(`Working on "${message.subject || "email"}" in the Design workspace.`);
      clearDesignRecovery();
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
        const isPreviewDraft = result.usedFallback && result.model === "preview";
        setArtifactStatus(
          isPreviewDraft
            ? `Local preview draft created from ${message.from}. Connect the secure AI backend for export-ready generation.`
            : result.usedFallback
            ? `AI unavailable: saved a local fallback ${getArtifactKindLabel(result.artifact.kind).toLowerCase()} for review. ${result.reason ?? "Connect the secure AI backend for full-quality generation."}`
            : `${getArtifactKindLabel(result.artifact.kind)} created from ${message.from}.`
        );
        if (result.usedFallback) {
          recordDesignRecovery({
            source: "email",
            prompt: message.actionText || message.snippet || message.subject,
            messageId: message.id,
            artifactId: result.artifact.id,
            status: "reconnect_required",
            reason: isPreviewDraft
              ? "Browser preview used a local design draft so you can test the workspace. Connect the secure AI backend for frontier-quality generation."
              : result.reason ?? "The secure AI backend was unavailable, so the artifact is a blocked placeholder.",
            technicalDetails: isPreviewDraft
              ? "The draft is intentionally local and review-only. Production AI generation still runs through the authenticated backend."
              : "Fallback artifacts stay visible for continuity but are not export-ready until regenerated."
          });
        } else {
          clearDesignRecovery();
        }
        setBackgroundWorkStatus(
          result.usedFallback
            ? `Fallback ${getArtifactKindLabel(result.artifact.kind).toLowerCase()} ready in Design. Review before using it.`
            : `${getArtifactKindLabel(result.artifact.kind)} ready in the Design workspace.`
        );
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
        recordDesignRecovery({
          source: "email",
          prompt: message.actionText || message.snippet || message.subject,
          messageId: message.id,
          reason: result.reason,
          technicalDetails: "Autopilot kept the source email and last canvas state available so you can retry after reconnecting AI."
        });
      }
      setBuildingWorkMessageIds((messageIds) => messageIds.filter((messageId) => messageId !== message.id));
      if (!isAutoDraft) {
        setArtifactBusy(false);
      }
      return false;
    }
  }

  async function runTryItNowEmailArtifactDemo(): Promise<void> {
    const message = createTryItNowEmailMessage();
    setTryItNowEmail(message);
    setSelectedInboxEmailId(message.id);
    setExpandedEmailIds((ids) => (ids.includes(message.id) ? ids : [message.id, ...ids]));
    setTryItNowArtifactId(null);
    setArtifactBusy(true);
    setArtifactStatus("Running the email-to-artifact demo...");
    setBackgroundWorkStatus("Demo: email arrived -> route -> generate deck -> quality check -> approval.");

    const result = await autopilot.agent
      .startRun({
        preferredKind: "slide_deck",
        prompt: `Sample Gmail message for the Autopilot email-to-artifact demo.

From: ${message.from} <${message.fromEmail}>
Subject: ${message.subject}
Body: ${message.actionText}

Turn this into the implicit deliverable. The output should prove the wedge: a leadership-ready deck that a user can review, edit, approve, or reject side-by-side with the email.`
      })
      .catch((error: unknown) => ({
        success: false as const,
        reason: error instanceof Error ? error.message : "Autopilot could not run the sample email demo."
      }));

    if (result.success) {
      setActionPlans((plans) => [result.plan, ...plans.filter((plan) => plan.id !== result.plan.id)]);
      setAgentRuns((runs) => [result.run, ...runs.filter((run) => run.id !== result.run.id)]);
      setTryItNowArtifactId(result.artifact.id);
      setActiveArtifactId(result.artifact.id);
      await refreshArtifacts();
      await saveProductivityDraftFromEmail(message, result.artifact, result.plan);
      setArtifactStatus(
        result.usedFallback
          ? `Demo used an offline fallback: ${result.reason ?? "connect the AI backend to see the full-quality output."}`
          : "Demo deck created. Review it beside the sample email."
      );
      setBackgroundWorkStatus(
        result.usedFallback
          ? "Demo fallback is visible so it cannot be mistaken for finished AI work."
          : "Demo complete: email, generated deck, quality check, and approval controls are ready."
      );
    } else {
      setArtifactStatus(result.reason);
      setBackgroundWorkStatus(result.reason);
    }
    setArtifactBusy(false);
  }

  async function approveSelectedEmailArtifact(): Promise<void> {
    if (!selectedInboxArtifact) {
      setEmailSyncStatus("Generate an artifact from the selected email before approving it.");
      return;
    }

    if (selectedInboxActionPlan) {
      const runs = await autopilot.agent.approveFinalStep(selectedInboxActionPlan.id).catch(() => null);
      if (runs) {
        setAgentRuns(runs);
      }
    }

    if (selectedInboxDraft) {
      const nextDrafts = await autopilot.productivity
        .upsertDraft({
          ...selectedInboxDraft,
          status: "approved",
          preview: `Approved: ${selectedInboxDraft.preview}`
        })
        .catch(() => null);
      if (nextDrafts) {
        productivityDraftsRef.current = nextDrafts;
        setProductivityDrafts(nextDrafts);
      }
    }

    setEmailSyncStatus(`Approved "${selectedInboxArtifact.title}" for the next user-controlled step.`);
  }

  function editSelectedEmailArtifact(): void {
    if (!selectedInboxArtifact) {
      setEmailSyncStatus("Generate an artifact from the selected email before editing it.");
      return;
    }

    setActiveArtifactId(selectedInboxArtifact.id);
    setArtifactStatus(`Editing "${selectedInboxArtifact.title}" from the email review view.`);
    showDesignWorkspace();
  }

  function rejectSelectedEmailArtifact(): void {
    if (selectedInboxDraft) {
      deleteProductivityDraft(selectedInboxDraft.id);
    }
    setEmailSyncStatus("Rejected the generated artifact. The source email stays in the Inbox.");
  }

  async function generateArtifactFromPrompt(event?: FormEvent<HTMLFormElement>, promptOverride?: string): Promise<void> {
    event?.preventDefault();
    const prompt = (promptOverride ?? artifactPrompt).trim();
    if (!prompt || artifactBusy) {
      return;
    }

    if (await createAndRunAutomationFromWorkspace(prompt, "design")) {
      void refreshAutomationState();
      return;
    }

    const translatedPrompt = await autopilot.assistant
      .translateDesignPrompt({
        prompt,
        sourceKind: "prompt",
        currentArtifactKind:
          activeArtifact?.kind === "document" || activeArtifact?.kind === "slide_deck" || activeArtifact?.kind === "website_design"
            ? activeArtifact.kind
            : undefined,
        sourcePreview: activeArtifactVersion ? artifactContentToEditorText(activeArtifactVersion.content).slice(0, 1800) : undefined
      })
      .catch((error: unknown) => ({
        success: false as const,
        refinedPrompt: prompt,
        options: [],
        reason: error instanceof Error ? error.message : "Design prompt translation failed."
      }));
    if (translatedPrompt.success && translatedPrompt.followUpQuestion && translatedPrompt.options.length >= 3) {
      setDesignPromptSuggestions(translatedPrompt.options.slice(0, 4));
      setDesignPromptStatus(`${translatedPrompt.followUpQuestion} Choose an option or add detail in the prompt box.`);
      setArtifactStatus("Autopilot needs one design detail before using the frontier design model.");
      return;
    }

    const promptForGeneration = translatedPrompt.success && translatedPrompt.refinedPrompt ? translatedPrompt.refinedPrompt : prompt;
    let projectRecordIdForGeneration = activeDesignProjectRecordId;
    if (!projectRecordIdForGeneration && blankDesignProjectName) {
      const projectRecord = createBlankDesignProjectRecord(blankDesignProjectName, "user", promptForGeneration);
      projectRecordIdForGeneration = projectRecord.id;
      setDesignProjectRecords((currentRecords) => [projectRecord, ...currentRecords].slice(0, 120));
      setActiveDesignProjectRecordId(projectRecord.id);
    }
    if (projectRecordIdForGeneration) {
      setDesignProjectRecords((currentRecords) =>
        currentRecords.map((record) =>
          record.id === projectRecordIdForGeneration
            ? {
                ...record,
                summary: `Generating: ${promptForGeneration.slice(0, 220)}`,
                status: "generating",
                updatedAt: Date.now()
              }
            : record
        )
      );
    }
    setArtifactBusy(true);
    setArtifactStatus(
      translatedPrompt.success && translatedPrompt.model
        ? `Prompt translated by ${translatedPrompt.model}. Autopilot is generating the artifact with the frontier design model...`
        : "Autopilot is generating an artifact..."
    );
    clearDesignRecovery();
    showDesignWorkspace();
    const result = await autopilot.agent
      .startRun({ prompt: promptForGeneration })
      .catch((error: unknown) => ({
        success: false as const,
        reason: error instanceof Error ? error.message : "Autopilot could not generate that artifact."
      }));

    if (result.success) {
      setActionPlans((plans) => [result.plan, ...plans.filter((plan) => plan.id !== result.plan.id)]);
      setActiveArtifactId(result.artifact.id);
      setBlankDesignProjectName("");
      if (projectRecordIdForGeneration) {
        setActiveDesignProjectRecordId(projectRecordIdForGeneration);
        setDesignProjectRecords((currentRecords) =>
          currentRecords.map((record) =>
            record.id === projectRecordIdForGeneration
              ? {
                  ...record,
                  summary: result.artifact.summary || record.summary,
                  artifactKindHint: result.artifact.kind,
                  artifactIds: [result.artifact.id, ...record.artifactIds.filter((artifactId) => artifactId !== result.artifact.id)].slice(0, 80),
                  status: result.usedFallback ? "failed_recoverable" : "ready",
                  updatedAt: result.artifact.updatedAt,
                  sourceLabel: result.artifact.source.label || record.sourceLabel
                }
              : record
          )
        );
      }
      await refreshArtifacts();
      setAgentRuns((runs) => [result.run, ...runs.filter((run) => run.id !== result.run.id)]);
      const isPreviewDraft = result.usedFallback && result.model === "preview";
      setArtifactStatus(
        isPreviewDraft
          ? `Local preview draft created for ${getArtifactKindLabel(result.artifact.kind).toLowerCase()}. Connect the secure AI backend for export-ready generation.`
          : result.usedFallback
          ? `AI unavailable: saved a local fallback ${getArtifactKindLabel(result.artifact.kind).toLowerCase()}. ${result.reason ?? "Connect the secure AI backend for full generation."}`
          : `${getArtifactKindLabel(result.artifact.kind)} created. Keep prompting to revise it.`
      );
      if (result.usedFallback) {
        recordDesignRecovery({
          source: "prompt",
          prompt: promptForGeneration,
          artifactId: result.artifact.id,
          status: "reconnect_required",
          reason: isPreviewDraft
            ? "Browser preview used a local design draft so you can test the workspace. Connect the secure AI backend for frontier-quality generation."
            : result.reason ?? "The secure AI backend was unavailable, so this is a blocked placeholder.",
          technicalDetails: isPreviewDraft
            ? "The draft is intentionally local and review-only. Production AI generation still runs through the authenticated backend."
            : "The canvas keeps the placeholder visible, but export stays behind the quality gate until the AI backend recovers."
        });
      } else {
        clearDesignRecovery();
      }
    } else {
      if (projectRecordIdForGeneration) {
        setDesignProjectRecords((currentRecords) =>
          currentRecords.map((record) =>
            record.id === projectRecordIdForGeneration
              ? {
                  ...record,
                  summary: `Generation needs retry: ${result.reason}`,
                  status: "failed_recoverable",
                  updatedAt: Date.now()
                }
              : record
          )
        );
      }
      setArtifactStatus(result.reason);
      recordDesignRecovery({
        source: "prompt",
        prompt: promptForGeneration,
        reason: result.reason,
        technicalDetails: "Autopilot preserved the prompt so you can retry without rebuilding the workspace."
      });
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

  async function reviseActiveArtifactWithAi(promptOverride?: string): Promise<void> {
    if (!activeArtifact || !activeArtifactVersion || artifactBusy) {
      return;
    }

    const prompt = (promptOverride ?? artifactPrompt).trim();
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
    clearDesignRecovery();
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
      recordDesignRecovery({
        source: "revision",
        prompt,
        artifactId: activeArtifact.id,
        reason: result.reason,
        technicalDetails: "The last good artifact remains on the canvas. Retry after reconnecting AI or save a manual version."
      });
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
      setArtifactStatus(
        result.usedFallback
          ? `AI unavailable: saved a fallback revision for review. ${result.reason ?? "Connect the secure AI backend for full-quality revisions."}`
          : "AI revision saved as a new version."
      );
      if (result.usedFallback) {
        recordDesignRecovery({
          source: "revision",
          prompt,
          artifactId: activeArtifact.id,
          reason: result.reason ?? "The secure AI backend was unavailable, so the revision is blocked from export-ready status.",
          technicalDetails: "The prior artifact version is still available in version navigation."
        });
      } else {
        clearDesignRecovery();
      }
    } else {
      setArtifactStatus("Autopilot generated a revision but could not save it.");
      recordDesignRecovery({
        source: "revision",
        prompt,
        artifactId: activeArtifact.id,
        reason: "Autopilot generated a revision but could not save it.",
        technicalDetails: "The generated result did not replace the last saved artifact."
      });
    }
    setArtifactBusy(false);
  }

  function approveActiveArtifactQualityAnyway(): void {
    if (!activeArtifact || !activeGeneratedArtifactReview || activeGeneratedArtifactReview.qualityReport.passed) {
      return;
    }

    setArtifactQualityOverrideIds((currentIds) => (currentIds.includes(activeArtifact.id) ? currentIds : [...currentIds, activeArtifact.id]));
    setArtifactStatus(`Quality gate acknowledged for ${activeArtifact.title}. Export is unlocked, but the review warnings remain visible.`);
  }

  function blockArtifactExportForQuality(): boolean {
    if (!activeArtifact || !activeGeneratedArtifactReview || !activeArtifactQualityGateBlocked) {
      return false;
    }

    const failures = activeGeneratedArtifactReview.qualityReport.failedChecks.map((check) => check.label).slice(0, 3).join(", ");
    setDesignAiPanelOpen(true);
    setArtifactStatus(`Quality gate blocked export: ${failures || "review failed checks"}. Revise the artifact or choose Approve anyway.`);
    return true;
  }

  async function exportActiveArtifact(): Promise<void> {
    if (!activeArtifact || artifactBusy) {
      return;
    }

    if (blockArtifactExportForQuality()) {
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
    setArtifactStatus(result.success ? `Exported to ${result.path}` : result.reason);
    setArtifactBusy(false);
  }

  async function shareActiveArtifact(): Promise<void> {
    if (!activeArtifact || !designCanvasVersion || artifactBusy) {
      setArtifactStatus("Select an artifact before sharing.");
      return;
    }

    if (blockArtifactExportForQuality()) {
      return;
    }

    const shareText = artifactContentToShareText(activeArtifact, designCanvasVersion.content);
    if (!navigator.clipboard?.writeText) {
      setArtifactStatus("Clipboard sharing is unavailable in this browser preview. Export the artifact instead.");
      return;
    }

    setArtifactBusy(true);
    setArtifactStatus(`Preparing share summary for ${activeArtifact.title}...`);
    try {
      await navigator.clipboard.writeText(shareText);
      setArtifactStatus(`Copied a review-ready share summary for ${activeArtifact.title}.`);
    } catch (error) {
      setArtifactStatus(error instanceof Error ? error.message : "Could not copy the artifact share summary.");
    } finally {
      setArtifactBusy(false);
    }
  }

  async function exportActiveArtifactToCoding(): Promise<void> {
    if (!activeArtifact || artifactBusy) {
      return;
    }

    if (blockArtifactExportForQuality()) {
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

  async function applyDesignPromptSuggestion(suggestion: string): Promise<void> {
    const prompt = suggestion.trim();
    if (!prompt || artifactBusy) {
      return;
    }

    setArtifactPrompt(prompt);
    setDesignAiPanelOpen(true);
    setArtifactStatus("Applying that design direction with Autopilot.");
    if (activeArtifact && activeArtifactVersion) {
      await reviseActiveArtifactWithAi(prompt);
    } else {
      await generateArtifactFromPrompt(undefined, prompt);
    }
    void generateDesignPromptSuggestions();
  }

  function previewDesignPromptSuggestion(suggestion: string): void {
    const prompt = suggestion.trim();
    if (!prompt) {
      return;
    }

    setArtifactPrompt(prompt);
    setDesignAiPanelOpen(true);
    setDesignPreviewMode(Boolean(activeArtifact));
    setArtifactStatus(activeArtifact ? "Preview direction loaded. Press Apply AI to revise the artifact." : "Prompt direction loaded. Press Generate to create the artifact.");
  }

  function dismissDesignPromptSuggestion(suggestion: string): void {
    setDesignPromptSuggestions((suggestions) => suggestions.filter((item) => item !== suggestion));
    setArtifactStatus("Dismissed that prompt idea.");
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

  async function addActionsFromEmailMessages(messages: EmailMessageSummary[]): Promise<{
    addedCount: number;
    engine: "openai" | "local";
    model?: string;
    reason?: string;
  }> {
    const readableMessages = filterBlockedEmailMessages(messages, normalizedBlockedEmailSenders);
    const skippedBlockedCount = messages.length - readableMessages.length;
    if (readableMessages.length === 0) {
      return { addedCount: 0, engine: "local" };
    }

    const analysis = await autopilot.email.analyzeActions(readableMessages).catch((error: unknown) => ({
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
        reason: skippedBlockedCount > 0 ? `${analysis.reason ?? ""} ${skippedBlockedCount} blocked sender message${skippedBlockedCount === 1 ? "" : "s"} skipped.`.trim() : analysis.reason
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
    const syncResult = await syncProductivityTasksFromSources(["gmail", "google-calendar"]);
    const plannerLabel = actionResult.engine === "openai" ? `OpenAI${actionResult.model ? ` (${actionResult.model})` : ""}` : "inbox review only";
    const fallbackNote = actionResult.reason ? ` ${actionResult.reason}` : "";
    setEmailSyncStatus(
      `Synced ${result.messages.length} inbox messages. Productivity routed ${syncResult.addedCount} new task${
        syncResult.addedCount === 1 ? "" : "s"
      } and updated ${syncResult.updatedCount} with ${plannerLabel}.${fallbackNote}`
    );
    setEmailBusy(false);
  }

  async function connectGmailInbox(mode: "preferred" | "autopilot" | "external" = "preferred"): Promise<void> {
    const resolvedMode = mode === "preferred" ? accountLinkOpenMode : mode;
    setEmailBusy(true);
    setEmailSyncStatus(resolvedMode === "external" ? "Opening Google sign-in in another browser." : "Opening Google sign-in inside Autopilot.");
    if (resolvedMode === "autopilot") {
      await switchToBrowserWorkspace();
    }
    const connect = resolvedMode === "external" ? autopilot.email.connectGmailExternal : autopilot.email.connectGmail;
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
      reason: resolvedMode === "external" ? "Google connection failed in the external browser." : "Google connection failed."
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
    const syncResult = await syncProductivityTasksFromSources(["gmail", "google-calendar"]);
    const plannerLabel = actionResult.engine === "openai" ? `OpenAI${actionResult.model ? ` (${actionResult.model})` : ""}` : "inbox review only";
    const fallbackNote = actionResult.reason ? ` ${actionResult.reason}` : "";
    setEmailSyncStatus(
      `Connected ${result.status.accountEmail ?? "Google"}. Productivity routed ${syncResult.addedCount} new task${
        syncResult.addedCount === 1 ? "" : "s"
      } and updated ${syncResult.updatedCount} with ${plannerLabel}.${fallbackNote}`
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
      await connectGmailInbox();
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
        await connectGmailInbox();
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
      await connectGmailInbox();
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

  function openCodingAiProjectFromWorkItem(item: WorkItem): void {
    setCodingSection("files");
    setCodingExplorerOpen(true);
    setCodingRightSidebarOpen(true);
    setCodingRightPanel("assistant");
    const chat = startNewCodingChat(activeCodingProject, item.title.slice(0, 72));
    setCodingDraftMessage(
      [
        `Productivity routed this as an AI-started coding project: ${item.title}`,
        "",
        `Source context: ${item.context}`,
        `Requested output: ${item.requestedOutput}`,
        `Route reason: ${item.routeReason}`,
        "",
        "Inspect the project, explain what you need if no folder is open, then generate a real code patch and show the diff before applying."
      ].join("\n")
    );
    openCodingAssistant(chat);
    setCodingStatus(`AI-started coding project loaded from Productivity: ${item.title}`);
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
    setCodingStatus("Choose or create a folder. Existing files will stay in place.");
    const snapshot = await autopilot.coding.createProject().catch(() => defaultCodingSnapshot);
    applyCodingSnapshot(snapshot, snapshot.activeProject ? `Using ${snapshot.activeProject.name}. Existing files are preserved.` : "No project created.");
    if (snapshot.activeProject) {
      startNewCodingChat(snapshot.activeProject, `Work in ${snapshot.activeProject.name}`);
    }
    setCodingBusy(false);
  }

  async function renameCodingProject(project: CodingProject): Promise<void> {
    const nextName = window.prompt("Rename project", project.name);
    if (nextName === null) {
      return;
    }

    const trimmedName = nextName.trim().replace(/\s+/g, " ");
    if (!trimmedName || trimmedName === project.name) {
      return;
    }

    setCodingBusy(true);
    const result = await autopilot.coding.renameProject(project.rootPath, trimmedName).catch(() => ({
      success: false as const,
      reason: "Could not rename that project.",
      snapshot: codingSnapshot
    }));
    applyCodingSnapshot(result.snapshot, result.success ? `Renamed project to ${trimmedName}.` : result.reason);
    if (result.success) {
      setCodingChats((currentChats) =>
        currentChats.map((chat) =>
          chat.projectRootPath === project.rootPath
            ? {
                ...chat,
                projectName: trimmedName,
                updatedAt: Date.now()
              }
            : chat
        )
      );
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
    setCodingPluginBrowserTab("plugins");
    setCodingRightPanel("plugins");
    setCodingRightSidebarOpen(false);
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

  function openCodingSkills(): void {
    setCodingSection("skills");
    setCodingPluginBrowserTab("skills");
    setCodingRightPanel("plugins");
    setCodingRightSidebarOpen(false);
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
      title: "Skills"
    };
    setCodingTabs((currentTabs) => [...currentTabs, tab]);
    setActiveCodingTabId(tab.id);
  }

  function openCodingProjectBoard(): void {
    setCodingSection("board");
    setCodingExplorerOpen(true);
    setCodingRightSidebarOpen(false);
    setCodingStatus("Project Board is open. Drafts, active work, ready reviews, and done checks are grouped for this project.");
    const existingTab = codingTabs.find((tab) => tab.kind === "board");
    if (existingTab) {
      setActiveCodingTabId(existingTab.id);
      return;
    }

    const tab: CodingWorkbenchTab = {
      id: createCodingTabId("board"),
      kind: "board",
      title: "Project Board"
    };
    setCodingTabs((currentTabs) => [...currentTabs, tab]);
    setActiveCodingTabId(tab.id);
  }

  function openCodingAutomationChat(): void {
    setCodingSection("files");
    setCodingExplorerOpen(true);
    setCodingRightSidebarOpen(true);
    setCodingRightPanel("assistant");
    const chat = activeCodingAssistantChat ?? startNewCodingChat(activeCodingProject, "Automation chat");
    openCodingChatTab(chat, { focus: true });
    openCodingAssistant(chat);
    setCodingDraftMessage(
      "Create a project automation. Ask me for trigger, schedule, sources, output, quality bar, and approval rules before saving anything."
    );
    setCodingStatus("Automation chat is ready in the AI sidebar. Automations stay tied to this project and require approval before external impact.");
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
    setCodingRightSidebarOpen(false);
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
    setCodingBrowserTestSessionActive(true);
    setCodingStatus("Browser Test is open. Use the sticky feedback note to send revision context back to Coding.");
    const existingTab = codingTabs.find((tab) => tab.kind === "browser");
    if (existingTab) {
      setActiveCodingTabId(existingTab.id);
      return;
    }

    const tab: CodingWorkbenchTab = {
      id: createCodingTabId("browser"),
      kind: "browser",
      title: "Browser Test"
    };
    setCodingTabs((currentTabs) => [...currentTabs, tab]);
    setActiveCodingTabId(tab.id);
  }

  async function openCodingBrowserTestWorkspace(): Promise<void> {
    if (!activeCodingProject) {
      setCodingStatus("Open a project before launching Browser Test.");
      return;
    }

    const defaultUrl = "http://127.0.0.1:5173";
    const requestedUrl = window.prompt(
      "Browser Test URL",
      codingCommandResult?.success && /^https?:\/\//iu.test(codingCommandResult.stdout.trim())
        ? codingCommandResult.stdout.trim()
        : defaultUrl
    );
    if (requestedUrl === null) {
      return;
    }

    const url = requestedUrl.trim() || defaultUrl;
    if (!/^https?:\/\//iu.test(url)) {
      setCodingStatus("Browser Test needs a local http:// or https:// URL. Start a dev server, then try again.");
      return;
    }

    try {
      setBrowserDownloadsOpen(false);
      setAssistantOpen(false);
      setCodingSection("browser");
      setCodingBrowserTestSessionActive(true);
      setCodingStatus(`Opening Browser Test for ${activeCodingProject.name} in Autopilot Browser.`);
      await switchToBrowserWorkspace();
      await autopilot.tabs.create(url);
      setCodingStatus(`Browser Test opened: ${url}. Use Coding feedback to send notes back to the agent.`);
    } catch {
      setCodingStatus("Autopilot could not open Browser Test. Start the dev server, then open its local URL.");
    }
  }

  function submitCodingBrowserFeedback(): void {
    const feedback = codingBrowserFeedbackDraft.trim();
    if (!feedback) {
      setCodingStatus("Write what you noticed in Browser Test before sending feedback.");
      return;
    }

    const targetChat = activeCodingAssistantChat ?? createCodingChatThread(activeCodingProject, "Browser test feedback");
    const userMessage = createCodingChatMessage(
      "user",
      `${codingClickSuggestMode ? "Click-to-suggest feedback" : "Browser Test feedback"}: ${feedback}`
    );
    const agentMessage = createCodingChatMessage(
      "agent",
      "Got it. I saved this as revision context for the next coding pass. I will not change files until you ask me to apply a patch."
    );
    setCodingChats((currentChats) => {
      const existingChats = currentChats.some((chat) => chat.id === targetChat.id) ? currentChats : [targetChat, ...currentChats];
      return existingChats
        .map((chat) =>
          chat.id === targetChat.id
            ? {
                ...chat,
                updatedAt: Date.now(),
                messages: [...chat.messages, userMessage, agentMessage]
              }
            : chat
        )
        .sort((leftChat, rightChat) => rightChat.updatedAt - leftChat.updatedAt)
        .slice(0, MAX_CODING_CHATS);
    });
    openCodingAssistant(targetChat);
    setCodingBrowserFeedbackDraft("");
    setCodingClickSuggestMode(false);
    setCodingStatus("Browser Test feedback saved into the Coding assistant context.");
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

  function openCodingSourceControl(): void {
    setCodingSection("files");
    setCodingRightPanel("code");
    setCodingRightSidebarOpen(true);
    setCodingStatus("Source control is open. Changed files, diffs, and approval state are ready for review.");
    void refreshCodingRepoState();
  }

  function openCodingRunPanel(): void {
    openCodingTerminal({ launchShell: false });
    setCodingCommandDraft((draft) => draft || "npm run dev");
    setCodingStatus("Run panel is open. Review or change the command, then run it from the terminal panel.");
  }

  function openCodingTestsPanel(): void {
    openCodingTerminal({ launchShell: false });
    setCodingCommandDraft("npm test -- --run");
    setCodingStatus(activeCodingProject ? "Test command is ready. Run it when you want verification output." : "Open a project before running tests.");
  }

  function openCodingNotifications(): void {
    setCodingRightPanel("summary");
    setCodingRightSidebarOpen(true);
    setCodingStatus("Notifications are summarized in the coding status and review panel.");
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
    const defaultCollapsed = rootPath !== activeCodingProject?.rootPath;
    setCollapsedCodingProjects((currentProjects) => ({
      ...currentProjects,
      [rootPath]: currentProjects[rootPath] === undefined ? !defaultCollapsed : !currentProjects[rootPath]
    }));
  }

  function toggleCodingProjectSection(rootPath: string, section: CodingProjectSection): void {
    setCollapsedCodingProjectSections((currentSections) => ({
      ...currentSections,
      [rootPath]: {
        ...currentSections[rootPath],
        [section]: !currentSections[rootPath]?.[section]
      }
    }));
  }

  async function openCodingProjectCode(project: CodingProject): Promise<void> {
    if (project.rootPath !== activeCodingProject?.rootPath) {
      await selectCodingProject(project.rootPath, { startChat: false });
    }
    setCodingSection("files");
    setCodingExplorerOpen(true);
    setCollapsedCodingProjects((currentProjects) => ({
      ...currentProjects,
      [project.rootPath]: false
    }));
    setCollapsedCodingProjectSections((currentSections) => ({
      ...currentSections,
      [project.rootPath]: {
        ...currentSections[project.rootPath],
        code: false
      }
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

  function runCodingProjectBoardAction(item: CodingProjectBoardItem): void {
    if (item.action === "openProject") {
      void openCodingProject();
      return;
    }

    if (item.action === "plan") {
      const chat = activeCodingAssistantChat ?? startNewCodingChat(activeCodingProject, item.title);
      setCodingDraftMessage(item.prompt ?? item.detail);
      void createCodingAgentPlan(item.prompt ?? item.detail, chat);
      setCodingStatus(`Started board task: ${item.title}`);
      return;
    }

    if (item.action === "reviewDiff") {
      openCodingReview(codingCursorPrimaryEditorTab?.id);
      setCodingStatus(item.title === "No diff ready yet" ? "Open a project chat and ask Autopilot to make a change first." : `Reviewing board task: ${item.title}`);
      return;
    }

    if (item.action === "runTests") {
      void runCodingProjectTool("npm test -- --run", "Running board verification tests.");
      return;
    }

    const chat = startNewCodingChat(activeCodingProject, item.title);
    setCodingDraftMessage(item.prompt ?? item.detail);
    openCodingAssistant(chat);
    setCodingStatus(`Opened board chat: ${item.title}`);
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

  function openCodingBuilderGuideChat(guide: (typeof codingBuilderGuides)[number]): void {
    const project = activeCodingProject ?? orderedCodingProjects[0] ?? null;
    startNewCodingChat(project, guide.name);
    setCodingDraftMessage(guide.prompt);
    setCodingRightPanel("assistant");
    setCodingRightSidebarOpen(true);
    setCodingStatus(`${guide.name} guide opened${project ? ` in ${project.name}` : ""}. Autopilot will turn the checklist into implementation steps.`);
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

  function useAutomationTemplate(template: "industry" | "drafts" | "repo" | "payments"): void {
    setAutomationSetup((currentSetup) => {
      if (template === "payments") {
        return {
          ...currentSetup,
          title: "Recurring invoice review",
          prompt: "Every week, review Gmail and browser finance sources for recurring invoices. Prepare payment proposals only after invoice and vendor verification, then stop for my approval.",
          schedule: "weekly",
          outputKind: "payment_proposal",
          sources: ["gmail", "web"],
          qualityBar: 98,
          requiresApproval: true
        };
      }

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
      sources: automationSetup.outputKind === "payment_proposal" ? Array.from(new Set([...automationSetup.sources, "gmail"])) : automationSetup.sources,
      sourceWorkspace: "coding",
      qualityBar: automationSetup.outputKind === "payment_proposal" ? Math.max(automationSetup.qualityBar, 98) : automationSetup.qualityBar,
      requiresApproval: automationSetup.outputKind === "payment_proposal" ? true : automationSetup.requiresApproval,
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

  async function setAutomationRecipeEnabled(recipe: AutomationRecipe | null | undefined, enabled: boolean): Promise<void> {
    if (!recipe) {
      setAutomationStatus("Select an automation before changing its schedule.");
      return;
    }

    setAutomationBusy(true);
    setAutomationStatus(`${enabled ? "Resuming" : "Stopping future runs for"} ${recipe.name}...`);
    const recipes = await autopilot.automation.updateRecipe({ id: recipe.id, enabled }).catch(() => null);
    setAutomationBusy(false);
    if (!recipes) {
      setAutomationStatus("Autopilot could not update that automation. Refresh and try again.");
      return;
    }

    setAutomationRecipes(recipes);
    await refreshAutomationState();
    setAutomationStatus(
      enabled
        ? `Resumed scheduled runs for ${recipe.name}. External actions still require approval.`
        : `Stopped future runs for ${recipe.name}. Existing receipts and run history were kept.`
    );
    setCodingStatus(enabled ? `Resumed automation: ${recipe.name}.` : `Stopped future runs for automation: ${recipe.name}.`);
  }

  async function stopAutomationRecipe(recipe: AutomationRecipe | null | undefined): Promise<void> {
    await setAutomationRecipeEnabled(recipe, false);
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

  function applyCodingAiFilePatch(patch: CodingAiFilePatch = codingAiFilePatch as CodingAiFilePatch): void {
    if (!patch || patch.status === "dismissed") {
      return;
    }

    updateCodingFileContent(patch.tabId, patch.nextContent);
    setCodingAiFilePatch({ ...patch, status: "applied" });
    setCodingAgentRun((currentRun) => {
      if (!currentRun) {
        return currentRun;
      }

      const existing = currentRun.changedFiles.some((file) => file.path === patch.relativePath);
      const changedFiles: CodingGitChangedFile[] = existing
        ? currentRun.changedFiles
        : [{ path: patch.relativePath, status: "modified", staged: false, unstaged: true }, ...currentRun.changedFiles];
      return {
        ...currentRun,
        phase: "editing",
        changedFiles,
        updatedAt: Date.now()
      };
    });
    openCodingReview(patch.tabId);
    setCodingStatus(`Applied AI patch to ${patch.relativePath}. Autosave will write it to disk, then review the diff before approval.`);
  }

  function dismissCodingAiFilePatch(): void {
    setCodingAiFilePatch((currentPatch) => (currentPatch ? { ...currentPatch, status: "dismissed" } : currentPatch));
    setCodingStatus("AI patch proposal dismissed.");
  }

  function shouldUseLocalCodingStarterTemplates(): boolean {
    return isBrowserPreview;
  }

  async function requestCodingAiPatchForActiveFile(goal: string, plan: CodingAgentPlan, run: CodingAgentRun): Promise<string> {
    type CodingAiPatchTarget = {
      tabId: string;
      path: string;
      relativePath: string;
      originalContent: string;
      fromOpenTab: boolean;
      isNewFile?: boolean;
    };

    async function resolvePatchTarget(): Promise<CodingAiPatchTarget | null> {
      if (activeTextCodingTab) {
        return {
          tabId: activeTextCodingTab.id,
          path: activeTextCodingTab.file.path,
          relativePath: activeTextCodingTab.file.relativePath,
          originalContent: getCodingTabContent(activeTextCodingTab),
          fromOpenTab: true
        };
      }

      const candidates = new Map<string, { path: string; relativePath: string; bonus: number }>();
      const addCandidate = (pathValue: string | undefined, relativePathValue: string | undefined, bonus: number): void => {
        if (!pathValue || !relativePathValue || !isLikelyCodingCodeFile(relativePathValue)) {
          return;
        }
        const key = normalizeLocalPathForCompare(pathValue);
        const current = candidates.get(key);
        if (!current || current.bonus < bonus) {
          candidates.set(key, { path: pathValue, relativePath: relativePathValue, bonus });
        }
      };

      for (const tab of textCodingTabs) {
        if (!tab.path || (activeCodingProject && tab.projectRootPath && tab.projectRootPath !== activeCodingProject.rootPath)) {
          continue;
        }
        addCandidate(tab.path, tab.file.relativePath, 95);
      }

      for (const item of activeProjectRecentCodeItems) {
        if (item.kind === "file") {
          addCandidate(item.path, item.path, item.openedTabId ? 86 : 58);
        }
      }

      if (activeCodingProject) {
        for (const relativePath of plan.schema.touchedFiles) {
          if (!/^[\w./\\ -]+\.[\w]+$/u.test(relativePath) || /Use search|before editing|inspect/iu.test(relativePath)) {
            continue;
          }
          addCandidate(joinLocalPath(activeCodingProject.rootPath, relativePath), relativePath, 72);
        }
      }

      const codeNodes: CodingTreeNode[] = [];
      collectCodingCodeNodes(codingSnapshot.tree?.children, codeNodes, 120);
      for (const node of codeNodes) {
        addCandidate(node.path, node.relativePath, 40);
      }

      const sortedCandidates = [...candidates.values()]
        .map((candidate) => ({
          ...candidate,
          score: candidate.bonus + getCodingEditTargetScore(candidate.relativePath, goal)
        }))
        .filter((candidate) => candidate.score > 0)
        .sort((left, right) => right.score - left.score)
        .slice(0, 10);

      const createGeneratedTarget = async (): Promise<CodingAiPatchTarget | null> => {
        if (!activeCodingProject) {
          return null;
        }

        const relativePath = getCodingGeneratedFileRelativePath(goal, activeCodingProjectCodeNodes);
        if (!relativePath) {
          return null;
        }

        const generatedPath = joinLocalPath(activeCodingProject.rootPath, relativePath);
        const existing = await autopilot.coding.readPath(generatedPath).catch(() => null);
        if (existing?.success && existing.kind === "text") {
          const existingTab = textCodingTabs.find((tab) => tab.path && normalizeLocalPathForCompare(tab.path) === normalizeLocalPathForCompare(generatedPath));
          if (existingTab) {
            return {
              tabId: existingTab.id,
              path: existingTab.file.path,
              relativePath: existingTab.file.relativePath,
              originalContent: getCodingTabContent(existingTab),
              fromOpenTab: true
            };
          }

          const existingFileTab: CodingWorkbenchTab = {
            id: createCodingTabId("file", existing.path),
            kind: "file",
            title: existing.name,
            path: existing.path,
            projectRootPath: activeCodingProject.rootPath,
            file: existing,
            content: existing.content,
            baseContent: existing.content,
            savedAt: existing.modifiedAt
          };
          upsertCodingTab(existingFileTab);
          return {
            tabId: existingFileTab.id,
            path: existing.path,
            relativePath: existing.relativePath,
            originalContent: existing.content,
            fromOpenTab: false
          };
        }

        const now = Date.now();
        const fileName = getLocalPathName(relativePath);
        const newFileTab: CodingWorkbenchTab = {
          id: createCodingTabId("file", generatedPath),
          kind: "file",
          title: fileName,
          path: generatedPath,
          projectRootPath: activeCodingProject.rootPath,
          file: {
            success: true,
            kind: "text",
            name: fileName,
            path: generatedPath,
            relativePath,
            content: "",
            language: getCodingLanguageFromPath(relativePath),
            size: 0,
            modifiedAt: now
          },
          content: "",
          baseContent: "",
          savedAt: now
        };
        upsertCodingTab(newFileTab);
        return {
          tabId: newFileTab.id,
          path: generatedPath,
          relativePath,
          originalContent: "",
          fromOpenTab: false,
          isNewFile: true
        };
      };

      if ((sortedCandidates[0]?.score ?? 0) < 150) {
        const generatedTarget = await createGeneratedTarget();
        if (generatedTarget) {
          return generatedTarget;
        }
      }

      for (const candidate of sortedCandidates) {
        const existingTab = textCodingTabs.find((tab) => tab.path && normalizeLocalPathForCompare(tab.path) === normalizeLocalPathForCompare(candidate.path));
        if (existingTab) {
          return {
            tabId: existingTab.id,
            path: existingTab.file.path,
            relativePath: existingTab.file.relativePath,
            originalContent: getCodingTabContent(existingTab),
            fromOpenTab: true
          };
        }

        const result = await autopilot.coding.readPath(candidate.path).catch(() => null);
        if (!result?.success || result.kind !== "text") {
          continue;
        }

        const tab: CodingWorkbenchTab = {
          id: createCodingTabId("file", result.path),
          kind: "file",
          title: result.name,
          path: result.path,
          projectRootPath: activeCodingProject?.rootPath ?? null,
          file: result,
          content: result.content,
          baseContent: result.content,
          savedAt: result.modifiedAt
        };
        upsertCodingTab(tab);
        return {
          tabId: tab.id,
          path: result.path,
          relativePath: result.relativePath,
          originalContent: result.content,
          fromOpenTab: false
        };
      }

      return createGeneratedTarget();
    }

    setCodingAiFilePatch(null);
    if (!shouldAttemptCodingFileEdit(goal)) {
      return "";
    }

    const target = await resolvePatchTarget();
    if (!target) {
      return "\n\nCode generation needs an editable file target. I could not find a safe app file to change, so open the file you want edited and ask again.";
    }

    if (target.originalContent.length > 80_000) {
      return `\n\nCode generation skipped: ${target.relativePath} is too large for a safe single-file AI patch. Open a smaller file or ask for a scoped change.`;
    }

    const stageGeneratedPatch = (parsedPatch: { explanation: string; nextContent: string }, sourceLabel = "Generated"): string => {
      if (parsedPatch.nextContent === target.originalContent) {
        return `\n\nCode generation skipped: the model chose not to change ${target.relativePath}. ${parsedPatch.explanation}`;
      }

      const patch: CodingAiFilePatch = {
        id: `coding-file-patch:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`,
        tabId: target.tabId,
        path: target.path,
        relativePath: target.relativePath,
        explanation: parsedPatch.explanation,
        originalContent: target.originalContent,
        nextContent: parsedPatch.nextContent,
        status: codingSnapshot.accessMode === "full" ? "applied" : "pending",
        createdAt: Date.now()
      };

      setCodingAiFilePatch(patch);
      if (codingSnapshot.accessMode === "full") {
        applyCodingAiFilePatch(patch);
        return `\n\n${sourceLabel} and applied code in ${patch.relativePath}: ${patch.explanation}`;
      }

      const patchVerb = sourceLabel === "Generated" ? "Generated a code patch for" : `${sourceLabel} a code patch for`;
      return `\n\n${patchVerb} ${patch.relativePath}: ${patch.explanation}\n\nApproval mode is on, so I did not write it yet. Use Apply edits in the Review panel to edit the file and inspect the diff.${target.fromOpenTab ? "" : target.isNewFile ? "\n\nI created a new editable file target so the generated code has a real place to land." : "\n\nI opened the most likely app file automatically so you can see exactly what will change."}`;
    };

    const editResponse = await autopilot.assistant
      .ask({
        prompt: `You are Autopilot's coding editor. Produce a safe full-file replacement for exactly one project file.

Return ONLY JSON with this shape:
{"explanation":"short explanation","newContent":"complete replacement file content"}

Rules:
- Preserve unrelated code and formatting.
- Do not omit imports, comments, or existing code unless the user explicitly requested removal.
- If the user asks to build, create, generate, or implement something, make the best self-contained implementation in this file instead of only describing a plan.
- If the request truly needs other files, still make the safest useful change in this file and mention the follow-up in explanation.
- Keep explanations plain and user-facing.
- Do not include markdown fences outside the JSON.

User request:
${goal}

Project plan:
${plan.summary}

Run id: ${run.id}
File path: ${target.relativePath}

Current file content:
${target.originalContent || "(new file - create the complete file content)"}`,
        task: "coding_agent",
        sources: ["coding-project"],
        responseFormat: "json_object",
        timeoutMs: 110_000
      })
      .catch((error: unknown) => ({
        success: false,
        answer: "",
        sources: [],
        reason: error instanceof Error ? error.message : "AI file edit failed."
    }));

    if (!editResponse.success) {
      const localFallback = shouldUseLocalCodingStarterTemplates() ? buildLocalCodingFallbackPatch(goal, target.relativePath, target.originalContent) : null;
      if (localFallback) {
        return stageGeneratedPatch(
          localFallback,
          "AI model unavailable, so Autopilot used a clearly labeled local starter template and generated"
        );
      }
      return `\n\nCode generation blocked: ${editResponse.reason ?? "The AI backend did not return a patch."}\n\nNo code was generated or applied. Use Retry, send a shorter prompt, or check AI setup.`;
    }

    const parsedPatch = parseCodingFilePatchResponse(editResponse.answer);
    if (!parsedPatch) {
      const localFallback = shouldUseLocalCodingStarterTemplates() ? buildLocalCodingFallbackPatch(goal, target.relativePath, target.originalContent) : null;
      if (localFallback) {
        return stageGeneratedPatch(
          localFallback,
          "The model response was not a valid patch, so Autopilot used a clearly labeled local starter template and generated"
        );
      }
      return "\n\nCode generation blocked: the model did not return a valid JSON file patch.\n\nNo code was generated or applied. Use Retry, send a shorter prompt, or check AI setup.";
    }

    return stageGeneratedPatch(parsedPatch);
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
      setCodingAgentRun(null);
      setCodingAiFilePatch(null);
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
    setCodingAgentRun((currentRun) => (currentRun ? { ...currentRun, approvalState: "approved", updatedAt: Date.now() } : currentRun));
    setCodingStatus("Coding work approved locally. Sending, committing, pushing, deleting, and publishing still need their own explicit approval.");
  }

  function rejectCodingAgentPlan(): void {
    advanceActiveCodingPlan("rejected");
    setCodingAgentRun((currentRun) => (currentRun ? { ...currentRun, approvalState: "rejected", updatedAt: Date.now() } : currentRun));
    setCodingStatus("Coding work marked for revision. Ask Autopilot for changes before approving.");
  }

  function clearCodingRunWatchdog(): void {
    if (codingRunWatchdogRef.current) {
      window.clearTimeout(codingRunWatchdogRef.current);
      codingRunWatchdogRef.current = null;
    }
  }

  function isCurrentCodingRun(runToken: number): boolean {
    return codingRunInFlightRef.current && codingRunTokenRef.current === runToken;
  }

  function appendCodingAgentMessage(chatId: string | null | undefined, content: string): void {
    if (!chatId) {
      return;
    }

    const agentMessage = createCodingChatMessage("agent", content);
    setCodingChats((currentChats) =>
      currentChats.map((chat) =>
        chat.id === chatId
          ? {
              ...chat,
              updatedAt: Date.now(),
              messages: [...chat.messages, agentMessage]
            }
          : chat
      )
    );
  }

  function markCodingRunStatus(runToken: number, status: CodingRunStatus, message: string): void {
    if (!isCurrentCodingRun(runToken)) {
      return;
    }

    setCodingRunStatus(status);
    setCodingRunHeartbeat({
      runToken,
      status,
      message,
      updatedAt: Date.now()
    });
    setCodingStatus(message);
  }

  function beginCodingVisibleRun(prompt: string, chatId: string): number {
    clearCodingRunWatchdog();
    const runToken = codingRunTokenRef.current + 1;
    codingRunTokenRef.current = runToken;
    codingRunInFlightRef.current = true;
    setLastCodingRunPrompt(prompt);
    setCodingRunTimeout(null);
    setCodingRunStatus("queued");
    setCodingRunHeartbeat({
      runToken,
      status: "queued",
      message: "Queued the coding run. Autopilot is acknowledging your prompt and preparing the first step.",
      updatedAt: Date.now()
    });
    setCodingBusy(true);
    setCodingStatus("Queued coding run. Autopilot is starting now.");

    codingRunWatchdogRef.current = window.setTimeout(() => {
      if (!isCurrentCodingRun(runToken)) {
        return;
      }

      const reason = "The coding AI took longer than expected, so Autopilot stopped the visible run instead of leaving the composer frozen.";
      codingRunInFlightRef.current = false;
      codingRunWatchdogRef.current = null;
      setCodingBusy(false);
      setCodingRunStatus("blocked");
      setCodingRunHeartbeat({
        runToken,
        status: "blocked",
        message: reason,
        updatedAt: Date.now()
      });
      setCodingRunTimeout({
        runToken,
        status: "blocked",
        reason,
        prompt,
        elapsedMs: CODING_RUN_WATCHDOG_MS,
        actions: ["retry", "shorter_prompt", "check_ai_setup"],
        updatedAt: Date.now()
      });
      setCodingStatus("Coding run blocked. Retry, send a shorter prompt, or check AI setup.");
      appendCodingAgentMessage(
        chatId,
        "The coding run stalled, so I stopped the visible run and kept the log intact. You can retry, shorten the prompt, or check AI setup. No code was applied."
      );
    }, CODING_RUN_WATCHDOG_MS);

    return runToken;
  }

  function finishCodingVisibleRun(runToken: number, status: CodingRunStatus, message: string): void {
    if (!isCurrentCodingRun(runToken)) {
      return;
    }

    clearCodingRunWatchdog();
    codingRunInFlightRef.current = false;
    setCodingBusy(false);
    setCodingRunStatus(status);
    setCodingRunHeartbeat({
      runToken,
      status,
      message,
      updatedAt: Date.now()
    });
    setCodingStatus(message);
  }

  function blockCodingVisibleRun(runToken: number, reason: string, prompt: string): void {
    if (!isCurrentCodingRun(runToken)) {
      return;
    }

    clearCodingRunWatchdog();
    codingRunInFlightRef.current = false;
    setCodingBusy(false);
    setCodingRunStatus("blocked");
    setCodingRunHeartbeat({
      runToken,
      status: "blocked",
      message: reason,
      updatedAt: Date.now()
    });
    setCodingRunTimeout({
      runToken,
      status: "blocked",
      reason,
      prompt,
      elapsedMs: 0,
      actions: ["retry", "shorter_prompt", "check_ai_setup"],
      updatedAt: Date.now()
    });
    setCodingStatus(reason);
  }

  function retryLastCodingRun(): void {
    const prompt = lastCodingRunPrompt.trim();
    if (!prompt) {
      setCodingStatus("No previous coding prompt is available to retry.");
      return;
    }

    setCodingDraftMessage(prompt);
    setCodingRunTimeout(null);
    void sendCodingChatMessage(prompt);
  }

  function prepareShorterCodingPrompt(): void {
    const prompt = lastCodingRunPrompt.trim();
    if (!prompt) {
      setCodingStatus("No previous coding prompt is available to shorten.");
      return;
    }

    setCodingDraftMessage(`Make the smallest safe version first, then show the diff: ${prompt.slice(0, 420)}`);
    setCodingRunTimeout(null);
    setCodingStatus("Shorter retry prompt prepared. Press Send when you want Autopilot to try again.");
  }

  function openCodingAiSetup(): void {
    setView("settings");
    setCodingRunTimeout(null);
    setCodingStatus("Settings opened. Check AI backend readiness, model routing, and Supabase configuration.");
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
    setCodingAgentRun(null);
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
    setCodingAgentRun((currentRun) =>
      currentRun
        ? {
            ...currentRun,
            phase: result.success ? "review" : "testing",
            commands: [...currentRun.commands, result].slice(-12),
            testResults: [
              ...currentRun.testResults,
              result.success
                ? `${result.command} exited ${result.exitCode} in ${result.durationMs}ms.`
                : `${result.command} failed: ${result.reason ?? result.stderr ?? "unknown error"}`
            ].slice(-12),
            updatedAt: Date.now()
          }
        : currentRun
    );
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
    if (result.success) {
      setCodingAgentRun((currentRun) =>
        currentRun
          ? {
              ...currentRun,
              phase: "review",
              diff: result.diff,
              updatedAt: Date.now()
            }
          : currentRun
      );
      advanceActiveCodingPlan("diff_viewed");
    }
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
    setCodingAgentRun((currentRun) =>
      currentRun
        ? {
            ...currentRun,
            phase: result.success ? "review" : "testing",
            commands: [...currentRun.commands, result].slice(-12),
            testResults: [
              ...currentRun.testResults,
              result.success
                ? `${result.command} exited ${result.exitCode} in ${result.durationMs}ms.`
                : `${result.command} failed: ${result.reason ?? result.stderr ?? "unknown error"}`
            ].slice(-12),
            updatedAt: Date.now()
          }
        : currentRun
    );
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

  async function startWorkGraphSafeWork(item: WorkGraphItem): Promise<void> {
    if (workGraphBusyIds[item.id]) {
      return;
    }

    setSelectedWorkGraphItemId(item.id);
    setWorkGraphBusyIds((current) => ({ ...current, [item.id]: true }));
    const chatSuggestionId = getChatSuggestionIdFromWorkTwinItem(item);
    if (chatSuggestionId) {
      const accepted = await acceptEnterpriseChatSuggestion(chatSuggestionId);
      setWorkGraphStatus(
        accepted
          ? `Chat ask accepted: "${item.title}" is now available as routed Productivity work.`
          : `Chat ask could not be accepted: "${item.title}".`
      );
      setWorkGraphBusyIds((current) => {
        const next = { ...current };
        delete next[item.id];
        return next;
      });
      return;
    }

    setWorkGraphStatus(`Starting safe work for "${item.title}". External-impact actions stay approval-gated.`);
    const result = await autopilot.workGraph.startSafeWork(item.id).catch((error: unknown) => ({
      success: false as const,
      reason: error instanceof Error ? error.message : "Work Twin could not start safe work.",
      snapshot: workGraphSnapshot ?? undefined
    }));
    if (result.snapshot) {
      setWorkGraphSnapshot(result.snapshot);
    }
    await Promise.all([refreshWorkOrchestration(), refreshArtifacts(), refreshAutomationState()]);
    setWorkGraphStatus(result.reason ?? (result.success ? "Safe work started." : "Safe work could not start."));
    setWorkGraphBusyIds((current) => {
      const next = { ...current };
      delete next[item.id];
      return next;
    });
  }

  async function previewAgentRuntimePlan(item: WorkGraphItem): Promise<void> {
    if (agentRuntimeBusy) {
      return;
    }

    setSelectedWorkGraphItemId(item.id);
    setAgentRuntimeBusy(true);
    setAgentRuntimeStatus(`Agent Runtime is planning "${item.title}" with approval gates on.`);
    const trace = await autopilot.runtimeAgent
      .run({
        workspace: item.route.workspace,
        sourceId: item.id,
        shadowMode: true,
        intent: `${item.source.kind} to ${item.route.workspace}: ${item.route.reason}`,
        prompt: [
          `Review this Work Twin item: ${item.title}.`,
          `Source: ${item.source.kind} - ${item.source.label}.`,
          `Ask: ${item.summary}`,
          `Plan safe work only, record proof, and stop before external impact.`
        ].join("\n")
      })
      .catch((error: unknown) => {
        setAgentRuntimeStatus(error instanceof Error ? error.message : "Agent Runtime could not create a plan.");
        return null;
      });

    if (trace) {
      setAgentRuntimeTrace(trace);
      setAgentRuntimeStatus(
        `Runtime selected ${trace.selectedTools.length} tool${trace.selectedTools.length === 1 ? "" : "s"}; ${trace.permissionDecisions.filter((decision) => !decision.allowed).length} approval gate${trace.permissionDecisions.filter((decision) => !decision.allowed).length === 1 ? "" : "s"}.`
      );
    }
    await refreshAgentRuntime();
    setAgentRuntimeBusy(false);
  }

  async function approveWorkGraphItem(item: WorkGraphItem): Promise<void> {
    setSelectedWorkGraphItemId(item.id);
    setWorkGraphBusyIds((current) => ({ ...current, [item.id]: true }));
    const chatSuggestionId = getChatSuggestionIdFromWorkTwinItem(item);
    if (chatSuggestionId) {
      const accepted = await acceptEnterpriseChatSuggestion(chatSuggestionId);
      setWorkGraphStatus(accepted ? `Approved chat ask: "${item.title}" was added to Productivity.` : `Could not approve chat ask: "${item.title}".`);
      setWorkGraphBusyIds((current) => {
        const next = { ...current };
        delete next[item.id];
        return next;
      });
      return;
    }

    const result = await autopilot.workGraph.approve(item.id).catch((error: unknown) => ({
      success: false as const,
      reason: error instanceof Error ? error.message : "Could not approve this Work Twin item.",
      snapshot: undefined
    }));
    if (result.snapshot) {
      setWorkGraphSnapshot(result.snapshot);
    } else {
      await refreshWorkGraph();
    }
    setWorkGraphStatus(result.success ? `"${item.title}" approved. External actions still require their own final command.` : result.reason ?? "Approval failed.");
    setWorkGraphBusyIds((current) => {
      const next = { ...current };
      delete next[item.id];
      return next;
    });
  }

  async function rejectWorkGraphItem(item: WorkGraphItem): Promise<void> {
    const chatSuggestionId = getChatSuggestionIdFromWorkTwinItem(item);
    if (chatSuggestionId) {
      ignoreEnterpriseChatSuggestion(chatSuggestionId);
      setSelectedWorkGraphItemId(item.id);
      setWorkGraphStatus(`Rejected chat ask: "${item.title}" was removed from suggestions.`);
      return;
    }

    const reason = window.prompt("Why reject this output?", "Needs revision before approval.") ?? "Rejected by user.";
    setSelectedWorkGraphItemId(item.id);
    setWorkGraphBusyIds((current) => ({ ...current, [item.id]: true }));
    const result = await autopilot.workGraph.reject(item.id, reason).catch((error: unknown) => ({
      success: false as const,
      reason: error instanceof Error ? error.message : "Could not reject this Work Twin item.",
      snapshot: undefined
    }));
    if (result.snapshot) {
      setWorkGraphSnapshot(result.snapshot);
    } else {
      await refreshWorkGraph();
    }
    setWorkGraphStatus(result.success ? `"${item.title}" rejected and kept in the source trail.` : result.reason ?? "Reject failed.");
    setWorkGraphBusyIds((current) => {
      const next = { ...current };
      delete next[item.id];
      return next;
    });
  }

  async function reviseWorkGraphItem(item: WorkGraphItem): Promise<void> {
    if (getChatSuggestionIdFromWorkTwinItem(item)) {
      setSelectedWorkGraphItemId(item.id);
      openWorkspaceByView("chatting");
      setChatStatus("Open the source chat message, add clarification, or ignore the suggestion before routing it.");
      setWorkGraphStatus("Chat suggestions are revised by continuing the source conversation or rejecting the suggestion.");
      return;
    }

    const feedback = window.prompt("What should Autopilot revise?", "Make this sharper and preserve the source trail.") ?? "";
    setSelectedWorkGraphItemId(item.id);
    setWorkGraphBusyIds((current) => ({ ...current, [item.id]: true }));
    const result = await autopilot.workGraph.revise(item.id, feedback).catch((error: unknown) => ({
      success: false as const,
      reason: error instanceof Error ? error.message : "Could not request a revision.",
      snapshot: undefined
    }));
    if (result.snapshot) {
      setWorkGraphSnapshot(result.snapshot);
    } else {
      await refreshWorkGraph();
    }
    setWorkGraphStatus(result.reason ?? (result.success ? "Revision requested." : "Revision failed."));
    setWorkGraphBusyIds((current) => {
      const next = { ...current };
      delete next[item.id];
      return next;
    });
  }

  async function makeWorkGraphRule(item: WorkGraphItem): Promise<void> {
    setSelectedWorkGraphItemId(item.id);
    if (getChatSuggestionIdFromWorkTwinItem(item)) {
      openWorkspaceByView("chatting");
      setWorkGraphStatus("Chat trusted rules are created from accepted chat patterns after the enterprise workspace is connected.");
      return;
    }

    setWorkGraphBusyIds((current) => ({ ...current, [item.id]: true }));
    const result = await autopilot.workGraph.makeRule(item.id).catch((error: unknown) => ({
      success: false as const,
      reason: error instanceof Error ? error.message : "Could not create a Shadow Mode rule.",
      snapshot: undefined
    }));
    if (result.snapshot) {
      setWorkGraphSnapshot(result.snapshot);
    } else {
      await refreshWorkGraph();
    }
    setWorkGraphStatus(result.success ? `Rule created: ${result.rule?.name ?? item.title}` : result.reason ?? "Rule creation failed.");
    setWorkGraphBusyIds((current) => {
      const next = { ...current };
      delete next[item.id];
      return next;
    });
  }

  async function openWorkGraphOriginal(item: WorkGraphItem): Promise<void> {
    setSelectedWorkGraphItemId(item.id);
    if (item.source.kind === "chat") {
      openWorkspaceByView("chatting");
      setChatStatus(`Showing source for "${item.title}".`);
      return;
    }

    if (item.output.workspace === "design" && item.output.refId) {
      setActiveArtifactId(item.output.refId);
      openWorkspaceByView("design");
      return;
    }

    if (item.output.workspace === "coding" || item.source.kind === "coding-project") {
      openWorkspaceByView("coding");
      return;
    }

    if (item.source.url) {
      const snapshot = await autopilot.tabs.create(item.source.url).catch(() => null);
      if (snapshot) {
        setTabs(snapshot.tabs);
        setActiveTabId(snapshot.activeTabId);
      }
      openWorkspaceByView("browser");
      return;
    }

    openWorkspaceByView(item.output.workspace === "automation" ? "coding" : item.output.workspace);
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

  function stopCodingAgentRun(): void {
    if (!codingBusy && !codingRunInFlightRef.current) {
      setCodingStatus("No coding agent run is active.");
      return;
    }

    const stoppedToken = codingRunTokenRef.current;
    clearCodingRunWatchdog();
    codingRunInFlightRef.current = false;
    codingRunTokenRef.current = stoppedToken + 1;
    setCodingBusy(false);
    setCodingRunStatus("stopped");
    setCodingRunHeartbeat({
      runToken: stoppedToken,
      status: "stopped",
      message: "User stopped the visible coding run before any new result was applied.",
      updatedAt: Date.now()
    });
    setCodingRunTimeout(null);
    setCodingAgentRun((currentRun) =>
      currentRun
        ? {
            ...currentRun,
            phase: "review",
            progress: [
              ...(currentRun.progress ?? []),
              {
                id: `coding-progress:${Date.now().toString(36)}`,
                runId: currentRun.id,
                phase: "review",
                message: "User stopped the visible coding run before applying new work.",
                createdAt: Date.now()
              }
            ],
            updatedAt: Date.now()
          }
        : currentRun
    );
    setCodingStatus("Stopped the visible coding run. Already-started commands can still finish in Terminal.");
  }

  function createCodingClarificationQuestion(input: {
    prompt: string;
    options: string[];
    sourcePrompt: string;
    reason?: string;
  }): CodingClarificationQuestion {
    const normalizedOptions = input.options
      .map((option) => option.trim())
      .filter(Boolean)
      .slice(0, 3)
      .map((option, index) => ({
        id: `option-${index + 1}`,
        label: option,
        detail: index === 0 ? "Recommended default. Autopilot will use this if you dismiss the question." : "Choose this if it better matches what you want built.",
        recommended: index === 0
      }));

    return {
      id: `coding-clarification-${Date.now()}`,
      prompt: input.prompt,
      options: [
        ...normalizedOptions,
        {
          id: "custom",
          label: "No, and tell Autopilot what to do differently.",
          detail: "Write your own instruction. Autopilot will send that exact text to the coding agent.",
          custom: true
        }
      ],
      currentIndex: 1,
      total: 1,
      defaultOptionId: normalizedOptions[0]?.id ?? "custom",
      createdAt: Date.now(),
      sourcePrompt: input.sourcePrompt,
      reason: input.reason ?? "Autopilot asked because the coding path is ambiguous."
    };
  }

  function answerCodingClarification(answer: CodingClarificationAnswer): void {
    const question = codingClarificationQuestion;
    if (!question || question.id !== answer.questionId) {
      setCodingStatus("That coding clarification is no longer active.");
      return;
    }

    const selectedOption = question.options.find((option) => option.id === answer.optionId);
    const exactAnswer = answer.customText?.trim() || answer.answerText.trim() || selectedOption?.label || "";
    if (!exactAnswer) {
      setCodingStatus("Choose an answer or write custom guidance before continuing.");
      return;
    }

    setCodingClarificationQuestion(null);
    setCodingRunTimeout(null);
    setCodingStatus("Clarification received. Autopilot is continuing with your selected answer.");
    void sendCodingChatMessage(
      [
        question.sourcePrompt,
        "",
        `Clarification answer: ${exactAnswer}`,
        `Why Autopilot asked: ${question.reason}`
      ].join("\n")
    );
  }

  function dismissCodingClarification(question: CodingClarificationQuestion): void {
    const defaultOption = question.options.find((option) => option.id === question.defaultOptionId) ?? question.options[0];
    setCodingClarificationQuestion(null);
    setCodingRunTimeout(null);
    setCodingStatus("Clarification dismissed. Autopilot is continuing with the recommended default.");
    void sendCodingChatMessage(
      [
        question.sourcePrompt,
        "",
        `Assumption: ${defaultOption?.label ?? "Use the safest reasonable default."}`,
        `Why Autopilot asked: ${question.reason}`
      ].join("\n")
    );
  }

  async function sendCodingChatMessage(messageOverride?: string): Promise<void> {
    const message = (messageOverride ?? codingDraftMessage).trim();
    if (!message) {
      return;
    }

    if (codingRunInFlightRef.current) {
      setCodingStatus("Autopilot is already working on a coding run. Stop it before sending another prompt.");
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
    const ackMessage = createCodingChatMessage(
      "agent",
      "Queued. I’m turning this into a coding run now. You’ll see the status move through reading files, planning, editing, testing, and review, or I’ll show the exact blocker."
    );
    const automationIntent = detectAutomationIntent(message, "coding");

    setCodingChats((currentChats) => {
      const existingChats = currentChats.some((chat) => chat.id === targetChat?.id) ? currentChats : [targetChat as CodingChatThread, ...currentChats];
      return existingChats
        .map((chat) =>
          chat.id === targetChat?.id
            ? {
                ...chat,
                title: nextTitle,
                updatedAt: now,
                messages: [...chat.messages, userMessage, ...(automationIntent.isAutomation || !activeCodingProject ? [] : [ackMessage])]
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
      const agentMessage = createCodingChatMessage(
        "agent",
        `I saved this as an automation because it looks like a ${automationIntent.triggerReason}. I will run the first pass now, save the output with quality checks, and keep final send/share/publish steps behind approval.`
      );
      setCodingChats((currentChats) =>
        currentChats.map((chat) =>
          chat.id === targetChat?.id
            ? {
                ...chat,
                updatedAt: Date.now(),
                messages: [...chat.messages, agentMessage]
              }
            : chat
        )
      );
      setCodingStatus(`Automation detected from chat: ${nextTitle}`);
      await createAndRunAutomationFromWorkspace(message, "coding");
      return;
    }

    if (!activeCodingProject) {
      const agentMessage = createCodingChatMessage("agent", createCodingNoProjectReply());
      setCodingChats((currentChats) =>
        currentChats.map((chat) =>
          chat.id === targetChat?.id
            ? {
                ...chat,
                updatedAt: Date.now(),
                messages: [...chat.messages, agentMessage]
              }
            : chat
        )
      );
      setCodingStatus("Open a project before asking the coding agent to inspect or edit files.");
      return;
    }

    const runToken = beginCodingVisibleRun(message, targetChat.id);

    try {
      markCodingRunStatus(runToken, "understanding", "Autopilot is translating your request into a concrete coding brief.");
      const translatedPrompt = await autopilot.assistant
        .translateCodingPrompt({
          prompt: message,
          projectName: activeCodingProject.name,
          activeFilePath: activeTextCodingTab?.file.relativePath,
          openFiles: [
            ...textCodingTabs
              .filter((tab) => !tab.projectRootPath || tab.projectRootPath === activeCodingProject.rootPath)
              .map((tab) => tab.file.relativePath),
            ...activeProjectRecentCodeItems.filter((item) => item.kind === "file").map((item) => item.path)
          ],
          sourcePreview: `Project access: ${codingSnapshot.accessMode}. Recent files: ${
            activeProjectRecentCodeItems
              .filter((item) => item.kind === "file")
              .slice(0, 8)
              .map((item) => item.path)
              .join(", ") || "none"
          }`
        })
        .catch((error: unknown) => ({
          success: false as const,
          refinedPrompt: message,
          implementationIntent: "Use the original request because coding prompt translation failed.",
          targetFiles: [],
          options: [],
          reason: error instanceof Error ? error.message : "Coding prompt translation failed."
        }));

      if (!isCurrentCodingRun(runToken)) {
        return;
      }

      if (translatedPrompt.success && translatedPrompt.followUpQuestion && translatedPrompt.options.length >= 3) {
        setCodingClarificationQuestion(
          createCodingClarificationQuestion({
            prompt: translatedPrompt.followUpQuestion,
            options: translatedPrompt.options,
            sourcePrompt: message,
            reason: translatedPrompt.implementationIntent || translatedPrompt.reason
          })
        );
        appendCodingAgentMessage(targetChat.id, "I need one detail before I edit. Pick an answer in the clarification card, or dismiss it and I will use the recommended default.");
        blockCodingVisibleRun(runToken, "Autopilot needs one detail before it edits files.", message);
        return;
      }

      const codingGoal = translatedPrompt.refinedPrompt || message;
      markCodingRunStatus(runToken, "reading_files", "Autopilot is reading the project and preparing a repo-aware coding run.");
      const runResult: CodingAgentRunResult = await autopilot.coding.startAgentRun(codingGoal).catch(() => ({
        success: false as const,
        reason: "Autopilot could not start a coding agent run.",
        generatedAt: Date.now()
      }));

      if (!isCurrentCodingRun(runToken)) {
        return;
      }

      if (!runResult.success) {
        appendCodingAgentMessage(targetChat.id, `I could not start a coding agent run: ${runResult.reason}`);
        blockCodingVisibleRun(runToken, runResult.reason, message);
        return;
      }

      setCodingAgentPlan(runResult.plan);
      setCodingAgentRun(runResult.run);
      markCodingRunStatus(runToken, "planning", "Leader created the short plan. Autopilot is now preparing the implementation path.");

      const response = await autopilot.assistant
        .ask({
          prompt: `You are Autopilot's coding agent. The app has already created this repo-aware coding run. Explain the implementation path in plain user-facing language.

Rules:
- Be concrete and concise.
- Say what files or areas matter.
- Do not claim edits were made unless there is a changed-file diff.
- Do not expose hidden chain-of-thought. Show a useful plan and progress summary instead.

User request:
${codingGoal}

Original user wording:
${message}

Local plan:
${runResult.plan.summary}

Assessment:
${runResult.plan.assessment.size} / ${runResult.plan.assessment.thinkingDepth}

Schema:
${JSON.stringify(runResult.plan.schema, null, 2)}

Current changed files:
${runResult.run.changedFiles.map((file) => `${file.status} ${file.path}`).join("\n") || "No git changes yet."}`,
          task: "coding_agent",
          sources: ["coding-project"],
          activeTabId,
          timeoutMs: 110_000
        })
        .catch((error: unknown) => ({
          success: false,
          answer: "",
          sources: [],
          reason: error instanceof Error ? error.message : "Coding AI failed."
        }));

      if (!isCurrentCodingRun(runToken)) {
        return;
      }

      markCodingRunStatus(runToken, "editing", "Autopilot is generating the actual file patch or a clear blocker.");
      const fileEditNote = await requestCodingAiPatchForActiveFile(codingGoal, runResult.plan, runResult.run);

      if (!isCurrentCodingRun(runToken)) {
        return;
      }

      const patchSetResult = await autopilot.coding.createPatchSet().catch(() => null);
      const hasReviewablePatch =
        /^Generated/u.test(fileEditNote.trim()) ||
        /generated.*code|code patch for/iu.test(fileEditNote) ||
        (patchSetResult?.success === true && patchSetResult.patchSet.files.length > 0) ||
        runResult.run.changedFiles.length > 0;
      const finalRunStatus = response.success && hasReviewablePatch ? "ready_for_review" : "blocked";
      const finalRunDetail =
        finalRunStatus === "ready_for_review"
          ? `Agent run ready for review: ${nextTitle}`
          : response.success
            ? `Coding run blocked until there is a real patch/diff to review: ${nextTitle}`
            : `Local plan ready; AI model unavailable: ${nextTitle}`;
      const verificationCommand =
        response.success && hasReviewablePatch && codingSnapshot.accessMode === "full" && /^Generated and applied code/u.test(fileEditNote.trim())
          ? runResult.plan.suggestedCommands[0]
          : undefined;
      const agentMessage = createCodingChatMessage(
        "agent",
        response.success
          ? `${formatCodingAgentRunMessage(runResult.plan, runResult.run, response.answer)}${fileEditNote}${
              verificationCommand ? `\n\nFull access is on, so I'm starting verification now: ${verificationCommand}` : ""
            }${hasReviewablePatch ? "" : "\n\nDone is blocked: I need to generate a real patch or show a precise blocker before this can move to review."}`
          : `${formatCodingAiUnavailableReply(response.reason, runResult.plan, runResult.run)}${fileEditNote}`
      );
      setCodingChats((currentChats) =>
        currentChats.map((chat) =>
          chat.id === targetChat?.id
            ? {
                ...chat,
                updatedAt: Date.now(),
                messages: [...chat.messages, agentMessage]
              }
            : chat
          )
      );
      if (verificationCommand && isCurrentCodingRun(runToken)) {
        markCodingRunStatus(runToken, "testing", `Full access is on, so Autopilot is starting verification: ${verificationCommand}`);
        await runCodingCommandText(verificationCommand);
      }
      finishCodingVisibleRun(
        runToken,
        finalRunStatus,
        finalRunDetail
      );
    } catch (error) {
      if (!isCurrentCodingRun(runToken)) {
        return;
      }

      const reason = error instanceof Error ? error.message : "Coding run failed unexpectedly.";
      appendCodingAgentMessage(targetChat.id, `The coding run hit a blocker: ${reason}\n\nNo code was applied. You can retry, send a shorter prompt, or check AI setup.`);
      blockCodingVisibleRun(runToken, reason, message);
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

  function renderCodingPromptContextPills(): JSX.Element {
    const currentFileLabel = activeTextCodingTab?.file.relativePath ?? activeCodingTab.path ?? activeCodingTab.title;

    return (
      <div className="coding-prompt-context-pills" aria-label="Coding prompt context">
        <button type="button" onClick={() => (activeCodingProject ? openCodingPicker(activeCodingProject.rootPath) : void openCodingProject())}>
          <FolderOpen size={13} aria-hidden="true" />
          <span>{activeCodingProject ? `@project ${activeCodingProject.name}` : "Open project"}</span>
        </button>
        <button type="button" disabled={!activeCodingTab} onClick={() => activeCodingTab && setActiveCodingTabId(activeCodingTab.id)}>
          <FileText size={13} aria-hidden="true" />
          <span>@current {currentFileLabel}</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setCodingRightSidebarOpen(true);
            setCodingRightPanel("code");
            if (codingGitChangedFiles[0]) {
              void refreshCodingGitDiff(codingGitChangedFiles[0].path);
            }
          }}
        >
          <Code2 size={13} aria-hidden="true" />
          <span>@changes {codingReviewChangedCount}</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setCodingRightSidebarOpen(true);
            setCodingRightPanel("access");
          }}
        >
          <ShieldCheck size={13} aria-hidden="true" />
          <span>{codingSnapshot.accessMode === "full" ? "Full access" : "Ask first"}</span>
        </button>
      </div>
    );
  }

  function renderCodingAgentPlanPanel(): JSX.Element {
    return (
      <section className="coding-agent-plan-panel" aria-label="Codex-style coding workflow">
        <div className="coding-agent-plan-heading">
          <span>
            <p className="panel-kicker">Agent workflow</p>
            <h3>{activeCodingProject ? "Plan, run, review" : "Open a project to start"}</h3>
          </span>
          <div className="coding-agent-mode-pills" aria-label="Agent mode status">
            <em>Agent</em>
            <em>{codingSnapshot.accessMode === "full" ? "Full access" : "Ask first"}</em>
            <em>{codingAgentPlan?.phase ?? "Plan mode"}</em>
          </div>
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
            {codingAgentPlan.projectMemory?.present && (
              <div className="coding-project-memory-card" aria-label="Project memory loaded">
                <span>
                  <strong>Project memory</strong>
                  <small>{codingAgentPlan.projectMemory.relativePath}</small>
                </span>
                <p>{codingAgentPlan.projectMemory.summary}</p>
                <ul>
                  {codingAgentPlan.projectMemory.instructions.slice(0, 3).map((instruction) => (
                    <li key={instruction}>{instruction}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="coding-agent-assessment" aria-label="Task assessment">
              <span>
                <strong>{codingAgentPlan.assessment.size}</strong>
                <small>{codingAgentPlan.assessment.thinkingDepth} thinking</small>
              </span>
              <p>{codingAgentPlan.assessment.reason}</p>
              <b>{codingAgentPlan.phase}</b>
            </div>

            {codingAgentRun && codingAgentRun.planId === codingAgentPlan.id && (
              <div className="coding-agent-run-card" aria-label="Coding agent run trail">
                <span>
                  <strong>Run trail</strong>
                  <small>{codingAgentRun.approvalState === "needs_review" ? "Needs review before external steps" : codingAgentRun.approvalState}</small>
                </span>
                <div>
                  <p>
                    <b>{codingAgentRun.changedFiles.length}</b>
                    changed files
                  </p>
                  <p>
                    <b>{codingAgentRun.commands.length}</b>
                    commands
                  </p>
                  <p>
                    <b>{codingAgentRun.testResults.length}</b>
                    test notes
                  </p>
                </div>
                {codingAgentRun.changedFiles.length > 0 ? (
                  <button type="button" onClick={() => {
                    setCodingRightPanel("code");
                    setCodingRightSidebarOpen(true);
                  }}>
                    Review diff
                  </button>
                ) : (
                  <small>No file edit has happened yet. Autopilot must produce changed files before this becomes approval-ready.</small>
                )}
                {codingAgentRun.progress && codingAgentRun.progress.length > 0 && (
                  <ol className="coding-agent-run-trace" aria-label="Agent run trace">
                    {codingAgentRun.progress.slice(0, 5).map((event) => (
                      <li key={event.id} data-phase={event.phase}>
                        <strong>{event.phase}</strong>
                        <span>{event.message}</span>
                      </li>
                    ))}
                  </ol>
                )}
                {codingAiFilePatch && codingAiFilePatch.status === "pending" && (
                  <div className="coding-ai-patch-review" aria-label="Pending AI file patch">
                    <span>
                      <strong>AI patch ready</strong>
                      <small>{codingAiFilePatch.relativePath}</small>
                    </span>
                    <p>{codingAiFilePatch.explanation}</p>
                    <div>
                      <button type="button" onClick={() => applyCodingAiFilePatch()}>
                        Apply AI patch
                      </button>
                      <button type="button" className="secondary" onClick={dismissCodingAiFilePatch}>
                        Dismiss
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

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

  function renderCodingRecentCodeButton(item: CodingRecentCodeItem): JSX.Element {
    const RecentIcon = item.kind === "folder" ? FolderOpen : getCodingFileIcon(item.title);
    return (
      <button
        type="button"
        key={item.id}
        onClick={() => {
          if (item.openedTabId) {
            setActiveCodingTabId(item.openedTabId);
            return;
          }
          void openCodingPath(item.path);
        }}
      >
        <RecentIcon size={16} aria-hidden="true" />
        <span>
          <strong>{item.title}</strong>
          <small>{item.detail}</small>
        </span>
        {item.dirty && <em>Modified</em>}
      </button>
    );
  }

  function selectDesignProject(project: DesignProject): void {
    setActiveArtifactId(project.artifactId);
    setActiveDesignProjectRecordId(null);
    setBlankDesignProjectName("");
    setDesignToolSection("projects");
    setDesignFileDraftId(null);
    setAllDesignProjectsOpen(false);
    setArtifactStatus(`${project.title} is open on the canvas.`);
  }

  function selectDesignProjectRecord(record: DesignProjectRecord): void {
    const firstArtifactId = record.artifactIds[0] ?? null;
    setActiveDesignProjectRecordId(record.id);
    setActiveArtifactId(firstArtifactId);
    setBlankDesignProjectName(firstArtifactId ? "" : record.title);
    setDesignToolSection("projects");
    setDesignFileDraftId(null);
    setAllDesignProjectsOpen(false);
    setDesignProjectDrawerOpen(true);
    setDesignAiPanelOpen(true);
    setArtifactStatus(
      firstArtifactId
        ? `${record.title} is open. Its generated artifacts are listed in this project.`
        : `${record.title} is open. Ask the AI sidebar to generate the first artifact.`
    );
  }

  function activateDesignToolSection(section: DesignToolSection, status?: string): void {
    setDesignToolSection(section);
    if (section === "pages" || section === "history" || section === "settings") {
      setDesignProjectDrawerOpen(true);
      setDesignSourcePanelOpen(false);
    }
    if (section === "projects" || section === "components" || section === "assets") {
      setDesignProjectDrawerOpen(true);
    }
    if (section === "styles") {
      setDesignAiPanelOpen(true);
    }
    setArtifactStatus(
      status ??
        {
          projects: "Built items is open. Choose an artifact or create a new one from the assistant.",
          pages: "Files is open. Documents, decks, website sections, and generated drafts live in Built items.",
          history: "History is open. Review artifact versions and restore one onto the result canvas.",
          components: "Built sections are visible. Select an artifact, then ask Autopilot to revise the chosen block.",
          assets: "Built items shows generated files, source media, and export-ready resources.",
          styles: "Ask Autopilot for color, type, spacing, and responsive polish in the assistant.",
          plugins: "Use To Coding for website designs, Export for files, and Share for review-ready summaries.",
          team: "Sources is open with provenance, owner, and approval context.",
          settings: "Design settings is open. Adjust preview, frame, guides, panels, and assistant visibility from one place."
        }[section]
    );
  }

  function openDesignSourcesPanel(): void {
    setDesignSourcePanelOpen(true);
    activateDesignToolSection("team", "Sources is open. Review the email, docs, attachments, and source trail behind this artifact.");
  }

  function createNewDesignArtifactFromRail(): void {
    const projectName = window.prompt("What do you want to name the project?", blankDesignProjectName || "Untitled design project")?.trim();
    if (!projectName) {
      setArtifactStatus("New project cancelled. Every Design project needs a name before Autopilot starts generating.");
      return;
    }
    const projectRecord = createBlankDesignProjectRecord(projectName, "user", artifactPrompt);
    setDesignProjectRecords((currentRecords) => [projectRecord, ...currentRecords.filter((record) => record.id !== projectRecord.id)].slice(0, 120));
    setActiveDesignProjectRecordId(projectRecord.id);
    setBlankDesignProjectName(projectRecord.title);
    setActiveArtifactId(null);
    setDesignToolSection("projects");
    setDesignFileDraftId(null);
    setDesignAiPanelOpen(true);
    setDesignProjectDrawerOpen(true);
    setDesignSourcePanelOpen(false);
    setArtifactPrompt(`Create the first artifact for ${projectRecord.title}.`);
    setArtifactStatus(`${projectRecord.title} was saved as a blank project. Tell the AI sidebar what to design, and generated artifacts will appear on the canvas attached to this project.`);
  }

  function selectDesignStarterProject(project: DesignStarterProject): void {
    setSelectedDesignStarterProjectId(project.id);
    setActiveArtifactId(null);
    setActiveDesignProjectRecordId(null);
    setBlankDesignProjectName(project.title);
    setDesignToolSection("projects");
    setDesignFileDraftId(null);
    setDesignProjectTab("mine");
    setDesignProjectDrawerOpen(true);
    setDesignAiPanelOpen(true);
    setArtifactPrompt(project.prompt);
    setArtifactStatus(`${project.title} is ready as a starter. Press Generate to create your own ${getArtifactKindLabel(project.kind).toLowerCase()}.`);
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

  function toggleDesignCanvasEditMode(): void {
    if (!activeArtifact) {
      setArtifactStatus("Create or select an artifact before using click-to-edit.");
      return;
    }

    setDesignCanvasEditMode((isEditing) => {
      const nextEditing = !isEditing;
      setDesignPreviewMode(true);
      setDesignAiPanelOpen(true);
      setArtifactStatus(
        nextEditing
          ? "Click-to-edit is on. Select the canvas to load a focused revision prompt in the assistant."
          : "Click-to-edit is off. The canvas is back in review mode."
      );
      return nextEditing;
    });
  }

  function requestCanvasEdit(targetLabel: string): void {
    if (!activeArtifact || !designCanvasVersion) {
      setArtifactStatus("Create or select an artifact before requesting a canvas edit.");
      return;
    }

    const prompt = `Revise the selected ${targetLabel} in "${activeArtifact.title}". Improve hierarchy, spacing, copy clarity, and visual polish while preserving the artifact's goal. Show the change as a new version and keep sources/proof intact.`;
    setArtifactPrompt(prompt);
    setDesignAiPanelOpen(true);
    setArtifactStatus("Canvas selection loaded into the assistant. Add detail or press Apply AI to revise.");
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

  function renderDesignBuiltItem(project: DesignProject): JSX.Element {
    const Icon = project.kind === "website_design" ? Globe2 : project.kind === "slide_deck" ? FileText : project.kind === "document" ? FileText : ListChecks;
    const isGenerating = artifactBusy && activeArtifact?.id === project.artifactId;
    const statusLabel = isGenerating ? "Generating" : project.exportedProjectPath ? "Exported" : project.needsReview ? "Review" : project.generatedByAi ? "Ready" : "Saved";
    return (
      <article className={`design-built-item ${activeArtifact?.id === project.artifactId ? "active" : ""}`} data-origin={project.origin} data-status={statusLabel.toLowerCase()} key={`built:${project.id}`}>
        <button type="button" onClick={() => selectDesignProject(project)}>
          <span className="design-built-icon" data-kind={project.kind}>
            <Icon size={18} aria-hidden="true" />
          </span>
          <span>
            <strong>{project.title}</strong>
            <small>
              {getArtifactKindLabel(project.kind)} <b aria-hidden="true">/</b> {statusLabel}
            </small>
          </span>
        </button>
        <span className={`design-artifact-progress ${isGenerating ? "running" : "done"}`} aria-label={isGenerating ? `${project.title} is generating` : `${project.title} is ready`}>
          {isGenerating ? <span aria-hidden="true" /> : <Check size={13} aria-hidden="true" />}
        </span>
        <button
          className="icon-button small"
          type="button"
          aria-label={`Open actions for ${project.title}`}
          onClick={() => {
            selectDesignProject(project);
            setDesignAiPanelOpen(true);
            setArtifactStatus(`Selected ${project.title}. Ask Autopilot for edits or use Export, Share, or To Coding when available.`);
          }}
        >
          <MoreHorizontal size={15} aria-hidden="true" />
        </button>
      </article>
    );
  }

  function renderDesignProjectRecord(record: DesignProjectRecord): JSX.Element {
    const firstArtifact = record.artifactIds[0] ? artifacts.find((artifact) => artifact.id === record.artifactIds[0]) : null;
    const kind = firstArtifact?.kind ?? (record.artifactKindHint === "slide_deck" || record.artifactKindHint === "document" || record.artifactKindHint === "website_design" ? record.artifactKindHint : "website_design");
    const Icon = kind === "website_design" ? Globe2 : kind === "slide_deck" ? Play : FileText;
    const isGenerating = record.status === "generating";
    const statusLabel =
      record.status === "failed_recoverable"
        ? "Needs retry"
        : record.status === "needs_review"
          ? "Review"
          : record.status === "ready"
            ? "Ready"
            : isGenerating
              ? "Generating"
              : "Queued";
    return (
      <article className={`design-built-item ${activeDesignProjectRecordId === record.id ? "active" : ""}`} data-origin={record.origin} data-status={record.status} key={`record:${record.id}`}>
        <button type="button" onClick={() => selectDesignProjectRecord(record)}>
          <span className="design-built-icon" data-kind={kind}>
            <Icon size={18} aria-hidden="true" />
          </span>
          <span>
            <strong>{record.title}</strong>
            <small>
              Project <b aria-hidden="true">/</b> {statusLabel} <em>{record.artifactIds.length} artifacts</em>
            </small>
          </span>
        </button>
        <span className={`design-artifact-progress ${isGenerating ? "running" : record.status === "failed_recoverable" ? "queued" : "done"}`} aria-label={`${record.title} is ${statusLabel.toLowerCase()}`}>
          {isGenerating ? <span aria-hidden="true" /> : record.status === "failed_recoverable" ? <AlertTriangle size={13} aria-hidden="true" /> : <Check size={13} aria-hidden="true" />}
        </span>
        <button
          className="icon-button small"
          type="button"
          aria-label={`Open ${record.title} project actions`}
          onClick={() => {
            selectDesignProjectRecord(record);
            setDesignAiPanelOpen(true);
            setArtifactStatus(`${record.title} is selected. Ask Autopilot to generate, revise, or export artifacts from this project.`);
          }}
        >
          <MoreHorizontal size={15} aria-hidden="true" />
        </button>
      </article>
    );
  }

  function renderDesignStarterProject(project: DesignStarterProject): JSX.Element {
    const Icon = project.kind === "website_design" ? Globe2 : project.kind === "slide_deck" ? Play : FileText;
    return (
      <article className={`design-built-item design-starter-project ${selectedDesignStarterProjectId === project.id && !activeArtifact ? "active" : ""}`} key={`starter:${project.id}`}>
        <button type="button" onClick={() => selectDesignStarterProject(project)}>
          <span className="design-built-icon" data-kind={project.kind}>
            <Icon size={18} aria-hidden="true" />
          </span>
          <span>
            <strong>{project.title}</strong>
            <small>
              {getArtifactKindLabel(project.kind)} <b aria-hidden="true">/</b> Starter <em>{project.timeLabel}</em>
            </small>
          </span>
        </button>
        <button
          className="icon-button small"
          type="button"
          aria-label={`Create ${project.title}`}
          onClick={() => {
            selectDesignStarterProject(project);
            setArtifactStatus(`${project.title} loaded. Generate it, or edit the brief first.`);
          }}
        >
          <Sparkles size={15} aria-hidden="true" />
        </button>
      </article>
    );
  }

  function openDesignGeneratedFile(file: DesignGeneratedFile): void {
    if (file.artifactId) {
      const owningRecord = designProjectRecords.find((record) => record.artifactIds.includes(file.artifactId ?? ""));
      setActiveDesignProjectRecordId(owningRecord?.id ?? null);
      setActiveArtifactId(file.artifactId);
      setDesignToolSection("projects");
      setDesignFileDraftId(null);
      setDesignPreviewMode(false);
      setArtifactStatus(`Opened "${file.title}" on the result canvas.`);
      return;
    }

    const draft = file.draftId ? productivityDrafts.find((candidate) => candidate.id === file.draftId) : null;
    if (draft) {
      setDesignToolSection("pages");
      setDesignFileDraftId(draft.id);
      setArtifactPrompt("");
      setDesignAiPanelOpen(true);
      setArtifactStatus(`Opened "${draft.title}" in Files. Use it as source for a new artifact or open the original email.`);
      return;
    }

    setArtifactStatus("That generated file is no longer available. Sync sources or create a new artifact.");
  }

  async function openDesignGeneratedFileSource(file: DesignGeneratedFile): Promise<void> {
    if (!file.sourceUrl) {
      setArtifactStatus(`"${file.title}" does not have an openable source link.`);
      return;
    }

    try {
      await switchToBrowserWorkspace();
      await autopilot.tabs.create(file.sourceUrl);
      setArtifactStatus(`Opened the source for "${file.title}" in Browser.`);
    } catch {
      setArtifactStatus(`Autopilot could not open the source for "${file.title}".`);
    }
  }

  function loadSelectedDraftIntoAssistant(): void {
    if (!selectedDesignFileDraft) {
      setArtifactStatus("Choose a draft before asking Autopilot to continue from it.");
      return;
    }

    setArtifactPrompt(`Use this saved email draft as context. Improve it or turn it into the right artifact.\n\nDraft title: ${selectedDesignFileDraft.title}\nSource: ${selectedDesignFileDraft.source.label}\n\n${selectedDesignFileDraft.body}`);
    setDesignAiPanelOpen(true);
    setArtifactStatus(`Loaded "${selectedDesignFileDraft.title}" into the assistant.`);
  }

  async function openSelectedDesignDraftSource(): Promise<void> {
    if (!selectedDesignFileDraft?.source.url) {
      setArtifactStatus("This draft does not have an openable source email link.");
      return;
    }

    try {
      await switchToBrowserWorkspace();
      await autopilot.tabs.create(selectedDesignFileDraft.source.url);
      setArtifactStatus(`Opened the source email for "${selectedDesignFileDraft.title}" in Browser.`);
    } catch {
      setArtifactStatus("Autopilot could not open the source email for that draft.");
    }
  }

  function renderDesignCanvasFileStrip(): JSX.Element {
    const projectFiles = designGeneratedFiles
      .filter((file) => file.id !== `artifact:${activeArtifact?.id ?? ""}`)
      .slice(0, 4);

    return (
      <section className="design-atlas-file-strip" aria-label="Generated files in this design workspace">
        <header>
          <div>
            <p className="panel-kicker">Built in this project</p>
            <h2>Generated files</h2>
          </div>
          <span>{designGeneratedFileCount}</span>
        </header>
        {projectFiles.length > 0 ? (
          <div className="design-atlas-file-list">
            {projectFiles.map((file) => {
              const FileIcon = file.kind === "website_design" ? Globe2 : file.section === "drafts" ? Mail : file.kind === "slide_deck" ? Play : FileText;
              return (
                <article className="design-atlas-file-row" key={`canvas:${file.id}`}>
                  <button type="button" onClick={() => openDesignGeneratedFile(file)}>
                    <span className="design-atlas-file-icon" data-section={file.section}>
                      <FileIcon size={17} aria-hidden="true" />
                    </span>
                    <span>
                      <strong>{file.title}</strong>
                      <small>
                        {file.meta} - {file.status} - {formatInboxReceivedAt(file.updatedAt)}
                      </small>
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={!file.sourceUrl}
                    title={file.sourceUrl ? "Open original source" : "No source link was saved for this generated file."}
                    onClick={() => void openDesignGeneratedFileSource(file)}
                  >
                    Source
                  </button>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="design-atlas-empty-files">
            <FileText size={16} aria-hidden="true" />
            <span>Generated documents, decks, websites, and drafts will appear here.</span>
          </div>
        )}
        <button className="design-atlas-generate-more" type="button" onClick={createNewDesignArtifactFromRail}>
          <Sparkles size={15} aria-hidden="true" />
          Generate another artifact
        </button>
      </section>
    );
  }

  function renderDesignFilesLibrary(): JSX.Element {
    return (
      <DesignFilesLibrary
        activeArtifactId={activeArtifact?.id}
        generatedFileCount={designGeneratedFileCount}
        filesBySection={designFilesBySection}
        selectedDraft={selectedDesignFileDraft}
        formatDate={formatInboxReceivedAt}
        getArtifactKindLabel={getProductivityDraftKindLabel}
        onCreateNew={createNewDesignArtifactFromRail}
        onOpenFile={openDesignGeneratedFile}
        onOpenFileSource={(file) => void openDesignGeneratedFileSource(file)}
        onCloseDraft={() => setDesignFileDraftId(null)}
        onUseDraftWithAi={loadSelectedDraftIntoAssistant}
        onOpenDraftSource={() => void openSelectedDesignDraftSource()}
      />
    );
  }
  function renderDesignHistoryPanel(): JSX.Element {
    const versions = activeArtifact?.versions ?? [];
    const selectedVersionIndex = Math.max(designPreviewVersionIndex ?? activeArtifactVersionIndex, 0);
    const selectedVersion = versions[selectedVersionIndex] ?? designCanvasVersion ?? null;
    const selectedVersionText = selectedVersion ? artifactContentToEditorText(selectedVersion.content).slice(0, 1400) : "";

    return (
      <div className="design-history-panel" aria-label="Design version history">
        <header className="design-history-hero">
          <div>
            <p className="panel-kicker">History</p>
            <h1>Version history</h1>
            <span>
              {activeArtifact
                ? `${activeArtifact.title} has ${versions.length} saved version${versions.length === 1 ? "" : "s"}. Preview, restore to canvas, or ask Autopilot to revise from a specific point.`
                : "Create an artifact and every AI revision will appear here as a reviewable version."}
            </span>
          </div>
          <button className="primary-action" type="button" onClick={createNewDesignArtifactFromRail}>
            <Sparkles size={15} aria-hidden="true" />
            New from AI
          </button>
        </header>

        {activeArtifact ? (
          <div className="design-history-layout">
            <section className="design-history-timeline" aria-label="Artifact versions">
              {versions.map((version, index) => {
                const isSelected = selectedVersion?.id === version.id;
                return (
                  <article className={`design-history-card ${isSelected ? "active" : ""}`} key={version.id}>
                    <button className="design-history-main" type="button" onClick={() => selectDesignVersion(index)}>
                      <span>
                        <strong>Version {index + 1}</strong>
                        <small>{version.summary || version.prompt || "Saved artifact revision"}</small>
                      </span>
                      <time dateTime={new Date(version.createdAt).toISOString()}>{formatInboxReceivedAt(version.createdAt)}</time>
                    </button>
                    <div className="design-history-meta">
                      <span>{getArtifactKindLabel(version.content.kind)}</span>
                      {version.prompt && <span>{version.prompt.slice(0, 72)}</span>}
                    </div>
                    <div className="artifact-editor-actions">
                      <button
                        className="secondary-action"
                        type="button"
                        onClick={() => {
                          selectDesignVersion(index);
                          setDesignToolSection("projects");
                          setArtifactStatus(`Version ${index + 1} is loaded on the result canvas.`);
                        }}
                      >
                        <Eye size={14} aria-hidden="true" />
                        Open on canvas
                      </button>
                      <button
                        className="secondary-action"
                        type="button"
                        onClick={() => {
                          selectDesignVersion(index);
                          setDesignAiPanelOpen(true);
                          setArtifactPrompt(`Revise version ${index + 1} of "${activeArtifact.title}" with a cleaner, more polished result.`);
                          setArtifactStatus("Version context is loaded in Ask Autopilot.");
                        }}
                      >
                        <Sparkles size={14} aria-hidden="true" />
                        Ask AI
                      </button>
                    </div>
                  </article>
                );
              })}
            </section>

            <section className="design-history-preview" aria-label="Selected version preview">
              <header>
                <div>
                  <p className="panel-kicker">Selected version</p>
                  <h2>{selectedVersion ? selectedVersion.summary || `Version ${selectedVersionIndex + 1}` : "No version selected"}</h2>
                </div>
                <button
                  className="primary-action"
                  type="button"
                  disabled={!selectedVersion}
                  onClick={() => {
                    setDesignToolSection("projects");
                    setArtifactStatus("Selected version is open on the result canvas.");
                  }}
                >
                  Open result
                </button>
              </header>
              {selectedVersion ? (
                <pre>{selectedVersionText}</pre>
              ) : (
                <div className="design-files-empty">
                  <Clock size={17} aria-hidden="true" />
                  <span>No version selected yet.</span>
                </div>
              )}
            </section>
          </div>
        ) : (
          <section className="design-history-empty">
            <Clock size={22} aria-hidden="true" />
            <h2>No versions yet.</h2>
            <p>Ask Autopilot to create a document, deck, website, or draft. Each revision will be saved here with its prompt and result preview.</p>
            <button className="primary-action" type="button" onClick={createNewDesignArtifactFromRail}>
              Create artifact
            </button>
          </section>
        )}
      </div>
    );
  }

  function renderDesignSettingsPanel(): JSX.Element {
    return (
      <div className="design-settings-panel" aria-label="Design studio settings">
        <header className="design-settings-hero">
          <div>
            <p className="panel-kicker">Settings</p>
            <h1>Studio settings</h1>
            <span>Control the canvas, preview mode, panels, and assistant without digging through a crowded sidebar.</span>
          </div>
          <button
            className="primary-action"
            type="button"
            onClick={() => {
              setDesignToolSection("projects");
              setDesignProjectDrawerOpen(true);
              setArtifactStatus("Built items is open.");
            }}
          >
            <FolderOpen size={15} aria-hidden="true" />
            Open built items
          </button>
        </header>

        <div className="design-settings-grid">
          <section className="design-setting-card">
            <span>
              <Settings size={16} aria-hidden="true" />
              Canvas frame
            </span>
            <strong>{designCanvasWidth}px</strong>
            <p>Cycle the review frame for desktop, laptop, and narrow preview widths.</p>
            <button className="secondary-action" type="button" onClick={cycleDesignCanvasWidth}>
              Cycle width
            </button>
          </section>

          <section className="design-setting-card">
            <span>
              <Search size={16} aria-hidden="true" />
              Zoom
            </span>
            <strong>{designCanvasZoom}%</strong>
            <p>Change the result canvas zoom without changing the generated artifact.</p>
            <button className="secondary-action" type="button" onClick={cycleDesignCanvasZoom}>
              Cycle zoom
            </button>
          </section>

          <section className="design-setting-card">
            <span>
              <Eye size={16} aria-hidden="true" />
              Preview mode
            </span>
            <strong>{designPreviewMode ? "Preview" : "Edit"}</strong>
            <p>Preview hides editor guide chrome. Edit mode shows selection and structure hints.</p>
            <button className="secondary-action" type="button" disabled={!activeArtifact} title={activeArtifact ? "Toggle preview mode" : "Create or select an artifact before previewing."} onClick={toggleDesignPreviewMode}>
              Toggle preview
            </button>
          </section>

          <section className="design-setting-card">
            <span>
              <Hash size={16} aria-hidden="true" />
              Canvas guides
            </span>
            <strong>{designGuidesVisible ? "On" : "Off"}</strong>
            <p>Guides stay hidden by default so generated work is the first thing you see.</p>
            <button
              className="secondary-action"
              type="button"
              onClick={() => {
                setDesignGuidesVisible((isVisible) => !isVisible);
                setArtifactStatus(!designGuidesVisible ? "Canvas guides are visible." : "Canvas guides are hidden.");
              }}
            >
              {designGuidesVisible ? "Hide guides" : "Show guides"}
            </button>
          </section>

          <section className="design-setting-card">
            <span>
              <Sparkles size={16} aria-hidden="true" />
              Assistant
            </span>
            <strong>{designAiPanelOpen ? "Open" : "Closed"}</strong>
            <p>The assistant stays minimal: one prompt box, advanced actions folded away.</p>
            <button
              className="secondary-action"
              type="button"
              onClick={() => {
                setDesignAiPanelOpen(true);
                setArtifactStatus("Ask Autopilot is open.");
              }}
            >
              Open assistant
            </button>
          </section>

          <section className="design-setting-card">
            <span>
              <FileText size={16} aria-hidden="true" />
              Files library
            </span>
            <strong>{designGeneratedFileCount} files</strong>
            <p>Documents, slide decks, websites, drafts, and exports are organized by output type.</p>
            <button className="secondary-action" type="button" onClick={() => activateDesignToolSection("pages")}>
              Open files
            </button>
          </section>

          <section className="design-setting-card">
            <span>
              <Package size={16} aria-hidden="true" />
              Sources
            </span>
            <strong>{activeDesignSourceContext ? "Attached" : "None yet"}</strong>
            <p>Review provenance from Gmail, Drive, calendar invites, links, attachments, or manual prompts.</p>
            <button className="secondary-action" type="button" onClick={openDesignSourcesPanel}>
              Review sources
            </button>
          </section>

          <section className="design-setting-card">
            <span>
              <Clock size={16} aria-hidden="true" />
              Versions
            </span>
            <strong>{activeArtifact ? activeArtifact.versions.length : 0}</strong>
            <p>Every revision is saved so you can inspect the path from prompt to final artifact.</p>
            <button className="secondary-action" type="button" onClick={() => activateDesignToolSection("history")}>
              Open history
            </button>
          </section>
        </div>
      </div>
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
    if (item.state === "working") {
      if (assignments.some((assignment) => assignment.state === "failed")) {
        return "Being worked on - needs revision";
      }
      if (assignments.some((assignment) => assignment.state === "waiting_for_user")) {
        return "Being worked on - needs review";
      }
      if (assignments.some((assignment) => assignment.state === "completed")) {
        return "Being worked on - output ready";
      }
      return "Being worked on";
    }
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

  const globalRailWide = globalRailOpen && globalRailWidth >= GLOBAL_RAIL_LABEL_WIDTH;
  const globalRailToggleLabel = "Hide rail";
  const accountGateOpen = !accountStatus || !accountStatus.configured || !accountStatus.signedIn;
  const accountGateMessage = !accountStatus
    ? "Checking Autopilot account status..."
    : !accountStatus.configured
      ? accountStatus.reason ?? "Autopilot needs Supabase public config before anyone can use this app."
      : !accountStatus.signedIn
        ? "Sign into your Autopilot account to unlock Browser, Productivity, Coding, Chatting, Design, and Automation."
        : "";
  const moneyMovementSetupCards = getMoneyMovementSetupCards(moneyMovementSettings, accountStatus);
  const moneyMovementPaymentMethods = moneyMovementSettings?.paymentMethodReadiness ?? [];
  const moneyMovementVerificationPending = moneyMovementSettings?.status === "verification_pending" && moneyMovementSettings.emailVerifiedForPayments !== true;
  const moneyMovementEnableLabel = moneyMovementBusy
    ? "Working..."
    : moneyMovementSettings?.emailVerifiedForPayments
      ? "Verification complete"
      : moneyMovementVerificationPending
        ? "Resend verification email"
        : "Enable money movement";
  const moneyMovementCodeDigits = moneyMovementCodeInput.replace(/\D/gu, "").slice(0, 6);
  const moneyMovementConfirmDisabled = moneyMovementBusy || moneyMovementCodeDigits.length !== 6 || moneyMovementSettings?.emailVerifiedForPayments === true;
  const moneyMovementVerificationMethodLabel = moneyMovementSettings?.emailVerifiedForPayments
    ? "Verified"
    : moneyMovementVerificationPending
      ? "6-digit code"
      : "Not started";
  const moneyMovementEmailTransportLabel =
    moneyMovementSettings?.verificationEmailTransport === "resend"
      ? "Resend email"
      : moneyMovementSettings?.verificationEmailTransport === "development"
        ? "Development code"
        : moneyMovementSettings?.verificationEmailTransport === "not_configured"
          ? "Email service not configured"
          : "Waiting";
  const moneyMovementLastSentLabel = moneyMovementSettings?.verificationEmailLastSentAt
    ? new Date(moneyMovementSettings.verificationEmailLastSentAt).toLocaleString()
    : "Not sent yet";

  if (accountGateOpen) {
    return (
      <main className="account-gate" aria-labelledby="account-gate-heading">
        <section className="account-gate-card">
          <div className="account-gate-brand">
            <img className="account-gate-logo" src="./autopilot-logo.svg" alt="" />
            <span>
              <p className="panel-kicker">Autopilot Browser</p>
              <h1 id="account-gate-heading">Sign in to continue.</h1>
            </span>
          </div>
          <p className="account-gate-copy">
            Autopilot is account-first now. Your account powers secure AI access, enterprise chat membership, and backend readiness without requiring users to download an <code>.env.local</code> file.
          </p>
          <div className="account-gate-status" aria-label="Backend readiness">
            <span>
              <strong>Supabase</strong>
              <small>{accountStatus?.configured ? "Configured" : "Needs public anon key"}</small>
            </span>
            <span>
              <strong>AI proxy</strong>
              <small>{accountStatus?.backend.aiProxyReady ? "Ready" : accountStatus?.backend.aiProxyHealthReason ?? "Waiting for sign-in/proxy"}</small>
            </span>
            <span>
              <strong>Account</strong>
              <small>{accountStatus?.signedIn ? accountStatus.userEmail ?? "Signed in" : "Required"}</small>
            </span>
          </div>
          <form
            className="backend-account-form account-gate-form"
            aria-label="Autopilot account sign in"
            onSubmit={(event) => {
              event.preventDefault();
              void handleAccountSignIn("sign-in");
            }}
          >
            <label>
              <span>Email</span>
              <input
                type="email"
                value={accountEmailInput}
                onChange={(event) => setAccountEmailInput(event.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
              />
            </label>
            <label>
              <span>Password</span>
              <input
                type="password"
                value={accountPasswordInput}
                onChange={(event) => setAccountPasswordInput(event.target.value)}
                placeholder="Password"
                autoComplete="current-password"
              />
            </label>
            <button className="primary-action" type="submit" disabled={!accountStatus?.configured}>
              Sign in
            </button>
            <button type="button" disabled={!accountStatus?.configured} onClick={() => void handleAccountSignIn("sign-up")}>
              Create account
            </button>
            <button type="button" disabled={!accountStatus?.configured} onClick={() => void handleAccountSignIn("magic-link")}>
              Send magic link
            </button>
            <button type="button" onClick={refreshAccountStatus}>
              Refresh status
            </button>
          </form>
          <p className="account-gate-note" role="status">
            {accountActionStatus || accountGateMessage}
          </p>
        </section>
      </main>
    );
  }

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
                {view === "home"
                  ? "Home"
                  : view === "productivity"
                  ? "Productivity"
                  : view === "coding"
                    ? "Coding"
                    : view === "chatting"
                      ? "Chatting"
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

          {view === "home" && (
            <section className="home-command-page" aria-labelledby="home-heading">
              <HomeCommandHero
                workTwinTotal={workTwinCounts.total || commandCenterOpenCount}
                aiWorkingCount={workTwinCounts.aiWorking || workAssignments.filter((assignment) => assignment.state === "running").length}
                reviewCount={workTwinCounts.needsApproval || artifacts.length}
                rulesSuggestedCount={workTwinCounts.rulesSuggested || pendingChatActionSuggestions.length}
              />

              <HomeCommandStrip
                primaryReviewItem={homePrimaryReviewItem}
                workGraphBusyIds={workGraphBusyIds}
                sourceHealth={homeSourceHealth}
                onRefreshWorkGraph={() => void refreshWorkGraph()}
                onOpenWorkspace={openWorkspaceByView}
                onSelectWorkGraphItem={setSelectedWorkGraphItemId}
                onStartSafeWork={(item) => void startWorkGraphSafeWork(item)}
              />

              <HomeAttentionBoard
                lanes={homeAttentionLanes}
                selectedWorkGraphItemId={selectedWorkGraphItem?.id}
                onSelectWorkGraphItem={setSelectedWorkGraphItemId}
              />

              <section className="home-command-grid" aria-label="Autopilot overview">
                <HomeOverviewCards
                  todaysCallOpenCount={todaysCallPlan.openCount}
                  todaysCallHeadline={todaysCallPlan.headline}
                  todaysCallSubheadline={todaysCallPlan.subheadline}
                  latestActivity={homeLatestActivity}
                  paymentItems={homePaymentItems}
                  paymentReceiptStatusById={paymentReceiptStatusById}
                  onOpenWorkspace={openWorkspaceByView}
                  onRefreshPayments={() => void Promise.all([refreshPaymentReceipts(), refreshMoneyMovementSettings()])}
                  onVerifyReceipt={(receiptId) => void verifyHomePaymentReceipt(receiptId)}
                  onOpenAutomationPayment={(item) => {
                    if (item.automationRunId) {
                      setSelectedAutomationRunId(item.automationRunId);
                    }
                    setCodingSection("browser");
                    openWorkspaceByView("coding");
                  }}
                />

                <HomeWorkTwinCard
                  workGraphItems={workGraphItems}
                  selectedWorkGraphItem={selectedWorkGraphItem}
                  workGraphBusyIds={workGraphBusyIds}
                  workTwinProof={workTwinProof}
                  workGraphStatus={workGraphStatus}
                  shadowModeRunCount={shadowModeRuns.length}
                  shadowModeRuleCount={shadowModeRules.length}
                  agentRuntimeBusy={agentRuntimeBusy}
                  onRefreshWorkGraph={() => void refreshWorkGraph()}
                  onSelectWorkGraphItem={setSelectedWorkGraphItemId}
                  onStartSafeWork={(item) => void startWorkGraphSafeWork(item)}
                  onPreviewAgentRuntimePlan={(item) => void previewAgentRuntimePlan(item)}
                  onOpenOriginal={(item) => void openWorkGraphOriginal(item)}
                  onApprove={(item) => void approveWorkGraphItem(item)}
                  onReject={(item) => void rejectWorkGraphItem(item)}
                  onRevise={(item) => void reviseWorkGraphItem(item)}
                  onMakeRule={(item) => void makeWorkGraphRule(item)}
                  onOpenProductivity={() => openWorkspaceByView("productivity")}
                />

                <HomeAgentRuntimeCard
                  activeRuntimeConnectors={activeRuntimeConnectors}
                  selectedRuntimeTools={selectedRuntimeTools}
                  runtimePermissionPolicy={runtimePermissionPolicy}
                  agentRuntimeTrace={agentRuntimeTrace}
                  allowedRuntimeDecisionCount={allowedRuntimeDecisionCount}
                  blockedRuntimeDecisions={blockedRuntimeDecisions}
                  agentRuntimeStatus={agentRuntimeStatus}
                  onRefreshAgentRuntime={() => void refreshAgentRuntime()}
                />

                <article className="home-command-card">
                  <header>
                    <span>
                      <Mail size={18} aria-hidden="true" />
                      Inbox
                    </span>
                    <button type="button" onClick={() => openWorkspaceByView("productivity")}>View</button>
                  </header>
                  <strong>{emailMessages.length} synced emails</strong>
                  <p>{productivityDrafts.length} drafts saved. {queueOpenActionItems.length} classified actions are ready for review.</p>
                </article>

                <article className="home-command-card">
                  <header>
                    <span>
                      <Code2 size={18} aria-hidden="true" />
                      Coding
                    </span>
                    <button type="button" onClick={() => openWorkspaceByView("coding")}>Open</button>
                  </header>
                  <strong>{visibleCodingChats.length} agent chats</strong>
                  <p>{codingSnapshot.activeProject ? `${codingSnapshot.activeProject.name} is active.` : "Open a project to give the coding agent file and terminal context."}</p>
                </article>

                <article className="home-command-card">
                  <header>
                    <span>
                      <Palette size={18} aria-hidden="true" />
                      Design
                    </span>
                    <button type="button" onClick={() => openWorkspaceByView("design")}>Open</button>
                  </header>
                  <strong>{activeArtifact ? activeArtifact.title : "No artifact selected"}</strong>
                  <p>{activeGeneratedArtifactReview ? `Quality ${activeGeneratedArtifactReview.qualityReport.score}/100 with ${activeArtifact?.versions.length ?? 0} versions.` : "Ask Autopilot to create a document, deck, or website design."}</p>
                </article>

                <article className="home-command-card">
                  <header>
                    <span>
                      <MessageCircle size={18} aria-hidden="true" />
                      Chatting
                    </span>
                    <button type="button" onClick={() => openWorkspaceByView("chatting")}>Open</button>
                  </header>
                  <strong>{enterpriseChat.organizationName}</strong>
                  <p>{pendingChatActionSuggestions.length} team action suggestions waiting. Invite key is rotatable from Chatting.</p>
                </article>

                <article className="home-command-card">
                  <header>
                    <span>
                      <Clock size={18} aria-hidden="true" />
                      Automation
                    </span>
                    <button type="button" onClick={() => openWorkspaceByView("coding")}>Manage</button>
                  </header>
                  <strong>{automationRuns.length} runs</strong>
                  <p>{runningAutomationRuns.length > 0 ? `${runningAutomationRuns.length} automation${runningAutomationRuns.length === 1 ? " is" : "s are"} running now.` : "No automation is running right now."}</p>
                </article>
              </section>
            </section>
          )}

          {view === "chatting" && (
            <section className="chatting-workspace enterprise-chat-redesign" aria-labelledby="chatting-heading">
              <aside className="chatting-sidebar" aria-label="Organizations and channels">
                <header>
                  <p className="panel-kicker">Enterprise Chat</p>
                  <h2 id="chatting-heading">{enterpriseChat.organizationName}</h2>
                  <small>
                    {activeEnterpriseMembers.length} active member{activeEnterpriseMembers.length === 1 ? "" : "s"} - signed in as {currentEnterpriseMember?.displayName ?? accountStatus?.userEmail}
                  </small>
                </header>
                <div className="chatting-local-mode-banner" role="status">
                  <strong>Local preview mode</strong>
                  <span>Messages and actions are saved on this device. Supabase realtime chat tables exist, but cross-account live sync is not connected in this build yet.</span>
                </div>
                <section className="chatting-admin-card" aria-label="Invite controls">
                  <span>
                    <strong>Enterprise key</strong>
                    <code>{enterpriseChat.inviteKey}</code>
                    <small>Version {enterpriseChat.inviteKeyVersion} - rotating blocks future joins with the old key.</small>
                  </span>
                  <div>
                    <button type="button" onClick={() => void navigator.clipboard?.writeText(enterpriseChat.inviteKey).then(() => setChatStatus("Invite key copied."))}>
                      Copy
                    </button>
                    <button type="button" disabled={!currentEnterpriseCanAdmin} title={currentEnterpriseCanAdmin ? "Rotate invite key" : "Only owners/admins can rotate invite keys"} onClick={rotateEnterpriseInviteKey}>
                      Rotate
                    </button>
                  </div>
                </section>
                <form
                  className="chatting-org-form"
                  aria-label="Organization settings"
                  onSubmit={(event) => {
                    event.preventDefault();
                    updateEnterpriseOrganizationName();
                  }}
                >
                  <label>
                    <span>Organization</span>
                    <input value={chatOrganizationDraft} onChange={(event) => setChatOrganizationDraft(event.target.value)} aria-label="Organization name" />
                  </label>
                  <button type="submit" disabled={!currentEnterpriseCanAdmin} title={currentEnterpriseCanAdmin ? "Save organization name" : "Only owners/admins can rename the workspace"}>
                    Save
                  </button>
                </form>
                <form
                  className="chatting-join-card"
                  aria-label="Join organization with enterprise key"
                  onSubmit={(event) => {
                    event.preventDefault();
                    joinEnterpriseOrganizationWithKey();
                  }}
                >
                  <strong>Join by key</strong>
                  <label>
                    <span>Email</span>
                    <input value={chatJoinEmailDraft} onChange={(event) => setChatJoinEmailDraft(event.target.value)} placeholder="teammate@company.com" aria-label="Invitee email" />
                  </label>
                  <label>
                    <span>Key</span>
                    <input value={chatJoinKeyDraft} onChange={(event) => setChatJoinKeyDraft(event.target.value)} placeholder="Paste current enterprise key" aria-label="Enterprise key to join" />
                  </label>
                  <button type="submit" disabled={!chatJoinEmailDraft.trim() || !chatJoinKeyDraft.trim()}>
                    Join workspace
                  </button>
                  <small>Old rotated keys are rejected. Existing members stay active.</small>
                </form>
                <form
                  className="chatting-channel-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    createEnterpriseChannel();
                  }}
                >
                  <label>
                    <Hash size={14} aria-hidden="true" />
                    <input value={chatChannelDraft} onChange={(event) => setChatChannelDraft(event.target.value)} placeholder="New channel" aria-label="New channel name" />
                  </label>
                  <button type="submit" aria-label="Create channel">
                    <Plus size={15} aria-hidden="true" />
                  </button>
                </form>
                <nav className="chatting-channel-list" aria-label="Channels">
                  <p className="chatting-list-heading">Channels</p>
                  {enterpriseChat.channels.filter((channel) => channel.kind === "channel").map((channel) => (
                    <button
                      className={channel.id === activeChatChannel?.id ? "active" : ""}
                      type="button"
                      key={channel.id}
                      onClick={() => updateEnterpriseChat((currentState) => ({ ...currentState, activeChannelId: channel.id }))}
                    >
                      <Hash size={15} aria-hidden="true" />
                      <span>{channel.name}</span>
                      {channel.unreadCount > 0 ? <em>{channel.unreadCount}</em> : channel.aiNotesEnabled && <em>AI</em>}
                    </button>
                  ))}
                  <p className="chatting-list-heading">Direct messages</p>
                  {enterpriseChat.channels.filter((channel) => channel.kind === "dm").map((channel) => (
                    <button
                      className={channel.id === activeChatChannel?.id ? "active" : ""}
                      type="button"
                      key={channel.id}
                      onClick={() => updateEnterpriseChat((currentState) => ({ ...currentState, activeChannelId: channel.id }))}
                    >
                      <MessageCircle size={15} aria-hidden="true" />
                      <span>{channel.name}</span>
                      {channel.unreadCount > 0 && <em>{channel.unreadCount}</em>}
                    </button>
                  ))}
                </nav>
                <section className="chatting-member-list" aria-label="Organization members">
                  <p className="chatting-list-heading">Members</p>
                  {activeEnterpriseMembers.map((member) => (
                    <article key={member.id}>
                      <span>
                        <strong>{member.displayName}</strong>
                        <small>{member.email} - {member.role}</small>
                      </span>
                      <div>
                        {member.id !== currentEnterpriseMember?.id && (
                          <button type="button" onClick={() => createEnterpriseDirectMessage(member.id)} aria-label={`Start DM with ${member.displayName}`}>
                            <MessageCircle size={13} aria-hidden="true" />
                          </button>
                        )}
                        {member.role !== "owner" && member.id !== currentEnterpriseMember?.id && (
                          <button
                            className="danger"
                            type="button"
                            disabled={!currentEnterpriseCanAdmin}
                            title={currentEnterpriseCanAdmin ? `Remove ${member.displayName}` : "Only owners/admins can remove members"}
                            onClick={() => removeEnterpriseMember(member.id)}
                            aria-label={`Remove ${member.displayName}`}
                          >
                            <X size={13} aria-hidden="true" />
                          </button>
                        )}
                        {member.role !== "owner" && member.id !== currentEnterpriseMember?.id && (
                          <button
                            type="button"
                            disabled={currentEnterpriseMember?.role !== "owner"}
                            title={currentEnterpriseMember?.role === "owner" ? `Toggle admin access for ${member.displayName}` : "Only the owner can change admin roles"}
                            onClick={() => toggleEnterpriseMemberAdmin(member.id)}
                            aria-label={`Toggle admin access for ${member.displayName}`}
                          >
                            <ShieldCheck size={13} aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                </section>
              </aside>

              <section className="chatting-main" aria-label="Message timeline">
                <header className="chatting-main-header">
                  <span className="chatting-room-title">
                    <b aria-hidden="true">{activeChatChannel?.kind === "dm" ? "DM" : "#"}</b>
                    <span>
                      <strong>{activeChatChannel?.name ?? "No channel"}</strong>
                      <small>
                        {activeChatMessages.length} message{activeChatMessages.length === 1 ? "" : "s"} - {activeChatChannel?.aiNotesEnabled ? "AI notes on" : "AI notes off"}
                      </small>
                    </span>
                  </span>
                  <div className="chatting-channel-members" aria-label="Channel members">
                    {activeChatMembers.slice(0, 7).map((member) => (
                      <span key={member.id} title={`${member.displayName} - ${member.role}`}>
                        {getDisplayInitials(member.displayName)}
                      </span>
                    ))}
                    {activeChatMembers.length > 7 && <em>+{activeChatMembers.length - 7}</em>}
                  </div>
                  <div>
                    <button type="button" onClick={markActiveChatRead}>
                      Mark read
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        activeChatChannel &&
                        updateEnterpriseChat((currentState) => ({
                          ...currentState,
                          channels: currentState.channels.map((channel) =>
                            channel.id === activeChatChannel.id ? { ...channel, aiNotesEnabled: !channel.aiNotesEnabled } : channel
                          ),
                          auditLog: [
                            createEnterpriseAuditEvent(
                              currentState.currentUserId,
                              `${activeChatChannel.aiNotesEnabled ? "Paused" : "Enabled"} AI notes in ${activeChatChannel.kind === "dm" ? activeChatChannel.name : `#${activeChatChannel.name}`}.`
                            ),
                            ...currentState.auditLog
                          ].slice(0, 80)
                        }))
                      }
                    >
                      {activeChatChannel?.aiNotesEnabled ? "Pause AI notes" : "Enable AI notes"}
                    </button>
                  </div>
                </header>
                <div className="chatting-message-list">
                  {activeChatMessages.map((message) => (
                    <article className={message.authorId === currentEnterpriseMember?.id ? "own" : ""} key={message.id}>
                      <span className="chatting-avatar" aria-hidden="true">
                        {getDisplayInitials(message.author)}
                      </span>
                      <div className="chatting-message-body">
                        <header>
                          <strong>{message.author}</strong>
                          <time>{formatSaveTime(message.createdAt)}</time>
                        </header>
                        <p>{message.body}</p>
                        {message.mentionMemberIds.length > 0 && (
                          <div className="chatting-mentions">
                            {message.mentionMemberIds.map((memberId) => (
                              <span key={memberId}>@{enterpriseChat.members.find((member) => member.id === memberId)?.displayName ?? "member"}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
                <form
                  className="chatting-composer"
                  onSubmit={(event) => {
                    event.preventDefault();
                    sendEnterpriseChatMessage();
                  }}
                >
                  <textarea
                    value={chatMessageDraft}
                    onChange={(event) => setChatMessageDraft(event.target.value)}
                    placeholder="Message the team. Use @name, deadlines, asks, decisions, or deliverables..."
                    aria-label="Message"
                  />
                  <button className="primary-action" type="submit" disabled={!chatMessageDraft.trim()}>
                    <Send size={16} aria-hidden="true" />
                    Send
                  </button>
                </form>
              </section>

              <aside className="chatting-ai-panel" aria-label="AI notes and action suggestions">
                <header>
                  <span>
                    <Sparkles size={17} aria-hidden="true" />
                    <strong>AI notes</strong>
                  </span>
                  <button type="button" disabled={activeChatMessages.length === 0 || !activeChatChannel?.aiNotesEnabled} title={!activeChatChannel?.aiNotesEnabled ? "Enable AI notes before analyzing this channel" : "Analyze recent messages"} onClick={analyzeEnterpriseChatChannel}>
                    Analyze
                  </button>
                </header>
                <p className="chatting-status">{chatStatus}</p>
                <div className="chatting-note-list">
                  {enterpriseChat.aiNotes.slice(0, 6).map((note, index) => (
                    <p key={`${note}-${index}`}>{note}</p>
                  ))}
                </div>
                <section className="chatting-actions-list" aria-label="Action suggestions">
                  <h3>Action suggestions</h3>
                  {pendingChatActionSuggestions.length === 0 ? (
                    <div className="chatting-empty-state">
                      <ListChecks size={18} aria-hidden="true" />
                      <span>No team action items waiting.</span>
                    </div>
                  ) : (
                    pendingChatActionSuggestions.map((suggestion) => (
                      <article key={suggestion.id}>
                        <span className="route-pill">{suggestion.route}</span>
                        <strong>{suggestion.title}</strong>
                        <p>{suggestion.summary}</p>
                        <small>
                          {suggestion.confidence}% confidence
                          {suggestion.assigneeId ? ` - assigned to ${enterpriseChat.members.find((member) => member.id === suggestion.assigneeId)?.displayName ?? "teammate"}` : ""}
                        </small>
                        <div>
                          <button type="button" onClick={() => void acceptEnterpriseChatSuggestion(suggestion.id)}>
                            Accept
                          </button>
                          <button type="button" onClick={() => ignoreEnterpriseChatSuggestion(suggestion.id)}>
                            Ignore
                          </button>
                        </div>
                      </article>
                    ))
                  )}
                </section>
                <section className="chatting-actions-list" aria-label="Admin audit log">
                  <h3>Admin audit</h3>
                  {enterpriseChat.auditLog.slice(0, 5).map((event) => (
                    <article key={event.id}>
                      <strong>{event.action}</strong>
                      <small>{formatSaveTime(event.createdAt)}</small>
                    </article>
                  ))}
                </section>
              </aside>
            </section>
          )}

          {view === "coding" && (
            <CodingWorkspaceRebuild
              assistantUserName={codingAssistantUserName}
              snapshot={codingSnapshot}
              activeProject={activeCodingProject}
              activeTab={activeCodingTab as CodingWorkbenchTabView}
              activeTextTab={activeTextCodingTab as CodingTextWorkbenchTabView | null}
              tabs={codingTabs as CodingWorkbenchTabView[]}
              textTabs={textCodingTabs as CodingTextWorkbenchTabView[]}
              visibleProjects={visibleCodingProjects}
              orderedProjects={orderedCodingProjects}
              chatsByProject={codingChatsByProject as Map<string, CodingChatThreadView[]>}
              activeChat={activeCodingAssistantChat as CodingChatThreadView | null}
              projectSearch={codingProjectSearch}
              setProjectSearch={setCodingProjectSearch}
              openFolders={openCodingFolders}
              collapsedProjects={collapsedCodingProjects}
              collapsedProjectSections={collapsedCodingProjectSections}
              recentCodeItems={activeProjectRecentCodeItems}
              boardColumns={codingProjectBoardColumns}
              codingSection={codingSection}
              setCodingSection={setCodingSection}
              assistantPanelMode={codingAssistantPanelMode}
              setAssistantPanelMode={setCodingAssistantPanelMode}
              busy={codingBusy}
              status={codingStatus}
              runStatus={codingRunStatus}
              runHeartbeat={codingRunHeartbeat}
              runTimeout={codingRunTimeout}
              lastRunPrompt={lastCodingRunPrompt}
              commandDraft={codingCommandDraft}
              setCommandDraft={setCodingCommandDraft}
              terminalOpening={codingTerminalOpening}
              terminalText={getCodingTerminalDisplay()}
              pendingCommand={pendingCodingCommand}
              commandHistory={codingTerminalHistory}
              reviewChangedCount={codingReviewChangedCount}
              reviewAddedCount={codingReviewAddedCount}
              reviewRemovedCount={codingReviewRemovedCount}
              branchLabel={codingBranchLabel}
              testsLabel={codingTestsLabel}
              agentPlan={codingAgentPlan}
              agentRun={codingAgentRun}
              clarificationQuestion={codingClarificationQuestion}
              draftMessage={codingDraftMessage}
              setDraftMessage={setCodingDraftMessage}
              browserFeedbackDraft={codingBrowserFeedbackDraft}
              setBrowserFeedbackDraft={setCodingBrowserFeedbackDraft}
              clickSuggestMode={codingClickSuggestMode}
              setClickSuggestMode={setCodingClickSuggestMode}
              activeDiff={activeCodingVisibleDiff ?? activeTextCodingDiff}
              aiPatch={codingAiFilePatch as CodingAiFilePatchView | null}
              onOpenProject={() => void openCodingProject()}
              onCreateProject={() => void createCodingProject()}
              onOpenPicker={() => openCodingPicker()}
              onOpenNode={openCodingNode}
              onOpenPath={(path) => void openCodingPath(path)}
              onSelectProject={(rootPath) => void selectCodingProject(rootPath, { startChat: false })}
              onStartNewChat={(project) => {
                startNewCodingChat(project);
              }}
              onOpenExistingChat={(chat) => void openExistingCodingChat(chat as CodingChatThread)}
              onArchiveChat={archiveCodingChat}
              onToggleProject={toggleCodingProjectGroup}
              onToggleProjectSection={toggleCodingProjectSection}
              onOpenSearch={openCodingSearch}
              onOpenBoard={openCodingProjectBoard}
              onRunBoardAction={(_action, item) => {
                if (item) {
                  runCodingProjectBoardAction(item as CodingProjectBoardItemView as CodingProjectBoardItem);
                }
              }}
              onOpenTerminal={() => openCodingTerminal()}
              onOpenTerminalFresh={() => openCodingTerminal({ forceLaunch: true })}
              onRunTests={() => void runCodingProjectTool("npm test -- --run", "Running project tests.")}
              onOpenReview={openCodingReview}
              onApplyAiPatch={() => applyCodingAiFilePatch()}
              onDismissAiPatch={dismissCodingAiFilePatch}
              onSetAccessMode={setCodingAccessMode}
              onApprovePendingCommand={() => void runCodingCommand(true)}
              onCancelPendingCommand={() => setPendingCodingCommand(null)}
              onRunCommand={() => void runCodingCommand(false)}
              onSendChat={() => void sendCodingChatMessage()}
              onAnswerClarification={answerCodingClarification}
              onDismissClarification={dismissCodingClarification}
              onStopRun={stopCodingAgentRun}
              onRetryRun={retryLastCodingRun}
              onUseShorterPrompt={prepareShorterCodingPrompt}
              onCheckAiSetup={openCodingAiSetup}
              onOpenBrowserTestWorkspace={() => void openCodingBrowserTestWorkspace()}
              onSubmitBrowserFeedback={submitCodingBrowserFeedback}
              onSetActiveTab={setActiveCodingTabId}
              onCloseTab={closeCodingTab}
              onUpdateFileContent={updateCodingFileContent}
              onRefreshRepo={() => void refreshCodingRepoState()}
              onOpenSettings={() => {
                setAssistantOpen(false);
                setBrowserDownloadsOpen(false);
                setView("settings");
              }}
            />
          )}

          {Boolean(false) && view === "coding" && (
            <section
              className={`coding-page ${codingRightSidebarOpen ? "" : "right-sidebar-closed"} ${codingExplorerOpen ? "" : "explorer-closed"} ${
                codingActivityRailExpanded ? "activity-rail-expanded" : ""
              } cursor-desktop-mode coding-assistant-${codingAssistantPanelMode}`}
              aria-labelledby="coding-heading"
            >
              <div className={`coding-activity-rail ${codingActivityRailExpanded ? "expanded" : ""}`} aria-label="Coding tools">
                <button
                  className="coding-activity-brand"
                  type="button"
                  aria-label="Coding workspace tools"
                  onClick={() => {
                    setCodingSection("files");
                    setCodingExplorerOpen(true);
                  }}
                >
                  <span className="coding-forge-mark" aria-hidden="true">
                    <AutopilotNeedle className="coding-forge-needle" />
                  </span>
                  <span className="coding-activity-label">Autopilot</span>
                </button>
                <nav className="coding-activity-tools" aria-label="Coding workspace tools">
                  <button className={activeCodingTab.kind === "chat" && codingSection === "files" ? "active" : ""} type="button" aria-label="New coding chat" title="New Chat" onClick={newCodingChat}>
                    <MessageCircle size={18} aria-hidden="true" />
                    <span className="coding-activity-label">New Chat</span>
                  </button>
                  <button className={codingSection === "plugins" ? "active" : ""} type="button" aria-label="Open coding plugins" title="Plugins" onClick={openCodingPlugins}>
                    <Package size={18} aria-hidden="true" />
                    <span className="coding-activity-label">Plugins</span>
                  </button>
                  <button className={codingSection === "skills" ? "active" : ""} type="button" aria-label="Open coding skills" title="Skills" onClick={openCodingSkills}>
                    <Sparkles size={18} aria-hidden="true" />
                    <span className="coding-activity-label">Skills</span>
                  </button>
                  <button className={codingRightPanel === "assistant" && codingDraftMessage.toLowerCase().includes("automation") ? "active" : ""} type="button" aria-label="Open automation chat" title="Automations" onClick={openCodingAutomationChat}>
                    <Wrench size={18} aria-hidden="true" />
                    <span className="coding-activity-label">Automations</span>
                  </button>
                  <button className={codingSection === "board" ? "active" : ""} type="button" aria-label="Open project board" title="Project Board" onClick={openCodingProjectBoard}>
                    <ListChecks size={18} aria-hidden="true" />
                    <span className="coding-activity-label">Project Board</span>
                  </button>
                  <button
                    className={codingSection === "terminal" ? "active" : ""}
                    type="button"
                    aria-label="Terminal"
                    title="Terminal"
                    onClick={() => openCodingTerminal()}
                  >
                    <Terminal size={18} aria-hidden="true" />
                    <span className="coding-activity-label">Terminal</span>
                  </button>
                  <button
                    type="button"
                    aria-label="Create new coding project"
                    title="New Project"
                    disabled={codingBusy}
                    onClick={() => void createCodingProject()}
                  >
                    <Plus size={18} aria-hidden="true" />
                    <span className="coding-activity-label">New Project</span>
                  </button>
                </nav>
                <div className="coding-activity-footer">
                  <button
                    className="coding-activity-settings"
                    type="button"
                    aria-label="Coding notifications"
                    title="Notifications"
                    onClick={openCodingNotifications}
                  >
                    <Clock size={18} aria-hidden="true" />
                    <span className="coding-activity-label">Notifications</span>
                  </button>
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
                      <p className="panel-kicker">Autopilot</p>
                      <h2 id="coding-heading">
                        {activeCodingProject?.name ?? "No project"}
                      </h2>
                    </div>
                  <button type="button" aria-label="Open file picker" onClick={openCodingPicker}>
                    <Plus size={15} />
                  </button>
                </div>

                <label className="coding-project-search-shell">
                  <Search size={13} aria-hidden="true" />
                  <input
                    value={codingProjectSearch}
                    onChange={(event) => setCodingProjectSearch(event.target.value)}
                    placeholder="Search files, chats, board..."
                    aria-label="Search files, chats, board"
                  />
                  {codingProjectSearch && (
                    <button type="button" aria-label="Clear project search" onClick={() => setCodingProjectSearch("")}>
                      <X size={12} aria-hidden="true" />
                    </button>
                  )}
                </label>

                <div className="coding-sidebar-mode-tabs" role="tablist" aria-label="Coding sidebar mode">
                  <button className={codingSection === "files" ? "active" : ""} type="button" role="tab" aria-selected={codingSection === "files"} onClick={toggleCodingFilesPanel}>
                    Files
                  </button>
                  <button
                    className={activeCodingTab.kind === "chat" && codingSection !== "board" ? "active" : ""}
                    type="button"
                    role="tab"
                    aria-selected={activeCodingTab.kind === "chat" && codingSection !== "board"}
                    onClick={() => {
                      setCodingSection("files");
                      const chat = activeCodingAssistantChat ?? startNewCodingChat(activeCodingProject);
                      openCodingAssistant(chat);
                    }}
                  >
                    Chats
                  </button>
                  <button className={codingSection === "board" ? "active" : ""} type="button" role="tab" aria-selected={codingSection === "board"} onClick={openCodingProjectBoard}>
                    Board
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

                <section className="coding-ai-projects" aria-label="AI-started coding projects">
                  <header>
                    <span>AI-started projects</span>
                    <b>{codingRoutedWorkItems.length}</b>
                  </header>
                  {codingRoutedWorkItems.length === 0 ? (
                    <p>No Productivity-routed coding work yet. Real code tasks will appear here before credits go to the coding agent.</p>
                  ) : (
                    codingRoutedWorkItems.map((item) => (
                      <button type="button" key={item.id} onClick={() => openCodingAiProjectFromWorkItem(item)}>
                        <span className="coding-project-dot" aria-hidden="true" />
                        <span>
                          <strong>{item.title}</strong>
                          <small>{item.requestedOutput} / {item.routeConfidence}% route confidence</small>
                        </span>
                      </button>
                    ))
                  )}
                </section>

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
                  ) : visibleCodingProjects.length === 0 ? (
                    <span className="coding-sidebar-empty">No projects match "{codingProjectSearch}".</span>
                  ) : (
                    <div className="coding-project-list">
                      {visibleCodingProjects.map((project, projectIndex) => {
                        const projectChats = codingChatsByProject.get(project.rootPath) ?? [];
                        const isActiveProject = project.rootPath === activeCodingProject?.rootPath;
                        const isCollapsed = Boolean(collapsedCodingProjects[project.rootPath]);
                        const projectSections = collapsedCodingProjectSections[project.rootPath] ?? {};
                        const projectChatsCollapsed = Boolean(projectSections.chats);
                        const projectCodeCollapsed = Boolean(projectSections.code);
                        const projectOpenTabs = codingTabs.filter(
                          (tab) => tab.projectRootPath === project.rootPath && (tab.kind === "file" || tab.kind === "folder")
                        );
                        const projectKnownFileCount = isActiveProject ? codingProjectFileCount : projectOpenTabs.length;
                        const projectAccent = CODING_PROJECT_ACCENTS[projectIndex % CODING_PROJECT_ACCENTS.length];
                        return (
                          <div
                            className={`coding-project-group coding-project-card ${draggingCodingProjectRoot === project.rootPath ? "dragging" : ""}`}
                            key={project.rootPath}
                            style={{ "--project-accent": projectAccent } as CSSProperties}
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
                              <span className="coding-project-dot" aria-hidden="true" />
                              <button
                                className="coding-project-collapse"
                                type="button"
                                aria-label={isCollapsed ? `Expand ${project.name}` : `Collapse ${project.name}`}
                                onClick={() => toggleCodingProjectGroup(project.rootPath)}
                              >
                                {isCollapsed ? <Folder size={14} aria-hidden="true" /> : <FolderOpen size={14} aria-hidden="true" />}
                              </button>
                              <button type="button" className="coding-project-main" onClick={() => void openCodingProjectDetails(project)}>
                                <span>{project.name}</span>
                                <small>{projectChats.length} chat{projectChats.length === 1 ? "" : "s"} • {projectKnownFileCount} file{projectKnownFileCount === 1 ? "" : "s"}</small>
                              </button>
                              <button
                                className="coding-project-open-button"
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void openCodingProjectCode(project);
                                }}
                              >
                                Open
                              </button>
                              <button
                                className="coding-project-rename"
                                type="button"
                                aria-label={`Rename ${project.name}`}
                                title={`Rename ${project.name}`}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void renameCodingProject(project);
                                }}
                              >
                                <Pencil size={13} aria-hidden="true" />
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
                                <div className="coding-project-subsection">
                                  <div className="coding-project-section-header">
                                    <button
                                      type="button"
                                      aria-label={projectChatsCollapsed ? `Expand chats in ${project.name}` : `Collapse chats in ${project.name}`}
                                      onClick={() => toggleCodingProjectSection(project.rootPath, "chats")}
                                    >
                                      {projectChatsCollapsed ? <ChevronRight size={13} aria-hidden="true" /> : <ChevronDown size={13} aria-hidden="true" />}
                                      <MessageCircle size={13} aria-hidden="true" />
                                      <span>Chats</span>
                                    </button>
                                    <small>{projectChats.length}</small>
                                    <button
                                      type="button"
                                      aria-label={`New chat in ${project.name}`}
                                      onClick={() => {
                                        void selectCodingProject(project.rootPath, { startChat: false }).then(() => startNewCodingChat(project));
                                      }}
                                    >
                                      <Plus size={12} aria-hidden="true" />
                                    </button>
                                  </div>
                                  {!projectChatsCollapsed &&
                                    (projectChats.length === 0 ? (
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
                                    ))}
                                </div>

                                <div className="coding-project-subsection">
                                  <div className="coding-project-section-header">
                                    <button
                                      type="button"
                                      aria-label={projectCodeCollapsed ? `Expand code in ${project.name}` : `Collapse code in ${project.name}`}
                                      onClick={() => toggleCodingProjectSection(project.rootPath, "code")}
                                    >
                                      {projectCodeCollapsed ? <ChevronRight size={13} aria-hidden="true" /> : <ChevronDown size={13} aria-hidden="true" />}
                                      <Code2 size={13} aria-hidden="true" />
                                      <span>Code</span>
                                    </button>
                                    <small>{projectKnownFileCount}</small>
                                    <button type="button" aria-label={`Open code in ${project.name}`} onClick={() => void openCodingProjectCode(project)}>
                                      <FolderOpen size={12} aria-hidden="true" />
                                    </button>
                                  </div>
                                  {!projectCodeCollapsed &&
                                    (isActiveProject && codingSnapshot.tree?.children?.length ? (
                                      <div className="coding-project-inline-tree" aria-label={`Code files in ${project.name}`}>
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
                                    ) : projectOpenTabs.length > 0 ? (
                                      <div className="coding-project-open-code-list" aria-label={`Open code in ${project.name}`}>
                                        {projectOpenTabs.slice(0, 5).map((tab) => {
                                          const ProjectTabIcon = getCodingTabIcon(tab.kind, tab.file);
                                          return (
                                            <button key={tab.id} type="button" onClick={() => setActiveCodingTabId(tab.id)}>
                                              <ProjectTabIcon size={13} aria-hidden="true" />
                                              <span>{tab.title}</span>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <button className="coding-project-load-code" type="button" onClick={() => void openCodingProjectCode(project)}>
                                        Open project to load files
                                      </button>
                                    ))}
                                </div>
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
                ) : activeCodingAssistantChat ? null : codingSnapshot.tree ? (
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
                  <div className="coding-mode-switch" role="group" aria-label="Agent and editor mode">
                    <button
                      className={activeCodingTab.kind === "chat" ? "active" : ""}
                      type="button"
                      onClick={() => {
                        const chatTab = codingTabs.find((tab) => tab.kind === "chat");
                        if (chatTab) {
                          setActiveCodingTabId(chatTab.id);
                        } else {
                          startNewCodingChat(activeCodingProject);
                        }
                        openCodingAssistant(activeCodingAssistantChat);
                      }}
                    >
                      Agent
                    </button>
                    <button
                      className={activeCodingTab.kind !== "chat" ? "active" : ""}
                      type="button"
                      onClick={() => {
                        const openFileTab = textCodingTabs[0] ?? activeProjectOpenTabs[0];
                        if (openFileTab) {
                          setActiveCodingTabId(openFileTab.id);
                          return;
                        }
                        openCodingPicker();
                      }}
                    >
                      Editor
                    </button>
                  </div>
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
                    <button
                      className={`coding-icon-tool ${codingBrowserTestSessionActive ? "active" : ""}`}
                      type="button"
                      aria-label="Open in Browser Test"
                      title="Open in Browser Test"
                      onClick={openCodingBrowser}
                    >
                      <Globe2 size={15} aria-hidden="true" />
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
                  {activeCodingTab.kind === "board" && (
                    <section className="coding-project-board-workspace" aria-label="Project Board">
                      <header className="coding-project-board-hero">
                        <div>
                          <p className="panel-kicker">Project Board</p>
                          <h2>{activeCodingProject?.name ?? "Open a project to start the board"}</h2>
                          <span>
                            Drafts, active agent work, ready reviews, and done checks stay attached to this project. Files and chats stay visible on the left.
                          </span>
                        </div>
                        <div className="coding-project-board-actions">
                          <button type="button" onClick={() => startNewCodingChat(activeCodingProject)}>
                            <MessageCircle size={14} aria-hidden="true" />
                            New chat
                          </button>
                          <button type="button" disabled={!activeCodingProject} onClick={() => void createCodingAgentPlan(undefined, activeCodingAssistantChat)}>
                            <Sparkles size={14} aria-hidden="true" />
                            Plan work
                          </button>
                          <button type="button" onClick={() => void runCodingProjectTool("npm test -- --run", "Running board verification tests.")} disabled={!activeCodingProject || codingBusy}>
                            <Play size={14} aria-hidden="true" />
                            Run tests
                          </button>
                        </div>
                      </header>

                      <div className="coding-project-board-summary" aria-label="Project Board summary">
                        <span>
                          <strong>{codingProjectBoardColumns.reduce((total, column) => total + column.items.length, 0)}</strong>
                          <small>Board items</small>
                        </span>
                        <span>
                          <strong>{codingGitChangedFiles.length}</strong>
                          <small>Git changes</small>
                        </span>
                        <span>
                          <strong>{codingProjectFileCount}</strong>
                          <small>Known files</small>
                        </span>
                        <span>
                          <strong>{codingTestsLabel}</strong>
                          <small>Verification</small>
                        </span>
                      </div>

                      <div className="coding-project-board-columns">
                        {codingProjectBoardColumns.map((column) => (
                          <section className={`coding-project-board-column ${column.id}`} key={column.id} aria-label={`${column.title} tasks`}>
                            <header>
                              <span>
                                <strong>{column.title}</strong>
                                <small>{column.description}</small>
                              </span>
                              <em>{column.items.length}</em>
                            </header>
                            <div className="coding-project-board-card-list">
                              {column.items.map((item) => (
                                <article className={`coding-project-board-card ${item.status}`} key={item.id}>
                                  <div>
                                    <span className="coding-project-board-dot" aria-hidden="true" />
                                    <strong>{item.title}</strong>
                                  </div>
                                  <p>{item.detail}</p>
                                  <dl>
                                    <div>
                                      <dt>DoD</dt>
                                      <dd>{item.meta}</dd>
                                    </div>
                                    <div>
                                      <dt>{item.agent}</dt>
                                      <dd>{item.branch}</dd>
                                    </div>
                                  </dl>
                                  <button type="button" onClick={() => runCodingProjectBoardAction(item)}>
                                    {item.actionLabel}
                                  </button>
                                </article>
                              ))}
                            </div>
                          </section>
                        ))}
                      </div>

                      <footer className="coding-project-board-footer">
                        <button type="button" onClick={openCodingPlugins}>
                          <Package size={14} aria-hidden="true" />
                          Plugins
                        </button>
                        <button type="button" onClick={openCodingSkills}>
                          <Sparkles size={14} aria-hidden="true" />
                          Skills
                        </button>
                        <button type="button" onClick={openCodingAutomationChat}>
                          <Wrench size={14} aria-hidden="true" />
                          Automation chat
                        </button>
                      </footer>
                    </section>
                  )}

                  {activeCodingTab.kind === "chat" && codingSection !== "board" && codingSection !== "plugins" && codingSection !== "skills" && (
                    <section className="coding-chat coding-editor-home chat-focused" aria-label="Coding workbench">
                      {true ? (
                        <>
                          <div className={`coding-cursor-ide-layout ${codingRightSidebarOpen ? "" : "ai-hidden"}`.trim()} aria-label="Cursor and Gemini inspired coding workspace">
                            <section className="coding-cursor-editor-stage" aria-label="Code editor">
                              <header className="coding-cursor-shell-topbar" aria-label="Agentic coding top bar">
                                <div className="coding-cursor-product-lockup">
                                  <strong>Autopilot</strong>
                                  <button
                                    type="button"
                                    aria-label="Switch coding project"
                                    title={activeCodingProject ? `Open ${activeCodingProject.name} details` : "Open a local project"}
                                    onClick={() => (activeCodingProject ? void openCodingProjectDetails(activeCodingProject) : void openCodingProject())}
                                  >
                                    {activeCodingProject?.name ?? "Open project"}
                                    <ChevronDown size={12} aria-hidden="true" />
                                  </button>
                                </div>
                                <button className="coding-cursor-command-search" type="button" onClick={openCodingSearch}>
                                  <Search size={14} aria-hidden="true" />
                                  <span>Search files, chats, symbols...</span>
                                  <kbd>Ctrl K</kbd>
                                </button>
                                <div className="coding-cursor-top-actions" aria-label="Project status and tools">
                                  <button type="button" aria-label="Open source control status" title="Open branch and changed files" onClick={openCodingSourceControl}>
                                    <Github size={14} aria-hidden="true" />
                                    <span>{codingBranchLabel}</span>
                                  </button>
                                  <button type="button" aria-label="Run project tests" title="Prepare npm test -- --run" onClick={openCodingTestsPanel}>
                                    <Check size={14} aria-hidden="true" />
                                    <span>{codingTestsLabel}</span>
                                  </button>
                                  <button type="button" aria-label="Open run panel" title="Prepare a run command" onClick={openCodingRunPanel}>
                                    <Play size={14} aria-hidden="true" />
                                  </button>
                                  <button type="button" aria-label="Open Browser Test" onClick={openCodingBrowser}>
                                    <Globe2 size={14} aria-hidden="true" />
                                  </button>
                                  <button type="button" aria-label="Open coding summary" onClick={openCodingSummary}>
                                    <ListChecks size={14} aria-hidden="true" />
                                  </button>
                                  <button type="button" aria-label="Coding settings" onClick={() => setView("settings")}>
                                    <Settings size={14} aria-hidden="true" />
                                  </button>
                                  <button type="button" aria-label="Coding notifications" title="Notifications" onClick={openCodingNotifications}>
                                    <Clock size={14} aria-hidden="true" />
                                  </button>
                                  <span className="coding-cursor-avatar" aria-label={`Signed in as ${codingAssistantUserName}`}>
                                    {codingAssistantUserName.slice(0, 2).toUpperCase()}
                                  </span>
                                </div>
                              </header>

                              <div className="coding-cursor-editor-tabs" role="tablist" aria-label="Open editor tabs">
                                {codingCursorEditorTabs.length > 0 ? (
                                  codingCursorEditorTabs.map((tab) => {
                                    const TabIcon = getCodingTabIcon(tab.kind, tab.file);
                                    return (
                                      <button
                                        className={tab.id === codingCursorPrimaryEditorTab?.id ? "active" : ""}
                                        key={tab.id}
                                        type="button"
                                        role="tab"
                                        aria-selected={tab.id === codingCursorPrimaryEditorTab?.id}
                                        onClick={() => setActiveCodingTabId(tab.id)}
                                      >
                                        <TabIcon size={14} aria-hidden="true" />
                                        <span>{tab.title}</span>
                                        {tab.dirty && <em>M</em>}
                                      </button>
                                    );
                                  })
                                ) : (
                                  <button className="active" type="button" role="tab" aria-selected="true" onClick={openCodingPicker}>
                                    <FileText size={14} aria-hidden="true" />
                                    <span>welcome.ts</span>
                                  </button>
                                )}
                                {codingAgenticEditReadyCount > 0 && (
                                  <button className="coding-cursor-edits-ready" type="button" onClick={() => openCodingReview(codingCursorPrimaryEditorTab?.id)}>
                                    <Sparkles size={13} aria-hidden="true" />
                                    <span>{codingAgenticEditReadyCount} edit{codingAgenticEditReadyCount === 1 ? "" : "s"} ready</span>
                                  </button>
                                )}
                                <button type="button" aria-label="Open another file" onClick={openCodingPicker}>
                                  <Plus size={14} aria-hidden="true" />
                                </button>
                              </div>

                              <div className="coding-cursor-breadcrumbs" aria-label="Current file path">
                                <span>{activeCodingProject?.name ?? "No project"}</span>
                                <ChevronRight size={13} aria-hidden="true" />
                                <span>{codingCursorPrimaryEditorTab?.file.relativePath ?? "welcome.ts"}</span>
                              </div>

                              <div className={`coding-cursor-code-shell ${codingAgenticEditReadyCount > 0 ? "has-agentic-edits" : ""}`} aria-label="Code editor preview">
                                <div className="coding-cursor-code-lines">
                                  {codingCursorEditorLines.map((line, index) => {
                                    const diffClass =
                                      codingAgenticEditReadyCount > 0 && index === 8
                                        ? "removed"
                                        : codingAgenticEditReadyCount > 0 && index >= 9 && index <= 29
                                          ? "added"
                                          : "";
                                    return (
                                    <div className={`coding-cursor-code-line ${diffClass}`.trim()} key={`${index}-${line.slice(0, 24)}`}>
                                      <span>{index + 1}</span>
                                      <code>{line.length > 0 ? line : " "}</code>
                                    </div>
                                    );
                                  })}
                                </div>
                                <div className="coding-cursor-minimap" aria-hidden="true">
                                  {codingCursorEditorLines.slice(0, 42).map((line, index) => (
                                    <span key={`${index}-${line.length}`} style={{ width: `${Math.max(16, Math.min(94, line.length * 2))}%` }} />
                                  ))}
                                </div>
                              </div>

                              <footer className="coding-cursor-status-bar" aria-label="Editor status">
                                <span>{activeCodingProject?.name ?? "Open a folder"}</span>
                                <span>{codingGitChangedFiles.length} change{codingGitChangedFiles.length === 1 ? "" : "s"}</span>
                                <span className={activeTextCodingTab?.dirty ? "saving" : "saved"}>
                                  {activeTextCodingTab
                                    ? activeTextCodingTab.dirty
                                      ? "Autosaving..."
                                      : `Autosaved ${formatSaveTime(activeTextCodingTab.savedAt)}`
                                    : "Autosave ready"}
                                </span>
                                <span>{codingSnapshot.accessMode === "full" ? "Full access" : "Ask first"}</span>
                                <button type="button" onClick={openCodingBrowser}>Go live</button>
                              </footer>
                            </section>

                            <aside className="coding-cursor-ai-sidebar" aria-label="Autopilot AI coding assistant">
                              <header className="coding-cursor-ai-topbar">
                                <span>{codingAssistantDisplayChat.title}</span>
                                <div>
                                  <button
                                    type="button"
                                    aria-label="Make AI sidebar wider"
                                    onClick={() => setCodingAssistantPanelMode(codingAssistantPanelMode === "wide" ? "normal" : "wide")}
                                  >
                                    <ChevronLeft size={14} aria-hidden="true" />
                                  </button>
                                  <button
                                    type="button"
                                    aria-label="Focus AI sidebar"
                                    onClick={() => setCodingAssistantPanelMode(codingAssistantPanelMode === "focus" ? "normal" : "focus")}
                                  >
                                    <MoreHorizontal size={14} aria-hidden="true" />
                                  </button>
                                  <button
                                    type="button"
                                    aria-label="Hide AI assistant"
                                    onClick={() => {
                                      setCodingAssistantPanelMode("normal");
                                      setCodingRightSidebarOpen(false);
                                    }}
                                  >
                                    <X size={14} aria-hidden="true" />
                                  </button>
                                </div>
                              </header>

                              <div className="coding-cursor-ai-content">
                                <section className="coding-cursor-ai-hello" aria-label="Assistant greeting">
                                  <Sparkles size={20} aria-hidden="true" />
                                  <div>
                                    <strong>Hello, {codingAssistantUserName}</strong>
                                    <span>How can I help you code today?</span>
                                  </div>
                                </section>

                                <div className="coding-cursor-ai-suggestions" aria-label="Assistant suggestion prompts">
                                  <button type="button" onClick={() => setCodingDraftMessage("Look through this project and tell me what it does.")}>
                                    What can you do?
                                  </button>
                                  <button type="button" onClick={() => setCodingDraftMessage("Inspect the files and make the smallest safe change.")}>
                                    Help me change code
                                  </button>
                                  <button type="button" onClick={() => setCodingDraftMessage("Run the project tests, summarize failures, then propose fixes.")}>
                                    Run and fix tests
                                  </button>
                                </div>

                                <section className="coding-cursor-ai-plan" aria-label="Autopilot working context">
                                  <span>Context</span>
                                  <p>{activeCodingProject ? `Working in ${activeCodingProject.name}.` : "Open a folder to let Autopilot inspect files and generate real patches."}</p>
                                  <ul>
                                    <li>{activeProjectOpenTabs.length > 0 ? `${activeProjectOpenTabs.length} editor tab${activeProjectOpenTabs.length === 1 ? "" : "s"} open` : "No file opened yet"}</li>
                                    <li>{codingGitChangedFiles.length > 0 ? `${codingGitChangedFiles.length} changed file${codingGitChangedFiles.length === 1 ? "" : "s"} ready for review` : "No git changes detected"}</li>
                                    <li>{codingSnapshot.accessMode === "full" ? "Commands can run with full access" : "Commands ask before running"}</li>
                                  </ul>
                                </section>

                                <section className="coding-cursor-agent-card" aria-label="Agentic coding controls">
                                  <span>Plan</span>
                                  <ol>
                                    <li className={activeCodingProject ? "complete" : ""}>Open project</li>
                                    <li className={codingAgentPlan ? "complete" : codingBusy ? "running" : ""}>Plan</li>
                                    <li className={codingAgenticEditReadyCount > 0 || codingAiFilePatch?.status === "applied" ? "complete" : ""}>Edit</li>
                                    <li className={codingCommandResult ? (codingCommandResult.success ? "complete" : "blocked") : ""}>Test</li>
                                    <li className={codingReviewChangedCount > 0 ? "running" : ""}>Review</li>
                                  </ol>
                                  <div>
                                    <button type="button" disabled={!activeCodingProject || codingBusy} onClick={() => void createCodingAgentPlan(undefined, activeCodingAssistantChat)}>
                                      Plan
                                    </button>
                                    <button
                                      type="button"
                                      disabled={!codingAiFilePatch || codingAiFilePatch.status !== "pending"}
                                      onClick={() => applyCodingAiFilePatch()}
                                      title={codingAiFilePatch?.status === "pending" ? "Apply the proposed patch to the open file" : "Ask Autopilot to generate a patch first"}
                                    >
                                      Apply edits
                                    </button>
                                    <button type="button" disabled={!activeCodingProject} onClick={() => openCodingReview(codingCursorPrimaryEditorTab?.id)}>
                                      Review diff
                                    </button>
                                    <button type="button" disabled={!activeCodingProject || codingBusy} onClick={() => void runCodingProjectTool("npm test -- --run", "Running project tests.")}>
                                      Test
                                    </button>
                                  </div>
                                </section>

                                <section className="coding-cursor-ai-diff-card" aria-label="Ready changes">
                                  <header>
                                    <span>TS</span>
                                    <strong>{codingAiFilePatch?.relativePath ?? activeCodingReviewTab?.file.relativePath ?? selectedCodingGitChangedFile?.path ?? "src/api/retry.ts"}</strong>
                                    <em>+{Math.max(codingReviewAddedCount, codingAiFilePatch ? 28 : 0)}</em>
                                    <em className="removed">-{Math.max(codingReviewRemovedCount, codingAiFilePatch ? 1 : 0)}</em>
                                  </header>
                                  <p>
                                    {codingAgenticEditReadyCount > 0
                                      ? "Autopilot has edits ready. Review the diff, then apply only when you approve."
                                      : "Ask Autopilot to make a change and this card will show the proposed diff before anything is applied."}
                                  </p>
                                  <div>
                                    <button
                                      type="button"
                                      disabled={!activeCodingProject}
                                      title={activeCodingProject ? "Open the changed-file review surface" : "Open a project before reviewing diffs"}
                                      onClick={() => openCodingReview(codingCursorPrimaryEditorTab?.id)}
                                    >
                                      Review diff
                                    </button>
                                    <button
                                      type="button"
                                      disabled={!codingAiFilePatch || codingAiFilePatch.status !== "pending"}
                                      title={codingAiFilePatch?.status === "pending" ? "Apply the proposed patch" : "No pending AI patch yet"}
                                      onClick={() => applyCodingAiFilePatch()}
                                    >
                                      Apply edits
                                    </button>
                                  </div>
                                </section>

                                <div className="coding-cursor-ai-thread" aria-label="Assistant conversation">
                                  {codingAssistantDisplayChat.messages.length === 0 ? (
                                    <p className="coding-cursor-ai-empty">Ask me to inspect files, generate code, run a command, or explain the project.</p>
                                  ) : (
                                    codingAssistantDisplayChat.messages.map((message) => (
                                      <article className={`coding-cursor-ai-message ${message.role}`} key={message.id}>
                                        <strong>{message.role === "user" ? "You" : "Autopilot"}</strong>
                                        <p>{message.content}</p>
                                      </article>
                                    ))
                                  )}
                                </div>
                              </div>

                              <form
                                className="coding-cursor-ai-input"
                                onSubmit={(event) => {
                                  event.preventDefault();
                                  void sendCodingChatMessage();
                                }}
                              >
                                <textarea
                                  value={codingDraftMessage}
                                  onChange={(event) => setCodingDraftMessage(event.target.value)}
                                  placeholder="Ask Autopilot to inspect, edit, test, or explain this project..."
                                  aria-label="Ask Autopilot to code"
                                  rows={3}
                                />
                                <div>
                                  <button type="button" onClick={() => setCodingRightPanel("access")}>
                                    Agent
                                  </button>
                                  <button type="button" onClick={openCodingPicker}>
                                    Add file
                                  </button>
                                  <button type="button" title="Coding model is locked to GPT-5.5 for highest-quality edits" onClick={() => setCodingStatus("Coding generation is routed to GPT-5.5.")}>
                                    GPT-5.5
                                  </button>
                                  <button type="submit" disabled={!codingDraftMessage.trim()} aria-label="Send coding prompt">
                                    <ArrowUp size={15} aria-hidden="true" />
                                  </button>
                                </div>
                              </form>
                            </aside>
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
                              Browser Test
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
                                Cursor-style agent workspace
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
                              {renderCodingPromptContextPills()}
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
                          {activeCodingProject ? (
                            <div className="coding-agent-status-grid prominent" aria-label="Active project context">
                              <span>
                                <strong>Active project</strong>
                                <small>{activeCodingProject?.name ?? "No project"}</small>
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
                          ) : null}
                          {activeCodingProject && (
                            <section className="coding-recent-code-panel" aria-label="Recent code in active project">
                              <header>
                                <div>
                                  <p className="panel-kicker">Recent code</p>
                                  <h3>Keep working where you left off.</h3>
                                  <span>Open editors appear first, followed by recently changed project files.</span>
                                </div>
                                <button type="button" onClick={() => openCodingPicker()}>
                                  <FolderOpen size={14} aria-hidden="true" />
                                  Browse all
                                </button>
                              </header>
                              {activeProjectRecentCodeItems.length > 0 ? (
                                <div className="coding-recent-code-list">
                                  {activeProjectRecentCodeItems.map(renderCodingRecentCodeButton)}
                                </div>
                              ) : (
                                <div className="coding-recent-code-empty">
                                  <FileText size={18} aria-hidden="true" />
                                  <span>No code opened yet. Browse this project to pin files here.</span>
                                  <button type="button" onClick={() => openCodingPicker()}>
                                    Open file
                                  </button>
                                </div>
                              )}
                            </section>
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
                        <section className="coding-project-overview-panel recent-code" aria-label="Recent project code">
                          <div className="coding-project-overview-heading">
                            <span>
                              <strong>Recent code</strong>
                              <small>Open editors and recently modified code files in this project</small>
                            </span>
                            <button type="button" onClick={() => openCodingPicker(activeCodingTab.path)}>
                              Browse all
                            </button>
                          </div>
                          {activeProjectRecentCodeItems.length > 0 ? (
                            <div className="coding-recent-code-list project">
                              {activeProjectRecentCodeItems.map(renderCodingRecentCodeButton)}
                            </div>
                          ) : (
                            <div className="coding-recent-code-empty">
                              <FileText size={18} aria-hidden="true" />
                              <span>No recent code yet. Open a file or folder and Autopilot will keep it here.</span>
                              <button type="button" onClick={() => openCodingPicker(activeCodingTab.path)}>
                                Open file
                              </button>
                            </div>
                          )}
                        </section>
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

                  {(activeCodingTab.kind === "plugins" || codingSection === "plugins" || codingSection === "skills") && (
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
                        <>
                          <section className="coding-builder-guides" aria-label="Agent plugin and skill builder guides">
                            <header>
                              <div>
                                <p className="panel-kicker">Builder guides</p>
                                <h3>Agent, plugin, and skill creation</h3>
                              </div>
                              <span>Research-backed workflows</span>
                            </header>
                            <div className="coding-builder-guide-grid">
                              {codingBuilderGuides.map((guide) => (
                                <article className="coding-builder-guide-card" key={guide.id}>
                                  <span className="coding-plugin-icon">
                                    <Sparkles size={18} aria-hidden="true" />
                                  </span>
                                  <div>
                                    <strong>{guide.name}</strong>
                                    <small>{guide.category}</small>
                                    <p>{guide.description}</p>
                                    <ul>
                                      {guide.checklist.map((item) => (
                                        <li key={item}>{item}</li>
                                      ))}
                                    </ul>
                                  </div>
                                  <button type="button" onClick={() => openCodingBuilderGuideChat(guide)}>
                                    Start guide
                                  </button>
                                </article>
                              ))}
                            </div>
                          </section>
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
                        </>
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

                  {activeCodingTab.kind === "terminal" && codingSection !== "board" && codingSection !== "plugins" && codingSection !== "skills" && (
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
                          <button
                            className="coding-close-terminal-button"
                            type="button"
                            aria-label="Close terminal"
                            onClick={() => {
                              closeCodingTab(activeCodingTab.id);
                              setCodingSection("files");
                              setCodingStatus("Terminal closed. Your project and chats are still open.");
                            }}
                          >
                            <X size={15} aria-hidden="true" />
                            Close
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
                      <section className="coding-browser-test-card" aria-label="Browser Test feedback">
                        <div>
                          <p className="panel-kicker">Browser Test</p>
                          <h2>Test the app, then send feedback back to Coding.</h2>
                          <span>
                            Use this as the sticky note while previewing a project. Feedback becomes revision context; no file changes happen until you approve an AI patch.
                          </span>
                        </div>
                        <label className="coding-browser-feedback-box">
                          <span>{codingClickSuggestMode ? "Click-to-suggest note" : "Feedback note"}</span>
                          <textarea
                            value={codingBrowserFeedbackDraft}
                            onChange={(event) => setCodingBrowserFeedbackDraft(event.target.value)}
                            placeholder="Example: the hero button is too low, make it primary and tighten the spacing."
                            aria-label="Browser Test feedback"
                          />
                        </label>
                        <div className="coding-browser-test-actions">
                          <button
                            className={codingClickSuggestMode ? "active" : ""}
                            type="button"
                            aria-pressed={codingClickSuggestMode}
                            onClick={() => setCodingClickSuggestMode((isEnabled) => !isEnabled)}
                          >
                            <MousePointer2 size={14} aria-hidden="true" />
                            Click-to-suggest
                          </button>
                          <button type="button" onClick={submitCodingBrowserFeedback} disabled={!codingBrowserFeedbackDraft.trim()}>
                            <ArrowRight size={14} aria-hidden="true" />
                            Send to Coding
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCodingBrowserTestSessionActive(false);
                              setCodingClickSuggestMode(false);
                              setCodingStatus("Browser Test closed. Your Coding session is still intact.");
                            }}
                          >
                            Close test note
                          </button>
                        </div>
                      </section>
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
                            <button type="button" onClick={() => useAutomationTemplate("payments")}>
                              Use recurring payments
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
                              <option value="payment_proposal">Payment proposal</option>
                            </select>
                          </label>
                          {automationSetup.outputKind === "payment_proposal" ? (
                            <div className="automation-payment-safety-note" role="note">
                              <ShieldCheck size={15} aria-hidden="true" />
                              <span>
                                Recurring payment automations only prepare invoice/vendor review and payment proposals. They cannot execute money movement without verified settings, provider confirmation, and your per-payment approval.
                              </span>
                            </div>
                          ) : null}
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

                          {automationRecipes.length > 0 && (
                            <div className="automation-recipe-control-list" aria-label="Saved automation controls">
                              {automationRecipes.slice(0, 5).map((recipe) => (
                                <article className="automation-recipe-control-row" data-state={recipe.enabled ? "enabled" : "paused"} key={recipe.id}>
                                  <span>
                                    <strong>{recipe.name}</strong>
                                    <small>
                                      {recipe.enabled ? "Scheduled" : "Stopped"} - {recipe.schedule} - {recipe.outputKind.replace(/_/gu, " ")}
                                    </small>
                                  </span>
                                  <button
                                    type="button"
                                    disabled={automationBusy}
                                    onClick={() => void setAutomationRecipeEnabled(recipe, !recipe.enabled)}
                                  >
                                    {recipe.enabled ? "Stop" : "Resume"}
                                  </button>
                                </article>
                              ))}
                            </div>
                          )}

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
                                  {activeAutomationRecipe && activeAutomationRecipe.enabled && (
                                    <button
                                      type="button"
                                      title="Stops future scheduled runs. It does not erase receipts or run history."
                                      onClick={() => void stopAutomationRecipe(activeAutomationRecipe)}
                                    >
                                      Stop future runs
                                    </button>
                                  )}
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
                    <p className="panel-kicker">Assistant</p>
                    <h2>{codingRightPanel === "assistant" ? `Ready when you are, ${codingAssistantUserName}` : codingRightPanel}</h2>
                  </div>
                  <div className="coding-assistant-size-toggle" role="group" aria-label="Assistant panel size">
                    {(["normal", "wide", "focus"] as CodingAssistantPanelMode[]).map((mode) => (
                      <button
                        className={codingAssistantPanelMode === mode ? "active" : ""}
                        key={mode}
                        type="button"
                        aria-label={`Set assistant panel to ${mode}`}
                        onClick={() => {
                          setCodingAssistantPanelMode(mode);
                          setCodingRightSidebarOpen(true);
                        }}
                      >
                        {mode === "normal" ? "N" : mode === "wide" ? "W" : "F"}
                      </button>
                    ))}
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
                          <strong>Ready when you are, {codingAssistantUserName}</strong>
                          <small>
                            {activeCodingAssistantChat?.title ??
                              (activeCodingProject ? `${activeCodingProject.name} coding agent` : "Open a project or ask for a code change")}
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
                          placeholder="Ask for code. Example: build the Snake game, run tests, then show me the diff."
                          aria-label="Coding assistant message"
                          rows={3}
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
                            <li>
                              <b>Memory</b>
                              <span>
                                {codingAgentPlan.projectMemory?.present
                                  ? `${codingAgentPlan.projectMemory.relativePath}: ${codingAgentPlan.projectMemory.summary}`
                                  : "No project memory file loaded."}
                              </span>
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
            <section className={`productivity-page productivity-command-page productivity-rebuild-page ${productivityDraftReaderMode ? "draft-reader-focus" : ""}`} aria-labelledby="productivity-heading">
              <header className="productivity-hero">
                <div className="productivity-hero-copy">
                  <p className="panel-kicker">{todayLabel}</p>
                  <h1 id="productivity-heading">
                    {productivityDraftReaderMode
                      ? `${responseDrafts.length} AI ${responseDrafts.length === 1 ? "draft is" : "drafts are"} ready to review.`
                      : todaysCallPlan.openCount > 0
                      ? todaysCallPlan.headline
                      : `${commandCenterOpenCount} ${commandCenterOpenCount === 1 ? "thing needs" : "things need"} action, ${commandCenterUrgentCount} ${
                          commandCenterUrgentCount === 1 ? "is" : "are"
                        } urgent.`}
                  </h1>
                  <p>
                    {productivityDraftReaderMode
                      ? "Review copy-ready email and chat replies here, copy the draft, then return to the inbox without spending artifact credits."
                      : todaysCallPlan.openCount > 0
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

              <section className="productivity-draft-reader-page" aria-label="AI-generated email and chat drafts">
                <header className="productivity-draft-reader-hero">
                  <div>
                    <p className="panel-kicker">Draft review</p>
                    <h2>Copy-ready replies without artifact spend</h2>
                    <span>Email and chat follow-ups land here when the right output is a reply, not a document or slideshow.</span>
                  </div>
                  <div className="productivity-draft-reader-actions">
                    <div className="productivity-draft-reader-stats" aria-label="AI draft summary">
                      <span>
                        <strong>{responseDrafts.length}</strong>
                        <small>Total drafts</small>
                      </span>
                      <span>
                        <strong>{responseDrafts.filter((draft) => draft.status === "needs_review").length}</strong>
                        <small>Need review</small>
                      </span>
                      <span>
                        <strong>{responseDrafts.filter((draft) => draft.source.provider === "gmail").length}</strong>
                        <small>From Gmail</small>
                      </span>
                    </div>
                    <button className="secondary-action" type="button" onClick={closeProductivityDraftReader}>
                      <ArrowLeft size={14} aria-hidden="true" />
                      Back to inbox
                    </button>
                  </div>
                </header>
                <div className="productivity-draft-reader-grid">
                  <div className="productivity-draft-reader-list" aria-label="AI draft list">
                    {responseDrafts.length === 0 ? (
                      <div className="checklist-empty">
                        <Mail size={20} aria-hidden="true" />
                        <span>No AI drafts yet. Select an email and choose Create draft, or let Gmail sync find messages that need replies.</span>
                      </div>
                    ) : (
                      responseDrafts.map((draft) => (
                        <button
                          className={`productivity-draft-reader-row ${selectedResponseDraft?.id === draft.id ? "active" : ""}`}
                          key={draft.id}
                          type="button"
                          onClick={() => setSelectedResponseDraftId(draft.id)}
                        >
                          <span className="productivity-draft-icon" aria-hidden="true">
                            <Mail size={16} />
                          </span>
                          <span>
                            <strong>{draft.title}</strong>
                            <small>
                              {draft.source.from ?? draft.source.label} - {formatInboxReceivedAt(draft.updatedAt)}
                            </small>
                            <em>{draft.preview}</em>
                          </span>
                          <b data-status={draft.status}>{getDraftStatusLabel(draft.status)}</b>
                        </button>
                      ))
                    )}
                  </div>
                  <article className="productivity-draft-reader-card">
                    {selectedResponseDraft ? (
                      <>
                        <header>
                          <div>
                            <p className="panel-kicker">{getProductivityDraftKindLabel(selectedResponseDraft.artifactKind)}</p>
                            <h2>{selectedResponseDraft.title}</h2>
                            <span>
                              Source: {selectedResponseDraft.source.from ?? selectedResponseDraft.source.label}
                              {selectedResponseDraft.source.subject ? ` - ${selectedResponseDraft.source.subject}` : ""}
                            </span>
                          </div>
                          <span className="draft-status-pill" data-status={selectedResponseDraft.status}>
                            {getDraftStatusLabel(selectedResponseDraft.status)}
                          </span>
                        </header>
                        <textarea value={selectedResponseDraft.body} readOnly aria-label="Selected AI draft body" />
                        <div className="productivity-draft-reader-card-actions">
                          <button className="primary-action" type="button" onClick={() => void copyProductivityDraftBody(selectedResponseDraft)}>
                            <Copy size={14} aria-hidden="true" />
                            Copy draft
                          </button>
                          {selectedResponseDraft.source.url && (
                            <button className="secondary-action" type="button" onClick={() => void openProductivityDraftSource(selectedResponseDraft)}>
                              <Mail size={14} aria-hidden="true" />
                              Open source
                            </button>
                          )}
                          <button className="secondary-action danger" type="button" onClick={() => deleteProductivityDraft(selectedResponseDraft.id)}>
                            <Trash2 size={14} aria-hidden="true" />
                            Delete
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="checklist-empty">
                        <FileText size={20} aria-hidden="true" />
                        <span>Select a response draft to view, copy, or open the original source.</span>
                      </div>
                    )}
                  </article>
                </div>
              </section>

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
                {workGraphItems.length > 0 && (
                  <section className="productivity-work-graph-strip" aria-label="Work Twin proof in Productivity">
                    <header>
                      <div>
                        <p className="panel-kicker">Work Twin</p>
                        <h3>Source to output, with proof</h3>
                      </div>
                      <button className="secondary-action" type="button" onClick={() => void refreshWorkGraph()}>
                        <RotateCw size={14} aria-hidden="true" />
                        Refresh graph
                      </button>
                    </header>
                    <div className="productivity-work-graph-grid">
                      <div className="productivity-work-graph-list">
                        {workGraphItems.slice(0, 4).map((item) => (
                          <button
                            key={`productivity:${item.id}`}
                            className={selectedWorkGraphItem?.id === item.id ? "active" : ""}
                            type="button"
                            onClick={() => setSelectedWorkGraphItemId(item.id)}
                          >
                            <span>
                              <strong>{item.title}</strong>
                              <small>{item.source.label}</small>
                            </span>
                            <em data-state={item.run.state}>{item.run.state.replace(/_/gu, " ")}</em>
                          </button>
                        ))}
                      </div>
                      {selectedWorkGraphItem && (
                        <article className="productivity-work-graph-proof">
                          <p className="panel-kicker">
                            {selectedWorkGraphItem.source.kind} to {selectedWorkGraphItem.route.workspace}
                          </p>
                          <h4>{selectedWorkGraphItem.title}</h4>
                          <p>{selectedWorkGraphItem.run.plan}</p>
                          <small>
                            Routed {selectedWorkGraphItem.route.confidence}%: {selectedWorkGraphItem.route.reason}
                          </small>
                          <div>
                            <button type="button" onClick={() => void openWorkGraphOriginal(selectedWorkGraphItem)}>
                              Review Work
                            </button>
                            <button
                              className="primary-action"
                              type="button"
                              disabled={!selectedWorkGraphItem.shadow.eligible || Boolean(workGraphBusyIds[selectedWorkGraphItem.id])}
                              title={selectedWorkGraphItem.shadow.eligible ? "Start safe work" : selectedWorkGraphItem.shadow.why}
                              onClick={() => void startWorkGraphSafeWork(selectedWorkGraphItem)}
                            >
                              <Sparkles size={14} className={workGraphBusyIds[selectedWorkGraphItem.id] ? "spin" : ""} aria-hidden="true" />
                              Start safe work
                            </button>
                            <details>
                              <summary>Show Proof and Replay</summary>
                              <ul>
                                {buildWorkTwinReplay(selectedWorkGraphItem).map((step) => (
                                  <li key={`productivity:${step.id}`}>
                                    <strong>{step.label}</strong>
                                    <span>{step.detail}</span>
                                  </li>
                                ))}
                              </ul>
                            </details>
                          </div>
                        </article>
                      )}
                    </div>
                  </section>
                )}
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
                      ].map((lane) => {
                        const visibleLaneItems = lane.items.slice(0, 12);
                        const hiddenLaneCount = Math.max(0, lane.items.length - visibleLaneItems.length);
                        return (
                          <section className="work-lane" key={lane.title}>
                            <div className="work-lane-heading">
                              <span>{lane.title}</span>
                              <b>{lane.items.length}</b>
                            </div>
                            {lane.items.length === 0 ? (
                              <p>{lane.empty}</p>
                            ) : (
                              <>
                                {visibleLaneItems.map((item) => (
                                  <button
                                    className={`work-item-row ${selectedWorkItem?.id === item.id ? "active" : ""}`}
                                    key={`${lane.title}:${item.id}`}
                                    type="button"
                                    onClick={() => setSelectedWorkItemId(item.id)}
                                  >
                                    <span>
                                      <strong>{item.title}</strong>
                                      <small>{getWorkItemSourceSummary(item)}</small>
                                      <small className="work-state-summary">{getWorkItemStatusLabel(item)}</small>
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
                                ))}
                                {hiddenLaneCount > 0 && <span className="work-lane-more">{hiddenLaneCount} more in this lane. Scroll the queue to review.</span>}
                              </>
                            )}
                          </section>
                        );
                      })
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

              <section className="email-artifact-proof" aria-label="Email to artifact review">
                <header className="email-artifact-proof-header">
                  <div>
                    <p className="panel-kicker">Email to artifact</p>
                    <h2>Review the source and the generated work side by side</h2>
                    <span>Autopilot should extract the actual ask, build the deliverable, run quality checks, then stop for approval.</span>
                  </div>
                  <div className="email-artifact-proof-actions">
                    <button className="secondary-action" type="button" onClick={() => void runTryItNowEmailArtifactDemo()} disabled={artifactBusy}>
                      <Sparkles size={15} className={artifactBusy ? "spin" : ""} aria-hidden="true" />
                      Try it now
                    </button>
                    <button className="secondary-action" type="button" disabled={!selectedInboxArtifact} onClick={editSelectedEmailArtifact}>
                      Edit
                    </button>
                    <button className="secondary-action danger" type="button" disabled={!selectedInboxArtifact} onClick={rejectSelectedEmailArtifact}>
                      Reject
                    </button>
                    <button className="primary-action" type="button" disabled={!selectedInboxArtifact} onClick={() => void approveSelectedEmailArtifact()}>
                      <Check size={15} aria-hidden="true" />
                      Approve
                    </button>
                  </div>
                </header>
                <div className="email-artifact-proof-grid">
                  <article className="email-artifact-source-card">
                    <span className="proof-column-label">Source email</span>
                    {selectedInboxEmail ? (
                      <>
                        <div className="proof-email-meta">
                          <span className="productivity-email-avatar" aria-hidden="true">
                            {getInboxSenderInitials(selectedInboxEmail)}
                          </span>
                          <div>
                            <strong>{selectedInboxEmail.subject || "(No subject)"}</strong>
                            <small>
                              {getInboxSenderLabel(selectedInboxEmail)} {selectedInboxEmail.fromEmail ? `<${selectedInboxEmail.fromEmail}>` : ""}
                            </small>
                            <time dateTime={new Date(selectedInboxEmail.receivedAt).toISOString()}>{formatInboxReceivedAt(selectedInboxEmail.receivedAt)}</time>
                          </div>
                        </div>
                        <p>{selectedInboxEmail.actionText || selectedInboxEmail.snippet || "No readable body was included in this sync."}</p>
                        <div className="proof-email-needs">
                          <strong>Detected ask</strong>
                          <span>{getInboxNeededSummary(selectedInboxEmail, productivityTasks.filter((task) => task.source.messageId === selectedInboxEmail.id), selectedInboxDraft ?? undefined)}</span>
                        </div>
                        {selectedInboxAgentRun?.artifactTrace && (
                          <div className="proof-email-needs trace">
                            <strong>What Autopilot planned</strong>
                            <span>{selectedInboxAgentRun.artifactTrace.inferredAsk}</span>
                            <small>
                              Audience: {selectedInboxAgentRun.artifactTrace.audience}. Attempts: {selectedInboxAgentRun.artifactTrace.attempts}.
                            </small>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="proof-empty">
                        <Mail size={20} aria-hidden="true" />
                        <span>Select an email, sync Gmail, or run the sample demo.</span>
                      </div>
                    )}
                  </article>

                  <article className="email-artifact-output-card">
                    <div className="proof-output-heading">
                      <span className="proof-column-label">Generated artifact</span>
                      {selectedInboxArtifactReview && (
                        <em data-passed={selectedInboxArtifactReview.qualityReport.passed}>
                          Quality {selectedInboxArtifactReview.qualityReport.score}/100
                        </em>
                      )}
                    </div>
                    {selectedInboxArtifact && selectedInboxArtifactVersion ? (
                      <>
                        <h3>{selectedInboxArtifact.title}</h3>
                        <p>{selectedInboxArtifact.summary}</p>
                        {selectedInboxAgentRun?.artifactTrace && (
                          <div className="proof-generation-trace">
                            <span>
                              <strong>Plan</strong>
                              {selectedInboxAgentRun.artifactTrace.planningNotes[0] ?? selectedInboxAgentRun.artifactTrace.inferredAsk}
                            </span>
                            <span>
                              <strong>Critique</strong>
                              {selectedInboxAgentRun.artifactTrace.critique[0] ?? "Self-critique completed before revision."}
                            </span>
                            <span>
                              <strong>Revision</strong>
                              {selectedInboxAgentRun.artifactTrace.revisionSummary}
                            </span>
                          </div>
                        )}
                        {selectedInboxArtifactVersion.content.kind === "document" && (
                          <div className="proof-document-preview">
                            {selectedInboxArtifactVersion.content.markdown
                              .split(/\n+/u)
                              .filter(Boolean)
                              .slice(0, 12)
                              .map((line, index) => {
                                const trimmed = line.trim();
                                return trimmed.startsWith("#") ? (
                                  <strong key={`${trimmed}-${index}`}>{trimmed.replace(/^#+\s*/u, "")}</strong>
                                ) : (
                                  <span key={`${trimmed}-${index}`}>{trimmed.replace(/^[-*]\s*/u, "")}</span>
                                );
                              })}
                          </div>
                        )}
                        {selectedInboxArtifactVersion.content.kind === "slide_deck" && (
                          <div className="proof-slide-strip">
                            {selectedInboxArtifactVersion.content.slides.slice(0, 3).map((slide, index) => (
                              <section key={slide.id}>
                                <small>{String(index + 1).padStart(2, "0")}</small>
                                <strong>{slide.title}</strong>
                                <span>{slide.bullets[0] ?? slide.speakerNotes ?? "Ready for review."}</span>
                              </section>
                            ))}
                          </div>
                        )}
                        {selectedInboxArtifactVersion.content.kind === "website_design" && (
                          <div className="proof-website-frame">
                            <iframe title={`${selectedInboxArtifact.title} email artifact preview`} sandbox="" srcDoc={getArtifactPreviewSrcDoc(selectedInboxArtifactVersion.content)} />
                          </div>
                        )}
                        {selectedInboxArtifactReview && !selectedInboxArtifactReview.qualityReport.passed && (
                          <div className="proof-quality-failures">
                            {selectedInboxArtifactReview.qualityReport.failedChecks.slice(0, 3).map((check) => (
                              <span key={check.id}>
                                <strong>{check.label}</strong>
                                {check.detail}
                              </span>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="proof-empty">
                        <Sparkles size={20} aria-hidden="true" />
                        <span>Generate work from the selected email to see the before/after proof.</span>
                        <button
                          className="primary-action"
                          type="button"
                          disabled={!selectedInboxEmail || artifactBusy}
                          onClick={() =>
                            selectedInboxEmail?.id.startsWith("demo-email:")
                              ? void runTryItNowEmailArtifactDemo()
                              : selectedInboxEmail
                                ? void generateArtifactFromEmail(selectedInboxEmail, undefined, { mode: "background", taskIds: [] })
                                : undefined
                          }
                        >
                          <Sparkles size={15} className={artifactBusy ? "spin" : ""} aria-hidden="true" />
                          Build work
                        </button>
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
                            onClick={() => void connectGmailInbox()}
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
                  <section className={`productivity-inbox-consent-card ${inboxOrganizationConsent}`} aria-label="Inbox organization consent">
                    <div>
                      <p className="panel-kicker">Inbox organization</p>
                      <strong>
                        {inboxOrganizationConsent === "unset"
                          ? "Do you want to allow inbox organization?"
                          : inboxOrganizationConsent === "allowed"
                            ? "Inbox organization is allowed"
                            : "Inbox organization is off"}
                      </strong>
                      <span>
                        {inboxOrganizationConsent === "unset"
                          ? "Autopilot can prepare Gmail label and archive batches for review. Nothing changes in Gmail until you approve."
                          : inboxOrganizationConsent === "allowed"
                            ? `${EMAIL_ORGANIZATION_MODE_OPTIONS.find((option) => option.id === emailOrganizationMode)?.label ?? "Suggest only"} mode is active. Manage labels, blocked senders, and sources from Sources or Settings.`
                            : "Autopilot will leave Gmail organization alone. You can turn it back on in Settings."}
                      </span>
                    </div>
                    {inboxOrganizationConsent === "unset" ? (
                      <div>
                        <button
                          type="button"
                          onClick={() => {
                            setInboxOrganizationConsent("allowed");
                            setEmailOrganizationMode("approve_batches");
                            setEmailSyncStatus("Inbox organization enabled. Autopilot will prepare reviewable Gmail batches only after sync.");
                          }}
                        >
                          Allow organization
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setInboxOrganizationConsent("declined");
                            setEmailOrganizationMode("off");
                            setEmailSyncStatus("Inbox organization is off. Autopilot will still show readable email drafts.");
                          }}
                        >
                          Not now
                        </button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setProductivitySourcesOpen(true)}>
                        Manage sources
                      </button>
                    )}
                  </section>
                  <section className="email-organization-panel" aria-label="Gmail organization controls">
                    <div>
                      <p className="panel-kicker">Gmail organization</p>
                      <strong>{EMAIL_ORGANIZATION_MODE_OPTIONS.find((option) => option.id === emailOrganizationMode)?.label ?? "Suggest only"}</strong>
                      <span>
                        {emailOrganizationMode === "off"
                          ? "AI organization suggestions are off. Direct buttons still require your click."
                          : emailOrganizationMode === "suggest_only"
                            ? "AI can suggest labels, archive, read states, and stars, but Gmail changes only after your command."
                            : emailOrganizationMode === "approve_batches"
                              ? "Autopilot can prepare batches for review. Click Apply before Gmail changes."
                              : "Only trusted rules you create may organize matching email. Send/delete actions stay blocked."}
                      </span>
                    </div>
                    <div className="email-organization-mode-list" role="group" aria-label="Email organization mode">
                      {EMAIL_ORGANIZATION_MODE_OPTIONS.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          className={emailOrganizationMode === option.id ? "active" : ""}
                          aria-pressed={emailOrganizationMode === option.id}
                          title={option.description}
                          onClick={() => setEmailOrganizationMode(option.id)}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </section>
                  <section className="email-blocked-senders-panel" aria-label="Blocked Gmail senders">
                    <div>
                      <p className="panel-kicker">Privacy controls</p>
                      <strong>Blocked senders</strong>
                      <span>
                        Autopilot hides blocked senders from the inbox, Action Queue, finance detection, and AI email analysis before any model call.
                      </span>
                    </div>
                    <div className="blocked-sender-stats">
                      <span>{blockedEmailSenders.length} blocked</span>
                      <span>{blockedEmailMessageCount} hidden emails</span>
                    </div>
                    {blockedEmailSenders.length > 0 && (
                      <div className="blocked-sender-chip-list" aria-label="Current blocked sender list">
                        {blockedEmailSenders.map((sender) => (
                          <span key={sender}>
                            {sender}
                            <button type="button" onClick={() => unblockEmailSender(sender)} aria-label={`Unblock ${sender}`}>
                              <X size={12} aria-hidden="true" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="sender-block-grid" aria-label="Senders from synced Gmail">
                      {emailSenderOptions.slice(0, 8).map((sender) => {
                        const isBlocked = blockedEmailSenders.includes(sender.email);
                        return (
                          <button
                            type="button"
                            key={sender.email}
                            disabled={isBlocked}
                            title={isBlocked ? "This sender is already blocked." : `Block ${sender.email} from Productivity AI analysis.`}
                            onClick={() => {
                              setBlockedEmailSenders((currentSenders) =>
                                currentSenders.includes(sender.email) ? currentSenders : [...currentSenders, sender.email]
                              );
                              setEmailSyncStatus(`Blocked ${sender.email}. Productivity will skip that sender before AI analysis.`);
                            }}
                          >
                            <span>
                              <strong>{sender.name}</strong>
                              <small>{sender.email}</small>
                            </span>
                            <em>{isBlocked ? "Blocked" : `Block ${sender.count}`}</em>
                          </button>
                        );
                      })}
                      {emailSenderOptions.length === 0 && <p>Sync Gmail to choose specific senders to block.</p>}
                    </div>
                  </section>
                  {productivityShortcutHelpOpen && (
                    <div className="productivity-shortcut-help" role="note" aria-label="Inbox keyboard shortcuts">
                      <strong>Inbox shortcuts</strong>
                      <span>
                        <kbd>J</kbd>/<kbd>K</kbd> move
                      </span>
                      <span>
                        <kbd>Enter</kbd> details
                      </span>
                      <span>
                        <kbd>R</kbd> draft
                      </span>
                      <span>
                        <kbd>E</kbd> archive/ignore
                      </span>
                      <span>
                        <kbd>C</kbd> compose
                      </span>
                      <span>
                        <kbd>U</kbd> unread
                      </span>
                      <span>
                        <kbd>S</kbd> star
                      </span>
                      <span>
                        <kbd>L</kbd> label
                      </span>
                      <span>
                        <kbd>H</kbd> snooze
                      </span>
                      <span>
                        <kbd>/</kbd> search
                      </span>
                      <span>
                        <kbd>Ctrl</kbd>+<kbd>K</kbd> commands
                      </span>
                      <span>
                        <kbd>?</kbd> hide
                      </span>
                    </div>
                  )}
                  {productivityCommandPaletteOpen && (
                    <div className="productivity-command-palette" role="dialog" aria-label="Productivity command palette">
                      <div>
                        <strong>Command palette</strong>
                        <button className="icon-button small" type="button" aria-label="Close command palette" onClick={() => setProductivityCommandPaletteOpen(false)}>
                          <X size={14} aria-hidden="true" />
                        </button>
                      </div>
                      <button type="button" onClick={() => selectedInboxEmail && void generateArtifactFromEmail(selectedInboxEmail, undefined, { mode: "background", taskIds: [] })}>
                        <Sparkles size={14} aria-hidden="true" />
                        Generate draft or artifact <kbd>R</kbd>
                      </button>
                      <button type="button" onClick={() => selectedInboxEmail && ignoreInboxEmail(selectedInboxEmail)}>
                        <Archive size={14} aria-hidden="true" />
                        Ignore selected email locally
                      </button>
                      <button type="button" onClick={() => selectedInboxEmail && void applyInboxOrganizationCommand(selectedInboxEmail, "archive")}>
                        <Archive size={14} aria-hidden="true" />
                        Archive in Gmail <kbd>E</kbd>
                      </button>
                      <button type="button" onClick={() => selectedInboxEmail && void applyInboxOrganizationCommand(selectedInboxEmail, "label")}>
                        <Mail size={14} aria-hidden="true" />
                        Label Needs review <kbd>L</kbd>
                      </button>
                      <button type="button" onClick={() => selectedInboxEmail && void applyInboxOrganizationCommand(selectedInboxEmail, "snooze")}>
                        <Clock size={14} aria-hidden="true" />
                        Snooze selected email <kbd>H</kbd>
                      </button>
                      <button type="button" onClick={() => setProductivityShortcutHelpOpen(true)}>
                        <ListChecks size={14} aria-hidden="true" />
                        Show shortcuts <kbd>?</kbd>
                      </button>
                    </div>
                  )}

                  {visibleEmailMessages.length === 0 ? (
                    <div className="email-empty">
                      <Mail size={22} aria-hidden="true" />
                      <span>
                        {blockedEmailMessageCount > 0
                          ? "Every synced Gmail message is currently hidden by your blocked sender list."
                          : googleSourceLooksConnected
                            ? "No Gmail messages synced yet. Calendar data may still be showing below."
                            : "Connect Google to show Gmail and Calendar here."}
                      </span>
                    </div>
                  ) : (
                    <div className="productivity-email-list" aria-label={`${Math.min(visibleEmailMessages.length, 200)} synced Gmail messages`}>
                      {visibleEmailMessages.slice(0, 200).map((message) => {
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
                        const messageNeedsArtifact = hasExplicitArtifactRequest(
                          `${message.subject} ${message.snippet} ${message.actionText ?? ""} ${messageTasks
                            .map((task) => `${task.title} ${task.context} ${task.source.requestedOutput ?? ""}`)
                            .join(" ")}`
                        );
                        const actionLabel = messageDraft ? "View draft response" : isBuildingMessage ? "Drafting..." : messageNeedsArtifact ? "Build requested work" : "Create draft response";
                        return (
                          <article
                            className={`productivity-email-card ${message.unread ? "unread" : ""} ${messageDraft ? "has-draft" : ""} ${isExpanded ? "expanded" : ""} ${isIgnored ? "ignored" : ""} ${
                              selectedInboxEmailId === message.id ? "selected" : ""
                            }`}
                            key={message.id}
                            onMouseEnter={() => {
                              setSelectedInboxEmailId(message.id);
                              if (!productivityShortcutHintSeen) {
                                setProductivityShortcutHelpOpen(true);
                                setProductivityShortcutHintSeen(true);
                              }
                            }}
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
                                <div className="productivity-email-organization-actions" aria-label={`Organize ${message.subject || "email"} in Gmail`}>
                                  <p className="detail-label">Organize in Gmail</p>
                                  <button type="button" disabled={emailBusy} onClick={() => void applyInboxOrganizationCommand(message, "archive")}>
                                    Archive
                                  </button>
                                  <button type="button" disabled={emailBusy} onClick={() => void applyInboxOrganizationCommand(message, message.unread ? "mark_read" : "mark_unread")}>
                                    {message.unread ? "Mark read" : "Mark unread"}
                                  </button>
                                  <button type="button" disabled={emailBusy} onClick={() => void applyInboxOrganizationCommand(message, "star")}>
                                    Star
                                  </button>
                                  <button type="button" disabled={emailBusy} onClick={() => void applyInboxOrganizationCommand(message, "label")}>
                                    Label Needs review
                                  </button>
                                  <button type="button" disabled={emailBusy} onClick={() => void applyInboxOrganizationCommand(message, "snooze")}>
                                    Snooze
                                  </button>
                                  <small>These are explicit user commands. AI suggestions and rules never send or delete mail.</small>
                                </div>
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
                              <button className="secondary-action productivity-email-action" type="button" onClick={() => ignoreInboxEmail(message)}>
                                Ignore
                              </button>
                              <button className="secondary-action productivity-email-action" type="button" onClick={() => blockEmailSenderFromMessage(message)}>
                                Block sender
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
                                {getProductivityDraftKindLabel(draft.artifactKind)} from {draft.source.from ?? draft.source.label}
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
                            {isResponseDraft(draft) && (
                              <button className="secondary-action" type="button" onClick={() => void copyProductivityDraftBody(draft)}>
                                Copy
                              </button>
                            )}
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

                <section className={`calendar-panel calendar-week-panel calendar-layout-${calendarLayoutPreference}`} aria-label="Integrated Google Calendar week view">
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
                        <button
                          type="button"
                          onClick={() => openCalendarCreateAt(calendarWeekDays.find((day) => isSameCalendarDay(day, calendarToday)) ?? calendarWeekDays[0], 9)}
                        >
                          <Plus size={15} aria-hidden="true" />
                          New event
                        </button>
                        <button type="button" onClick={() => setCalendarReferenceDate(calendarToday)}>
                          Today
                        </button>
                        <button type="button" aria-label="Previous week" onClick={() => setCalendarReferenceDate(addCalendarDays(calendarReferenceDate, -7))}>
                          <ChevronLeft size={16} aria-hidden="true" />
                        </button>
                        <button type="button" aria-label="Next week" onClick={() => setCalendarReferenceDate(addCalendarDays(calendarReferenceDate, 7))}>
                          <ChevronRight size={16} aria-hidden="true" />
                        </button>
                        <select
                          className="calendar-layout-select"
                          value={calendarLayoutPreference}
                          onChange={(event) => setCalendarLayoutPreference(event.target.value as CalendarLayoutPreference)}
                          aria-label="Calendar layout"
                        >
                          <option value="hybrid_split">Hybrid Split</option>
                          <option value="google_lanes">Google-style lanes</option>
                          <option value="agenda_first">Agenda-first</option>
                        </select>
                        <button type="button" onClick={() => void syncGoogleCalendarFromPanel()} disabled={emailBusy}>
                          {googleSourceLooksConnected ? <RotateCw size={15} className={emailBusy ? "spin" : ""} aria-hidden="true" /> : <Plus size={15} aria-hidden="true" />}
                          {googleSourceLooksConnected ? "Sync" : "Connect"}
                        </button>
                      </div>
                    </div>

                    {calendarOverlapGroups.length > 0 && (
                      <section className="calendar-overlap-agenda" aria-label="Readable overlapping calendar events">
                        <header className="calendar-overlap-agenda-header">
                          <div>
                            <strong>Overlapping events</strong>
                            <span>
                              {calendarOverlapGroups.reduce((total, group) => total + group.events.length, 0)} events are stacked here so they stay readable.
                            </span>
                          </div>
                        </header>
                        <div className="calendar-overlap-agenda-list">
                          {calendarOverlapGroups.map((group) => (
                            <article className="calendar-overlap-group" key={group.id}>
                              <div className="calendar-overlap-group-heading">
                                <strong>{group.dayLabel}</strong>
                                <span>{group.timeLabel}</span>
                              </div>
                              <div className="calendar-overlap-cards">
                                {group.events.map((event) => (
                                  <button
                                    className="calendar-overlap-card"
                                    key={event.id}
                                    type="button"
                                    style={{ "--calendar-event-color": event.color } as CSSProperties}
                                    onClick={() => openCalendarEventEditor(event)}
                                    title={`${event.title} - ${event.timeLabel}. Click to edit in Autopilot.`}
                                  >
                                    <strong>{event.title}</strong>
                                    <span>{event.timeLabel}</span>
                                    <small>{event.calendarName}</small>
                                  </button>
                                ))}
                              </div>
                            </article>
                          ))}
                        </div>
                      </section>
                    )}

                    <div
                      className="calendar-week-board"
                      style={
                        {
                          "--calendar-hour-count": CALENDAR_WEEK_END_HOUR - CALENDAR_WEEK_START_HOUR,
                          "--calendar-hour-label-count": calendarHours.length,
                          "--calendar-hour-height": `${CALENDAR_HOUR_HEIGHT}px`,
                          "--calendar-board-min-width": `${calendarBoardMinWidth}px`
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
                          const { leftPercent, widthPercent } = getCalendarWeekEventLayout(event);
                          return (
                            <button
                              className={`calendar-week-event ${calendarOverlapEventIds.has(event.id) ? "overlap-collapsed" : ""} ${
                                event.compact ? "compact" : ""
                              } ${event.allDay ? "all-day" : ""} ${
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
                                  "--calendar-lane-count": event.laneCount,
                                  "--calendar-stack-offset-hours": event.stackOffsetHours
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

                  {Boolean(false) && visibleOpenActionItems.length === 0 ? (
                    <div className="action-empty">
                      <Check size={22} aria-hidden="true" />
                      <span>{selectedActionSource === "All" ? "No open action items" : `No open ${selectedActionSource.toLowerCase()} actions`}</span>
                    </div>
                  ) : (
                    <div className="action-queue-stacks">
                      {[
                        { id: "needs-user", title: "Needs user action", items: needsUserActionQueueItems, empty: "Nothing needs your direct action right now." },
                        { id: "ai-working", title: "AI working", items: aiWorkingActionQueueItems, empty: "Autopilot is not currently preparing routed work." },
                        { id: "waiting", title: "Waiting / not working", items: waitingActionQueueItems, empty: "No waiting AI-prep items." }
                      ].map((lane) => {
                        const visibleLaneItems = lane.items.slice(0, 12);
                        return (
                          <section className={`action-queue-stack ${lane.id}`} key={lane.id} aria-label={lane.title}>
                            <header>
                              <span>{lane.title}</span>
                              <b>{lane.items.length}</b>
                            </header>
                            {visibleLaneItems.length === 0 ? (
                              <p className="action-queue-stack-empty">{lane.empty}</p>
                            ) : (
                              <div className="action-list">
                                {visibleLaneItems.map((item) => {
                                  const task = taskByActionId.get(item.id);
                                  const queueWorkItem = workItemByTaskId.get(item.id);
                                  return (
                                    <article className="action-item" key={`${lane.id}:${item.id}`}>
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
                                          {queueWorkItem ? <small>{getWorkItemStatusLabel(queueWorkItem)}</small> : task ? <small>{getTaskStateLabel(task.state)}</small> : null}
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
                            {lane.items.length > visibleLaneItems.length && <span className="work-lane-more">+{lane.items.length - visibleLaneItems.length} more</span>}
                          </section>
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

                  <section className={`productivity-finance-sidebar ${financeReady ? "unlocked" : "locked"}`} aria-label="Finances">
                    <div className="queue-source-heading">
                      <div>
                        <p className="panel-kicker">Finances</p>
                        <h3>Invoices & money</h3>
                      </div>
                      <span className="finance-lock-pill">
                        {financeProviderReady ? "Ready" : financeReady ? "Provider needed" : "Locked"}
                      </span>
                    </div>
                    {!financeReady ? (
                      <div className="finance-locked-card">
                        <LockKeyhole size={18} aria-hidden="true" />
                        <span>
                          <strong>Money management is locked</strong>
                          <small>{financeLockedReason}</small>
                        </span>
                        <button type="button" onClick={() => openWorkspaceByView("settings")}>
                          Enable in Settings
                        </button>
                      </div>
                    ) : (
                      <>
                        <p>
                          Possible invoices come from readable Gmail and other approved sources. Every payment still needs invoice and vendor verification first.
                        </p>
                        {financeInvoiceCandidates.length === 0 ? (
                          <div className="finance-empty-card">
                            <CreditCard size={18} aria-hidden="true" />
                            <span>No invoice candidates from readable emails yet.</span>
                          </div>
                        ) : (
                          <div className="finance-invoice-list">
                            {financeInvoiceCandidates.map((candidate) => (
                              <article className="finance-invoice-card" key={candidate.id}>
                                <strong>{candidate.title}</strong>
                                <small>{candidate.sender} - {candidate.amountLabel} - {candidate.dueLabel}</small>
                                <span>{candidate.reason}</span>
                                <div>
                                  <button type="button" onClick={() => void reviewFinanceInvoiceCandidate(candidate)}>
                                    Run safety check
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (candidate.sourceKind === "gmail") {
                                        const message = visibleEmailMessages.find((item) => item.id === candidate.messageId);
                                        if (!message) {
                                          return;
                                        }
                                        void openEmailInBrowser(message);
                                        return;
                                      }
                                      activateTab(candidate.sourceId);
                                    }}
                                  >
                                    Open source
                                  </button>
                                </div>
                              </article>
                            ))}
                          </div>
                        )}
                        {!financeProviderReady && (
                          <button className="secondary-action compact" type="button" onClick={() => openWorkspaceByView("settings")}>
                            Connect Stripe before proposals
                          </button>
                        )}
                        {financeReviewStatus && <p className="finance-review-status">{financeReviewStatus}</p>}
                      </>
                    )}
                  </section>

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
            <section
              className={`design-rebuild-studio ${designProjectDrawerOpen ? "projects-open" : "projects-collapsed"} ${designAiPanelOpen ? "assistant-open" : "assistant-collapsed"} ${
                artifactBusy ? "is-generating" : ""
              }`}
              aria-labelledby="design-studio-heading"
            >
              {designProjectDrawerOpen ? (
                <aside className="design-rebuild-projects" aria-label="Design projects and artifacts">
                  <header className="design-rebuild-projects-head">
                    <div>
                      <p className="panel-kicker">Projects</p>
                      <h2>Design</h2>
                      <span>Projects you start and work Autopilot starts stay separate.</span>
                    </div>
                    <button className="primary-action compact" type="button" onClick={createNewDesignArtifactFromRail}>
                      <Plus size={14} aria-hidden="true" />
                      New Project
                    </button>
                    <button className="icon-button small" type="button" aria-label="Collapse design projects" onClick={() => setDesignProjectDrawerOpen(false)}>
                      <ChevronLeft size={15} aria-hidden="true" />
                    </button>
                  </header>

                  <label className="design-rebuild-search">
                    <Search size={14} aria-hidden="true" />
                    <input value={designProjectFilter} onChange={(event) => setDesignProjectFilter(event.target.value)} placeholder="Search projects..." aria-label="Search design projects" />
                  </label>

                  <div className="design-rebuild-project-scroll">
                    <section className="design-rebuild-group" aria-label="User-started design projects">
                      <header>
                        <span>User files</span>
                        <b>{filteredVisibleDesignProjectRecords.length + filteredVisibleDesignProjects.length + (blankDesignProjectName ? 1 : 0)}</b>
                      </header>
                      {blankDesignProjectName && !activeArtifact && !activeDesignProjectRecord && (
                        <button
                          className="design-rebuild-project-card active"
                          type="button"
                          onClick={() => {
                            setDesignToolSection("projects");
                            setArtifactStatus(`${blankDesignProjectName} is open. Ask the assistant to generate the first artifact.`);
                          }}
                        >
                          <span className="design-rebuild-status-dot queued" aria-hidden="true" />
                          <span>
                            <strong>{blankDesignProjectName}</strong>
                            <small>Blank project - waiting for first artifact</small>
                          </span>
                        </button>
                      )}
                      {filteredVisibleDesignProjectRecords.map((record) => (
                        <button
                          className={`design-rebuild-project-card ${activeDesignProjectRecordId === record.id ? "active" : ""}`}
                          type="button"
                          key={record.id}
                          onClick={() => selectDesignProjectRecord(record)}
                        >
                          <span className={`design-rebuild-status-dot ${record.status}`} aria-hidden="true" />
                          <span>
                            <strong>{record.title}</strong>
                            <small>{record.summary || record.sourceLabel}</small>
                          </span>
                          <em>{record.artifactIds.length + record.draftIds.length}</em>
                        </button>
                      ))}
                      {filteredVisibleDesignProjects.map((project) => renderDesignBuiltItem(project))}
                      {filteredVisibleDesignProjectRecords.length === 0 && filteredVisibleDesignProjects.length === 0 && !blankDesignProjectName && (
                        <div className="design-rebuild-empty">
                          <FolderOpen size={17} aria-hidden="true" />
                          <span>Start with New Project or pick a starter below.</span>
                        </div>
                      )}
                    </section>

                    <section className="design-rebuild-group ai" aria-label="AI-started design projects">
                      <header>
                        <span>AI-generated files</span>
                        <b>{aiWorkingDesignProjectRecords.length + aiWorkingDesignProjects.length}</b>
                      </header>
                      {aiWorkingDesignProjectRecords.map((record) => (
                        <button
                          className={`design-rebuild-project-card ${activeDesignProjectRecordId === record.id ? "active" : ""}`}
                          type="button"
                          key={record.id}
                          onClick={() => selectDesignProjectRecord(record)}
                        >
                          <span className={`design-rebuild-status-dot ${record.status}`} aria-hidden="true" />
                          <span>
                            <strong>{record.title}</strong>
                            <small>{record.summary || "Routed from Productivity"}</small>
                          </span>
                          <em>{record.artifactIds.length + record.draftIds.length}</em>
                        </button>
                      ))}
                      {aiWorkingDesignProjects.map((project) => renderDesignBuiltItem(project))}
                      {aiWorkingDesignProjectRecords.length === 0 && aiWorkingDesignProjects.length === 0 && (
                        <div className="design-rebuild-empty">
                          <Sparkles size={17} aria-hidden="true" />
                          <span>Routed email work will appear here only when Design is truly needed.</span>
                        </div>
                      )}
                    </section>

                    <section className="design-rebuild-group artifacts" aria-label="Artifacts in selected design project">
                      <header>
                        <span>Artifacts</span>
                        <b>{activeDesignProjectArtifacts.length}</b>
                      </header>
                      {activeDesignProjectArtifacts.length > 0 ? (
                        activeDesignProjectArtifacts.map((file) => (
                          <button className="design-rebuild-artifact-row" type="button" key={file.id} onClick={() => openDesignGeneratedFile(file)}>
                            <span className={`design-rebuild-status-dot ${artifactBusy && file.artifactId === activeArtifact?.id ? "generating" : "ready"}`} aria-hidden="true" />
                            <span>
                              <strong>{file.title}</strong>
                              <small>{file.meta} - {file.status}</small>
                            </span>
                          </button>
                        ))
                      ) : (
                        <div className="design-rebuild-empty">
                          <Package size={17} aria-hidden="true" />
                          <span>Documents, slides, websites, spreadsheets, forms, drafts, briefs, checklists, assets, code handoffs, and exports show here.</span>
                        </div>
                      )}
                    </section>

                    <section className="design-rebuild-group starters" aria-label="Design starter projects">
                      <header>
                        <span>Starters</span>
                        <b>{filteredDesignStarterProjects.length}</b>
                      </header>
                      {filteredDesignStarterProjects.slice(0, 4).map((project) => renderDesignStarterProject(project))}
                    </section>
                  </div>
                </aside>
              ) : (
                <button className="design-rebuild-edge-toggle left" type="button" onClick={() => setDesignProjectDrawerOpen(true)} aria-label="Open design projects">
                  <FolderOpen size={16} aria-hidden="true" />
                  Projects
                </button>
              )}

              <main className="design-rebuild-canvas" aria-label="Design artifact canvas">
                <header className="design-rebuild-toolbar">
                  <div>
                    <span className="design-rebuild-breadcrumb">
                      Projects <ChevronRight size={13} aria-hidden="true" /> {activeDesignProjectRecord?.title ?? activeArtifact?.title ?? blankDesignProjectName ?? "New project"}
                    </span>
                    <h1 id="design-studio-heading">{activeArtifact ? activeArtifact.title : blankDesignProjectName || "Create a new artifact"}</h1>
                  </div>
                  <nav className="design-rebuild-artifact-types" aria-label="Supported artifact types">
                    <span>Artifacts</span>
                    <span>Docs</span>
                    <span>Slides</span>
                    <span>Websites</span>
                    <span>Sheets</span>
                    <span>Forms</span>
                    <span>Drafts</span>
                  </nav>
                  <div className="design-rebuild-toolbar-actions">
                    <button type="button" className={designToolSection === "pages" ? "active" : ""} onClick={() => activateDesignToolSection("pages", "Artifacts library is open.")}>
                      <Package size={14} aria-hidden="true" />
                      Artifacts
                    </button>
                    <button type="button" onClick={openDesignSourcesPanel} disabled={!activeDesignSourceContext} title={activeDesignSourceContext ? "Open the source trail." : "No source trail is attached yet."}>
                      <Globe2 size={14} aria-hidden="true" />
                      Sources
                    </button>
                    <button type="button" disabled={!activeArtifact || artifactBusy} title={activeArtifact ? "Export the selected artifact." : "Create or select an artifact before exporting."} onClick={() => void exportActiveArtifact()}>
                      <Download size={14} aria-hidden="true" />
                      Export
                    </button>
                    <button
                      type="button"
                      disabled={!activeArtifact || activeArtifact.kind !== "website_design" || artifactBusy}
                      title={activeArtifact?.kind === "website_design" ? "Send this website design to Coding." : "Send to Coding is available for website designs only."}
                      onClick={() => void exportActiveArtifactToCoding()}
                    >
                      <Code2 size={14} aria-hidden="true" />
                      To Coding
                    </button>
                    <button type="button" onClick={() => setDesignAiPanelOpen((isOpen) => !isOpen)}>
                      <Sparkles size={14} aria-hidden="true" />
                      Assistant
                    </button>
                  </div>
                </header>

                {designToolSection === "pages" ? (
                  renderDesignFilesLibrary()
                ) : designToolSection === "history" ? (
                  renderDesignHistoryPanel()
                ) : designToolSection === "settings" ? (
                  renderDesignSettingsPanel()
                ) : (
                  <section className="design-rebuild-stage">
                    {(artifactStatus || exportToCodingStatus || backgroundWorkStatus) && (
                      <div className={`design-rebuild-status ${artifactBusy ? "busy" : ""}`} role="status">
                        {artifactBusy && <Sparkles size={14} className="spin" aria-hidden="true" />}
                        <span>{backgroundWorkStatus || exportToCodingStatus || artifactStatus}</span>
                      </div>
                    )}

                    {!activeArtifact || !designCanvasVersion ? (
                      <article className="design-rebuild-empty-canvas">
                        <span className={`design-rebuild-build-indicator ${artifactBusy ? "running" : "idle"}`} aria-hidden="true">
                          {artifactBusy ? <i /> : <Package size={28} />}
                        </span>
                        <p className="panel-kicker">{blankDesignProjectName ? "Blank project" : "Ready to create"}</p>
                        <h2>{blankDesignProjectName || "What should Autopilot design?"}</h2>
                        <p>
                          Ask for a document, slide deck, website, spreadsheet, form, draft, brief, checklist, asset pack, code handoff, or export. The result opens here first.
                        </p>
                        <form className="design-rebuild-inline-prompt" onSubmit={(event) => void submitDesignAssistantPrompt(event)}>
                          <input value={artifactPrompt} onChange={(event) => setArtifactPrompt(event.target.value)} placeholder="Ask Autopilot to make the first artifact..." aria-label="Design prompt" />
                          <button type="submit" disabled={artifactBusy || artifactPrompt.trim().length === 0}>
                            <Sparkles size={15} aria-hidden="true" />
                            Generate
                          </button>
                        </form>
                      </article>
                    ) : (
                      <article className="design-rebuild-artboard">
                        <button
                          className="design-rebuild-edit-target"
                          type="button"
                          disabled={!activeArtifact}
                          title={activeArtifact ? "Ask the assistant for a focused revision to this result." : "Create an artifact first."}
                          onClick={() => requestCanvasEdit(getArtifactKindLabel(activeArtifact.kind))}
                        >
                          <MousePointer2 size={14} aria-hidden="true" />
                          Edit this result
                        </button>
                        <header>
                          <span>{getArtifactKindLabel(activeArtifact.kind)} result</span>
                          <h2>{activeArtifact.title}</h2>
                          <p>{activeArtifact.summary}</p>
                        </header>
                        <div className="design-rebuild-selected-frame">
                          {designCanvasVersion.content.kind === "document" && (
                            <article className="design-document-preview">
                              {designCanvasVersion.content.markdown.split(/\n+/u).slice(0, 28).map((line, index) => {
                                const trimmed = line.trim();
                                if (!trimmed) {
                                  return null;
                                }
                                if (trimmed.startsWith("#")) {
                                  return <h2 key={`line-${index}`}>{trimmed.replace(/^#+\s*/u, "")}</h2>;
                                }
                                return <p key={`line-${index}`}>{trimmed.replace(/^[-*]\s*/u, "")}</p>;
                              })}
                            </article>
                          )}

                          {designCanvasVersion.content.kind === "slide_deck" && (
                            <div className="slide-preview-grid design-slide-grid">
                              {designCanvasVersion.content.slides.map((slide, index) => {
                                const variant = getSlidePreviewVariant(slide, index, designCanvasVersion.content.kind === "slide_deck" ? designCanvasVersion.content.slides.length : 1);
                                return (
                                  <article className={`slide-preview-card ${variant}`} key={slide.id}>
                                    <span>{String(index + 1).padStart(2, "0")}</span>
                                    <h3>{slide.title}</h3>
                                    <ul>
                                      {slide.bullets.slice(0, 5).map((bullet) => (
                                        <li key={bullet}>{bullet}</li>
                                      ))}
                                    </ul>
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

                    {renderDesignCanvasFileStrip()}
                  </section>
                )}
              </main>

              {designAiPanelOpen ? (
                <aside className="design-rebuild-assistant" aria-label="Design assistant">
                  <header>
                    <div>
                      <p className="panel-kicker">Autopilot AI</p>
                      <h2>What's on your mind today?</h2>
                    </div>
                    <button className="icon-button small" type="button" aria-label="Collapse design assistant" onClick={() => setDesignAiPanelOpen(false)}>
                      <X size={15} aria-hidden="true" />
                    </button>
                  </header>

                  <section className="design-rebuild-assistant-card">
                    <Sparkles size={18} aria-hidden="true" />
                    <div>
                      <strong>{activeArtifact ? "Ask for a revision" : "Ask for a new artifact"}</strong>
                      <span>
                        {activeArtifact
                          ? "Autopilot will revise the selected artifact and keep the result on the canvas."
                          : "Autopilot will ask clarifying questions only when the prompt is too vague, then generate the result."}
                      </span>
                    </div>
                  </section>

                  {artifactBusy && (
                    <section className="design-rebuild-generating-card" role="status">
                      <span className="design-rebuild-build-indicator running" aria-hidden="true"><i /></span>
                      <div>
                        <strong>Generating artifact</strong>
                        <span>Planning, drafting, checking quality, and revising before it lands on the canvas.</span>
                      </div>
                    </section>
                  )}

                  {activeGeneratedArtifactReview && (
                    <details className="design-rebuild-details">
                      <summary>Quality {activeGeneratedArtifactReview.qualityReport.score}/100</summary>
                      <p>{activeGeneratedArtifactReview.qualityReport.summary}</p>
                      <div className="design-rebuild-quality-mini">
                        {(activeGeneratedArtifactReview.qualityReport.failedChecks.length > 0
                          ? activeGeneratedArtifactReview.qualityReport.failedChecks
                          : activeGeneratedArtifactReview.qualityReport.passedChecks.slice(0, 3)
                        ).map((check) => (
                          <span key={check.id} data-passed={check.passed}>
                            {check.passed ? "Pass" : "Review"}: {check.label}
                          </span>
                        ))}
                      </div>
                    </details>
                  )}

                  {(activeDesignDraft || activeDesignSourceContext) && (
                    <details className="design-rebuild-details">
                      <summary>Sources and drafts</summary>
                      {activeDesignDraft && (
                        <button type="button" onClick={() => openProductivityDraft(activeDesignDraft)}>
                          <Mail size={14} aria-hidden="true" />
                          Open draft: {activeDesignDraft.title}
                        </button>
                      )}
                      {activeDesignSourceContext && (
                        <button type="button" onClick={openDesignSourcesPanel}>
                          <Globe2 size={14} aria-hidden="true" />
                          View source trail
                        </button>
                      )}
                    </details>
                  )}

                  <form className="design-rebuild-ai-form" onSubmit={(event) => void submitDesignAssistantPrompt(event)}>
                    <textarea
                      value={artifactPrompt}
                      onChange={(event) => setArtifactPrompt(event.target.value)}
                      placeholder={activeArtifact ? "Ask for changes..." : "Describe what to design..."}
                      aria-label="Ask Autopilot to design"
                    />
                    <button type="submit" disabled={artifactBusy || artifactPrompt.trim().length === 0} title={artifactPrompt.trim().length === 0 ? "Type a design request before sending." : "Generate or revise this artifact."}>
                      <Send size={16} aria-hidden="true" />
                    </button>
                  </form>
                </aside>
              ) : (
                <button className="design-rebuild-edge-toggle right" type="button" onClick={() => setDesignAiPanelOpen(true)} aria-label="Open design assistant">
                  <Sparkles size={16} aria-hidden="true" />
                  Assistant
                </button>
              )}
            </section>
          )}

          {Boolean(false) && view === "design" && (
            <section
              className={`design-workspace-v2 design-flow-studio design-atlas-studio design-claude-studio ${designProjectDrawerOpen ? "built-open" : "built-closed"} ${designSourcePanelOpen ? "source-open" : "source-closed"} ${
                designAiPanelOpen ? "ai-open" : "ai-closed"
              } ${designCanvasEditMode ? "canvas-editing" : "canvas-reviewing"}`}
              aria-labelledby="design-studio-heading"
            >
              <nav className="design-v2-local-rail" aria-label="Design workspace tools">
                <span className="design-rail-mark" aria-hidden="true">
                  <Palette size={18} />
                </span>
                <button
                  className={designProjectDrawerOpen ? "active" : ""}
                  type="button"
                  aria-label="Design workspace"
                  onClick={() => {
                    setDesignToolSection("projects");
                    setDesignProjectDrawerOpen(true);
                    setDesignSourcePanelOpen(false);
                    setArtifactStatus("Workspace is open. Built items are available on the left, and the result canvas is back in focus.");
                  }}
                >
                  <Home size={17} aria-hidden="true" />
                  Workspace
                </button>
                <button
                  className={designToolSection === "pages" ? "active" : ""}
                  type="button"
                  aria-label="Design files"
                  onClick={() => activateDesignToolSection("pages")}
                >
                  <FileText size={17} aria-hidden="true" />
                  Files
                </button>
                <button className={designSourcePanelOpen ? "active" : ""} type="button" aria-label="Design sources" onClick={openDesignSourcesPanel}>
                  <Package size={17} aria-hidden="true" />
                  Sources
                </button>
                <button
                  className={designToolSection === "history" ? "active" : ""}
                  type="button"
                  aria-label="Design history"
                  onClick={() =>
                    activateDesignToolSection(
                      "history",
                      activeArtifact
                        ? `${activeArtifact.versions.length} version${activeArtifact.versions.length === 1 ? "" : "s"} available for this artifact.`
                        : "Create an artifact to see version history."
                    )
                  }
                >
                  <Clock size={17} aria-hidden="true" />
                  History
                </button>
                <button className={designToolSection === "settings" ? "active" : ""} type="button" aria-label="Design settings" onClick={() => activateDesignToolSection("settings")}>
                  <Settings size={17} aria-hidden="true" />
                  Settings
                </button>
              </nav>

              {designProjectDrawerOpen && (
                <aside className="design-v2-project-drawer" aria-label="Built design items">
                  <header className="design-atlas-workspace-head">
                    <span className="design-atlas-workspace-avatar" aria-hidden="true">A</span>
                    <div>
                      <h2>Autopilot</h2>
                      <p>Design workspace</p>
                    </div>
                    <button className="secondary-action design-new-button" type="button" onClick={createNewDesignArtifactFromRail}>
                      <Plus size={14} aria-hidden="true" />
                      New Project
                    </button>
                    <button className="icon-button small" type="button" aria-label="Close project drawer" onClick={() => setDesignProjectDrawerOpen(false)}>
                      <X size={15} aria-hidden="true" />
                    </button>
                  </header>
                  <label className="design-v2-search">
                    <Search size={14} aria-hidden="true" />
                    <input value={designProjectFilter} onChange={(event) => setDesignProjectFilter(event.target.value)} placeholder="Search projects..." aria-label="Search design projects" />
                  </label>
                  <div className="design-v2-project-list design-project-spine" data-project-tab={designProjectTab}>
                    <section className="design-project-group" aria-label="User design projects">
                      <header>
                        <span>Projects</span>
                        <b>
                          {filteredVisibleDesignProjectRecords.length +
                            filteredVisibleDesignProjects.length +
                            (filteredVisibleDesignProjects.length === 0 && filteredVisibleDesignProjectRecords.length === 0 ? filteredDesignStarterProjects.length : 0)}
                        </b>
                      </header>
                      {filteredVisibleDesignProjectRecords.map((record) => renderDesignProjectRecord(record))}
                      {blankDesignProjectName && !activeArtifact && !activeDesignProjectRecord && (
                        <article className="design-built-item active" data-origin="user" data-status="queued">
                          <button type="button" onClick={() => activateDesignToolSection("projects", `${blankDesignProjectName} is open. Ask the AI sidebar to generate the first artifact.`)}>
                            <span className="design-built-icon" data-kind="website_design">
                              <FolderOpen size={18} aria-hidden="true" />
                            </span>
                            <span>
                              <strong>{blankDesignProjectName}</strong>
                              <small>Blank project <b aria-hidden="true">/</b> waiting for first artifact</small>
                            </span>
                          </button>
                          <span className="design-artifact-progress queued" aria-label={`${blankDesignProjectName} is queued`}>
                            <span aria-hidden="true" />
                          </span>
                        </article>
                      )}
                      {filteredVisibleDesignProjects.map((project) => renderDesignBuiltItem(project))}
                      {filteredVisibleDesignProjects.length === 0 && filteredVisibleDesignProjectRecords.length === 0 && !blankDesignProjectName && filteredDesignStarterProjects.map((project) => renderDesignStarterProject(project))}
                      {filteredVisibleDesignProjects.length === 0 && filteredVisibleDesignProjectRecords.length === 0 && filteredDesignStarterProjects.length === 0 && !blankDesignProjectName && (
                        <div className="design-project-empty compact">
                          <Search size={18} aria-hidden="true" />
                          <span>No user projects match that search.</span>
                        </div>
                      )}
                    </section>

                    <section className="design-project-group ai" aria-label="AI-started design projects">
                      <header>
                        <span>AI-started projects</span>
                        <b>{aiWorkingDesignProjectRecords.length + aiWorkingDesignProjects.length}</b>
                      </header>
                      {aiWorkingDesignProjectRecords.map((record) => renderDesignProjectRecord(record))}
                      {aiWorkingDesignProjects.map((project) => renderDesignBuiltItem(project))}
                      {aiWorkingDesignProjectRecords.length === 0 && aiWorkingDesignProjects.length === 0 && (
                        <div className="design-project-empty compact">
                          <Sparkles size={18} aria-hidden="true" />
                          <span>When Productivity routes real design work from an email, it will appear here instead of spending credits on random documents.</span>
                        </div>
                      )}
                    </section>

                    <section className="design-project-group artifacts" aria-label="Artifacts in this project">
                      <header>
                        <span>Artifacts in this project</span>
                        <b>{activeDesignProjectArtifacts.length}</b>
                      </header>
                      {activeDesignProjectArtifacts.length === 0 ? (
                        <div className="design-project-empty compact">
                          <Package size={18} aria-hidden="true" />
                          <span>Ask the AI sidebar to generate a website, doc, deck, draft, brief, memo, checklist, asset pack, or code handoff.</span>
                        </div>
                      ) : (
                        activeDesignProjectArtifacts.map((file) => (
                          <button className="design-project-artifact-row" type="button" key={file.id} onClick={() => openDesignGeneratedFile(file)}>
                            <span className={`design-artifact-progress ${artifactBusy && file.artifactId === activeArtifact?.id ? "running" : "done"}`}>
                              {artifactBusy && file.artifactId === activeArtifact?.id ? <span aria-hidden="true" /> : <Check size={12} aria-hidden="true" />}
                            </span>
                            <span>
                              <strong>{file.title}</strong>
                              <small>{file.meta} / {file.status}</small>
                            </span>
                          </button>
                        ))
                      )}
                    </section>
                  </div>
                  <button
                    className="design-view-all-button"
                    type="button"
                    onClick={() => {
                      activateDesignToolSection("pages", "Artifacts is open. User files and AI-generated files are separated so you can tell who started each output.");
                    }}
                  >
                    View all built items
                    <ArrowRight size={14} aria-hidden="true" />
                  </button>
                </aside>
              )}

              {designSourcePanelOpen && (
                <aside className="design-v2-source-panel" aria-label="Design source preview">
                  <header>
                    <div>
                      <p className="panel-kicker">Source preview</p>
                      <h2>{activeDesignSourceContext?.provider === "gmail" ? "Gmail thread" : "Sources"}</h2>
                    </div>
                    <button className="icon-button small" type="button" aria-label="Close source preview" onClick={() => setDesignSourcePanelOpen(false)}>
                      <X size={15} aria-hidden="true" />
                    </button>
                  </header>
                  {activeDesignSourceContext ? (
                    <>
                      <button className="design-source-selector" type="button" onClick={openDesignSourcesPanel}>
                        {activeDesignSourceContext.provider === "gmail" ? <Mail size={16} aria-hidden="true" /> : <FileText size={16} aria-hidden="true" />}
                        <span>{activeDesignSourceContext.provider === "gmail" ? "Gmail thread" : activeDesignSourceContext.provider}</span>
                        <ChevronDown size={14} aria-hidden="true" />
                      </button>
                      {activeDesignSourceEmail ? (
                        <div className="design-source-preview-card">
                          <dl>
                            <div>
                              <dt>From</dt>
                              <dd>{activeDesignSourceEmail.from || "Unknown sender"}</dd>
                            </div>
                            <div>
                              <dt>Email</dt>
                              <dd>{activeDesignSourceEmail.fromEmail || "No email captured"}</dd>
                            </div>
                            <div>
                              <dt>Subject</dt>
                              <dd>{activeDesignSourceEmail.subject || "No subject"}</dd>
                            </div>
                            <div>
                              <dt>Date</dt>
                              <dd>{formatInboxReceivedAt(activeDesignSourceEmail.receivedAt)}</dd>
                            </div>
                          </dl>
                          <span className="design-source-badge">Draft extracted</span>
                          <p>{activeDesignSourceEmail.snippet || activeDesignSourceContext.description}</p>
                        </div>
                      ) : (
                        <div className="design-source-preview-card">
                          <p>{activeDesignSourceContext.description}</p>
                        </div>
                      )}
                      {activeDesignSourceContext.requirements.length > 0 && (
                        <section className="design-source-requirements">
                          <strong>Source trail</strong>
                          {activeDesignSourceContext.requirements.slice(0, 5).map((requirement, index) => (
                            <span key={`${requirement}-${index}`}>
                              <Check size={13} aria-hidden="true" />
                              {requirement}
                            </span>
                          ))}
                        </section>
                      )}
                      <button className="secondary-action" type="button" disabled={!activeDesignSourceContext.url} onClick={() => void openActiveDesignSource()}>
                        Open full source
                        <Globe2 size={14} aria-hidden="true" />
                      </button>
                    </>
                  ) : (
                    <div className="design-source-empty">
                      <Package size={20} aria-hidden="true" />
                      <strong>No source attached yet.</strong>
                      <p>Generate from an email, draft, document, or prompt and Autopilot will show provenance here.</p>
                    </div>
                  )}
                </aside>
              )}

              <section
                className="design-v2-canvas-shell"
                aria-label={
                  designToolSection === "pages"
                    ? "Generated design files"
                    : designToolSection === "history"
                      ? "Design version history"
                      : designToolSection === "settings"
                        ? "Design studio settings"
                        : "Design canvas"
                }
              >
                {designToolSection === "pages" ? (
                  renderDesignFilesLibrary()
                ) : designToolSection === "history" ? (
                  renderDesignHistoryPanel()
                ) : designToolSection === "settings" ? (
                  renderDesignSettingsPanel()
                ) : (
                  <>
                <header className="design-v2-toolbar">
                  <div className="design-v2-toolbar-group">
                    <button type="button" className={designProjectDrawerOpen ? "active" : ""} onClick={() => setDesignProjectDrawerOpen((isOpen) => !isOpen)}>
                      <FolderOpen size={15} aria-hidden="true" />
                      Built items
                    </button>
                    <button type="button" className={designSourcePanelOpen ? "active" : ""} onClick={() => setDesignSourcePanelOpen((isOpen) => !isOpen)}>
                      <Package size={15} aria-hidden="true" />
                      Sources
                      <span className="design-toolbar-count">{activeDesignSourceContext ? 1 : 0}</span>
                    </button>
                    <button type="button" className={designAiPanelOpen ? "active" : ""} onClick={() => setDesignAiPanelOpen((isOpen) => !isOpen)}>
                      <Sparkles size={15} aria-hidden="true" />
                      Assistant
                    </button>
                  </div>
                  <div className="design-v2-toolbar-title">
                    <span className="design-atlas-breadcrumb">
                      Projects <ChevronRight size={13} aria-hidden="true" /> {activeArtifact ? activeArtifact.title : "New artifact"}
                    </span>
                    <strong>{activeArtifact ? activeArtifact.title : "Create your first artifact"}</strong>
                    <div className="design-v2-mode-tabs" role="tablist" aria-label="Artifact type preview">
                      <button
                        type="button"
                        className="active"
                        onClick={() => {
                          activateDesignToolSection("pages", "Artifacts is open. User files and AI-generated files are separated so you can tell who started each output.");
                        }}
                      >
                        <Package size={13} aria-hidden="true" />
                        Artifacts
                      </button>
                      <span>Websites</span>
                      <span>Slides</span>
                      <span>Docs</span>
                      <span>Drafts</span>
                      <span>Briefs</span>
                      <span>Assets</span>
                    </div>
                  </div>
                  <div className="design-v2-toolbar-group end">
                    <span className="design-claude-collaborators" aria-label="Design collaborators">
                      <b>EV</b>
                      <b>JK</b>
                      <b>MF</b>
                    </span>
                    <button
                      className={designCanvasEditMode ? "active" : ""}
                      type="button"
                      aria-label="Edit canvas by selecting a section"
                      disabled={!activeArtifact}
                      title={activeArtifact ? "Select the canvas to send a focused edit request to the assistant." : "Create or select an artifact before using click-to-edit."}
                      onClick={toggleDesignCanvasEditMode}
                    >
                      <MousePointer2 size={15} aria-hidden="true" />
                      Edit canvas
                    </button>
                    <button
                      type="button"
                      aria-label="Focus design canvas"
                      disabled={!activeArtifact}
                      title={activeArtifact ? "Fold away side panels and review the canvas." : "Create or select an artifact before entering focus view."}
                      onClick={() => {
                        setDesignProjectDrawerOpen(false);
                        setDesignSourcePanelOpen(false);
                        setDesignAiPanelOpen(false);
                        setDesignPreviewMode(true);
                        setArtifactStatus("Focus view is on. Built items, sources, and assistant are folded away so you can review the result full-screen.");
                      }}
                    >
                      <EyeOff size={15} aria-hidden="true" />
                      Focus
                    </button>
                    <button
                      className={designPreviewMode ? "active" : ""}
                      type="button"
                      aria-label="Design preview"
                      disabled={!activeArtifact}
                      title={activeArtifact ? "Toggle preview mode for this artifact." : "Create or select an artifact before previewing."}
                      onClick={() => setDesignPreviewMode((isPreviewing) => !isPreviewing)}
                    >
                      <Eye size={15} aria-hidden="true" />
                      Preview
                    </button>
                    <button
                      type="button"
                      aria-label="Run design preview"
                      disabled={!activeArtifact || !designCanvasVersion}
                      title={activeArtifact && designCanvasVersion ? "Run the current artifact preview." : "Create or select an artifact before running preview."}
                      onClick={runDesignPreview}
                    >
                      <Play size={15} aria-hidden="true" />
                      Run
                    </button>
                    <button
                      type="button"
                      aria-label="Share design artifact"
                      disabled={!activeArtifact || !designCanvasVersion || artifactBusy}
                      title={activeArtifact && designCanvasVersion ? "Copy a review-ready share summary." : "Create or select an artifact before sharing."}
                      onClick={() => void shareActiveArtifact()}
                    >
                      <UserPlus size={15} aria-hidden="true" />
                      Share
                    </button>
                    <button
                      type="button"
                      aria-label="Send design to Coding"
                      disabled={!activeArtifact || activeArtifact.kind !== "website_design" || artifactBusy}
                      title={activeArtifact?.kind === "website_design" ? "Send this website design to Coding." : "Send to Coding is available for website designs only."}
                      onClick={() => void exportActiveArtifactToCoding()}
                    >
                      <Code2 size={15} aria-hidden="true" />
                      To Coding
                    </button>
                    <button
                      className="design-export-button"
                      type="button"
                      aria-label="Export design artifact"
                      disabled={!activeArtifact || artifactBusy}
                      title={activeArtifact ? "Export the selected artifact." : "Create or select an artifact before exporting."}
                      onClick={() => void exportActiveArtifact()}
                    >
                      <Download size={15} aria-hidden="true" />
                      Export
                    </button>
                  </div>
                </header>

                {(artifactStatus || exportToCodingStatus || backgroundWorkStatus) && (
                  <div className={`design-v2-status ${artifactBusy ? "busy" : ""}`} role="status">
                    {artifactBusy && <Sparkles size={14} className="spin" aria-hidden="true" />}
                    <span>{backgroundWorkStatus || exportToCodingStatus || artifactStatus}</span>
                  </div>
                )}

                <div className={`design-v2-stage ${designGuidesVisible ? "" : "guides-hidden"} ${designPreviewMode ? "preview-mode" : ""} ${designCanvasEditMode ? "edit-selection-mode" : ""}`}>
                  {!activeArtifact || !designCanvasVersion ? (
                    <section className="design-v2-empty-artboard design-atlas-starter-page">
                      <header>
                        <span>{blankDesignProjectName ? "Blank project canvas" : `${getArtifactKindLabel((DESIGN_STARTER_PROJECTS.find((project) => project.id === selectedDesignStarterProjectId) ?? DESIGN_STARTER_PROJECTS[0])?.kind ?? "website_design")} starter`}</span>
                        <h1>{blankDesignProjectName || (DESIGN_STARTER_PROJECTS.find((project) => project.id === selectedDesignStarterProjectId) ?? DESIGN_STARTER_PROJECTS[0])?.title || "New design project"}</h1>
                        <p>
                          {blankDesignProjectName
                            ? "Nothing has been generated yet. Use the AI sidebar to create the first artifact; it will show a spinner while building and a check mark when ready."
                            : (DESIGN_STARTER_PROJECTS.find((project) => project.id === selectedDesignStarterProjectId) ?? DESIGN_STARTER_PROJECTS[0])?.summary ??
                              "Use the assistant to turn an email, prompt, or source into a website, slideshow, document, or draft."}
                        </p>
                      </header>
                      <div className="design-atlas-starter-doc" aria-label="Starter document canvas">
                        {blankDesignProjectName ? (
                          <>
                            <h2>Start with one clear artifact</h2>
                            <ul>
                              <li>Ask for a website, document, slide deck, memo, checklist, asset pack, or code handoff.</li>
                              <li>The right sidebar chat stays tied to this project.</li>
                              <li>Generated artifacts appear in the project sidebar and open here on the canvas.</li>
                            </ul>
                            <blockquote>Autopilot will not create expensive artifacts unless the prompt or routed source asks for one.</blockquote>
                          </>
                        ) : (
                          <>
                            <h2>Day-by-day</h2>
                            <ul>
                              <li>Mon - multi-surface canvas is the headline.</li>
                              <li>Tue - AI drafts from a prompt or doc.</li>
                              <li>Wed - brand-aware imports.</li>
                              <li>Thu - review, proof, and comments.</li>
                              <li>Fri - publish, export, or send to Coding.</li>
                            </ul>
                            <blockquote>
                              If a customer only sees one thing, it should be the finished result. Every source, draft, and quality check stays available without taking over the canvas.
                            </blockquote>
                          </>
                        )}
                      </div>
                      <form className="design-v2-empty-prompt" onSubmit={(event) => void submitDesignAssistantPrompt(event)}>
                        <input value={artifactPrompt} onChange={(event) => setArtifactPrompt(event.target.value)} placeholder="What's on your mind today?" aria-label="Design prompt" />
                        <button
                          className="primary-action"
                          type="submit"
                          disabled={artifactBusy || artifactPrompt.trim().length === 0}
                          title={artifactPrompt.trim().length === 0 ? "Type what you want Autopilot to design before generating." : "Generate this artifact."}
                        >
                          <Sparkles size={15} aria-hidden="true" />
                          Generate
                        </button>
                      </form>
                    </section>
                  ) : (
                    <article className="design-v2-artboard" style={{ "--design-canvas-width": `${designCanvasWidth}px`, "--design-canvas-scale": designCanvasZoom / 100 } as CSSProperties}>
                      {designCanvasEditMode && (
                        <button className="design-canvas-edit-target" type="button" onClick={() => requestCanvasEdit(getArtifactKindLabel(activeArtifact.kind))}>
                          <MousePointer2 size={14} aria-hidden="true" />
                          Edit this result with AI
                        </button>
                      )}
                      <header className="design-v2-artboard-header">
                        <span>{getArtifactKindLabel(activeArtifact.kind)} result</span>
                        <h1 id="design-studio-heading">{activeArtifact.title}</h1>
                        <p>{activeArtifact.summary}</p>
                      </header>
                      <div className="design-v2-selected-frame">
                        {designCanvasVersion.content.kind === "document" && (
                          <article className="design-document-preview">
                            {designCanvasVersion.content.markdown.split(/\n+/u).slice(0, 26).map((line, index) => {
                              const trimmed = line.trim();
                              if (!trimmed) {
                                return null;
                              }
                              if (trimmed.startsWith("#")) {
                                return <h2 key={`line-${index}`}>{trimmed.replace(/^#+\s*/u, "")}</h2>;
                              }
                              return <p key={`line-${index}`}>{trimmed.replace(/^[-*]\s*/u, "")}</p>;
                            })}
                          </article>
                        )}

                        {designCanvasVersion.content.kind === "slide_deck" && (
                          <div className="slide-preview-grid design-slide-grid">
                            {designCanvasVersion.content.slides.map((slide, index) => {
                              const variant = getSlidePreviewVariant(slide, index, designCanvasVersion.content.kind === "slide_deck" ? designCanvasVersion.content.slides.length : 1);
                              const firstBlock = slide.bullets.slice(0, 3);
                              const secondBlock = slide.bullets.slice(3, 6);
                              return (
                                <article className={`slide-preview-card ${variant}`} key={slide.id}>
                                  <span>{String(index + 1).padStart(2, "0")}</span>
                                  <h3>{slide.title}</h3>
                                  {variant === "cover" ? (
                                    <p>{slide.bullets[0] ?? slide.speakerNotes ?? "A focused title slide ready for speaker notes."}</p>
                                  ) : variant === "quote" ? (
                                    <blockquote>
                                      {slide.bullets[0] ?? slide.speakerNotes ?? "Use this slide for a customer quote or key evidence."}
                                    </blockquote>
                                  ) : variant === "two-column" ? (
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
                                  ) : variant === "closing" ? (
                                    <div className="slide-closing-callout">
                                      {(slide.bullets.length > 0 ? slide.bullets : ["Confirm the next step and approval owner."]).slice(0, 3).map((bullet) => (
                                        <strong key={bullet}>{bullet}</strong>
                                      ))}
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

                {renderDesignCanvasFileStrip()}

                <footer className="design-v2-footer">
                  <div className="design-v2-footer-tabs" role="tablist" aria-label="Built item tabs">
                    <button
                      type="button"
                      className={!activeArtifact || activeArtifact.kind !== "slide_deck" ? "active" : ""}
                      disabled={!activeArtifact}
                      title={activeArtifact ? "Show the document-style canvas for this artifact." : "Create or select an artifact before using document view."}
                      onClick={() => setArtifactStatus(activeArtifact ? `${activeArtifact.title} is open on the document canvas.` : "Create an artifact to open the document canvas.")}
                    >
                      <FileText size={14} aria-hidden="true" />
                      Document
                    </button>
                    <button
                      type="button"
                      className={activeArtifact?.kind === "slide_deck" ? "active" : ""}
                      disabled={activeArtifact?.kind !== "slide_deck"}
                      title={activeArtifact?.kind === "slide_deck" ? "Show the slide deck preview." : "Slideshow view is available after selecting or creating a slide deck."}
                      onClick={() => setArtifactStatus("Slideshow preview is open on the canvas.")}
                    >
                      <Play size={14} aria-hidden="true" />
                      Slideshow
                    </button>
                    <button
                      type="button"
                      disabled={!activeDesignDraft}
                      title={activeDesignDraft ? "Open the email draft connected to this artifact." : "No email draft is connected to this artifact yet."}
                      onClick={() => {
                        if (activeDesignDraft) {
                          openProductivityDraft(activeDesignDraft);
                        }
                      }}
                    >
                      <Mail size={14} aria-hidden="true" />
                      Email draft
                    </button>
                    <button type="button" aria-label="Create another design artifact" onClick={createNewDesignArtifactFromRail}>
                      <Plus size={14} aria-hidden="true" />
                    </button>
                  </div>
                  <span>Frame {designCanvasWidth}px</span>
                  <span>{designCanvasVersion ? getArtifactKindLabel(designCanvasVersion.content.kind) : "No artifact selected"}</span>
                  <span>{activeGeneratedArtifactReview ? `Quality ${activeGeneratedArtifactReview.qualityReport.score}/100` : "Quality appears after generation"}</span>
                  <div>
                    <button
                      type="button"
                      className={designGuidesVisible ? "active" : ""}
                      aria-label={designGuidesVisible ? "Hide canvas frame guides" : "Show canvas frame guides"}
                      onClick={() => setDesignGuidesVisible((areVisible) => !areVisible)}
                    >
                      {designGuidesVisible ? <Eye size={14} aria-hidden="true" /> : <EyeOff size={14} aria-hidden="true" />}
                    </button>
                    <button
                      type="button"
                      aria-label="Previous artifact version"
                      disabled={!activeArtifact || activeArtifactVersionIndex <= 0}
                      title={activeArtifact && activeArtifactVersionIndex > 0 ? "Load the previous saved version." : "No previous version is available."}
                      onClick={() => selectDesignVersion(activeArtifactVersionIndex - 1)}
                    >
                      <ArrowLeft size={14} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label="Next artifact version"
                      disabled={!activeArtifact || activeArtifactVersionIndex >= activeArtifact.versions.length - 1}
                      title={activeArtifact && activeArtifactVersionIndex < activeArtifact.versions.length - 1 ? "Load the next saved version." : "No newer version is available."}
                      onClick={() => selectDesignVersion(activeArtifactVersionIndex + 1)}
                    >
                      <ArrowRight size={14} aria-hidden="true" />
                    </button>
                  </div>
                </footer>
                  </>
                )}
              </section>

              {designAiPanelOpen && (
                <aside className="design-v2-ai-panel" aria-label="Design AI assistant">
                  <header>
                    <div>
                      <p className="panel-kicker">Autopilot AI</p>
                      <h2>Hello, {codingAssistantUserName}</h2>
                      <span>{activeArtifact ? "Edit the result on the canvas." : "What should we design today?"}</span>
                    </div>
                    <button className="icon-button small" type="button" aria-label="Close AI assistant" onClick={() => setDesignAiPanelOpen(false)}>
                      <ChevronRight size={15} aria-hidden="true" />
                    </button>
                  </header>
                  <section className="design-claude-brief-card" aria-label="Artifact studio workflow">
                    <Sparkles size={18} aria-hidden="true" />
                    <div>
                      <strong>Artifact-first studio</strong>
                      <small>Generate the result, select what should change, then review proof, versions, and export state without leaving this canvas.</small>
                    </div>
                  </section>
                  <section className="design-ai-artifacts-panel" aria-label="Project artifacts">
                    <header>
                      <span>Project artifacts</span>
                      <b>{activeDesignProjectArtifacts.length}</b>
                    </header>
                    {activeDesignProjectArtifacts.length === 0 ? (
                      <div className="design-ai-empty-artifacts">
                        <Package size={16} aria-hidden="true" />
                        <span>
                          {blankDesignProjectName
                            ? "Nothing has been built in this project yet. Ask Autopilot for the first artifact."
                            : "Open a project or generate an artifact to see the work Autopilot builds here."}
                        </span>
                      </div>
                    ) : (
                      activeDesignProjectArtifacts.map((file) => {
                        const isRunning = artifactBusy && file.artifactId === activeArtifact?.id;
                        return (
                          <button className="design-ai-artifact-row" type="button" key={file.id} onClick={() => openDesignGeneratedFile(file)}>
                            <span className={`design-artifact-progress ${isRunning ? "running" : "done"}`}>
                              {isRunning ? <span aria-hidden="true" /> : <Check size={12} aria-hidden="true" />}
                            </span>
                            <span>
                              <strong>{file.title}</strong>
                              <small>{file.meta} / {file.status}</small>
                            </span>
                          </button>
                        );
                      })
                    )}
                  </section>
                  <section className="design-atlas-suggestion-stack" aria-label="Autopilot design suggestions">
                    <header>
                      <span>
                        <Sparkles size={14} aria-hidden="true" />
                        Suggested moves
                      </span>
                      <button type="button" disabled={designPromptBusy} onClick={() => void generateDesignPromptSuggestions()}>
                        <RotateCw size={13} className={designPromptBusy ? "spin" : ""} aria-hidden="true" />
                        Refresh
                      </button>
                    </header>
                    {(designPromptSuggestions.length > 0
                      ? designPromptSuggestions.slice(0, 3)
                      : [
                          "Tighten the story and make the key decision obvious.",
                          "Match the artifact to the brand colors and improve hierarchy.",
                          "Generate a launch-ready version with stronger sections and next steps."
                        ]
                    ).map((suggestion) => (
                      <article className="design-atlas-suggestion-card" key={suggestion}>
                        <strong>{suggestion}</strong>
                        <div>
                          <button type="button" onClick={() => void applyDesignPromptSuggestion(suggestion)} disabled={artifactBusy} title={artifactBusy ? "Autopilot is already working on this artifact." : "Run this suggestion now."}>
                            Apply
                          </button>
                          <button type="button" onClick={() => previewDesignPromptSuggestion(suggestion)}>
                            Preview
                          </button>
                          {designPromptSuggestions.includes(suggestion) && (
                            <button type="button" onClick={() => dismissDesignPromptSuggestion(suggestion)}>
                              Dismiss
                            </button>
                          )}
                        </div>
                      </article>
                    ))}
                  </section>
                  {designRecoveryState && (
                    <section className="design-v2-panel-section design-recovery-card" aria-label="Design recovery">
                      <strong>
                        {designRecoveryState.status === "reconnect_required"
                          ? "Connect AI backend for export-ready output"
                          : designRecoveryState.source === "revision"
                            ? "Revision did not finish cleanly"
                            : "Generation needs one more try"}
                      </strong>
                      <small>{designRecoveryState.reason}</small>
                      <div className="artifact-editor-actions">
                        <button className="primary-action" type="button" onClick={() => void retryDesignRecovery()} disabled={artifactBusy}>
                          <RotateCw size={14} className={artifactBusy ? "spin" : ""} aria-hidden="true" />
                          Retry
                        </button>
                        <button className="secondary-action" type="button" onClick={clearDesignRecovery}>
                          Dismiss
                        </button>
                      </div>
                      {designRecoveryState.technicalDetails && (
                        <details className="design-v2-details compact">
                          <summary>Technical details</summary>
                          <p>{designRecoveryState.technicalDetails}</p>
                        </details>
                      )}
                    </section>
                  )}
                  <section className="design-v2-panel-section design-ai-brief">
                    <strong>{activeArtifact ? "What should change?" : "What do you want to make?"}</strong>
                    <small>
                      {activeArtifact
                        ? "Ask for a clearer deck, sharper document, revised website, or cleaner action list. The canvas stays focused on the result."
                        : "Describe the result you want. Autopilot will create the artifact here instead of showing you raw source text."}
                    </small>
                    <div className="design-ai-capabilities" aria-label="Supported design outputs">
                      <span>Docs</span>
                      <span>Decks</span>
                      <span>Websites</span>
                      <span>Action lists</span>
                    </div>
                  </section>

                  {(activeDesignDraft || activeDesignSourceContext) && (
                    <section className="design-v2-context-stack" aria-label="Source and draft context">
                      {activeDesignDraft && (
                        <details className="design-v2-details design-v2-draft-details" open={!activeArtifact}>
                          <summary>Draft</summary>
                          <strong>{activeDesignDraft.title}</strong>
                          <p>{activeDesignDraft.preview}</p>
                          <textarea value={activeDesignDraft.body} readOnly aria-label="Generated email draft" />
                          <div className="artifact-editor-actions">
                            <button className="secondary-action" type="button" onClick={() => openProductivityDraft(activeDesignDraft)}>
                              <FileText size={14} aria-hidden="true" />
                              Open draft
                            </button>
                            {activeDesignDraft.source.url && (
                              <button className="secondary-action" type="button" onClick={() => void openProductivityDraftSource(activeDesignDraft)}>
                                <Globe2 size={14} aria-hidden="true" />
                                Show full email
                              </button>
                            )}
                          </div>
                        </details>
                      )}

                      {activeDesignSourceContext && (
                        <details className="design-v2-details">
                          <summary>{activeDesignSourceContext.provider === "gmail" ? "Original email" : "Original request"}</summary>
                          <strong>{activeDesignSourceEmail?.subject ?? activeDesignSourceContext.description}</strong>
                          {activeDesignSourceEmail ? (
                            <div className="design-source-email-card">
                              <span>
                                <b>{activeDesignSourceEmail.from}</b>
                                <small>{activeDesignSourceEmail.fromEmail}</small>
                              </span>
                              <time dateTime={new Date(activeDesignSourceEmail.receivedAt).toISOString()}>{formatInboxReceivedAt(activeDesignSourceEmail.receivedAt)}</time>
                              <p>{activeDesignSourceEmail.snippet}</p>
                            </div>
                          ) : (
                            <p>{activeDesignSourceContext.description}</p>
                          )}
                          {activeDesignSourceContext.requirements.length > 0 && (
                            <ul>
                              {activeDesignSourceContext.requirements.slice(0, 4).map((requirement, index) => (
                                <li key={`${requirement}-${index}`}>{requirement}</li>
                              ))}
                            </ul>
                          )}
                          {activeDesignSourceContext.url && (
                            <button type="button" onClick={() => void openActiveDesignSource()}>
                              <Globe2 size={13} aria-hidden="true" />
                              Open source
                            </button>
                          )}
                        </details>
                      )}
                    </section>
                  )}

                  {activeGeneratedArtifactReview && (
                    <details className={`design-v2-details ${activeArtifactQualityGateBlocked ? "quality-blocking" : ""}`}>
                      <summary>
                        Quality {activeGeneratedArtifactReview.qualityReport.score}/100
                        {activeArtifactQualityGateBlocked ? " - export blocked" : ""}
                      </summary>
                      <div className="design-v2-quality-header">
                        <span>
                          <strong>{activeGeneratedArtifactReview.qualityReport.score}/100</strong>
                          <small>Quality score</small>
                        </span>
                        <em data-passed={activeGeneratedArtifactReview.qualityReport.passed}>
                          {activeGeneratedArtifactReview.qualityReport.passed ? "Passed" : activeArtifactQualityGateBlocked ? "Export blocked" : "Needs review"}
                        </em>
                      </div>
                      <div className="design-quality-bar" data-passed={activeGeneratedArtifactReview.qualityReport.passed}>
                        <span style={{ width: `${activeGeneratedArtifactReview.qualityReport.score}%` }} />
                      </div>
                      <small className="design-quality-summary">
                        {activeGeneratedArtifactReview.qualityReport.summary} Copy ratio {Math.round(activeGeneratedArtifactReview.qualityReport.sourceCopyRatio * 100)}%.{" "}
                        {activeArtifact ? `Version attempts: ${activeArtifact.versions.length}.` : ""}
                      </small>
                      <div className="design-quality-checks compact">
                        {(activeGeneratedArtifactReview.qualityReport.failedChecks.length > 0
                          ? activeGeneratedArtifactReview.qualityReport.failedChecks
                          : activeGeneratedArtifactReview.qualityReport.passedChecks.slice(0, 4)
                        ).map((check) => (
                          <span key={check.id} data-passed={check.passed}>
                            {check.passed ? "Pass" : "Review"}: {check.label}
                          </span>
                        ))}
                      </div>
                      {activeArtifactQualityGateBlocked && (
                        <div className="design-quality-gate-actions">
                          <button className="secondary-action" type="button" onClick={() => void reviseActiveArtifactWithAi()} disabled={artifactBusy || artifactPrompt.trim().length === 0}>
                            <Sparkles size={14} aria-hidden="true" />
                            Revise with AI
                          </button>
                          <button className="secondary-action danger" type="button" onClick={approveActiveArtifactQualityAnyway}>
                            Approve anyway
                          </button>
                        </div>
                      )}
                    </details>
                  )}

                  <details className="design-v2-details">
                    <summary>More tools</summary>
                    <div className="design-prompt-suggestions compact">
                      <button type="button" disabled={designPromptBusy} title={designPromptBusy ? "Autopilot is already generating prompt ideas." : "Ask Autopilot for fresh prompt ideas."} onClick={() => void generateDesignPromptSuggestions()}>
                        <RotateCw size={13} className={designPromptBusy ? "spin" : ""} aria-hidden="true" />
                        Refresh ideas
                      </button>
                      {designPromptSuggestions.slice(0, 3).map((suggestion) => (
                        <button type="button" key={suggestion} onClick={() => setArtifactPrompt(suggestion)}>
                          {suggestion}
                        </button>
                      ))}
                      {designPromptSuggestions.length === 0 && <span>{designPromptBusy ? "Asking the model for ideas..." : designPromptStatus || "Prompt ideas are optional."}</span>}
                    </div>
                    <textarea
                      value={artifactEditorDraft}
                      disabled={!activeArtifact || !activeArtifactVersion}
                      title={activeArtifact && activeArtifactVersion ? "Edit the current artifact content before saving a version." : "Create or select an artifact before editing content."}
                      onChange={(event) => setArtifactEditorDraft(event.target.value)}
                      aria-label="Edit artifact content"
                    />
                    <div className="artifact-editor-actions">
                      <button
                        className="secondary-action"
                        type="button"
                        disabled={!activeArtifact || !activeArtifactVersion || artifactBusy}
                        title={activeArtifact && activeArtifactVersion ? "Save the manual edits as a new version." : "Create or select an artifact before saving a version."}
                        onClick={() => void reviseActiveArtifact()}
                      >
                        <Save size={14} aria-hidden="true" />
                        Save version
                      </button>
                      <button
                        className="primary-action"
                        type="button"
                        disabled={!activeArtifact || !activeArtifactVersion || artifactBusy || artifactPrompt.trim().length === 0}
                        title={activeArtifact && activeArtifactVersion ? "Apply the assistant prompt to revise the artifact." : "Create or select an artifact before applying AI."}
                        onClick={() => void reviseActiveArtifactWithAi()}
                      >
                        <Sparkles size={14} aria-hidden="true" />
                        Apply AI
                      </button>
                    </div>
                    <div className="design-action-grid">
                      <button type="button" disabled={!activeArtifact || artifactBusy} title={activeArtifact ? "Export the selected artifact." : "Create or select an artifact before exporting."} onClick={() => void exportActiveArtifact()}>
                        <Download size={15} aria-hidden="true" />
                        Export
                      </button>
                      <button
                        type="button"
                        disabled={!activeArtifact || activeArtifact.kind !== "website_design" || artifactBusy}
                        title={activeArtifact?.kind === "website_design" ? "Send this website design to Coding." : "Send to Coding is available for website designs only."}
                        onClick={() => void exportActiveArtifactToCoding()}
                      >
                        <Code2 size={15} aria-hidden="true" />
                        To Coding
                      </button>
                    </div>
                  </details>
                  <div className="design-atlas-quick-actions" aria-label="Quick design actions">
                    <button type="button" onClick={() => previewDesignPromptSuggestion("Tighten the copy, remove filler, and make the recommendation more specific.")}>
                      Tighten copy
                    </button>
                    <button type="button" onClick={() => previewDesignPromptSuggestion("Match the current brand palette and make the result feel more polished.")}>
                      Match brand
                    </button>
                    <button type="button" onClick={() => previewDesignPromptSuggestion("Add a practical roadmap with owners, dates, and next steps.")}>
                      Add roadmap
                    </button>
                    <button type="button" onClick={() => previewDesignPromptSuggestion("Turn this document into a concise slide deck with strong claim titles.")}>
                      Generate slides
                    </button>
                  </div>
                  <form className="design-v2-ai-form" onSubmit={(event) => void submitDesignAssistantPrompt(event)}>
                    <div className="design-ai-context-strip" aria-label="Current design context">
                      <span>{activeArtifact ? getArtifactKindLabel(activeArtifact.kind) : "New artifact"}</span>
                      <span>{designCanvasEditMode ? "Click-to-edit on" : designPreviewMode ? "Preview" : "Edit"}</span>
                      <span>{activeGeneratedArtifactReview ? `Quality ${activeGeneratedArtifactReview.qualityReport.score}` : "Quality pending"}</span>
                    </div>
                    <textarea
                      value={artifactPrompt}
                      onChange={(event) => setArtifactPrompt(event.target.value)}
                      placeholder={activeArtifact ? "Ask Autopilot to revise, restyle, or expand this artifact..." : "Ask Autopilot to draft a website, deck, document, or email response..."}
                      aria-label="Ask Autopilot to design"
                    />
                    <button
                      className="primary-action"
                      type="submit"
                      disabled={artifactBusy || artifactPrompt.trim().length === 0}
                      title={artifactPrompt.trim().length === 0 ? "Type a design request before sending." : "Send this request to Autopilot."}
                    >
                      <ArrowRight size={16} aria-hidden="true" />
                    </button>
                  </form>
                </aside>
              )}
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

              <section className="backend-status-panel" aria-label="Backend and account readiness">
                <div>
                  <p className="panel-kicker">Account and backend</p>
                  <h2>Launch readiness</h2>
                  <p>Supabase handles accounts, and the AI proxy keeps private model keys out of the desktop app.</p>
                </div>
                <div className="backend-status-grid">
                  <span>
                    <strong>Supabase</strong>
                    <small>{accountStatus?.backend.supabaseProjectRef ?? "ctvxwmmclsfxortzmkeq"}</small>
                    <em>{accountStatus?.configured ? "Ready" : "Needs anon key"}</em>
                  </span>
                  <span>
                    <strong>Account</strong>
                    <small>{accountStatus?.userEmail ?? "No signed-in user"}</small>
                    <em>{accountStatus?.signedIn ? "Signed in" : "Signed out"}</em>
                  </span>
                  <span>
                    <strong>AI backend</strong>
                    <small>{accountStatus?.backend.aiProxyUrl ?? "Netlify Edge proxy"}</small>
                    <em>
                      {accountStatus?.backend.aiProxyReady
                        ? `Proxy ready (${accountStatus.backend.model})`
                        : accountStatus?.backend.aiProxyHealth === "unreachable"
                          ? "Proxy unreachable"
                          : accountStatus?.backend.aiProxyUrl
                            ? "Sign in needed"
                            : "Configure proxy URL"}
                    </em>
                  </span>
                  <span>
                    <strong>Local key</strong>
                    <small>Renderer never receives private keys</small>
                    <em>{accountStatus?.backend.localDevelopmentMode ? "Dev fallback" : accountStatus?.backend.hasOpenAiKeyInProcess ? "Dev key detected" : "No local key"}</em>
                  </span>
                </div>
                {accountStatus?.reason && <p className="backend-status-note">{accountStatus.reason}</p>}
                <div className="backend-account-form" aria-label="Autopilot account sign in">
                  <label>
                    <span>Email</span>
                    <input
                      type="email"
                      autoComplete="email"
                      value={accountEmailInput}
                      onChange={(event) => setAccountEmailInput(event.target.value)}
                      placeholder="you@example.com"
                    />
                  </label>
                  <label>
                    <span>Password</span>
                    <input
                      type="password"
                      autoComplete="current-password"
                      value={accountPasswordInput}
                      onChange={(event) => setAccountPasswordInput(event.target.value)}
                      placeholder="Password for Autopilot account"
                    />
                  </label>
                </div>
                <div className="backend-status-actions">
                  <button type="button" onClick={() => void handleAccountSignIn("sign-in")}>
                    Sign in
                  </button>
                  <button type="button" onClick={() => void handleAccountSignIn("sign-up")}>
                    Create account
                  </button>
                  <button type="button" onClick={() => void handleAccountSignIn("magic-link")}>
                    Email magic link
                  </button>
                  <button type="button" disabled={!accountStatus?.signedIn} onClick={() => void handleAccountSignOut()}>
                    Sign out
                  </button>
                  <button type="button" onClick={refreshAccountStatus}>
                    Refresh backend status
                  </button>
                </div>
                {accountActionStatus && <p className="backend-status-note" role="status">{accountActionStatus}</p>}
              </section>

              <section className="backend-status-panel" aria-label="Account linking browser preference">
                <div>
                  <p className="panel-kicker">Account linking</p>
                  <h2>Where authorization opens</h2>
                  <p>
                    Google, Stripe, and future connector sign-ins open in Autopilot Browser by default so saved-password prompts and source capture stay inside the app.
                  </p>
                </div>
                <div className="email-organization-settings-grid">
                  <button
                    className={accountLinkOpenMode === "autopilot" ? "active" : ""}
                    type="button"
                    aria-pressed={accountLinkOpenMode === "autopilot"}
                    onClick={() => setAccountLinkOpenMode("autopilot")}
                  >
                    <strong>Autopilot Browser</strong>
                    <span>Default. Opens authorization as an Autopilot tab and can offer to save username/password locally.</span>
                  </button>
                  <button
                    className={accountLinkOpenMode === "external" ? "active" : ""}
                    type="button"
                    aria-pressed={accountLinkOpenMode === "external"}
                    onClick={() => setAccountLinkOpenMode("external")}
                  >
                    <strong>Another browser</strong>
                    <span>Use your system browser for account linking when you prefer its existing sessions.</span>
                  </button>
                </div>
              </section>

              <section className="money-movement-settings-panel" aria-label="Payments and money movement settings">
                <div className="money-movement-panel-header">
                  <div>
                    <p className="panel-kicker">High-trust actions</p>
                    <h2>Payments & money management</h2>
                    <p>
                      Money movement is off by default. Click Enable money movement to send a payment-specific verification email. Once you confirm the
                      code, money management turns on and provider setup unlocks.
                    </p>
                  </div>
                  <span className={`money-movement-state-pill ${moneyMovementSettings?.emailVerifiedForPayments ? "ready" : moneyMovementVerificationPending ? "pending" : ""}`}>
                    {moneyMovementSettings?.emailVerifiedForPayments ? "Verified" : moneyMovementVerificationPending ? "Check email" : "Off by default"}
                  </span>
                </div>
                <div className="money-management-card-grid" aria-label="Money management setup steps">
                  {moneyMovementSetupCards.map(({ id, title, description, meta, status, Icon }) => (
                    <article className={`money-management-card ${status}`} key={id}>
                      <div className="money-management-card-top">
                        <span className="money-management-card-icon">
                          <Icon size={18} aria-hidden="true" />
                        </span>
                        <span className="money-management-card-status">{meta}</span>
                      </div>
                      <strong>{title}</strong>
                      <p>{description}</p>
                    </article>
                  ))}
                </div>
                <div className="backend-status-grid money-management-summary-grid">
                  <span>
                    <strong>Status</strong>
                    <small>{moneyMovementSettings?.status ?? "Checking"}</small>
                    <em>{moneyMovementSettings?.moneyMovementEnabled ? "Enabled" : moneyMovementVerificationPending ? "Pending code" : "Disabled"}</em>
                  </span>
                  <span>
                    <strong>Verified email</strong>
                    <small>{moneyMovementSettings?.verifiedEmail ?? moneyMovementSettings?.accountEmail ?? "No signed-in account"}</small>
                    <em>{moneyMovementSettings?.emailVerifiedForPayments ? "Verified" : "Verification required"}</em>
                  </span>
                  <span>
                    <strong>Provider</strong>
                    <small>{moneyMovementSettings?.stripeConnection.connectedAccountId ?? "No connected Stripe account"}</small>
                    <em>
                      {moneyMovementSettings?.stripeConnection.status === "connected"
                        ? moneyMovementSettings.stripeConnection.chargesEnabled
                          ? "Stripe connected"
                          : "Connected, charges not enabled"
                        : "Connect Stripe required"}
                    </em>
                  </span>
                  <span>
                    <strong>Receipts</strong>
                    <small>{moneyMovementSettings?.receiptsCount ?? 0} saved locally</small>
                    <em>Audit retained</em>
                  </span>
                </div>
                <div className="payment-provider-readiness-grid" aria-label="Payment provider readiness">
                  {(moneyMovementSettings?.providerReadiness ?? []).map((provider) => (
                    <article className="payment-provider-readiness-card" key={provider.providerKind}>
                      <div>
                        <strong>{provider.label}</strong>
                        <span>{provider.readinessPercent}% ready</span>
                      </div>
                      <progress max={100} value={provider.readinessPercent} aria-label={`${provider.label} readiness`} />
                      <p>{provider.currentStep}</p>
                      <small>
                        {provider.liveAvailable ? "Ready for live payments" : provider.nextAction}
                        {provider.technicalDetails ? ` · Details available` : ""}
                      </small>
                    </article>
                  ))}
                </div>
                <div className="payment-method-strip" aria-label="Supported payment methods">
                  {moneyMovementPaymentMethods.map((method) => (
                    <article className="payment-method-card" data-method={method.kind} key={method.kind}>
                      <div className="payment-method-mark" aria-hidden="true">
                        {method.kind === "bank_account" ? "Bank" : method.kind === "cash_app_pay" ? "$" : method.kind === "klarna" ? "K" : method.kind === "wallet" ? "Pay" : "Card"}
                      </div>
                      <span>
                        <strong>{method.label}</strong>
                        <small>{method.detail}</small>
                      </span>
                      <em>{method.providerHosted ? "Provider-hosted" : method.currentStep}</em>
                      <b>{method.readinessPercent}%</b>
                    </article>
                  ))}
                </div>
                <div className="money-management-action-board" aria-label="Money management actions">
                  <article className="money-management-action-card primary">
                    <div>
                      <span className="panel-kicker">Step 1</span>
                      <h3>Verify this account by email</h3>
                      <p>
                        This proves the signed-in account owns the email before any payment provider can be connected. The app first tries the payment
                        verification email service and sends a 6-digit key that expires after 15 minutes.
                      </p>
                    </div>
                    <dl>
                      <div>
                        <dt>Method</dt>
                        <dd>{moneyMovementVerificationMethodLabel}</dd>
                      </div>
                      <div>
                        <dt>Email sender</dt>
                        <dd>{moneyMovementEmailTransportLabel}</dd>
                      </div>
                      <div>
                        <dt>Last sent</dt>
                        <dd>{moneyMovementLastSentLabel}</dd>
                      </div>
                    </dl>
                    <button
                      type="button"
                      disabled={moneyMovementBusy || !accountStatus?.signedIn || moneyMovementSettings?.emailVerifiedForPayments}
                      title={!accountStatus?.signedIn ? "Sign into Autopilot before enabling money movement." : undefined}
                      onClick={() => void handleStartMoneyVerification()}
                    >
                      {moneyMovementEnableLabel}
                    </button>
                  </article>

                  <article className="money-management-action-card">
                    <div>
                      <span className="panel-kicker">Step 2</span>
                      <h3>Enter the 6-digit key</h3>
                      <p>
                        Type the six numbers from the payment verification email. Payment methods stay locked until this key matches the latest challenge.
                      </p>
                    </div>
                    <label className="money-management-code-field">
                      <span>Payment verification key</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        aria-label="Six digit payment verification key"
                        maxLength={6}
                        pattern="[0-9]{6}"
                        value={moneyMovementCodeDigits}
                        onChange={(event) => setMoneyMovementCodeInput(event.target.value.replace(/\D/gu, "").slice(0, 6))}
                        placeholder="000000"
                      />
                      <div className="money-management-code-key" aria-hidden="true">
                        {[0, 1, 2, 3, 4, 5].map((index) => (
                          <i className={moneyMovementCodeDigits[index] ? "filled" : ""} key={`money-key-${index}`}>
                            {moneyMovementCodeDigits[index] ?? ""}
                          </i>
                        ))}
                      </div>
                    </label>
                    <button type="button" disabled={moneyMovementConfirmDisabled} onClick={() => void handleConfirmMoneyVerification()}>
                      Confirm 6-digit key
                    </button>
                  </article>

                  <article className="money-management-action-card">
                    <div>
                      <span className="panel-kicker">Step 3</span>
                      <h3>Connect your own Stripe</h3>
                      <p>
                        Autopilot never pays from the app owner. It opens Stripe Connect for the signed-in user and locks every payment proposal to that
                        user-owned connected account.
                      </p>
                    </div>
                    <div className="money-management-provider-actions">
                      <button
                        type="button"
                        disabled={moneyMovementBusy || !moneyMovementSettings?.moneyMovementEnabled || !moneyMovementSettings.emailVerifiedForPayments}
                        onClick={() => void handleStartStripeConnect()}
                      >
                        Connect my Stripe
                      </button>
                      <button type="button" disabled={moneyMovementBusy || !moneyMovementSettings?.enabled} onClick={() => void handleRefreshStripeConnection()}>
                        Refresh Stripe
                      </button>
                      <button
                        type="button"
                        disabled={moneyMovementBusy || moneyMovementSettings?.stripeConnection.status !== "connected"}
                        onClick={() => void handleDisconnectStripeAccount()}
                      >
                        Disconnect Stripe
                      </button>
                    </div>
                  </article>

                  <article className="money-management-action-card muted">
                    <div>
                      <span className="panel-kicker">Safety</span>
                      <h3>Turn it off anytime</h3>
                      <p>
                        Disabling money movement blocks new payment execution immediately. Receipts and audit history stay local so you can prove what
                        happened.
                      </p>
                    </div>
                    <button type="button" disabled={moneyMovementBusy || !moneyMovementSettings?.enabled} onClick={() => void handleDisableMoneyMovement()}>
                      Disable money movement
                    </button>
                  </article>
                </div>
                <p className="backend-status-note money-management-status-note" role="status">
                  {moneyMovementStatus ||
                    moneyMovementSettings?.nextStep ||
                    moneyMovementSettings?.disabledReason ||
                    "Payment buttons stay disabled until verification is complete. Shadow Mode can only prepare proposals."}
                </p>
              </section>

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

              <section className="email-organization-settings-panel" aria-label="Email organization settings">
                <div>
                  <p className="panel-kicker">Productivity controls</p>
                  <h2>Gmail organization</h2>
                  <p>
                    Autopilot can help clean Gmail with labels, archive, read state, and stars. It only changes Gmail after an explicit command or a trusted rule you create.
                  </p>
                </div>
                <div className="email-organization-settings-grid">
                  {EMAIL_ORGANIZATION_MODE_OPTIONS.map((option) => (
                    <button
                      key={`settings:${option.id}`}
                      type="button"
                      className={emailOrganizationMode === option.id ? "active" : ""}
                      aria-pressed={emailOrganizationMode === option.id}
                      onClick={() => setEmailOrganizationMode(option.id)}
                    >
                      <strong>{option.label}</strong>
                      <span>{option.description}</span>
                    </button>
                  ))}
                </div>
                <p className="backend-status-note">
                  Current mode: {EMAIL_ORGANIZATION_MODE_OPTIONS.find((option) => option.id === emailOrganizationMode)?.label ?? "Suggest only"}. Gmail send, delete, unsubscribe, submit, pay, and publish actions remain blocked without a separate final approval.
                </p>
              </section>

              <section className="calendar-layout-settings-panel" aria-label="Calendar layout settings">
                <div>
                  <p className="panel-kicker">Calendar</p>
                  <h2>Calendar layout</h2>
                  <p>
                    Choose how Productivity displays busy weeks. Hybrid Split is the default: the week stays readable and crowded slots open into a clear detail drawer instead of stacking tiny unreadable pills.
                  </p>
                </div>
                <div className="calendar-layout-choice-grid">
                  {[
                    { id: "hybrid_split", label: "Hybrid Split", description: "Readable week grid plus overlap details for crowded moments." },
                    { id: "google_lanes", label: "Google-style lanes", description: "Compact calendar lanes for users who prefer a familiar calendar look." },
                    { id: "agenda_first", label: "Agenda-first", description: "Prioritize a clear event list before the week grid." }
                  ].map((option) => (
                    <button
                      type="button"
                      key={option.id}
                      className={calendarLayoutPreference === option.id ? "active" : ""}
                      aria-pressed={calendarLayoutPreference === option.id}
                      onClick={() => setCalendarLayoutPreference(option.id as CalendarLayoutPreference)}
                    >
                      <strong>{option.label}</strong>
                      <span>{option.description}</span>
                    </button>
                  ))}
                </div>
                <p className="backend-status-note">
                  Current layout: {calendarLayoutPreference === "hybrid_split" ? "Hybrid Split" : calendarLayoutPreference === "google_lanes" ? "Google-style lanes" : "Agenda-first"}. User-created Autopilot events sync to Google Calendar when Google Calendar is connected; AI-created events still require review first.
                </p>
              </section>

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

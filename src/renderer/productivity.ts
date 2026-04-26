export type ActionItemSource = "Email" | "Calendar" | "Web" | "Notes" | "Chat" | "Manual";
export type ProductivitySourceId = "gmail" | "outlook" | "google-calendar" | "slack";

export type ActionItem = {
  id: string;
  title: string;
  source: ActionItemSource;
  context: string;
  createdAt: number;
  completedAt: number | null;
};

const ACTION_ITEMS_STORAGE_KEY = "autopilot:action-items";
const PRODUCTIVITY_SOURCES_STORAGE_KEY = "autopilot:productivity-sources";
const DEFAULT_PRODUCTIVITY_SOURCES: ProductivitySourceId[] = ["gmail", "google-calendar"];
const VALID_PRODUCTIVITY_SOURCES = new Set<ProductivitySourceId>(["gmail", "outlook", "google-calendar", "slack"]);
const ACTIONABLE_PATTERNS = [
  /\b(todo|action item|follow up|need to|needs to|please|can you|could you|remind|deadline|due|by friday|by monday)\b/i,
  /^(review|send|share|submit|finish|complete|schedule|call|reply|respond|prepare|create|update|fix|read|draft|pay|sign|upload|download)\b/i,
  /^\s*(?:[-*]|\d+[.)])\s+/,
  /^\s*\[\s?\]\s+/
];

const DEFAULT_ACTION_ITEMS: ActionItem[] = [];

function isActionItem(value: unknown): value is ActionItem {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const item = value as Partial<ActionItem>;
  return (
    typeof item.id === "string" &&
    typeof item.title === "string" &&
    ["Email", "Calendar", "Web", "Notes", "Chat", "Manual"].includes(item.source ?? "") &&
    typeof item.context === "string" &&
    typeof item.createdAt === "number" &&
    (typeof item.completedAt === "number" || item.completedAt === null)
  );
}

function cleanActionTitle(value: string): string {
  return value
    .replace(/^\s*(?:[-*]|\d+[.)]|\[\s?\])\s*/, "")
    .replace(/^(?:todo|action item)\s*[:.-]\s*/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function isInternalAutopilotActionItem(item: ActionItem): boolean {
  const searchable = `${item.title} ${item.context}`.toLowerCase();
  return (
    item.id === "welcome-email-follow-up" ||
    item.id === "collect-open-tab-tasks" ||
    searchable.includes("autopilot://") ||
    searchable.includes("autopilot home") ||
    searchable.includes("autopilot history") ||
    searchable.includes("autopilot settings") ||
    searchable.includes("turn useful browser tabs into next actions") ||
    searchable.includes("follow up on unread email requests")
  );
}

export function sanitizeActionItems(items: ActionItem[]): ActionItem[] {
  return items.filter((item) => !isInternalAutopilotActionItem(item));
}

export function createActionItem(title: string, source: ActionItemSource, context = ""): ActionItem {
  return {
    id: crypto.randomUUID(),
    title: cleanActionTitle(title) || "Untitled action",
    source,
    context: context.trim().slice(0, 80),
    createdAt: Date.now(),
    completedAt: null
  };
}

export function extractActionItemTitles(text: string): string[] {
  const chunks = text
    .split(/\n|(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map(cleanActionTitle)
    .filter(Boolean);
  const actionable = chunks.filter((chunk) => ACTIONABLE_PATTERNS.some((pattern) => pattern.test(chunk)));

  return [...new Set(actionable)].slice(0, 8);
}

export function loadActionItems(): ActionItem[] {
  try {
    const stored = window.localStorage.getItem(ACTION_ITEMS_STORAGE_KEY);
    if (!stored) {
      return DEFAULT_ACTION_ITEMS;
    }

    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return DEFAULT_ACTION_ITEMS;
    }

    return sanitizeActionItems(parsed.filter(isActionItem));
  } catch {
    return DEFAULT_ACTION_ITEMS;
  }
}

export function saveActionItems(items: ActionItem[]): void {
  try {
    window.localStorage.setItem(ACTION_ITEMS_STORAGE_KEY, JSON.stringify(sanitizeActionItems(items)));
  } catch {
    // Local persistence is best-effort; the workspace should keep working in memory.
  }
}

export function loadProductivitySources(): ProductivitySourceId[] {
  try {
    const stored = window.localStorage.getItem(PRODUCTIVITY_SOURCES_STORAGE_KEY);
    if (!stored) {
      return DEFAULT_PRODUCTIVITY_SOURCES;
    }

    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return DEFAULT_PRODUCTIVITY_SOURCES;
    }

    return sanitizeProductivitySources(parsed);
  } catch {
    return DEFAULT_PRODUCTIVITY_SOURCES;
  }
}

export function sanitizeProductivitySources(sources: unknown[]): ProductivitySourceId[] {
  const selectedSources = sources.filter(
    (source): source is ProductivitySourceId => typeof source === "string" && VALID_PRODUCTIVITY_SOURCES.has(source as ProductivitySourceId)
  );
  const uniqueSources = [...new Set(selectedSources)];
  return uniqueSources.length > 0 ? uniqueSources : DEFAULT_PRODUCTIVITY_SOURCES;
}

export function saveProductivitySources(sources: ProductivitySourceId[]): void {
  try {
    window.localStorage.setItem(PRODUCTIVITY_SOURCES_STORAGE_KEY, JSON.stringify(sanitizeProductivitySources(sources)));
  } catch {
    // Source selection is best-effort local UI state.
  }
}

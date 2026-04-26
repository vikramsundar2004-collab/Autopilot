export type ActionItemSource = "Email" | "Web" | "Notes" | "Chat" | "Manual";

export type ActionItem = {
  id: string;
  title: string;
  source: ActionItemSource;
  context: string;
  createdAt: number;
  completedAt: number | null;
};

const ACTION_ITEMS_STORAGE_KEY = "autopilot:action-items";
const ACTIONABLE_PATTERNS = [
  /\b(todo|action item|follow up|need to|needs to|please|can you|could you|remind|deadline|due|by friday|by monday)\b/i,
  /^\s*(?:[-*]|\d+[.)])\s+/,
  /^\s*\[\s?\]\s+/
];

const DEFAULT_ACTION_ITEMS: ActionItem[] = [
  {
    id: "welcome-email-follow-up",
    title: "Follow up on unread email requests",
    source: "Email",
    context: "Inbox",
    createdAt: Date.now() - 1000 * 60 * 60,
    completedAt: null
  },
  {
    id: "collect-open-tab-tasks",
    title: "Turn useful browser tabs into next actions",
    source: "Web",
    context: "Browser workspace",
    createdAt: Date.now() - 1000 * 60 * 25,
    completedAt: null
  }
];

function isActionItem(value: unknown): value is ActionItem {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const item = value as Partial<ActionItem>;
  return (
    typeof item.id === "string" &&
    typeof item.title === "string" &&
    ["Email", "Web", "Notes", "Chat", "Manual"].includes(item.source ?? "") &&
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
  const selected = actionable.length > 0 ? actionable : chunks.slice(0, 3);

  return [...new Set(selected)].slice(0, 8);
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

    return parsed.filter(isActionItem);
  } catch {
    return DEFAULT_ACTION_ITEMS;
  }
}

export function saveActionItems(items: ActionItem[]): void {
  try {
    window.localStorage.setItem(ACTION_ITEMS_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Local persistence is best-effort; the workspace should keep working in memory.
  }
}

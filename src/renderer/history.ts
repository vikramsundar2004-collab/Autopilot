import type { BrowserHistoryEntry } from "../shared/browserModel";

export type { BrowserHistoryEntry };

export const HISTORY_STORAGE_KEY = "autopilot.history";
export const MAX_HISTORY_ENTRIES = 120;

type HistoryStorage = Pick<Storage, "getItem" | "setItem">;

function getDefaultHistoryStorage(): HistoryStorage | null {
  return typeof localStorage === "undefined" ? null : localStorage;
}

export function isHistoryUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return (parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:") && !isAutopilotGeneratedSearchUrl(parsedUrl);
  } catch {
    return false;
  }
}

function isAutopilotGeneratedSearchUrl(parsedUrl: URL): boolean {
  const host = parsedUrl.hostname.replace(/^www\./, "");
  if (host !== "google.com" || parsedUrl.pathname !== "/search") {
    return false;
  }

  const query = parsedUrl.searchParams.get("q") ?? "";
  if (!query.startsWith("data:text/html")) {
    return false;
  }

  return safeDecode(query).includes('data-autopilot-page="history"');
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function displayHistoryHost(url: string): string {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname.replace(/^www\./, "") || parsedUrl.href;
  } catch {
    return url;
  }
}

export function cleanHistoryTitle(title: string, url: string): string {
  const trimmedTitle = title.trim();
  if (trimmedTitle && trimmedTitle !== url && !isHistoryUrl(trimmedTitle)) {
    return trimmedTitle;
  }

  return displayHistoryHost(url);
}

export function addHistoryEntry(
  currentEntries: BrowserHistoryEntry[],
  entry: BrowserHistoryEntry
): BrowserHistoryEntry[] {
  if (!isHistoryUrl(entry.url)) {
    return currentEntries;
  }

  const normalizedEntry = {
    title: cleanHistoryTitle(entry.title, entry.url),
    url: entry.url,
    visitedAt: entry.visitedAt
  };

  if (currentEntries[0]?.url === normalizedEntry.url && currentEntries[0]?.title === normalizedEntry.title) {
    return currentEntries;
  }

  return [normalizedEntry, ...currentEntries.filter((currentEntry) => currentEntry.url !== normalizedEntry.url)].slice(
    0,
    MAX_HISTORY_ENTRIES
  );
}

export function loadHistoryEntries(storage: HistoryStorage | null = getDefaultHistoryStorage()): BrowserHistoryEntry[] {
  if (!storage) {
    return [];
  }

  try {
    const serializedEntries = storage.getItem(HISTORY_STORAGE_KEY);
    const parsedEntries: unknown = serializedEntries ? JSON.parse(serializedEntries) : [];
    if (!Array.isArray(parsedEntries)) {
      return [];
    }

    const seenUrls = new Set<string>();
    const entries: BrowserHistoryEntry[] = [];
    for (const parsedEntry of parsedEntries) {
      if (!parsedEntry || typeof parsedEntry !== "object") {
        continue;
      }

      const candidate = parsedEntry as Partial<BrowserHistoryEntry>;
      if (typeof candidate.url !== "string" || !isHistoryUrl(candidate.url) || seenUrls.has(candidate.url)) {
        continue;
      }

      const visitedAt = typeof candidate.visitedAt === "number" && Number.isFinite(candidate.visitedAt) ? candidate.visitedAt : Date.now();
      entries.push({
        title: typeof candidate.title === "string" ? cleanHistoryTitle(candidate.title, candidate.url) : displayHistoryHost(candidate.url),
        url: candidate.url,
        visitedAt
      });
      seenUrls.add(candidate.url);
    }

    return entries.slice(0, MAX_HISTORY_ENTRIES);
  } catch {
    return [];
  }
}

export function saveHistoryEntries(
  entries: BrowserHistoryEntry[],
  storage: HistoryStorage | null = getDefaultHistoryStorage()
): void {
  if (!storage) {
    return;
  }

  try {
    storage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY_ENTRIES)));
  } catch {
    // localStorage can be unavailable in private or locked-down renderer contexts.
  }
}

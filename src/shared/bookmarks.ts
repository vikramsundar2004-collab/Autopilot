export type BrowserBookmark = {
  kind: "bookmark";
  title: string;
  url: string;
  source: string;
};

export type AddBookmarkInput = {
  title: string;
  url: string;
};

export type BookmarkNodeTarget = {
  kind: "bookmark" | "folder";
  source: string;
  title: string;
  url?: string;
  path: string[];
};

export type AddBookmarkFolderInput = {
  title: string;
  parent?: BookmarkNodeTarget | null;
};

export type BrowserBookmarkSourceOption = {
  id: string;
  label: string;
  profileCount: number;
};

export type BrowserBookmarkFolder = {
  kind: "folder";
  title: string;
  source: string;
  children: BrowserBookmarkNode[];
};

export type BrowserBookmarkNode = BrowserBookmark | BrowserBookmarkFolder;

type ChromiumBookmarkNode = {
  type?: string;
  name?: string;
  url?: string;
  children?: ChromiumBookmarkNode[];
};

type ChromiumBookmarkFile = {
  roots?: Record<string, ChromiumBookmarkNode>;
};

export const DEFAULT_BOOKMARKS: BrowserBookmarkNode[] = [
  {
    kind: "folder",
    title: "Starter bookmarks",
    source: "Autopilot",
    children: [
      { kind: "bookmark", title: "GitHub", url: "https://github.com/", source: "Autopilot" },
      { kind: "bookmark", title: "Figma", url: "https://figma.com/", source: "Autopilot" },
      { kind: "bookmark", title: "Gmail", url: "https://mail.google.com/", source: "Autopilot" },
      { kind: "bookmark", title: "YouTube", url: "https://youtube.com/", source: "Autopilot" },
      { kind: "bookmark", title: "Reddit", url: "https://reddit.com/", source: "Autopilot" }
    ]
  }
];

function normalizeKeyPart(value: string): string {
  return encodeURIComponent(value.trim().toLowerCase());
}

export function createBookmarkNodeKey(target: BookmarkNodeTarget): string {
  const identity = target.kind === "bookmark" ? target.url ?? "" : target.title;
  return [
    normalizeKeyPart(target.source),
    target.kind,
    ...target.path.map(normalizeKeyPart),
    normalizeKeyPart(identity)
  ].join("/");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isWebUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function cleanTitle(title: string | undefined, url: string): string {
  const trimmed = title?.trim();
  if (trimmed) {
    return trimmed.length > 44 ? `${trimmed.slice(0, 41)}...` : trimmed;
  }

  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Bookmark";
  }
}

function parseBookmarkNode(
  node: ChromiumBookmarkNode,
  source: string,
  seen: Set<string>,
  remaining: { value: number }
): BrowserBookmarkNode | null {
  if (remaining.value <= 0) {
    return null;
  }

  if (node.type === "url" && typeof node.url === "string" && isWebUrl(node.url)) {
    const key = node.url.toLowerCase();
    if (seen.has(key)) {
      return null;
    }

    seen.add(key);
    remaining.value -= 1;
    return {
      kind: "bookmark",
      title: cleanTitle(node.name, node.url),
      url: node.url,
      source
    };
  }

  if (!Array.isArray(node.children)) {
    return null;
  }

  const children = node.children
    .map((child) => parseBookmarkNode(child, source, seen, remaining))
    .filter((child): child is BrowserBookmarkNode => Boolean(child));

  if (children.length === 0) {
    return null;
  }

  return {
    kind: "folder",
    title: node.name?.trim() || "Folder",
    source,
    children
  };
}

export function countBookmarks(nodes: BrowserBookmarkNode[]): number {
  return nodes.reduce((total, node) => {
    if (node.kind === "bookmark") {
      return total + 1;
    }

    return total + countBookmarks(node.children);
  }, 0);
}

export function parseChromiumBookmarks(input: unknown, source: string, maxBookmarks = 80): BrowserBookmarkNode[] {
  if (!isRecord(input) || !isRecord(input.roots)) {
    return [];
  }

  const roots = input.roots as ChromiumBookmarkFile["roots"];
  if (!roots) {
    return [];
  }

  const seen = new Set<string>();
  const remaining = { value: maxBookmarks };
  const parsedRoots: BrowserBookmarkNode[] = [];

  for (const root of Object.values(roots)) {
    if (!root || !Array.isArray(root.children) || remaining.value <= 0) {
      continue;
    }

    const children = root.children
      .map((child) => parseBookmarkNode(child, source, seen, remaining))
      .filter((child): child is BrowserBookmarkNode => Boolean(child));

    if (children.length > 0) {
      parsedRoots.push(...children);
    }
  }

  return parsedRoots;
}

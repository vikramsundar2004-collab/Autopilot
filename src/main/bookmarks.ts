import { app } from "electron";
import fs from "node:fs/promises";
import path from "node:path";

import {
  type AddBookmarkInput,
  type AddBookmarkFolderInput,
  type BrowserBookmark,
  type BrowserBookmarkSourceOption,
  createBookmarkNodeKey,
  countBookmarks,
  DEFAULT_BOOKMARKS,
  parseChromiumBookmarks,
  type BookmarkNodeTarget,
  type BrowserBookmarkNode
} from "../shared/bookmarks.js";
import { filterProfileRootsBySource, getChromiumProfileRoots, type BrowserProfileRoot } from "../shared/bookmarkSources.js";

type BookmarkFile = {
  source: string;
  file: string;
};

const MAX_IMPORTED_BOOKMARKS = 300;
const AUTOPILOT_BOOKMARKS_FILE = "autopilot-bookmarks.json";

type StoredBookmarks = {
  bookmarks?: Array<Partial<BrowserBookmark>>;
  nodes?: Array<Partial<BrowserBookmarkNode>>;
  browserSources?: string[];
  hiddenBookmarkKeys?: string[];
};

function isWebUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function cleanBookmarkTitle(title: string, url: string): string {
  const trimmed = title.trim();
  if (trimmed && trimmed !== "New tab" && trimmed !== "Autopilot Home") {
    return trimmed.length > 44 ? `${trimmed.slice(0, 41)}...` : trimmed;
  }

  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Bookmark";
  }
}

function cleanFolderTitle(title: string): string {
  const trimmed = title.trim().replace(/\s+/g, " ");
  return (trimmed || "New folder").slice(0, 44);
}

function targetFromNode(node: BrowserBookmarkNode, pathParts: string[]): BookmarkNodeTarget {
  return {
    kind: node.kind,
    source: node.source,
    title: node.title,
    url: node.kind === "bookmark" ? node.url : undefined,
    path: pathParts
  };
}

function sanitizeStoredNode(node: Partial<BrowserBookmarkNode>): BrowserBookmarkNode | null {
  if (node.kind === "bookmark" && typeof node.url === "string" && isWebUrl(node.url)) {
    return {
      kind: "bookmark",
      title: cleanBookmarkTitle(String(node.title ?? ""), node.url),
      url: node.url,
      source: "Autopilot"
    };
  }

  if (node.kind === "folder" && Array.isArray(node.children)) {
    const children = node.children
      .map((child) => sanitizeStoredNode(child as Partial<BrowserBookmarkNode>))
      .filter((child): child is BrowserBookmarkNode => Boolean(child));

    return {
      kind: "folder",
      title: cleanFolderTitle(String(node.title ?? "")),
      source: "Autopilot",
      children
    };
  }

  return null;
}

function removeBookmarkUrl(nodes: BrowserBookmarkNode[], url: string): BrowserBookmarkNode[] {
  const key = url.toLowerCase();

  return nodes
    .map((node): BrowserBookmarkNode | null => {
      if (node.kind === "bookmark") {
        return node.url.toLowerCase() === key ? null : node;
      }

      return {
        ...node,
        children: removeBookmarkUrl(node.children, url)
      };
    })
    .filter((node): node is BrowserBookmarkNode => Boolean(node));
}

function insertFolder(nodes: BrowserBookmarkNode[], parentKey: string | null, title: string, pathParts: string[] = []): BrowserBookmarkNode[] {
  const newFolder: BrowserBookmarkNode = {
    kind: "folder",
    title,
    source: "Autopilot",
    children: []
  };

  if (!parentKey) {
    return [newFolder, ...nodes];
  }

  return nodes.map((node) => {
    if (node.kind !== "folder") {
      return node;
    }

    const nodeKey = createBookmarkNodeKey(targetFromNode(node, pathParts));
    if (nodeKey === parentKey) {
      return {
        ...node,
        children: [newFolder, ...node.children]
      };
    }

    return {
      ...node,
      children: insertFolder(node.children, parentKey, title, [...pathParts, node.title])
    };
  });
}

function removeLocalTarget(
  nodes: BrowserBookmarkNode[],
  targetKey: string,
  pathParts: string[] = []
): { nodes: BrowserBookmarkNode[]; removed: boolean } {
  let removed = false;
  const nextNodes = nodes
    .map((node): BrowserBookmarkNode | null => {
      const key = createBookmarkNodeKey(targetFromNode(node, pathParts));
      if (key === targetKey) {
        removed = true;
        return null;
      }

      if (node.kind === "bookmark") {
        return node;
      }

      const nextChildren = removeLocalTarget(node.children, targetKey, [...pathParts, node.title]);
      removed = removed || nextChildren.removed;
      return {
        ...node,
        children: nextChildren.nodes
      };
    })
    .filter((node): node is BrowserBookmarkNode => Boolean(node));

  return { nodes: nextNodes, removed };
}

function filterHiddenNodes(
  nodes: BrowserBookmarkNode[],
  hiddenKeys: Set<string>,
  pathParts: string[] = []
): BrowserBookmarkNode[] {
  return nodes
    .map((node): BrowserBookmarkNode | null => {
      const key = createBookmarkNodeKey(targetFromNode(node, pathParts));
      if (hiddenKeys.has(key)) {
        return null;
      }

      if (node.kind === "bookmark") {
        return node;
      }

      return {
        ...node,
        children: filterHiddenNodes(node.children, hiddenKeys, [...pathParts, node.title])
      };
    })
    .filter((node): node is BrowserBookmarkNode => Boolean(node));
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function findBookmarkFiles(root: BrowserProfileRoot): Promise<BookmarkFile[]> {
  const files: BookmarkFile[] = [];
  const directBookmarks = path.join(root.root, "Bookmarks");

  if (await pathExists(directBookmarks)) {
    files.push({ source: root.source, file: directBookmarks });
  }

  let entries: Array<{ isDirectory: () => boolean; name: string }>;
  try {
    entries = await fs.readdir(root.root, { withFileTypes: true });
  } catch {
    return files;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const profileBookmarks = path.join(root.root, entry.name, "Bookmarks");
    if (await pathExists(profileBookmarks)) {
      files.push({
        source: root.source,
        file: profileBookmarks
      });
    }
  }

  return files;
}

function getBrowserProfileRoots(): BrowserProfileRoot[] {
  return getChromiumProfileRoots({
    env: process.env,
    homeDir: app.getPath("home"),
    platform: process.platform
  });
}

function userBookmarkFile(): string {
  return path.join(app.getPath("userData"), AUTOPILOT_BOOKMARKS_FILE);
}

async function readStoredBookmarks(): Promise<StoredBookmarks> {
  try {
    return JSON.parse(await fs.readFile(userBookmarkFile(), "utf8")) as StoredBookmarks;
  } catch {
    return {};
  }
}

async function writeStoredBookmarks(storedBookmarks: StoredBookmarks): Promise<void> {
  const file = userBookmarkFile();
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(storedBookmarks, null, 2), "utf8");
}

async function readAutopilotBookmarks(): Promise<BrowserBookmarkNode[]> {
  const parsed = await readStoredBookmarks();
  if (Array.isArray(parsed.nodes)) {
    return parsed.nodes
      .map((node) => sanitizeStoredNode(node as Partial<BrowserBookmarkNode>))
      .filter((node): node is BrowserBookmarkNode => Boolean(node));
  }

  const seen = new Set<string>();
  return (parsed.bookmarks ?? [])
    .filter((bookmark): bookmark is BrowserBookmark => {
      if (bookmark.kind !== "bookmark" || typeof bookmark.url !== "string" || !isWebUrl(bookmark.url)) {
        return false;
      }

      const key = bookmark.url.toLowerCase();
      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .map((bookmark) => ({
      kind: "bookmark" as const,
      title: cleanBookmarkTitle(String(bookmark.title ?? ""), bookmark.url),
      url: bookmark.url,
      source: "Autopilot"
    }));
}

async function writeAutopilotBookmarkNodes(nodes: BrowserBookmarkNode[]): Promise<void> {
  const storedBookmarks = await readStoredBookmarks();
  await writeStoredBookmarks({ ...storedBookmarks, bookmarks: undefined, nodes });
}

async function readHiddenBookmarkKeys(): Promise<Set<string>> {
  const storedBookmarks = await readStoredBookmarks();
  return new Set(
    Array.isArray(storedBookmarks.hiddenBookmarkKeys)
      ? storedBookmarks.hiddenBookmarkKeys.filter((key): key is string => typeof key === "string")
      : []
  );
}

async function writeHiddenBookmarkKeys(hiddenKeys: Set<string>): Promise<void> {
  const storedBookmarks = await readStoredBookmarks();
  await writeStoredBookmarks({
    ...storedBookmarks,
    hiddenBookmarkKeys: [...hiddenKeys].sort((left, right) => left.localeCompare(right))
  });
}

async function readBrowserBookmarks(selectedSources: string[]): Promise<BrowserBookmarkNode[]> {
  const selectedRoots = filterProfileRootsBySource(getBrowserProfileRoots(), selectedSources);
  const candidateFiles = (
    await Promise.all(selectedRoots.map((root) => findBookmarkFiles(root)))
  ).flat();
  const seenFiles = new Set<string>();
  const imported: BrowserBookmarkNode[] = [];
  let importedCount = 0;

  for (const candidate of candidateFiles) {
    const normalizedFile = candidate.file.toLowerCase();
    if (seenFiles.has(normalizedFile)) {
      continue;
    }
    seenFiles.add(normalizedFile);

    try {
      const raw = await fs.readFile(candidate.file, "utf8");
      const parsed = JSON.parse(raw) as unknown;
      const remaining = MAX_IMPORTED_BOOKMARKS - importedCount;
      if (remaining <= 0) {
        break;
      }

      const parsedBookmarks = parseChromiumBookmarks(parsed, candidate.source, remaining);
      const parsedCount = countBookmarks(parsedBookmarks);
      if (parsedCount > 0) {
        imported.push(...parsedBookmarks);
        importedCount += parsedCount;
      }
    } catch {
      // A locked or malformed browser profile should not block the browser UI.
    }
  }

  return imported;
}

export async function readImportedBookmarks(): Promise<BrowserBookmarkNode[]> {
  const selectedSources = await readSelectedBookmarkSources();
  const [autopilotBookmarks, browserBookmarks, hiddenBookmarkKeys] = await Promise.all([
    readAutopilotBookmarks(),
    readBrowserBookmarks(selectedSources),
    readHiddenBookmarkKeys()
  ]);
  const bookmarks = filterHiddenNodes([...autopilotBookmarks, ...browserBookmarks], hiddenBookmarkKeys);
  if (countBookmarks(bookmarks) > 0 || bookmarks.some((node) => node.kind === "folder")) {
    return bookmarks;
  }

  return filterHiddenNodes(DEFAULT_BOOKMARKS, hiddenBookmarkKeys);
}

export async function listAvailableBookmarkSources(): Promise<BrowserBookmarkSourceOption[]> {
  const candidateFiles = (
    await Promise.all(getBrowserProfileRoots().map((root) => findBookmarkFiles(root)))
  ).flat();
  const sources = new Map<string, number>();

  for (const candidate of candidateFiles) {
    sources.set(candidate.source, (sources.get(candidate.source) ?? 0) + 1);
  }

  return [...sources.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([source, profileCount]) => ({
      id: source,
      label: source,
      profileCount
    }));
}

export async function readSelectedBookmarkSources(): Promise<string[]> {
  const storedBookmarks = await readStoredBookmarks();
  return Array.isArray(storedBookmarks.browserSources)
    ? storedBookmarks.browserSources.filter((source): source is string => typeof source === "string" && source.trim().length > 0)
    : [];
}

export async function updateSelectedBookmarkSources(selectedSources: string[]): Promise<BrowserBookmarkNode[]> {
  const availableSources = new Set((await listAvailableBookmarkSources()).map((source) => source.id));
  const cleanedSources = [...new Set(selectedSources)]
    .filter((source) => typeof source === "string" && availableSources.has(source))
    .sort((left, right) => left.localeCompare(right));
  const storedBookmarks = await readStoredBookmarks();

  await writeStoredBookmarks({ ...storedBookmarks, browserSources: cleanedSources });
  return readImportedBookmarks();
}

export async function addAutopilotBookmark(input: AddBookmarkInput): Promise<BrowserBookmarkNode[]> {
  const url = input.url.trim();
  if (!isWebUrl(url)) {
    return readImportedBookmarks();
  }

  const existingBookmarks = removeBookmarkUrl(await readAutopilotBookmarks(), url);
  const nextBookmark: BrowserBookmark = {
    kind: "bookmark",
    title: cleanBookmarkTitle(input.title, url),
    url,
    source: "Autopilot"
  };
  const bookmarks = [nextBookmark, ...existingBookmarks].slice(0, 80);

  await writeAutopilotBookmarkNodes(bookmarks);
  return readImportedBookmarks();
}

export async function addAutopilotBookmarkFolder(input: AddBookmarkFolderInput): Promise<BrowserBookmarkNode[]> {
  const title = cleanFolderTitle(input.title);
  const parentKey =
    input.parent?.kind === "folder" && input.parent.source === "Autopilot"
      ? createBookmarkNodeKey(input.parent)
      : null;
  const bookmarks = insertFolder(await readAutopilotBookmarks(), parentKey, title).slice(0, 80);

  await writeAutopilotBookmarkNodes(bookmarks);
  return readImportedBookmarks();
}

export async function deleteBookmarkTarget(target: BookmarkNodeTarget): Promise<BrowserBookmarkNode[]> {
  const targetKey = createBookmarkNodeKey(target);
  if (target.source === "Autopilot") {
    const result = removeLocalTarget(await readAutopilotBookmarks(), targetKey);
    if (result.removed) {
      await writeAutopilotBookmarkNodes(result.nodes);
      return readImportedBookmarks();
    }
  }

  const hiddenKeys = await readHiddenBookmarkKeys();
  hiddenKeys.add(targetKey);
  await writeHiddenBookmarkKeys(hiddenKeys);
  return readImportedBookmarks();
}

import {
  closeTab,
  createHomeUrl,
  createTab,
  normalizeAddressInput,
  readableTitle,
  updateTab,
  type BrowserSnapshot
} from "../shared/browserModel";
import {
  DEFAULT_BOOKMARKS,
  createBookmarkNodeKey,
  type AddBookmarkFolderInput,
  type AddBookmarkInput,
  type BookmarkNodeTarget,
  type BrowserBookmarkNode,
  type BrowserBookmarkSourceOption
} from "../shared/bookmarks";
import type {
  PasswordAvailability,
  PasswordCredentialSummary,
  PasswordRevealResult,
  PasswordSaveResult,
  PendingPasswordSave
} from "../shared/passwords";
import type { PageTextCaptureResult } from "../shared/productivity";

type ViewBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type TabsApi = {
  getSnapshot: () => Promise<BrowserSnapshot>;
  create: () => Promise<BrowserSnapshot>;
  close: (tabId: string) => Promise<BrowserSnapshot>;
  activate: (tabId: string) => Promise<BrowserSnapshot>;
  navigate: (tabId: string, input: string) => Promise<BrowserSnapshot>;
  home: (tabId: string) => Promise<BrowserSnapshot>;
  back: (tabId: string) => Promise<BrowserSnapshot>;
  forward: (tabId: string) => Promise<BrowserSnapshot>;
  reload: (tabId: string) => Promise<BrowserSnapshot>;
  readPageText: (tabId: string) => Promise<PageTextCaptureResult>;
  print: (tabId: string) => Promise<{ success: boolean; reason?: string }>;
  setWebArea: (bounds: ViewBounds, visible: boolean) => Promise<BrowserSnapshot>;
  subscribe: (listener: (snapshot: BrowserSnapshot) => void) => () => void;
};

type BookmarksApi = {
  list: () => Promise<BrowserBookmarkNode[]>;
  add: (input: AddBookmarkInput) => Promise<BrowserBookmarkNode[]>;
  addFolder: (input: AddBookmarkFolderInput) => Promise<BrowserBookmarkNode[]>;
  delete: (target: BookmarkNodeTarget) => Promise<BrowserBookmarkNode[]>;
  sources: () => Promise<BrowserBookmarkSourceOption[]>;
  selectedSources: () => Promise<string[]>;
  setSources: (sources: string[]) => Promise<BrowserBookmarkNode[]>;
};

type PasswordsApi = {
  availability: () => Promise<PasswordAvailability>;
  list: () => Promise<PasswordCredentialSummary[]>;
  savePending: (pendingId: string) => Promise<PasswordSaveResult>;
  dismissPending: (pendingId: string) => Promise<void>;
  reveal: (id: string) => Promise<PasswordRevealResult>;
  remove: (id: string) => Promise<PasswordCredentialSummary[]>;
  subscribeChanges: (listener: (entries: PasswordCredentialSummary[]) => void) => () => void;
  subscribeSavePrompts: (listener: (pending: PendingPasswordSave) => void) => () => void;
};

export type AutopilotApi = {
  runtime: "electron" | "browser-preview";
  platform: string;
  versions: {
    chrome: string;
    electron: string;
  };
  tabs: TabsApi;
  bookmarks: BookmarksApi;
  passwords: PasswordsApi;
};

let previewApi: AutopilotApi | null = null;

function cloneSnapshot(snapshot: BrowserSnapshot): BrowserSnapshot {
  return {
    activeTabId: snapshot.activeTabId,
    tabs: snapshot.tabs.map((tab) => ({ ...tab }))
  };
}

export function createPreviewAutopilotApi(): AutopilotApi {
  const firstTab = createTab(createHomeUrl(), "Preview tab");
  let snapshot: BrowserSnapshot = {
    tabs: [firstTab],
    activeTabId: firstTab.id
  };
  let previewBookmarks = structuredClone(DEFAULT_BOOKMARKS);
  let previewSelectedSources: string[] = [];
  let previewPasswords: PasswordCredentialSummary[] = [];
  const listeners = new Set<(snapshot: BrowserSnapshot) => void>();

  function publish(nextSnapshot: BrowserSnapshot): BrowserSnapshot {
    snapshot = cloneSnapshot(nextSnapshot);
    const published = cloneSnapshot(snapshot);
    for (const listener of listeners) {
      listener(published);
    }
    return published;
  }

  function getActiveId(tabId?: string): string | null {
    return tabId ?? snapshot.activeTabId;
  }

  return {
    runtime: "browser-preview",
    platform: "browser",
    versions: {
      chrome: "preview",
      electron: "not running"
    },
    bookmarks: {
      list: async () => structuredClone(previewBookmarks),
      add: async (input: AddBookmarkInput) => {
        const bookmark = {
          kind: "bookmark" as const,
          title: input.title.trim() || "Bookmark",
          url: input.url,
          source: "Autopilot"
        };

        previewBookmarks = [bookmark, ...previewBookmarks];
        return structuredClone(previewBookmarks);
      },
      addFolder: async (input: AddBookmarkFolderInput) => {
        const folder = {
          kind: "folder" as const,
          title: input.title.trim() || "New folder",
          source: "Autopilot",
          children: []
        };
        const parentKey =
          input.parent?.kind === "folder" && input.parent.source === "Autopilot" ? createBookmarkNodeKey(input.parent) : null;

        if (!parentKey) {
          previewBookmarks = [folder, ...previewBookmarks];
          return structuredClone(previewBookmarks);
        }

        function insertIntoParent(nodes: BrowserBookmarkNode[], path: string[] = []): BrowserBookmarkNode[] {
          return nodes.map((node) => {
            if (node.kind === "bookmark") {
              return node;
            }

            const key = createBookmarkNodeKey({
              kind: "folder",
              source: node.source,
              title: node.title,
              path
            });
            if (key === parentKey) {
              return {
                ...node,
                children: [folder, ...node.children]
              };
            }

            return {
              ...node,
              children: insertIntoParent(node.children, [...path, node.title])
            };
          });
        }

        previewBookmarks = insertIntoParent(previewBookmarks);
        return structuredClone(previewBookmarks);
      },
      delete: async (target: BookmarkNodeTarget) => {
        const targetKey = createBookmarkNodeKey(target);
        function removeNodes(nodes: BrowserBookmarkNode[], path: string[] = []): BrowserBookmarkNode[] {
          return nodes
            .map((node): BrowserBookmarkNode | null => {
              const key = createBookmarkNodeKey({
                kind: node.kind,
                source: node.source,
                title: node.title,
                url: node.kind === "bookmark" ? node.url : undefined,
                path
              });
              if (key === targetKey) {
                return null;
              }

              if (node.kind === "bookmark") {
                return node;
              }

              return {
                ...node,
                children: removeNodes(node.children, [...path, node.title])
              };
            })
            .filter((node): node is BrowserBookmarkNode => Boolean(node));
        }

        previewBookmarks = removeNodes(previewBookmarks);
        return structuredClone(previewBookmarks);
      },
      sources: async () => [
        { id: "Chrome", label: "Chrome", profileCount: 1 },
        { id: "Edge", label: "Edge", profileCount: 1 },
        { id: "Brave", label: "Brave", profileCount: 1 }
      ],
      selectedSources: async () => [...previewSelectedSources],
      setSources: async (sources: string[]) => {
        previewSelectedSources = [...new Set(sources)];
        return structuredClone(previewBookmarks);
      }
    },
    passwords: {
      availability: async () => ({
        secureStorage: false,
        backend: "Browser preview",
        reason: "Password storage is available in the desktop app."
      }),
      list: async () => [...previewPasswords],
      savePending: async () => ({
        success: false,
        reason: "Password saving is available in the desktop app.",
        entries: [...previewPasswords]
      }),
      dismissPending: async () => undefined,
      reveal: async () => ({
        success: false,
        reason: "Password reveal is available in the desktop app."
      }),
      remove: async (id: string) => {
        previewPasswords = previewPasswords.filter((entry) => entry.id !== id);
        return [...previewPasswords];
      },
      subscribeChanges: () => () => undefined,
      subscribeSavePrompts: () => () => undefined
    },
    tabs: {
      getSnapshot: async () => cloneSnapshot(snapshot),
      create: async () => {
        const nextTab = createTab(createHomeUrl(), "Preview tab");
        return publish({
          tabs: [...snapshot.tabs, nextTab],
          activeTabId: nextTab.id
        });
      },
      close: async (tabId: string) => {
        const next = closeTab(snapshot.tabs, tabId, createTab(createHomeUrl(), "Preview tab"));
        return publish({
          tabs: next.tabs,
          activeTabId: next.activeId
        });
      },
      activate: async (tabId: string) => {
        if (!snapshot.tabs.some((tab) => tab.id === tabId)) {
          return cloneSnapshot(snapshot);
        }

        return publish({ ...snapshot, activeTabId: tabId });
      },
      navigate: async (tabId: string, input: string) => {
        const url = normalizeAddressInput(input, createHomeUrl());
        return publish({
          ...snapshot,
          tabs: updateTab(snapshot.tabs, tabId, {
            url,
            title: readableTitle("", url),
            isLoading: false,
            canGoBack: false,
            canGoForward: false
          })
        });
      },
      home: async (tabId: string) => {
        const activeId = getActiveId(tabId);
        if (!activeId) {
          return cloneSnapshot(snapshot);
        }

        const url = createHomeUrl();
        return publish({
          ...snapshot,
          tabs: updateTab(snapshot.tabs, activeId, {
            url,
            title: "Preview tab",
            isLoading: false,
            canGoBack: false,
            canGoForward: false
          })
        });
      },
      back: async () => cloneSnapshot(snapshot),
      forward: async () => cloneSnapshot(snapshot),
      reload: async () => cloneSnapshot(snapshot),
      readPageText: async (tabId: string) => {
        const tab = snapshot.tabs.find((entry) => entry.id === tabId);
        if (!tab) {
          return { success: false, reason: "No active page to read." };
        }

        return {
          success: true,
          title: tab.title,
          url: tab.url,
          text: "Please turn this preview page into an action item before Friday."
        };
      },
      print: async () => ({ success: false, reason: "Printing is available in the desktop app." }),
      setWebArea: async () => cloneSnapshot(snapshot),
      subscribe: (listener: (snapshot: BrowserSnapshot) => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      }
    }
  };
}

export function getAutopilotApi(): AutopilotApi {
  if (window.autopilot) {
    return window.autopilot;
  }

  previewApi ??= createPreviewAutopilotApi();
  return previewApi;
}

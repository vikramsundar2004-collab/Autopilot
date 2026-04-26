import { contextBridge, ipcRenderer, type IpcRendererEvent, type Rectangle } from "electron";

import type {
  AddBookmarkFolderInput,
  AddBookmarkInput,
  BookmarkNodeTarget,
  BrowserBookmarkNode,
  BrowserBookmarkSourceOption
} from "../shared/bookmarks.js";
import type { BrowserSnapshot } from "../shared/browserModel.js";
import type {
  PasswordAvailability,
  PasswordCredentialSummary,
  PasswordRevealResult,
  PasswordSaveResult,
  PendingPasswordSave
} from "../shared/passwords.js";
import type { PageTextCaptureResult } from "../shared/productivity.js";

const tabsApi = {
  getSnapshot: () => ipcRenderer.invoke("tabs:snapshot") as Promise<BrowserSnapshot>,
  create: () => ipcRenderer.invoke("tabs:create") as Promise<BrowserSnapshot>,
  close: (tabId: string) => ipcRenderer.invoke("tabs:close", tabId) as Promise<BrowserSnapshot>,
  activate: (tabId: string) => ipcRenderer.invoke("tabs:activate", tabId) as Promise<BrowserSnapshot>,
  navigate: (tabId: string, input: string) => ipcRenderer.invoke("tabs:navigate", tabId, input) as Promise<BrowserSnapshot>,
  home: (tabId: string) => ipcRenderer.invoke("tabs:home", tabId) as Promise<BrowserSnapshot>,
  back: (tabId: string) => ipcRenderer.invoke("tabs:back", tabId) as Promise<BrowserSnapshot>,
  forward: (tabId: string) => ipcRenderer.invoke("tabs:forward", tabId) as Promise<BrowserSnapshot>,
  reload: (tabId: string) => ipcRenderer.invoke("tabs:reload", tabId) as Promise<BrowserSnapshot>,
  readPageText: (tabId: string) => ipcRenderer.invoke("tabs:read-page-text", tabId) as Promise<PageTextCaptureResult>,
  print: (tabId: string) => ipcRenderer.invoke("tabs:print", tabId) as Promise<{ success: boolean; reason?: string }>,
  setWebArea: (bounds: Rectangle, visible: boolean) =>
    ipcRenderer.invoke("tabs:web-area", bounds, visible) as Promise<BrowserSnapshot>,
  subscribe: (listener: (snapshot: BrowserSnapshot) => void) => {
    const handler = (_event: IpcRendererEvent, snapshot: BrowserSnapshot) => listener(snapshot);
    ipcRenderer.on("tabs:changed", handler);
    return () => ipcRenderer.removeListener("tabs:changed", handler);
  }
};

const passwordsApi = {
  availability: () => ipcRenderer.invoke("passwords:availability") as Promise<PasswordAvailability>,
  list: () => ipcRenderer.invoke("passwords:list") as Promise<PasswordCredentialSummary[]>,
  savePending: (pendingId: string) => ipcRenderer.invoke("passwords:save-pending", pendingId) as Promise<PasswordSaveResult>,
  dismissPending: (pendingId: string) => ipcRenderer.invoke("passwords:dismiss-pending", pendingId) as Promise<void>,
  reveal: (id: string) => ipcRenderer.invoke("passwords:reveal", id) as Promise<PasswordRevealResult>,
  remove: (id: string) => ipcRenderer.invoke("passwords:remove", id) as Promise<PasswordCredentialSummary[]>,
  subscribeChanges: (listener: (entries: PasswordCredentialSummary[]) => void) => {
    const handler = (_event: IpcRendererEvent, entries: PasswordCredentialSummary[]) => listener(entries);
    ipcRenderer.on("passwords:changed", handler);
    return () => ipcRenderer.removeListener("passwords:changed", handler);
  },
  subscribeSavePrompts: (listener: (pending: PendingPasswordSave) => void) => {
    const handler = (_event: IpcRendererEvent, pending: PendingPasswordSave) => listener(pending);
    ipcRenderer.on("passwords:save-prompt", handler);
    return () => ipcRenderer.removeListener("passwords:save-prompt", handler);
  }
};

contextBridge.exposeInMainWorld("autopilot", {
  runtime: "electron",
  platform: process.platform,
  versions: {
    chrome: process.versions.chrome,
    electron: process.versions.electron
  },
  tabs: tabsApi,
  bookmarks: {
    list: () => ipcRenderer.invoke("bookmarks:list") as Promise<BrowserBookmarkNode[]>,
    add: (input: AddBookmarkInput) => ipcRenderer.invoke("bookmarks:add", input) as Promise<BrowserBookmarkNode[]>,
    addFolder: (input: AddBookmarkFolderInput) => ipcRenderer.invoke("bookmarks:add-folder", input) as Promise<BrowserBookmarkNode[]>,
    delete: (target: BookmarkNodeTarget) => ipcRenderer.invoke("bookmarks:delete", target) as Promise<BrowserBookmarkNode[]>,
    sources: () => ipcRenderer.invoke("bookmarks:sources") as Promise<BrowserBookmarkSourceOption[]>,
    selectedSources: () => ipcRenderer.invoke("bookmarks:selected-sources") as Promise<string[]>,
    setSources: (sources: string[]) => ipcRenderer.invoke("bookmarks:set-sources", sources) as Promise<BrowserBookmarkNode[]>
  },
  passwords: passwordsApi
});

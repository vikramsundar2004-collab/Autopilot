import { app, BrowserWindow, ipcMain, session, type Rectangle } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  addAutopilotBookmark,
  addAutopilotBookmarkFolder,
  deleteBookmarkTarget,
  listAvailableBookmarkSources,
  readImportedBookmarks,
  readSelectedBookmarkSources,
  updateSelectedBookmarkSources
} from "./bookmarks.js";
import { EmailService } from "./email.js";
import { loadAutopilotEnv } from "./env.js";
import { PasswordStore } from "./passwords.js";
import { TabController } from "./tabs.js";
import type { AddBookmarkFolderInput, AddBookmarkInput, BookmarkNodeTarget } from "../shared/bookmarks.js";
import type { CodingAccessMode, CodingCommandRequest } from "../shared/coding.js";
import type { PasswordCaptureInput } from "../shared/passwords.js";
import { CodingWorkspace } from "./coding.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);

let tabs: TabController | null = null;
loadAutopilotEnv();
const passwordStore = new PasswordStore();
const emailService = new EmailService();
const codingWorkspace = new CodingWorkspace();

function getAppIconPath(): string {
  return isDev
    ? path.join(__dirname, "../../public/autopilot-logo.ico")
    : path.join(__dirname, "../renderer/autopilot-logo.ico");
}

function denyPermissions(): void {
  for (const currentSession of [session.defaultSession, session.fromPartition("persist:autopilot")]) {
    currentSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
      callback(false);
    });
  }
}

function registerIpc(controller: TabController, mainWindow: BrowserWindow): void {
  function sendPasswordEntries(): void {
    if (!mainWindow.webContents.isDestroyed()) {
      mainWindow.webContents.send("passwords:changed", passwordStore.list());
    }
  }

  ipcMain.handle("tabs:snapshot", () => controller.getSnapshot());
  ipcMain.handle("tabs:create", (_event, url?: string) => controller.createTab(url));
  ipcMain.handle("tabs:close", (_event, tabId: string) => controller.closeTab(tabId));
  ipcMain.handle("tabs:activate", (_event, tabId: string) => controller.activateTab(tabId));
  ipcMain.handle("tabs:navigate", (_event, tabId: string, input: string) => controller.navigate(tabId, input));
  ipcMain.handle("tabs:home", (_event, tabId: string) => controller.goHome(tabId));
  ipcMain.handle("tabs:back", (_event, tabId: string) => controller.goBack(tabId));
  ipcMain.handle("tabs:forward", (_event, tabId: string) => controller.goForward(tabId));
  ipcMain.handle("tabs:reload", (_event, tabId: string) => controller.reload(tabId));
  ipcMain.handle("tabs:read-page-text", (_event, tabId: string) => controller.readPageText(tabId));
  ipcMain.handle("tabs:print", (_event, tabId: string) => controller.print(tabId));
  ipcMain.handle("tabs:web-area", (_event, bounds: Rectangle, visible: boolean) => controller.setWebArea(bounds, visible));
  ipcMain.handle("print-preview:print", (_event, options) => controller.printFromPreview(options));
  ipcMain.handle("bookmarks:list", () => readImportedBookmarks());
  ipcMain.handle("bookmarks:add", (_event, input: AddBookmarkInput) => addAutopilotBookmark(input));
  ipcMain.handle("bookmarks:add-folder", (_event, input: AddBookmarkFolderInput) => addAutopilotBookmarkFolder(input));
  ipcMain.handle("bookmarks:delete", (_event, target: BookmarkNodeTarget) => deleteBookmarkTarget(target));
  ipcMain.handle("bookmarks:sources", () => listAvailableBookmarkSources());
  ipcMain.handle("bookmarks:selected-sources", () => readSelectedBookmarkSources());
  ipcMain.handle("bookmarks:set-sources", (_event, sources: string[]) => updateSelectedBookmarkSources(sources));
  ipcMain.handle("email:status", () => emailService.getStatus());
  ipcMain.handle("email:list", () => emailService.listCachedMessages());
  ipcMain.handle("email:connect-gmail", () => emailService.connectGmail());
  ipcMain.handle("email:sync", () => emailService.syncInbox());
  ipcMain.handle("email:disconnect", () => emailService.disconnect());
  ipcMain.handle("coding:snapshot", () => codingWorkspace.getSnapshot());
  ipcMain.handle("coding:open-project", () => codingWorkspace.openProject(mainWindow));
  ipcMain.handle("coding:create-project", () => codingWorkspace.createProject(mainWindow));
  ipcMain.handle("coding:select-project", (_event, rootPath: string) => codingWorkspace.selectProject(rootPath));
  ipcMain.handle("coding:read-path", (_event, targetPath: string) => codingWorkspace.readPath(targetPath));
  ipcMain.handle("coding:write-file", (_event, targetPath: string, content: string) => codingWorkspace.writeFile(targetPath, content));
  ipcMain.handle("coding:set-access-mode", (_event, mode: CodingAccessMode) => codingWorkspace.setAccessMode(mode));
  ipcMain.handle("coding:search", (_event, query: string) => codingWorkspace.searchProject(query));
  ipcMain.handle("coding:run-command", (_event, input: CodingCommandRequest) => codingWorkspace.runCommand(input));
  ipcMain.handle("coding:browse", (_event, input: string) => codingWorkspace.browse(input));
  ipcMain.handle("passwords:stage", (event, input: PasswordCaptureInput) =>
    passwordStore.stage({
      ...input,
      title: input?.title || event.sender.getTitle(),
      url: input?.url || event.sender.getURL()
    })
  );
  ipcMain.handle("passwords:availability", () => passwordStore.getAvailability());
  ipcMain.handle("passwords:list", () => passwordStore.list());
  ipcMain.handle("passwords:save-pending", (_event, pendingId: string) => {
    const result = passwordStore.savePending(pendingId);
    if (result.success) {
      sendPasswordEntries();
    }
    return result;
  });
  ipcMain.handle("passwords:dismiss-pending", (_event, pendingId: string) => passwordStore.dismissPending(pendingId));
  ipcMain.handle("passwords:reveal", (_event, id: string) => passwordStore.reveal(id));
  ipcMain.handle("passwords:remove", (_event, id: string) => {
    const entries = passwordStore.remove(id);
    sendPasswordEntries();
    return entries;
  });
}

function createMainWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 920,
    minHeight: 620,
    title: "Autopilot Browser",
    icon: getAppIconPath(),
    backgroundColor: "#f4ebdd",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    }
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));

  tabs = new TabController(mainWindow);
  registerIpc(tabs, mainWindow);

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    void mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    void mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  tabs.createTab();
}

app.whenReady().then(() => {
  app.setName("Autopilot Browser");
  app.setAppUserModelId("Autopilot.Browser");
  denyPermissions();
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

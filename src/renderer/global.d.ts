import type {
  AddBookmarkFolderInput,
  AddBookmarkInput,
  BookmarkNodeTarget,
  BrowserBookmarkNode,
  BrowserBookmarkSourceOption
} from "../shared/bookmarks";
import type { BrowserSnapshot } from "../shared/browserModel";
import type { EmailConnectResult, EmailConnectionStatus, EmailMessageSummary, EmailSyncResult } from "../shared/email";
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
  create: (url?: string) => Promise<BrowserSnapshot>;
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

type EmailApi = {
  status: () => Promise<EmailConnectionStatus>;
  list: () => Promise<EmailMessageSummary[]>;
  connectGmail: () => Promise<EmailConnectResult>;
  sync: () => Promise<EmailSyncResult>;
  disconnect: () => Promise<EmailConnectionStatus>;
};

declare global {
  interface Window {
    autopilot?: {
      runtime: "electron";
      platform: string;
      versions: {
        chrome: string;
        electron: string;
      };
      tabs: TabsApi;
      bookmarks: {
        list: () => Promise<BrowserBookmarkNode[]>;
        add: (input: AddBookmarkInput) => Promise<BrowserBookmarkNode[]>;
        addFolder: (input: AddBookmarkFolderInput) => Promise<BrowserBookmarkNode[]>;
        delete: (target: BookmarkNodeTarget) => Promise<BrowserBookmarkNode[]>;
        sources: () => Promise<BrowserBookmarkSourceOption[]>;
        selectedSources: () => Promise<string[]>;
        setSources: (sources: string[]) => Promise<BrowserBookmarkNode[]>;
      };
      passwords: PasswordsApi;
      email: EmailApi;
    };
  }
}

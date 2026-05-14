import { beforeEach, describe, expect, it, vi } from "vitest";

const electronMock = vi.hoisted(() => {
  type Handler = (...args: unknown[]) => void;

  class TestEmitter {
    private readonly handlers = new Map<string, Handler[]>();

    on(eventName: string, handler: Handler): this {
      this.handlers.set(eventName, [...(this.handlers.get(eventName) ?? []), handler]);
      return this;
    }

    once(eventName: string, handler: Handler): this {
      const wrapped: Handler = (...args) => {
        this.off(eventName, wrapped);
        handler(...args);
      };
      return this.on(eventName, wrapped);
    }

    off(eventName: string, handler: Handler): this {
      this.handlers.set(
        eventName,
        (this.handlers.get(eventName) ?? []).filter((candidate) => candidate !== handler)
      );
      return this;
    }

    emit(eventName: string, ...args: unknown[]): boolean {
      for (const handler of this.handlers.get(eventName) ?? []) {
        handler(...args);
      }
      return true;
    }
  }

  let nextWebContentsId = 1;

  class MockWebContents extends TestEmitter {
    readonly id = nextWebContentsId++;
    private currentUrl = "";
    private currentTitle = "";
    private destroyed = false;

    setWindowOpenHandler = vi.fn();

    async loadURL(url: string): Promise<void> {
      this.currentUrl = url;
      this.currentTitle = "";
      this.emit("did-start-loading");
      this.emit("did-navigate", {}, url);
      this.emit("did-stop-loading");
    }

    isDestroyed(): boolean {
      return this.destroyed;
    }

    close(): void {
      this.destroyed = true;
    }

    getURL(): string {
      return this.currentUrl;
    }

    getTitle(): string {
      return this.currentTitle;
    }

    isLoading(): boolean {
      return false;
    }

    canGoBack(): boolean {
      return false;
    }

    canGoForward(): boolean {
      return false;
    }

    getOSProcessId(): number {
      return this.id;
    }

    reload = vi.fn();
    goBack = vi.fn();
    goForward = vi.fn();
    executeJavaScript = vi.fn();
    capturePage = vi.fn();
    getPrintersAsync = vi.fn();
    print = vi.fn();
  }

  class MockWebContentsView {
    readonly webContents = new MockWebContents();
    bounds: unknown = null;

    setBounds(bounds: unknown): void {
      this.bounds = bounds;
    }
  }

  return {
    TestEmitter,
    MockWebContentsView,
    shellOpenExternal: vi.fn().mockResolvedValue(undefined),
    onBeforeRequest: vi.fn(),
    onHeadersReceived: vi.fn()
  };
});

vi.mock("electron", () => ({
  app: {
    isReady: () => true,
    getAppMetrics: () => []
  },
  BrowserWindow: class {},
  WebContentsView: electronMock.MockWebContentsView,
  session: {
    fromPartition: () => ({
      webRequest: {
        onBeforeRequest: electronMock.onBeforeRequest,
        onHeadersReceived: electronMock.onHeadersReceived
      }
    })
  },
  shell: {
    openExternal: electronMock.shellOpenExternal
  }
}));

const { TabController } = await import("../src/main/tabs");

beforeEach(() => {
  electronMock.shellOpenExternal.mockClear();
  electronMock.onBeforeRequest.mockClear();
  electronMock.onHeadersReceived.mockClear();
});

function createFakeMainWindow() {
  const host = {
    children: [] as unknown[],
    addChildView: vi.fn((view: unknown) => {
      host.children = [...host.children, view];
    }),
    removeChildView: vi.fn((view: unknown) => {
      host.children = host.children.filter((child) => child !== view);
    })
  };
  const webContents = new electronMock.TestEmitter() as InstanceType<typeof electronMock.TestEmitter> & {
    isDestroyed: () => boolean;
    send: ReturnType<typeof vi.fn>;
  };
  webContents.isDestroyed = () => false;
  webContents.send = vi.fn();

  const window = new electronMock.TestEmitter() as InstanceType<typeof electronMock.TestEmitter> & {
    contentView: typeof host;
    webContents: typeof webContents;
    isDestroyed: () => boolean;
    isFullScreen: () => boolean;
    setFullScreen: ReturnType<typeof vi.fn>;
  };
  window.contentView = host;
  window.webContents = webContents;
  let isFullScreen = false;
  window.isDestroyed = () => false;
  window.isFullScreen = () => isFullScreen;
  window.setFullScreen = vi.fn((enabled: boolean) => {
    isFullScreen = enabled;
  });

  return { host, webContents, window };
}

describe("TabController browser view attachment", () => {
  it("keeps the home tab out of the native Chromium view so first launch has a renderer fallback", () => {
    const { host, window } = createFakeMainWindow();
    const controller = new TabController(window as never);

    controller.createTab();
    controller.setWebArea({ x: 16, y: 88, width: 900, height: 640 }, true);

    expect(host.children).toHaveLength(0);

    window.emit("closed");
  });

  it("reattaches the active browser view after the host renderer finishes loading", () => {
    const { host, webContents, window } = createFakeMainWindow();
    const controller = new TabController(window as never);

    const snapshot = controller.createTab();
    controller.navigate(snapshot.activeTabId ?? "", "https://example.com");
    controller.setWebArea({ x: 16, y: 88, width: 900, height: 640 }, true);
    expect(host.children).toHaveLength(1);

    webContents.emit("did-start-loading");
    expect(host.children).toHaveLength(0);

    webContents.emit("did-finish-load");
    expect(host.children).toHaveLength(1);

    window.emit("closed");
  });

  it("turns Supabase localhost auth fallback redirects into an Autopilot account notice", () => {
    const { host, window } = createFakeMainWindow();
    const controller = new TabController(window as never);

    controller.createTab("https://ctvxwmmclsfxortzmkeq.supabase.co/auth/v1/verify?token=test&type=signup");
    controller.setWebArea({ x: 16, y: 88, width: 900, height: 640 }, true);

    const activeView = host.children[0] as InstanceType<typeof electronMock.MockWebContentsView>;
    const event = { preventDefault: vi.fn() };
    activeView.webContents.emit("will-navigate", event, "http://localhost:3000/");

    const activeTab = controller.getSnapshot().tabs[0];
    expect(event.preventDefault).toHaveBeenCalled();
    expect(decodeURIComponent(activeTab.url)).toContain('data-autopilot-page="account-auth-complete"');
    expect(activeTab.navigationError).toBeUndefined();

    window.emit("closed");
  });

  it("keeps catching Supabase localhost fallback after Chromium swaps to its error page", async () => {
    const { host, window } = createFakeMainWindow();
    const controller = new TabController(window as never);

    controller.createTab("https://ctvxwmmclsfxortzmkeq.supabase.co/auth/v1/verify?token=test&type=magiclink");
    controller.setWebArea({ x: 16, y: 88, width: 900, height: 640 }, true);

    const activeView = host.children[0] as InstanceType<typeof electronMock.MockWebContentsView>;
    await activeView.webContents.loadURL("chrome-error://chromewebdata/");
    const event = { preventDefault: vi.fn() };
    activeView.webContents.emit("will-navigate", event, "http://localhost:3000/");

    const activeTab = controller.getSnapshot().tabs[0];
    expect(event.preventDefault).toHaveBeenCalled();
    expect(decodeURIComponent(activeTab.url)).toContain('data-autopilot-page="account-auth-complete"');
    expect(activeTab.navigationError).toBeUndefined();

    window.emit("closed");
  });

  it("hands Autopilot account callback URLs to the account callback handler", () => {
    const handleAccountCallbackUrl = vi.fn();
    const { host, window } = createFakeMainWindow();
    const controller = new TabController(window as never, handleAccountCallbackUrl);

    controller.createTab("https://ctvxwmmclsfxortzmkeq.supabase.co/auth/v1/verify?token=test&type=magiclink");
    controller.setWebArea({ x: 16, y: 88, width: 900, height: 640 }, true);

    const activeView = host.children[0] as InstanceType<typeof electronMock.MockWebContentsView>;
    const event = { preventDefault: vi.fn() };
    const callbackUrl = "autopilot://auth/callback#access_token=access-token&refresh_token=refresh-token";
    activeView.webContents.emit("will-navigate", event, callbackUrl);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(handleAccountCallbackUrl).toHaveBeenCalledWith(callbackUrl);
    expect(controller.getSnapshot().tabs[0].url).toContain("supabase.co/auth/v1/verify");

    window.emit("closed");
  });

  it("does not hijack normal localhost navigation outside Supabase auth", () => {
    const { host, window } = createFakeMainWindow();
    const controller = new TabController(window as never);

    controller.createTab("https://example.com");
    controller.setWebArea({ x: 16, y: 88, width: 900, height: 640 }, true);

    const activeView = host.children[0] as InstanceType<typeof electronMock.MockWebContentsView>;
    const event = { preventDefault: vi.fn() };
    activeView.webContents.emit("will-navigate", event, "http://localhost:3000/");

    expect(event.preventDefault).not.toHaveBeenCalled();

    window.emit("closed");
  });

  it("opens PDF popups as Autopilot tabs instead of the system browser", () => {
    const { host, window } = createFakeMainWindow();
    const controller = new TabController(window as never);

    controller.createTab("https://example.com");
    controller.setWebArea({ x: 16, y: 88, width: 900, height: 640 }, true);

    const activeView = host.children[0] as InstanceType<typeof electronMock.MockWebContentsView>;
    const windowOpenHandler = activeView.webContents.setWindowOpenHandler.mock.calls[0]?.[0] as
      | ((details: { url: string }) => { action: string })
      | undefined;
    expect(windowOpenHandler).toBeTypeOf("function");

    const result = windowOpenHandler?.({ url: "https://example.com/report.pdf" });

    expect(result).toEqual({ action: "deny" });
    expect(electronMock.shellOpenExternal).not.toHaveBeenCalled();
    expect(controller.getSnapshot().tabs.map((tab) => tab.url)).toContain("https://example.com/report.pdf");

    window.emit("closed");
  });

  it("moves clicked PDF navigations into a new Autopilot tab", () => {
    const { host, window } = createFakeMainWindow();
    const controller = new TabController(window as never);

    controller.createTab("https://example.com");
    controller.setWebArea({ x: 16, y: 88, width: 900, height: 640 }, true);

    const activeView = host.children[0] as InstanceType<typeof electronMock.MockWebContentsView>;
    const event = { preventDefault: vi.fn() };
    activeView.webContents.emit("will-navigate", event, "https://example.com/syllabus.pdf");

    const snapshot = controller.getSnapshot();
    expect(event.preventDefault).toHaveBeenCalled();
    expect(electronMock.shellOpenExternal).not.toHaveBeenCalled();
    expect(snapshot.tabs).toHaveLength(2);
    expect(snapshot.activeTabId).toBe(snapshot.tabs[1].id);
    expect(snapshot.tabs[1].url).toBe("https://example.com/syllabus.pdf");

    window.emit("closed");
  });

  it("routes PDF responses without a .pdf URL into an Autopilot tab", async () => {
    const { host, window } = createFakeMainWindow();
    const controller = new TabController(window as never);

    controller.createTab("https://example.com");
    controller.setWebArea({ x: 16, y: 88, width: 900, height: 640 }, true);

    const activeView = host.children[0] as InstanceType<typeof electronMock.MockWebContentsView>;
    const headersHandler = electronMock.onHeadersReceived.mock.calls[0]?.[1] as
      | ((
          details: {
            resourceType: string;
            webContentsId: number;
            url: string;
            responseHeaders: Record<string, string[]>;
          },
          callback: (response: { cancel?: boolean }) => void
        ) => void)
      | undefined;
    const callback = vi.fn();
    expect(headersHandler).toBeTypeOf("function");

    headersHandler?.(
      {
        resourceType: "mainFrame",
        webContentsId: activeView.webContents.id,
        url: "https://example.com/download?id=semester-plan",
        responseHeaders: {
          "content-type": ["application/pdf"]
        }
      },
      callback
    );
    await new Promise((resolve) => setImmediate(resolve));

    const snapshot = controller.getSnapshot();
    expect(callback).toHaveBeenCalledWith({ cancel: true });
    expect(electronMock.shellOpenExternal).not.toHaveBeenCalled();
    expect(snapshot.tabs.map((tab) => tab.url)).toContain("https://example.com/download?id=semester-plan");

    window.emit("closed");
  });

  it("lets page fullscreen buttons take over and release the browser window", () => {
    const { host, window } = createFakeMainWindow();
    const controller = new TabController(window as never);

    controller.createTab("https://example.com/video");
    controller.setWebArea({ x: 16, y: 88, width: 900, height: 640 }, true);

    const activeView = host.children[0] as InstanceType<typeof electronMock.MockWebContentsView>;
    activeView.webContents.emit("enter-html-full-screen");
    expect(window.setFullScreen).toHaveBeenLastCalledWith(true);
    expect(window.isFullScreen()).toBe(true);

    activeView.webContents.emit("leave-html-full-screen");
    expect(window.setFullScreen).toHaveBeenLastCalledWith(false);
    expect(window.isFullScreen()).toBe(false);

    window.emit("closed");
  });

  it("exits page fullscreen when the fullscreen tab closes", () => {
    const { host, window } = createFakeMainWindow();
    const controller = new TabController(window as never);

    const snapshot = controller.createTab("https://example.com/slides");
    controller.setWebArea({ x: 16, y: 88, width: 900, height: 640 }, true);

    const activeView = host.children[0] as InstanceType<typeof electronMock.MockWebContentsView>;
    activeView.webContents.emit("enter-html-full-screen");
    controller.closeTab(snapshot.activeTabId ?? "");

    expect(window.setFullScreen).toHaveBeenLastCalledWith(false);
    expect(window.isFullScreen()).toBe(false);

    window.emit("closed");
  });
});

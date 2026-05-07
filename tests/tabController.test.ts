import { describe, expect, it, vi } from "vitest";

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
  };
  window.contentView = host;
  window.webContents = webContents;

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
});

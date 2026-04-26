import { BrowserWindow, WebContentsView, session, shell, type PrinterInfo, type Rectangle } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  AUTOPILOT_PDF_NOTICE_MARKER,
  createHomeUrl,
  isPdfResponseHeaders,
  isPdfUrl,
  normalizeAddressInput,
  readableTitle,
  type BrowserSnapshot,
  type Tab
} from "../shared/browserModel.js";

type ManagedTab = Tab & {
  view: WebContentsView;
};

type ChildViewHost = {
  addChildView: (view: WebContentsView) => void;
  removeChildView: (view: WebContentsView) => void;
};

type PrintPreviewOptions = {
  previewId?: string;
  deviceName?: string;
  copies?: number;
  color?: boolean;
  landscape?: boolean;
};

type PrintPreviewRecord = {
  id: string;
  tabId: string;
};

const EMPTY_BOUNDS: Rectangle = { x: 0, y: 0, width: 0, height: 0 };
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BROWSER_PARTITION = "persist:autopilot";

function isSafeBrowserUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ["http:", "https:", "data:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

function isExternalPdfUrl(url: string): boolean {
  try {
    const protocol = new URL(url).protocol;
    return ["http:", "https:"].includes(protocol) && isPdfUrl(url);
  } catch {
    return false;
  }
}

function cleanPrintFilePart(value: string): string {
  const cleaned = value
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 64)
    .trim();

  return cleaned || "Autopilot page";
}

function getErrorReason(error: unknown): string {
  return error instanceof Error && error.message ? error.message : "Unable to create print preview.";
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "\"":
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

function createPdfExternalNoticeUrl(pdfUrl: string): string {
  const safePdfUrl = escapeHtml(pdfUrl);
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>PDF opened externally</title>
<style>
  :root {
    color-scheme: light;
    --bg: #f4ebdd;
    --surface: #fffaf2;
    --surface-2: #efe3d1;
    --primary: #1f4a37;
    --text: #17231d;
    --muted: #6f6257;
    --border: #deccb5;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    display: grid;
    place-items: center;
    background:
      radial-gradient(circle at 78% -12%, color-mix(in srgb, var(--surface-2) 82%, transparent), transparent 34%),
      linear-gradient(145deg, var(--surface), var(--bg));
    color: var(--text);
    font-family: Inter, "DM Sans", Aptos, ui-sans-serif, system-ui, sans-serif;
  }
  main {
    width: min(640px, calc(100vw - 48px));
    border: 1px solid var(--border);
    border-radius: 18px;
    background: color-mix(in srgb, var(--surface) 94%, white);
    box-shadow: 0 28px 88px rgba(51, 39, 31, .15);
    padding: 34px;
  }
  .kicker {
    margin: 0 0 10px;
    color: color-mix(in srgb, var(--primary) 74%, var(--text));
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0;
    text-transform: uppercase;
  }
  h1 {
    margin: 0;
    font-family: Georgia, serif;
    font-size: 36px;
    line-height: 1.05;
  }
  p {
    margin: 16px 0 0;
    color: var(--muted);
    font-size: 16px;
    line-height: 1.55;
  }
  a {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 46px;
    margin-top: 24px;
    border-radius: 12px;
    background: var(--primary);
    color: var(--surface);
    font-weight: 800;
    padding: 0 18px;
    text-decoration: none;
  }
  small {
    display: block;
    max-width: 100%;
    margin-top: 18px;
    overflow: hidden;
    color: var(--muted);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
</head>
<body ${AUTOPILOT_PDF_NOTICE_MARKER}>
<main>
  <p class="kicker">Autopilot</p>
  <h1>PDF opened externally</h1>
  <p>This PDF was sent to your default PDF app or browser so its print button can use a real preview instead of Electron's unsupported PDF print dialog.</p>
  <a href="${safePdfUrl}">Open PDF again</a>
  <small title="${safePdfUrl}">${safePdfUrl}</small>
</main>
</body>
</html>`;

  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

function openPdfInSystem(pdfUrl: string): void {
  if (process.env.AUTOPILOT_SKIP_EXTERNAL_PDF_OPEN === "1") {
    return;
  }

  void shell.openExternal(pdfUrl).catch(() => undefined);
}

function createPrinterOptions(printers: PrinterInfo[]): string {
  const options = printers.map((printer) => {
    const label = printer.displayName || printer.name;
    return `<option value="${escapeHtml(printer.name)}">${escapeHtml(label)}</option>`;
  });

  return [`<option value="">System default printer</option>`, ...options].join("");
}

function createPrintPreviewHtml({
  title,
  url,
  screenshotDataUrl,
  printers
}: {
  title: string;
  url: string;
  screenshotDataUrl: string | null;
  printers: PrinterInfo[];
}): string {
  const previewBody = screenshotDataUrl
    ? `<img src="${screenshotDataUrl}" alt="Current page preview" />`
    : `<div class="preview-fallback">
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(url)}</span>
        <p>Autopilot could not capture a live screenshot, but the page is ready to print from the active tab.</p>
      </div>`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Autopilot Print Preview</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f4ebdd;
      --surface: #fffaf2;
      --surface-2: #efe3d1;
      --primary: #1f4a37;
      --primary-hover: #17392a;
      --text: #17231d;
      --muted: #6f6257;
      --border: #deccb5;
      --danger: #9d3b2f;
    }
    * { box-sizing: border-box; }
    html, body { width: 100%; height: 100%; margin: 0; overflow: hidden; }
    body {
      display: grid;
      grid-template-columns: 312px minmax(0, 1fr);
      background:
        radial-gradient(circle at 78% -12%, color-mix(in srgb, var(--surface-2) 82%, transparent), transparent 34%),
        var(--bg);
      color: var(--text);
      font-family: Inter, "DM Sans", Aptos, ui-sans-serif, system-ui, sans-serif;
    }
    aside {
      display: grid;
      align-content: start;
      gap: 18px;
      border-right: 1px solid var(--border);
      background: color-mix(in srgb, var(--surface) 94%, var(--bg));
      padding: 22px;
      overflow: auto;
    }
    main {
      display: grid;
      min-width: 0;
      min-height: 0;
      padding: 26px;
      overflow: auto;
      place-items: start center;
    }
    h1 {
      margin: 0;
      font-family: Georgia, serif;
      font-size: 28px;
      line-height: 1.05;
    }
    p { margin: 0; color: var(--muted); line-height: 1.45; }
    .kicker {
      margin-bottom: 8px;
      color: color-mix(in srgb, var(--primary) 74%, var(--text));
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
    }
    .page-title {
      display: grid;
      gap: 6px;
      min-width: 0;
    }
    .page-title small {
      overflow: hidden;
      color: var(--muted);
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    label {
      display: grid;
      gap: 8px;
      color: var(--text);
      font-size: 13px;
      font-weight: 800;
    }
    select, input {
      width: 100%;
      min-height: 42px;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: var(--surface);
      color: var(--text);
      font: inherit;
      padding: 0 12px;
    }
    .segmented {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .segmented label {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 42px;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: var(--surface);
      cursor: pointer;
    }
    .segmented input { width: auto; min-height: auto; margin: 0 8px 0 0; }
    .checkbox {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 800;
    }
    .checkbox input { width: 18px; min-height: 18px; }
    button {
      min-height: 44px;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: var(--surface);
      color: var(--text);
      cursor: pointer;
      font: inherit;
      font-weight: 900;
      transition: background .14s ease, transform .14s ease;
    }
    button:hover { transform: translateY(-1px); }
    .primary {
      border-color: var(--primary);
      background: var(--primary);
      color: var(--surface);
    }
    .primary:hover { background: var(--primary-hover); }
    .actions { display: grid; gap: 10px; }
    .status {
      min-height: 40px;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: color-mix(in srgb, var(--surface-2) 64%, var(--surface));
      color: var(--muted);
      padding: 10px 12px;
      font-size: 13px;
      font-weight: 800;
    }
    .status.success { color: var(--primary); }
    .status.error { color: var(--danger); }
    .preview-page {
      width: min(100%, 850px);
      min-height: 600px;
      border: 1px solid var(--border);
      border-radius: 14px;
      background: #ffffff;
      box-shadow: 0 24px 72px rgba(51, 39, 31, .16);
      padding: 18px;
    }
    .preview-page img {
      display: block;
      width: 100%;
      height: auto;
      border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
      border-radius: 8px;
      background: white;
    }
    .preview-fallback {
      display: grid;
      place-items: center;
      gap: 10px;
      min-height: 460px;
      color: var(--text);
      text-align: center;
    }
    .preview-fallback strong {
      max-width: min(540px, 100%);
      overflow: hidden;
      font-family: Georgia, serif;
      font-size: 30px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .preview-fallback span {
      max-width: min(620px, 100%);
      overflow: hidden;
      color: var(--muted);
      font-size: 13px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .preview-fallback p {
      max-width: 420px;
    }
    .preview-note {
      margin-top: 12px;
      font-size: 12px;
      text-align: center;
    }
  </style>
</head>
<body>
  <aside>
    <section class="page-title">
      <p class="kicker">Autopilot</p>
      <h1>Print preview</h1>
      <small title="${escapeHtml(url)}">${escapeHtml(title)}</small>
    </section>

    <label>
      Printer
      <select id="printer">${createPrinterOptions(printers)}</select>
    </label>

    <label>
      Copies
      <input id="copies" type="number" min="1" max="99" value="1" />
    </label>

    <section>
      <p class="kicker">Orientation</p>
      <div class="segmented">
        <label><input type="radio" name="orientation" value="portrait" checked /> Portrait</label>
        <label><input type="radio" name="orientation" value="landscape" /> Landscape</label>
      </div>
    </section>

    <label class="checkbox">
      <input id="color" type="checkbox" checked />
      Color printing
    </label>

    <div class="actions">
      <button class="primary" id="print" type="button">Print</button>
    </div>

    <div class="status" id="status" role="status">Ready to print without the Electron system preview dialog.</div>
  </aside>

  <main>
    <section class="preview-page" aria-label="Page preview">
      ${previewBody}
      <p class="preview-note">This preview is generated by Autopilot. The printed page is sent from the live browser tab.</p>
    </section>
  </main>

  <script>
    const printer = document.getElementById("printer");
    const copies = document.getElementById("copies");
    const color = document.getElementById("color");
    const status = document.getElementById("status");
    const printButton = document.getElementById("print");

    function setStatus(message, kind = "") {
      status.textContent = message;
      status.className = kind ? "status " + kind : "status";
    }

    printButton.addEventListener("click", async () => {
      if (!window.autopilotPrintPreview) {
        setStatus("Print bridge is unavailable. Reopen this preview window.", "error");
        return;
      }

      printButton.disabled = true;
      setStatus("Sending page to printer...");
      const orientation = document.querySelector('input[name="orientation"]:checked')?.value || "portrait";
      const result = await window.autopilotPrintPreview.print({
        deviceName: printer.value,
        copies: Number(copies.value) || 1,
        color: color.checked,
        landscape: orientation === "landscape"
      });
      printButton.disabled = false;
      setStatus(result.success ? "Sent to printer." : (result.reason || "Print failed."), result.success ? "success" : "error");
    });
  </script>
</body>
</html>`;
}

export class TabController {
  private readonly window: BrowserWindow;
  private readonly tabs = new Map<string, ManagedTab>();
  private readonly printPreviewWindows = new Set<BrowserWindow>();
  private readonly printPreviews = new Map<string, PrintPreviewRecord>();
  private activeTabId: string | null = null;
  private attachedViewId: string | null = null;
  private bounds: Rectangle = EMPTY_BOUNDS;
  private visible = false;

  constructor(window: BrowserWindow) {
    this.window = window;
    this.registerPdfResponseHandler();
  }

  getSnapshot(): BrowserSnapshot {
    return {
      tabs: [...this.tabs.values()].map(({ view: _view, ...tab }) => tab),
      activeTabId: this.activeTabId
    };
  }

  createTab(url = createHomeUrl()): BrowserSnapshot {
    const id = crypto.randomUUID();
    const shouldOpenPdfExternally = isExternalPdfUrl(url);
    const initialUrl = shouldOpenPdfExternally ? createPdfExternalNoticeUrl(url) : url;
    const view = new WebContentsView({
      webPreferences: {
        preload: path.join(__dirname, "browserViewPreload.cjs"),
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        webSecurity: true,
        partition: BROWSER_PARTITION
      }
    });

    const tab: ManagedTab = {
      id,
      title: shouldOpenPdfExternally ? "PDF opened externally" : "New tab",
      url: initialUrl,
      isLoading: false,
      canGoBack: false,
      canGoForward: false,
      view
    };

    view.webContents.setWindowOpenHandler(({ url: popupUrl }) => {
      if (isExternalPdfUrl(popupUrl)) {
        this.createTab(popupUrl);
      } else if (isSafeBrowserUrl(popupUrl)) {
        this.createTab(popupUrl);
      }

      return { action: "deny" };
    });

    view.webContents.on("will-navigate", (event, targetUrl) => {
      if (!isExternalPdfUrl(targetUrl)) {
        return;
      }

      event.preventDefault();
      this.openPdfExternally(id, targetUrl);
    });

    view.webContents.on("did-start-loading", () => {
      this.patchTab(id, { isLoading: true });
    });

    view.webContents.on("did-stop-loading", () => {
      this.syncTabFromView(id);
    });

    view.webContents.on("page-title-updated", (_event, title) => {
      this.patchTab(id, { title: readableTitle(title, tab.url) });
    });

    view.webContents.on("did-navigate", (_event, navigatedUrl) => {
      this.patchTab(id, { url: navigatedUrl });
      this.syncTabFromView(id);
    });

    view.webContents.on("did-navigate-in-page", (_event, navigatedUrl) => {
      this.patchTab(id, { url: navigatedUrl });
      this.syncTabFromView(id);
    });

    view.webContents.on("did-fail-load", (_event, errorCode) => {
      if (errorCode === -3) {
        return;
      }

      this.patchTab(id, {
        title: "Load failed",
        isLoading: false
      });
    });

    this.tabs.set(id, tab);
    this.activeTabId = id;
    void view.webContents.loadURL(initialUrl);
    if (shouldOpenPdfExternally) {
      openPdfInSystem(url);
    }
    this.reconcileAttachedView();
    this.emit();
    return this.getSnapshot();
  }

  closeTab(tabId: string): BrowserSnapshot {
    const closingTab = this.tabs.get(tabId);
    if (!closingTab) {
      return this.getSnapshot();
    }

    const orderedTabs = [...this.tabs.values()];
    const closingIndex = orderedTabs.findIndex((tab) => tab.id === tabId);

    this.detachView(tabId);
    this.tabs.delete(tabId);

    if (!closingTab.view.webContents.isDestroyed()) {
      closingTab.view.webContents.close();
    }

    if (this.tabs.size === 0) {
      return this.createTab();
    }

    if (this.activeTabId === tabId) {
      const nextTabs = [...this.tabs.values()];
      const nextTab = nextTabs[Math.min(closingIndex, nextTabs.length - 1)];
      this.activeTabId = nextTab.id;
    }

    this.reconcileAttachedView();
    this.emit();
    return this.getSnapshot();
  }

  activateTab(tabId: string): BrowserSnapshot {
    if (this.tabs.has(tabId)) {
      this.activeTabId = tabId;
      this.reconcileAttachedView();
      this.emit();
    }

    return this.getSnapshot();
  }

  navigate(tabId: string, input: string): BrowserSnapshot {
    const tab = this.tabs.get(tabId);
    if (!tab) {
      return this.getSnapshot();
    }

    const url = normalizeAddressInput(input, createHomeUrl());
    if (!isSafeBrowserUrl(url)) {
      return this.getSnapshot();
    }

    if (isExternalPdfUrl(url)) {
      this.openPdfExternally(tabId, url);
      return this.getSnapshot();
    }

    tab.url = url;
    tab.isLoading = true;
    void tab.view.webContents.loadURL(url);
    this.emit();
    return this.getSnapshot();
  }

  goHome(tabId: string): BrowserSnapshot {
    return this.navigate(tabId, createHomeUrl());
  }

  goBack(tabId: string): BrowserSnapshot {
    const tab = this.tabs.get(tabId);
    if (tab?.view.webContents.canGoBack()) {
      tab.view.webContents.goBack();
    }

    return this.getSnapshot();
  }

  goForward(tabId: string): BrowserSnapshot {
    const tab = this.tabs.get(tabId);
    if (tab?.view.webContents.canGoForward()) {
      tab.view.webContents.goForward();
    }

    return this.getSnapshot();
  }

  reload(tabId: string): BrowserSnapshot {
    const tab = this.tabs.get(tabId);
    if (tab) {
      tab.view.webContents.reload();
    }

    return this.getSnapshot();
  }

  async print(tabId: string): Promise<{ success: boolean; reason?: string }> {
    const tab = this.tabs.get(tabId);
    if (!tab || tab.view.webContents.isDestroyed()) {
      return { success: false, reason: "No active page to print." };
    }

    try {
      const screenshotDataUrl = await tab.view.webContents
        .capturePage()
        .then((screenshot) => screenshot.toDataURL())
        .catch(() => null);
      const printers = await tab.view.webContents.getPrintersAsync();
      await this.openPrintPreview(tab, screenshotDataUrl, printers);
      return { success: true };
    } catch (error) {
      return { success: false, reason: getErrorReason(error) };
    }
  }

  printFromPreview(options: PrintPreviewOptions): Promise<{ success: boolean; reason?: string }> {
    const previewId = options.previewId;
    const preview = previewId ? this.printPreviews.get(previewId) : null;
    const tab = preview ? this.tabs.get(preview.tabId) : null;
    if (!preview || !tab || tab.view.webContents.isDestroyed()) {
      return Promise.resolve({ success: false, reason: "The original page is no longer available." });
    }

    const copies = Math.max(1, Math.min(99, Math.floor(Number(options.copies) || 1)));
    return new Promise((resolve) => {
      tab.view.webContents.print(
        {
          silent: true,
          printBackground: true,
          deviceName: options.deviceName || undefined,
          copies,
          color: options.color !== false,
          landscape: Boolean(options.landscape)
        },
        (success, failureReason) => {
          resolve({
            success,
            reason: failureReason || undefined
          });
        }
      );
    });
  }

  setWebArea(bounds: Rectangle, visible: boolean): BrowserSnapshot {
    this.bounds = {
      x: Math.max(0, Math.round(bounds.x)),
      y: Math.max(0, Math.round(bounds.y)),
      width: Math.max(0, Math.round(bounds.width)),
      height: Math.max(0, Math.round(bounds.height))
    };
    this.visible = visible && this.bounds.width > 0 && this.bounds.height > 0;
    this.reconcileAttachedView();
    return this.getSnapshot();
  }

  private registerPdfResponseHandler(): void {
    const browserSession = session.fromPartition(BROWSER_PARTITION);

    browserSession.webRequest.onBeforeRequest({ urls: ["http://*/*", "https://*/*"] }, (details, callback) => {
      if (details.resourceType !== "mainFrame" || !details.webContentsId || !isExternalPdfUrl(details.url)) {
        callback({});
        return;
      }

      const tabId = this.findTabIdByWebContentsId(details.webContentsId);
      if (!tabId) {
        callback({});
        return;
      }

      callback({ cancel: true });
      setImmediate(() => this.openPdfExternally(tabId, details.url));
    });

    browserSession.webRequest.onHeadersReceived({ urls: ["http://*/*", "https://*/*"] }, (details, callback) => {
      if (
        details.resourceType !== "mainFrame" ||
        !details.webContentsId ||
        !isPdfResponseHeaders(details.responseHeaders)
      ) {
        callback({});
        return;
      }

      const tabId = this.findTabIdByWebContentsId(details.webContentsId);
      if (!tabId) {
        callback({});
        return;
      }

      callback({ cancel: true });
      setImmediate(() => this.openPdfExternally(tabId, details.url));
    });
  }

  private openPdfExternally(tabId: string, pdfUrl: string): void {
    const tab = this.tabs.get(tabId);
    if (!tab || tab.view.webContents.isDestroyed()) {
      return;
    }

    const noticeUrl = createPdfExternalNoticeUrl(pdfUrl);
    tab.title = "PDF opened externally";
    tab.url = noticeUrl;
    tab.isLoading = false;
    void tab.view.webContents.loadURL(noticeUrl);
    openPdfInSystem(pdfUrl);
    this.emit();
  }

  private findTabIdByWebContentsId(webContentsId: number): string | null {
    for (const tab of this.tabs.values()) {
      if (tab.view.webContents.id === webContentsId) {
        return tab.id;
      }
    }

    return null;
  }

  private syncTabFromView(tabId: string): void {
    const tab = this.tabs.get(tabId);
    if (!tab || tab.view.webContents.isDestroyed()) {
      return;
    }

    const url = tab.view.webContents.getURL();
    tab.url = url;
    tab.title = readableTitle(tab.view.webContents.getTitle(), url);
    tab.isLoading = tab.view.webContents.isLoading();
    tab.canGoBack = tab.view.webContents.canGoBack();
    tab.canGoForward = tab.view.webContents.canGoForward();
    this.emit();
  }

  private patchTab(tabId: string, patch: Partial<Tab>): void {
    const tab = this.tabs.get(tabId);
    if (!tab) {
      return;
    }

    Object.assign(tab, patch);
    this.emit();
  }

  private reconcileAttachedView(): void {
    if (!this.visible || !this.activeTabId) {
      this.detachCurrentView();
      return;
    }

    const activeTab = this.tabs.get(this.activeTabId);
    if (!activeTab) {
      this.detachCurrentView();
      return;
    }

    if (this.attachedViewId !== this.activeTabId) {
      this.detachCurrentView();
      this.host.addChildView(activeTab.view);
      this.attachedViewId = this.activeTabId;
    }

    activeTab.view.setBounds(this.bounds);
  }

  private detachView(tabId: string): void {
    if (this.attachedViewId !== tabId) {
      return;
    }

    const tab = this.tabs.get(tabId);
    if (tab) {
      this.host.removeChildView(tab.view);
    }
    this.attachedViewId = null;
  }

  private detachCurrentView(): void {
    if (!this.attachedViewId) {
      return;
    }

    this.detachView(this.attachedViewId);
  }

  private emit(): void {
    if (!this.window.webContents.isDestroyed()) {
      this.window.webContents.send("tabs:changed", this.getSnapshot());
    }
  }

  private async openPrintPreview(
    tab: ManagedTab,
    screenshotDataUrl: string | null,
    printers: PrinterInfo[]
  ): Promise<void> {
    const previewId = crypto.randomUUID();
    const previewWindow = new BrowserWindow({
      width: 980,
      height: 760,
      minWidth: 720,
      minHeight: 520,
      title: `Print Preview - ${cleanPrintFilePart(tab.title)}`,
      parent: this.window,
      backgroundColor: "#fffaf2",
      autoHideMenuBar: true,
      show: false,
      webPreferences: {
        preload: path.join(__dirname, "printPreviewPreload.cjs"),
        additionalArguments: [`--autopilot-print-preview-id=${previewId}`],
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true
      }
    });

    this.printPreviews.set(previewId, {
      id: previewId,
      tabId: tab.id
    });
    this.printPreviewWindows.add(previewWindow);
    previewWindow.on("closed", () => {
      this.printPreviewWindows.delete(previewWindow);
      this.printPreviews.delete(previewId);
    });
    previewWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    previewWindow.once("ready-to-show", () => previewWindow.show());

    await previewWindow.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(
        createPrintPreviewHtml({
          title: readableTitle(tab.title, tab.url),
          url: tab.url,
          screenshotDataUrl,
          printers
        })
      )}`
    );
    if (!previewWindow.isVisible()) {
      previewWindow.show();
    }
  }

  private get host(): ChildViewHost {
    return this.window.contentView as unknown as ChildViewHost;
  }
}

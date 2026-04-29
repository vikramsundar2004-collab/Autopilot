import { describe, expect, it } from "vitest";

import { createPreviewAutopilotApi } from "../src/renderer/autopilotApi";

describe("browser preview autopilot api", () => {
  it("provides safe versions when Electron preload is unavailable", () => {
    const api = createPreviewAutopilotApi();

    expect(api.runtime).toBe("browser-preview");
    expect(api.versions.chrome).toBe("preview");
  });

  it("provides default bookmarks in browser preview", async () => {
    const api = createPreviewAutopilotApi();

    await expect(api.bookmarks.list()).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: "folder", title: "Starter bookmarks" })])
    );
  });

  it("adds preview bookmarks through the bookmark api", async () => {
    const api = createPreviewAutopilotApi();
    const bookmarks = await api.bookmarks.add({
      title: "Example",
      url: "https://example.com/"
    });

    expect(bookmarks[0]).toEqual(
      expect.objectContaining({
        kind: "bookmark",
        title: "Example",
        url: "https://example.com/"
      })
    );
  });

  it("provides password manager stubs in browser preview", async () => {
    const api = createPreviewAutopilotApi();

    await expect(api.passwords.availability()).resolves.toEqual(
      expect.objectContaining({
        secureStorage: false,
        backend: "Browser preview"
      })
    );
    await expect(api.passwords.list()).resolves.toEqual([]);
  });

  it("provides email sync stubs in browser preview", async () => {
    const api = createPreviewAutopilotApi();

    await expect(api.email.status()).resolves.toEqual(
      expect.objectContaining({
        configured: false,
        connected: false,
        provider: "gmail"
      })
    );
    await expect(api.email.list()).resolves.toEqual([]);
    await expect(api.email.analyzeActions([])).resolves.toEqual(
      expect.objectContaining({
        configured: false,
        actions: []
      })
    );
  });

  it("supports tab actions without window.autopilot", async () => {
    const api = createPreviewAutopilotApi();
    const initial = await api.tabs.getSnapshot();

    const afterCreate = await api.tabs.create();
    expect(afterCreate.tabs).toHaveLength(initial.tabs.length + 1);

    const activeId = afterCreate.activeTabId;
    expect(activeId).toBeTruthy();

    const afterNavigate = await api.tabs.navigate(activeId as string, "example.com");
    expect(afterNavigate.tabs.find((tab) => tab.id === activeId)?.url).toBe("https://example.com");

    const afterClose = await api.tabs.close(activeId as string);
    expect(afterClose.tabs).toHaveLength(initial.tabs.length);
  });

  it("can create a new tab directly at a requested url", async () => {
    const api = createPreviewAutopilotApi();
    const afterCreate = await api.tabs.create("https://mail.google.com/mail/u/0/#inbox/thread-1");

    const activeTab = afterCreate.tabs.find((tab) => tab.id === afterCreate.activeTabId);

    expect(activeTab).toEqual(
      expect.objectContaining({
        title: "mail.google.com",
        url: "https://mail.google.com/mail/u/0/#inbox/thread-1"
      })
    );
  });
});

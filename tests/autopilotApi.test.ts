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

  it("provides a safe external-link opener stub in browser preview", async () => {
    const api = createPreviewAutopilotApi();

    await expect(api.system.openExternalUrl("https://connect.stripe.com/oauth/authorize")).resolves.toEqual({ success: true });
  });

  it("uses a signed-in preview account so local QA can reach workspaces", async () => {
    const api = createPreviewAutopilotApi();

    await expect(api.account.status()).resolves.toEqual(
      expect.objectContaining({
        configured: true,
        signedIn: true,
        userEmail: "preview@autopilot.local",
        backend: expect.objectContaining({
          localDevelopmentMode: true,
          hasSupabaseAnonKey: true
        })
      })
    );
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

  it("provides honest calendar and Gmail organization stubs in browser preview", async () => {
    const api = createPreviewAutopilotApi();

    await expect(
      api.email.organize([
        {
          kind: "label",
          messageId: "message-1",
          label: "Needs follow-up",
          requiresUserCommand: true
        }
      ])
    ).resolves.toEqual(
      expect.objectContaining({
        success: false,
        appliedCount: 0,
        skippedCount: 1,
        reason: expect.stringContaining("Gmail modify scope")
      })
    );

    await expect(
      api.calendar.write({
        action: "create",
        title: "Preview event",
        startAt: Date.now()
      })
    ).resolves.toEqual(
      expect.objectContaining({
        success: false,
        action: "create",
        reason: expect.stringContaining("Calendar write scope")
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

  it("creates prompt-aware preview artifacts instead of generic placeholders", async () => {
    const api = createPreviewAutopilotApi();
    const result = await api.agent.startRun({
      prompt: "Build a client brief for Acme from Jordan Lee's launch timeline email.",
      preferredKind: "document"
    });

    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error("Expected preview artifact generation to succeed.");
    }

    const markdown = result.artifact.versions[0]?.content.kind === "document" ? result.artifact.versions[0].content.markdown : "";
    expect(markdown).toContain("Build a client brief for Acme");
    expect(markdown).toContain("What Autopilot will produce");
  });

  it("creates polished website preview drafts without using the whole prompt as the headline", async () => {
    const api = createPreviewAutopilotApi();
    const result = await api.agent.startRun({
      prompt:
        "Create a polished client-ready website mockup for a robotics tutoring club. Include a hero, pricing, testimonials, and one clear sign-up CTA.",
      preferredKind: "website_design"
    });

    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error("Expected preview website generation to succeed.");
    }

    expect(result.artifact.title).toBe("Robotics Tutoring Club Website");
    const content = result.artifact.versions[0]?.content;
    expect(content?.kind).toBe("website_design");
    if (content?.kind !== "website_design") {
      throw new Error("Expected website content.");
    }
    expect(content.html).toContain("pricing");
    expect(content.html).toContain("testimonials");
    expect(content.html).toContain("Start a session");
    expect(content.html).not.toContain("Include a hero");
  });

  it("provides browser agent stubs in browser preview", async () => {
    const api = createPreviewAutopilotApi();
    const snapshot = await api.tabs.getSnapshot();
    const activeTabId = snapshot.activeTabId as string;

    await expect(api.tabs.readDOM(activeTabId)).resolves.toEqual(
      expect.objectContaining({
        success: true,
        elements: expect.arrayContaining([expect.objectContaining({ selector: expect.any(String) })])
      })
    );
    await expect(api.tabs.clickBySelector(activeTabId, "button")).resolves.toEqual(
      expect.objectContaining({
        success: false,
        action: "click"
      })
    );
    await expect(api.tabs.fillBySelector(activeTabId, "input", "hello")).resolves.toEqual(
      expect.objectContaining({
        success: false,
        action: "fill"
      })
    );
    await expect(api.tabs.scrollTo(activeTabId, 100)).resolves.toEqual(
      expect.objectContaining({
        success: false,
        action: "scroll"
      })
    );
  });

  it("provides Work Twin and Shadow Mode stubs in browser preview", async () => {
    const api = createPreviewAutopilotApi();
    const snapshot = await api.workGraph.list();

    expect(snapshot.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: expect.objectContaining({ kind: "browser-tab" }),
          output: expect.objectContaining({ kind: "browser_summary" })
        })
      ])
    );

    const browserItem = snapshot.items.find((item) => item.source.kind === "browser-tab");
    expect(browserItem).toBeTruthy();

    const startResult = await api.workGraph.startSafeWork(browserItem!.id);
    expect(startResult).toEqual(
      expect.objectContaining({
        success: true,
        reason: expect.stringContaining("safe")
      })
    );

    await expect(api.workGraph.replay(browserItem!.id)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Source" }),
        expect.objectContaining({ label: "Plan" }),
        expect.objectContaining({ label: "Approval" })
      ])
    );

    await expect(api.shadowMode.listRuns()).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ workGraphItemId: browserItem!.id })])
    );

    const ruleResult = await api.workGraph.makeRule(browserItem!.id);
    expect(ruleResult).toEqual(expect.objectContaining({ success: true }));
    await expect(api.shadowMode.listRules()).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ createdFromItemId: browserItem!.id, enabled: true })])
    );
  });

  it("provides Agent Runtime, connector, memory, hook, subagent, and proof stubs in browser preview", async () => {
    const api = createPreviewAutopilotApi();
    const snapshot = await api.workGraph.list();
    const browserItem = snapshot.items.find((item) => item.source.kind === "browser-tab");

    await expect(api.workTwin.getProof(browserItem!.id)).resolves.toEqual(
      expect.objectContaining({
        itemId: browserItem!.id,
        source: expect.stringContaining("Preview tab")
      })
    );

    const trace = await api.runtimeAgent.run({
      workspace: "browser",
      prompt: "Read this form and fill it, but stop before submit.",
      shadowMode: true
    });
    expect(trace.permissionDecisions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ toolName: "browser.readPageText", allowed: true }),
        expect.objectContaining({ toolName: "browser.fill", allowed: false })
      ])
    );
    await expect(api.runtimeAgent.getTrace(trace.id)).resolves.toEqual(expect.objectContaining({ id: trace.id }));
    await expect(api.runtimeAgent.approveTool(trace.id, "browser.fill")).resolves.toEqual(
      expect.objectContaining({
        id: trace.id,
        permissionDecisions: expect.arrayContaining([expect.objectContaining({ toolName: "browser.fill", allowed: true })])
      })
    );

    await expect(api.connectors.list()).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "gmail" }), expect.objectContaining({ id: "google-calendar" })])
    );
    await expect(api.connectors.setEnabled("gmail", false)).resolves.toEqual(
      expect.objectContaining({ auth: expect.objectContaining({ state: "disabled" }) })
    );

    await expect(
      api.memory.update({
        scope: "workspace",
        workspace: "coding",
        key: "review_style",
        value: "Show changed files before approval."
      })
    ).resolves.toEqual(expect.arrayContaining([expect.objectContaining({ key: "review_style" })]));

    await expect(
      api.hooks.test({
        event: "before_command",
        workspace: "coding",
        value: "git reset --hard"
      })
    ).resolves.toEqual(expect.objectContaining({ blocked: true }));

    await expect(api.subagents.run("debugger", "Find the failing test.")).resolves.toEqual(
      expect.objectContaining({
        workspace: "coding",
        intent: expect.stringContaining("Debugger")
      })
    );
  });
});

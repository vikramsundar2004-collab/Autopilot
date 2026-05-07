import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("electron", () => ({
  app: {
    getPath: () => ""
  }
}));

import { ObservabilityStore } from "../src/main/observability";
import { ProductivityTaskStore } from "../src/main/productivityTasks";
import type { EmailActionAnalysisResult, EmailMessageSummary } from "../src/shared/email";

const tempRoots: string[] = [];

async function makeTempRoot(label: string): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), `autopilot-${label}-`));
  tempRoots.push(root);
  return root;
}

afterEach(async () => {
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (root) {
      await rm(root, { recursive: true, force: true });
    }
  }
});

describe("ProductivityTaskStore observability", () => {
  it("writes assignment route and update events to the persistent run log", async () => {
    const root = await makeTempRoot("productivity-run-log");
    let now = Date.parse("2026-05-05T12:00:00Z");
    const observability = new ObservabilityStore(root, () => now);
    const store = new ProductivityTaskStore(root, observability);
    const message: EmailMessageSummary = {
      id: "message-1",
      provider: "gmail",
      threadId: "thread-1",
      from: "Teacher",
      fromEmail: "teacher@example.com",
      subject: "Please draft the slides",
      snippet: "Please prepare a slide deck for Friday.",
      receivedAt: Date.parse("2026-05-05T11:00:00Z"),
      unread: true,
      url: "https://mail.google.com/mail/u/0/#inbox/message-1"
    };
    const analysis: EmailActionAnalysisResult = {
      success: true,
      configured: true,
      model: "test",
      actions: [
        {
          title: "Draft slide deck for Friday",
          context: "Teacher requested slides.",
          sourceMessageId: message.id,
          priority: "high",
          confidence: 0.91,
          requestedOutput: "slide_deck",
          recommendedAssistant: "design",
          reason: "The email asks for a deck.",
          draftSuggested: false
        }
      ]
    };

    await store.syncFromEmailActions([message], analysis);
    const workItems = await store.listWorkItems();
    const routeResult = await store.routeWorkItem(workItems[0].id);
    expect(routeResult?.assignments.length).toBeGreaterThan(0);

    now += 1_000;
    await store.updateWorkAssignment(routeResult?.assignments[0].id ?? "", {
      state: "waiting_for_user",
      runState: "waiting_for_approval",
      qualityScore: 92
    });

    const events = await observability.list();
    expect(events.map((event) => event.kind)).toContain("assignment_routed");
    expect(events.map((event) => event.kind)).toContain("assignment_updated");
    expect(events[0]).toMatchObject({
      workspace: routeResult?.assignments[0].role,
      metadata: {
        state: "waiting_for_user",
        runState: "waiting_for_approval",
        qualityScore: 92
      }
    });
  });
});

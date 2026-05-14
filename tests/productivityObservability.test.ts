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
  it("turns accepted enterprise chat asks into durable routed work items", async () => {
    const root = await makeTempRoot("productivity-chat-task");
    const store = new ProductivityTaskStore(root);

    const tasks = await store.upsertTask({
      id: "chat:action-1",
      title: "Fix the magic-link sign-up glitch before demo",
      context: "Autopilot Team / #engineering - Maya asked Vikram to debug the auth flow.",
      priority: "high",
      source: {
        provider: "chat",
        label: "Autopilot Team / #engineering",
        messageId: "message-1",
        from: "Maya Chen",
        subject: "Fix the magic-link sign-up glitch before demo",
        actionSummary: "@Vikram can you fix the magic-link glitch before demo?",
        actionConfidence: 87,
        requestedOutput: "coding plan or patch",
        recommendedAssistant: "coding",
        routeReason: "Accepted enterprise chat ask from #engineering; route to coding with 87% confidence."
      }
    });

    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({
      id: "chat:action-1",
      source: expect.objectContaining({
        provider: "chat",
        actionConfidence: 87,
        recommendedAssistant: "coding"
      })
    });

    const workItems = await store.listWorkItems();
    expect(workItems[0]).toEqual(
      expect.objectContaining({
        taskId: "chat:action-1",
        source: expect.objectContaining({ provider: "chat" }),
        assignedRoles: expect.arrayContaining(["coding"]),
        routeConfidence: expect.any(Number)
      })
    );

    const route = await store.routeWorkItem(workItems[0].id);
    expect(route?.assignments.map((assignment) => assignment.role)).toContain("coding");
  });

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

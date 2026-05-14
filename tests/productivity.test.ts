import { describe, expect, it } from "vitest";

import { sanitizeProductivityDrafts, sanitizeProductivitySyncSourceIds, sanitizeProductivityTasks } from "../src/shared/productivity";
import { extractActionItemTitles, sanitizeActionItems, sanitizeProductivitySources, type ActionItem } from "../src/renderer/productivity";

describe("extractActionItemTitles", () => {
  it("extracts actionable lines from email-like text", () => {
    expect(
      extractActionItemTitles(`Hi there,

Please send the draft by Friday.
Can you follow up with the design team?
Thanks!`)
    ).toEqual(["Please send the draft by Friday.", "Can you follow up with the design team?"]);
  });

  it("keeps action verbs but does not invent tasks from plain page text", () => {
    expect(extractActionItemTitles("Review quarterly plan\nShare notes\nAutopilot Home")).toEqual(["Review quarterly plan", "Share notes"]);
    expect(extractActionItemTitles("Autopilot Home\nWhere to next?\nSearch Google or enter an address")).toEqual([]);
  });

  it("removes internal Autopilot pages from saved actions", () => {
    const items: ActionItem[] = [
      {
        id: "internal",
        title: "Autopilot Home",
        source: "Calendar",
        context: "Autopilot Home",
        createdAt: 1,
        completedAt: null
      },
      {
        id: "collect-open-tab-tasks",
        title: "Turn useful browser tabs into next actions",
        source: "Web",
        context: "Browser workspace",
        createdAt: 2,
        completedAt: null
      },
      {
        id: "real",
        title: "Reply to the project kickoff thread",
        source: "Email",
        context: "Inbox",
        createdAt: 3,
        completedAt: null
      }
    ];

    expect(sanitizeActionItems(items)).toEqual([items[2]]);
  });

  it("removes the old browser source from productivity source selections", () => {
    expect(sanitizeProductivitySources(["browser", "gmail", "google-calendar", "browser"])).toEqual(["gmail", "google-calendar"]);
    expect(sanitizeProductivitySources(["browser"])).toEqual(["gmail", "google-calendar"]);
  });

  it("keeps backend productivity sync scoped to supported selected sources", () => {
    expect(sanitizeProductivitySyncSourceIds(["gmail", "browser", "google-calendar", "gmail"])).toEqual(["gmail", "google-calendar"]);
    expect(sanitizeProductivitySyncSourceIds(["outlook"])).toEqual(["outlook"]);
    expect(sanitizeProductivitySyncSourceIds(undefined)).toEqual(["gmail", "google-calendar", "slack"]);
  });

  it("sorts durable tasks by open state and priority", () => {
    const tasks = sanitizeProductivityTasks([
      {
        id: "done-low",
        title: "Archive newsletter",
        context: "Gmail",
        state: "done",
        priority: "low",
        source: { provider: "gmail", label: "Gmail" },
        createdAt: 1,
        updatedAt: 10
      },
      {
        id: "todo-high",
        title: "Reply to security alert",
        context: "Google",
        state: "todo",
        priority: "high",
        source: { provider: "gmail", label: "Gmail" },
        createdAt: 1,
        updatedAt: 2
      },
      {
        id: "waiting-high",
        title: "Wait for approval",
        context: "Slack",
        state: "waiting",
        priority: "high",
        source: { provider: "slack", label: "Slack" },
        createdAt: 1,
        updatedAt: 20
      }
    ]);

    expect(tasks.map((task) => task.id)).toEqual(["todo-high", "waiting-high", "done-low"]);
  });

  it("keeps AI email analysis metadata on durable task sources", () => {
    const tasks = sanitizeProductivityTasks([
      {
        id: "email-task",
        title: "Draft response to teacher",
        context: "Prepare a short reply",
        state: "todo",
        priority: "high",
        source: {
          provider: "gmail",
          label: "Teacher - Resume slides",
          messageId: "message-1",
          from: "Teacher",
          subject: "Resume slides",
          actionSummary: "Teacher needs a reply and updated slides.",
          actionConfidence: 91.4,
          requestedOutput: "reply",
          recommendedAssistant: "productivity",
          routeReason: "The email directly asks for a response.",
          draftSuggested: true
        },
        createdAt: 1,
        updatedAt: 2
      }
    ]);

    expect(tasks[0]?.source).toMatchObject({
      actionSummary: "Teacher needs a reply and updated slides.",
      actionConfidence: 91,
      requestedOutput: "reply",
      recommendedAssistant: "productivity",
      routeReason: "The email directly asks for a response.",
      draftSuggested: true
    });
  });

  it("keeps durable productivity drafts clean and sorted", () => {
    const drafts = sanitizeProductivityDrafts([
      {
        id: "older",
        title: " Reply draft  ",
        body: "  Hi team,\n\nHere is the update.  ",
        preview: "",
        status: "needs_review",
        artifactId: "artifact-1",
        artifactKind: "reply",
        source: { provider: "gmail", label: "Gmail", messageId: "message-1" },
        createdAt: 1,
        updatedAt: 2
      },
      {
        title: "Website draft",
        body: "<main>Landing page</main>",
        artifactKind: "website_design",
        source: { provider: "gmail", label: "Gmail" },
        createdAt: 1,
        updatedAt: 3
      },
      {
        title: "Broken draft without body",
        body: "",
        artifactKind: "document",
        source: { provider: "gmail", label: "Gmail" },
        createdAt: 1,
        updatedAt: 4
      }
    ]);

    expect(drafts).toHaveLength(2);
    expect(drafts[0].title).toBe("Website draft");
    expect(drafts[1]).toMatchObject({
      id: "older",
      title: "Reply draft",
      body: "Hi team,\n\nHere is the update.",
      preview: "Hi team, Here is the update.",
      status: "needs_review",
      artifactKind: "reply"
    });
  });
});

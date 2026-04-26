import { describe, expect, it } from "vitest";

import { extractActionItemTitles, sanitizeActionItems, type ActionItem } from "../src/renderer/productivity";

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
});

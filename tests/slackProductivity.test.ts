import { describe, expect, it } from "vitest";

import { createTaskFromSlackMessage } from "../src/main/productivityTasks";
import { createWorkItemFromTask } from "../src/shared/workItems";

describe("Slack productivity routing", () => {
  it("turns actionable Slack requests into routed WorkItems with source metadata", () => {
    const task = createTaskFromSlackMessage(
      {
        id: "C123:1714770000.000000",
        channelId: "C123",
        channelName: "launch",
        user: "Jordan",
        text: "Can you draft the Q4 pitch deck and send it for review by Friday?",
        url: "slack://channel?team=&id=C123&message=1714770000.000000",
        createdAt: Date.UTC(2026, 4, 3, 16, 0, 0)
      },
      Date.UTC(2026, 4, 3, 16, 5, 0)
    );

    expect(task).toEqual(
      expect.objectContaining({
        priority: "high",
        source: expect.objectContaining({
          provider: "slack",
          from: "Jordan",
          requestedOutput: "slide deck",
          recommendedAssistant: "design",
          routeReason: expect.stringContaining("Slack message")
        })
      })
    );

    const workItem = createWorkItemFromTask(task!);

    expect(workItem.assignedRoles).toEqual(expect.arrayContaining(["design", "productivity"]));
    expect(workItem.routeConfidence).toBeGreaterThanOrEqual(70);
    expect(workItem.permissionLevel).toBe("approval");
    expect(workItem.people).toContain("Jordan");
  });

  it("keeps non-action Slack chatter out of the work queue", () => {
    const task = createTaskFromSlackMessage({
      id: "C123:1714770001.000000",
      channelId: "C123",
      channelName: "general",
      user: "Priya",
      text: "FYI the office snacks arrived.",
      createdAt: Date.UTC(2026, 4, 3, 16, 0, 0)
    });

    expect(task).toBeNull();
  });
});

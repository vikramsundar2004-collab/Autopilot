import { describe, expect, it } from "vitest";

import { buildProactiveWorkPlan } from "../src/shared/proactiveWork";
import type { WorkAssignment, WorkItem } from "../src/shared/workItems";

const NOW = Date.UTC(2026, 4, 3, 16, 0, 0);

function makeWorkItem(overrides: Partial<WorkItem> = {}): WorkItem {
  return {
    id: "work:1",
    taskId: "task:1",
    title: "Draft reply to teacher before sending",
    context: "Write a helpful response, but wait for approval before sending.",
    source: {
      provider: "gmail",
      label: "Gmail",
      from: "Teacher",
      subject: "Can you send this today?"
    },
    state: "open",
    priority: "high",
    assignedRoles: ["productivity"],
    people: ["Teacher"],
    requestedOutput: "reply draft",
    extractedRequirements: ["Write a helpful response, but wait for approval before sending."],
    sourceRisk: "medium",
    aiSuggestedPrep: "Draft the reply or admin step for review.",
    routeConfidence: 88,
    routeReason: "Matched productivity work from the source request.",
    permissionLevel: "approval",
    createdAt: NOW - 60_000,
    updatedAt: NOW - 60_000,
    ...overrides
  };
}

function makeAssignment(workItem: WorkItem, overrides: Partial<WorkAssignment> = {}): WorkAssignment {
  return {
    id: `assignment:${workItem.id}:productivity`,
    workItemId: workItem.id,
    role: "productivity",
    state: "queued",
    title: "Draft reply",
    reason: "Autopilot can prepare local work.",
    outputRefs: [],
    approvalState: "not_required",
    createdAt: NOW - 30_000,
    updatedAt: NOW - 30_000,
    ...overrides
  };
}

describe("proactive work planner", () => {
  it("starts local prep for approval-gated email work without pretending it can send", () => {
    const workItem = makeWorkItem();
    const plan = buildProactiveWorkPlan({ workItems: [workItem], assignments: [], now: NOW });

    expect(plan.readyCount).toBe(1);
    expect(plan.startableItems[0]?.workItemId).toBe(workItem.id);
    expect(plan.startableItems[0]?.safety).toBe("approval_gated");
    expect(plan.startableItems[0]?.nextStep).toContain("stop before any send");
  });

  it("keeps calendar events out of proactive AI execution", () => {
    const calendarItem = makeWorkItem({
      id: "work:calendar",
      title: "Prepare for coding class",
      context: "Calendar event starts soon.",
      source: {
        provider: "google-calendar",
        label: "Google Calendar",
        calendarName: "Classes",
        subject: "Coding class",
        eventStartAt: NOW + 60_000
      },
      assignedRoles: ["productivity"]
    });
    const plan = buildProactiveWorkPlan({ workItems: [calendarItem], assignments: [], now: NOW });

    expect(plan.readyCount).toBe(0);
    expect(plan.items[0]?.status).toBe("user_only");
    expect(plan.items[0]?.reason).toContain("Calendar events stay on the calendar");
  });

  it("surfaces prepared assignments as review work before starting more", () => {
    const reviewItem = makeWorkItem({
      id: "work:review",
      title: "Review prepared document",
      assignedRoles: ["design"]
    });
    const readyItem = makeWorkItem({
      id: "work:ready",
      title: "Generate weekly research brief",
      assignedRoles: ["automation"],
      priority: "medium"
    });
    const plan = buildProactiveWorkPlan({
      workItems: [readyItem, reviewItem],
      assignments: [makeAssignment(reviewItem, { role: "design", state: "waiting_for_user" })],
      now: NOW
    });

    expect(plan.needsReviewCount).toBe(1);
    expect(plan.readyCount).toBe(1);
    expect(plan.items[0]?.workItemId).toBe(reviewItem.id);
    expect(plan.items[0]?.status).toBe("needs_review");
  });

  it("requires review before starting low-confidence routes", () => {
    const vagueItem = makeWorkItem({
      id: "work:vague",
      title: "Look at this when you can",
      context: "The source does not clearly ask for a draft, artifact, automation, or code change.",
      assignedRoles: ["productivity"],
      routeConfidence: 64
    });
    const plan = buildProactiveWorkPlan({ workItems: [vagueItem], assignments: [], now: NOW });

    expect(plan.readyCount).toBe(0);
    expect(plan.needsReviewCount).toBe(1);
    expect(plan.items[0]?.status).toBe("needs_review");
    expect(plan.items[0]?.reason).toContain("Route confidence is 64/100");
  });
});

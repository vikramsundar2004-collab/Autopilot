import { describe, expect, it } from "vitest";

import { buildTodaysCallPlan } from "../src/shared/todaysCall";
import type { WorkAssignment, WorkItem, WorkspaceRole } from "../src/shared/workItems";

const NOW = Date.UTC(2026, 4, 3, 16, 0, 0);

function makeWorkItem(overrides: Partial<WorkItem> = {}): WorkItem {
  return {
    id: "work:1",
    taskId: "task:1",
    title: "Draft response to teacher",
    context: "Prepare a clear reply, but wait before sending.",
    source: {
      provider: "gmail",
      label: "Gmail",
      from: "Teacher",
      subject: "Resume slides"
    },
    state: "open",
    priority: "medium",
    assignedRoles: ["productivity"],
    people: ["Teacher"],
    requestedOutput: "reply draft",
    extractedRequirements: ["Prepare a clear reply, but wait before sending."],
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

function makeAssignment(workItem: WorkItem, role: WorkspaceRole, overrides: Partial<WorkAssignment> = {}): WorkAssignment {
  return {
    id: `assignment:${workItem.id}:${role}`,
    workItemId: workItem.id,
    role,
    state: "queued",
    title: `Handle ${role} work`,
    reason: "Routed by Autopilot.",
    outputRefs: [],
    approvalState: "not_required",
    createdAt: NOW - 30_000,
    updatedAt: NOW - 30_000,
    ...overrides
  };
}

describe("today's call planner", () => {
  it("puts AI-handleable document work at the top with a concrete start action", () => {
    const item = makeWorkItem({
      title: "Create scholarship slide deck",
      context: "Use the email details to build a polished deck for review.",
      priority: "high",
      assignedRoles: ["design"]
    });

    const plan = buildTodaysCallPlan({ workItems: [item], assignments: [], now: NOW });

    expect(plan.topMove?.workItemId).toBe(item.id);
    expect(plan.topMove?.bucket).toBe("ai_can_handle");
    expect(plan.topMove?.actionLabel).toBe("Start Autopilot");
    expect(plan.topMove?.instruction).toContain("create the document");
  });

  it("prioritizes prepared work that needs user approval", () => {
    const approvalItem = makeWorkItem({
      id: "work:approval",
      title: "Approve final reply before sending",
      priority: "medium",
      assignedRoles: ["productivity"]
    });
    const draftItem = makeWorkItem({
      id: "work:draft",
      title: "Generate weekly industry brief",
      context: "Research competitors and write a source-backed brief.",
      priority: "high",
      assignedRoles: ["automation"]
    });

    const plan = buildTodaysCallPlan({
      workItems: [draftItem, approvalItem],
      assignments: [makeAssignment(approvalItem, "productivity", { state: "waiting_for_user" })],
      now: NOW
    });

    expect(plan.topMove?.workItemId).toBe(approvalItem.id);
    expect(plan.topMove?.bucket).toBe("needs_approval");
    expect(plan.topMove?.actionLabel).toBe("Review output");
  });

  it("keeps completed AI output in the review lane instead of making it look unstarted", () => {
    const artifactItem = makeWorkItem({
      id: "work:artifact",
      title: "Generated scholarship deck",
      assignedRoles: ["design"]
    });

    const plan = buildTodaysCallPlan({
      workItems: [artifactItem],
      assignments: [
        makeAssignment(artifactItem, "design", {
          state: "completed",
          approvalState: "needs_review",
          linkedArtifactId: "artifact:deck"
        })
      ],
      now: NOW
    });

    expect(plan.topMove?.bucket).toBe("needs_approval");
    expect(plan.buckets.needs_approval.map((move) => move.workItemId)).toContain(artifactItem.id);
  });

  it("separates calendar and approval-sensitive work from AI-safe work", () => {
    const calendarItem = makeWorkItem({
      id: "work:calendar",
      title: "Attend biology meeting",
      context: "Meeting starts soon and requires attendance.",
      source: {
        provider: "google-calendar",
        label: "Google Calendar",
        calendarName: "School",
        subject: "Biology meeting",
        eventStartAt: NOW + 90 * 60_000
      },
      assignedRoles: ["productivity"]
    });
    const aiItem = makeWorkItem({
      id: "work:ai",
      title: "Draft a document from the email",
      assignedRoles: ["design"]
    });

    const plan = buildTodaysCallPlan({ workItems: [calendarItem, aiItem], assignments: [], now: NOW });

    expect(plan.buckets.user_must_handle.map((move) => move.workItemId)).toContain(calendarItem.id);
    expect(plan.buckets.ai_can_handle.map((move) => move.workItemId)).toContain(aiItem.id);
    expect(plan.sourceBreakdown).toEqual(
      expect.arrayContaining([
        { label: "Calendar", count: 1 },
        { label: "Gmail", count: 1 }
      ])
    );
  });

  it("puts low-confidence routes into approval instead of the startable lane", () => {
    const vagueItem = makeWorkItem({
      id: "work:vague",
      title: "Look at this later",
      context: "The source is unclear about the requested output.",
      assignedRoles: ["productivity"],
      routeConfidence: 64
    });

    const plan = buildTodaysCallPlan({ workItems: [vagueItem], assignments: [], now: NOW });

    expect(plan.buckets.needs_approval.map((move) => move.workItemId)).toContain(vagueItem.id);
    expect(plan.buckets.ai_can_handle.map((move) => move.workItemId)).not.toContain(vagueItem.id);
    expect(plan.topMove?.reason).toContain("confirm the route");
  });
});

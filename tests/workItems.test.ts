import { describe, expect, it } from "vitest";

import type { ProductivityTask } from "../src/shared/productivity";
import {
  createAssignmentsForWorkItem,
  createWorkItemFromTask,
  getWorkItemOwnership,
  getWorkItemPermissionLevel,
  needsRouteReview,
  routeWorkspaceRoles,
  sanitizeWorkAssignments,
  summarizeWorkAssignmentTrail
} from "../src/shared/workItems";

function makeTask(overrides: Partial<ProductivityTask>): ProductivityTask {
  return {
    id: "task-1",
    title: "Follow up",
    context: "Prepare a response",
    state: "todo",
    priority: "medium",
    source: {
      provider: "gmail",
      label: "Gmail"
    },
    createdAt: 1,
    updatedAt: 1,
    ...overrides
  };
}

describe("work item routing", () => {
  it("routes documents and decks to Design", () => {
    const roles = routeWorkspaceRoles(
      makeTask({
        title: "Create a slide deck for the scholarship meeting",
        context: "Use the email thread to make a polished presentation"
      })
    );

    expect(roles).toContain("design");
  });

  it("routes repo and build work to Coding", () => {
    const roles = routeWorkspaceRoles(
      makeTask({
        title: "Debug GitHub repo deploy failure",
        context: "The TypeScript build is failing in CI"
      })
    );

    expect(roles).toContain("coding");
  });

  it("routes recurring briefs and research to Automation", () => {
    const roles = routeWorkspaceRoles(
      makeTask({
        title: "Generate a daily industry brief",
        context: "Research competitors and market trends every morning"
      })
    );

    expect(roles).toContain("automation");
  });

  it("keeps Google Calendar events in Productivity even when the title looks like coding or design work", () => {
    const calendarTask = makeTask({
      title: "Prepare for: Coding class with Matt",
      context: "Calendar event starts today",
      source: {
        provider: "google-calendar",
        label: "Classes - Coding class with Matt",
        calendarName: "Classes",
        subject: "Coding class with Matt",
        eventStartAt: Date.parse("2026-05-03T19:30:00Z")
      }
    });
    const workItem = createWorkItemFromTask(calendarTask);

    expect(routeWorkspaceRoles(calendarTask)).toEqual(["productivity"]);
    expect(workItem.assignedRoles).toEqual(["productivity"]);
    expect(workItem.routeReason).toContain("Calendar events stay");
    expect(workItem.permissionLevel).toBe("read");
    expect(workItem.requestedOutput).toBe("calendar commitment");
    expect(getWorkItemOwnership(workItem)).toBe("user");
  });

  it("normalizes stale routed Calendar work back to a user-owned open item", () => {
    const calendarTask = makeTask({
      title: "Prepare for: calendar updating",
      context: "Calendar event starts today",
      source: {
        provider: "google-calendar",
        label: "Personal - calendar updating",
        calendarName: "Personal",
        subject: "calendar updating",
        eventStartAt: Date.parse("2026-05-03T20:15:00Z")
      }
    });
    const staleWorkItem = createWorkItemFromTask(calendarTask, {
      ...createWorkItemFromTask(calendarTask),
      state: "working",
      assignedRoles: ["coding"]
    });

    expect(staleWorkItem.state).toBe("open");
    expect(staleWorkItem.assignedRoles).toEqual(["productivity"]);
    expect(staleWorkItem.permissionLevel).toBe("read");
    expect(getWorkItemOwnership(staleWorkItem)).toBe("user");
  });

  it("creates one durable assignment per routed role", () => {
    const workItem = createWorkItemFromTask(
      makeTask({
        title: "Draft a website design and implementation plan",
        context: "Create the design, then prepare coding work from it"
      })
    );
    const assignments = createAssignmentsForWorkItem(workItem);

    expect(assignments.map((assignment) => assignment.role)).toEqual(expect.arrayContaining(["design", "coding"]));
    expect(assignments.every((assignment) => assignment.state === "queued")).toBe(true);
  });

  it("sanitizes persisted assignment state", () => {
    const [assignment] = sanitizeWorkAssignments([
      {
        workItemId: "work:task-1",
        role: "automation",
        state: "mystery",
        title: "Run automation",
        reason: "Research-heavy work"
      }
    ]);

    expect(assignment.state).toBe("queued");
    expect(assignment.role).toBe("automation");
  });

  it("preserves linked draft outputs when assignments are rebuilt", () => {
    const workItem = createWorkItemFromTask(
      makeTask({
        title: "Draft a reply to the teacher",
        context: "Write a response, but wait for approval before sending."
      })
    );
    const [persisted] = sanitizeWorkAssignments([
      {
        id: "assignment:work:task-1:productivity",
        workItemId: workItem.id,
        role: "productivity",
        state: "waiting_for_user",
        title: "Prepare response draft",
        reason: "Reply work stays in Productivity.",
        linkedDraftId: "draft:teacher-response",
        createdAt: 1,
        updatedAt: 2
      }
    ]);
    const assignments = createAssignmentsForWorkItem(workItem, [persisted]);
    const productivityAssignment = assignments.find((assignment) => assignment.role === "productivity");

    expect(productivityAssignment?.linkedDraftId).toBe("draft:teacher-response");
    expect(productivityAssignment?.outputRefs).toContainEqual({ kind: "draft", id: "draft:teacher-response", label: "Productivity draft" });
    expect(productivityAssignment?.approvalState).toBe("needs_review");
    expect(productivityAssignment?.state).toBe("waiting_for_user");
  });

  it("summarizes assignment run trail for visible review", () => {
    const [assignment] = sanitizeWorkAssignments([
      {
        id: "assignment:work:task-1:design",
        workItemId: "work:task-1",
        role: "design",
        state: "waiting_for_user",
        title: "Create artifact",
        reason: "The request needs a deck.",
        runState: "quality_check",
        qualityScore: 82,
        outputRefs: [{ kind: "artifact", id: "artifact-1", label: "Design artifact" }],
        lastRunSummary: "Drafted 5 slides from the source email.",
        approvalState: "needs_review"
      }
    ]);

    expect(summarizeWorkAssignmentTrail(assignment)).toEqual([
      "Run: quality check",
      "Quality: 82/100",
      "Output: Design artifact",
      "Approval: needs review",
      "Last run: Drafted 5 slides from the source email."
    ]);
  });

  it("separates AI-handleable work from user-only decisions", () => {
    const aiWork = createWorkItemFromTask(
      makeTask({
        title: "Generate a weekly industry brief",
        context: "Research competitors and produce a source-backed document"
      })
    );
    const userWork = createWorkItemFromTask(
      makeTask({
        title: "Approve final scholarship response",
        context: "User needs to confirm before sending"
      })
    );

    expect(getWorkItemOwnership(aiWork)).toBe("ai");
    expect(getWorkItemPermissionLevel(aiWork)).toBe("draft");
    expect(getWorkItemOwnership(userWork)).toBe("user");
    expect(getWorkItemPermissionLevel(userWork)).toBe("approval");
  });

  it("allows Autopilot to draft replies while keeping final sending approval-gated", () => {
    const workItem = createWorkItemFromTask(
      makeTask({
        title: "Draft response to teacher before sending",
        context: "Write the reply now, but wait for me before sending it."
      })
    );

    expect(getWorkItemOwnership(workItem)).toBe("ai");
    expect(getWorkItemPermissionLevel(workItem)).toBe("approval");
  });

  it("marks vague routes for review instead of letting proactive work auto-start them", () => {
    const workItem = createWorkItemFromTask(
      makeTask({
        title: "Look at this",
        context: "Not sure what needs to happen here.",
        source: {
          provider: "gmail",
          label: "Gmail",
          from: "Someone",
          subject: "Thing"
        }
      })
    );

    expect(workItem.routeConfidence).toBeLessThan(70);
    expect(needsRouteReview(workItem)).toBe(true);
  });
});

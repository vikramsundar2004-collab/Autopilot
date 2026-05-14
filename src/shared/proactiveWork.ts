import {
  getWorkItemOwnership,
  getWorkItemPermissionLevel,
  getWorkItemSourceSummary,
  getRouteReviewReason,
  needsRouteReview,
  type WorkAssignment,
  type WorkItem,
  type WorkItemPermissionLevel,
  type WorkspaceRole
} from "./workItems.js";

export type ProactiveWorkStatus = "ready_to_start" | "already_working" | "needs_review" | "user_only";

export type ProactiveWorkSafety = "read_only" | "local_draft" | "approval_gated";

export type ProactiveWorkItem = {
  id: string;
  workItemId: string;
  title: string;
  source: string;
  roles: WorkspaceRole[];
  status: ProactiveWorkStatus;
  statusLabel: string;
  safety: ProactiveWorkSafety;
  permission: WorkItemPermissionLevel;
  canStart: boolean;
  reviewRequired: boolean;
  reason: string;
  nextStep: string;
  score: number;
};

export type ProactiveWorkPlan = {
  generatedAt: number;
  headline: string;
  summary: string;
  readyCount: number;
  workingCount: number;
  needsReviewCount: number;
  userOnlyCount: number;
  items: ProactiveWorkItem[];
  startableItems: ProactiveWorkItem[];
};

export type BuildProactiveWorkPlanInput = {
  workItems: WorkItem[];
  assignments: WorkAssignment[];
  now?: number;
};

export function buildProactiveWorkPlan(input: BuildProactiveWorkPlanInput): ProactiveWorkPlan {
  const now = input.now ?? Date.now();
  const assignmentsByWorkItemId = groupAssignmentsByWorkItemId(input.assignments);
  const items = input.workItems
    .filter((item) => item.state !== "done")
    .map((item) => buildProactiveItem(item, assignmentsByWorkItemId.get(item.id) ?? [], now))
    .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title));
  const startableItems = items.filter((item) => item.canStart);
  const workingCount = items.filter((item) => item.status === "already_working").length;
  const needsReviewCount = items.filter((item) => item.status === "needs_review").length;
  const userOnlyCount = items.filter((item) => item.status === "user_only").length;

  return {
    generatedAt: now,
    headline:
      startableItems.length > 0
        ? `Autopilot can start ${startableItems.length} safe ${startableItems.length === 1 ? "work item" : "work items"} now.`
        : needsReviewCount > 0
          ? `${needsReviewCount} prepared ${needsReviewCount === 1 ? "item needs" : "items need"} review.`
          : "Autopilot is waiting for the next safe handoff.",
    summary:
      startableItems.length > 0
        ? "It will only generate, draft, research, or prepare local work. Sending, publishing, submitting, deleting, payments, and sharing still stop for approval."
        : "Sync Gmail and Calendar to find work, or review finished outputs before any external step happens.",
    readyCount: startableItems.length,
    workingCount,
    needsReviewCount,
    userOnlyCount,
    items,
    startableItems
  };
}

function buildProactiveItem(item: WorkItem, assignments: WorkAssignment[], now: number): ProactiveWorkItem {
  const status = getProactiveStatus(item, assignments);
  const permission = getWorkItemPermissionLevel(item);
  const safety = getSafety(permission);
  const reviewRequired = status === "needs_review" || permission === "approval";
  const canStart = status === "ready_to_start";

  return {
    id: `proactive:${item.id}`,
    workItemId: item.id,
    title: item.title,
    source: getWorkItemSourceSummary(item),
    roles: item.assignedRoles,
    status,
    statusLabel: getStatusLabel(status),
    safety,
    permission,
    canStart,
    reviewRequired,
    reason: getReason(item, assignments, status, permission),
    nextStep: getNextStep(item, status, permission),
    score: scoreItem(item, assignments, status, now)
  };
}

function getProactiveStatus(item: WorkItem, assignments: WorkAssignment[]): ProactiveWorkStatus {
  if (item.source.provider === "google-calendar") {
    return "user_only";
  }

  if (needsRouteReview(item)) {
    return "needs_review";
  }

  if (
    assignments.some(
      (assignment) =>
        assignment.state === "waiting_for_user" ||
        assignment.state === "completed" ||
        assignment.state === "failed" ||
        assignment.approvalState === "needs_review" ||
        assignment.approvalState === "rejected"
    )
  ) {
    return "needs_review";
  }

  if (item.state === "working" || assignments.some((assignment) => assignment.state === "running")) {
    return "already_working";
  }

  return getWorkItemOwnership(item) === "ai" ? "ready_to_start" : "user_only";
}

function getSafety(permission: WorkItemPermissionLevel): ProactiveWorkSafety {
  if (permission === "approval") {
    return "approval_gated";
  }

  if (permission === "draft") {
    return "local_draft";
  }

  return "read_only";
}

function getStatusLabel(status: ProactiveWorkStatus): string {
  switch (status) {
    case "ready_to_start":
      return "Ready to start";
    case "already_working":
      return "Working now";
    case "needs_review":
      return "Needs review";
    case "user_only":
      return "User handles";
  }
}

function getReason(item: WorkItem, _assignments: WorkAssignment[], status: ProactiveWorkStatus, permission: WorkItemPermissionLevel): string {
  if (status === "needs_review") {
    return needsRouteReview(item) ? getRouteReviewReason(item) : "Autopilot has prepared output or a handoff; the next step is human review.";
  }

  if (status === "already_working") {
    return "A routed assignment is already running for this item.";
  }

  if (status === "user_only") {
    return item.source.provider === "google-calendar"
      ? "Calendar events stay on the calendar and require the user to attend, decide, or act."
      : "This item needs judgment, confirmation, attendance, or another user-only step.";
  }

  if (permission === "approval") {
    return "Autopilot can prepare the local draft, but the external final step is approval-gated.";
  }

  return "Autopilot can safely prepare this before the user asks.";
}

function getNextStep(item: WorkItem, status: ProactiveWorkStatus, permission: WorkItemPermissionLevel): string {
  if (status === "needs_review") {
    return "Preview the output, then approve, edit, or reject it.";
  }

  if (status === "already_working") {
    return "Watch the run log and wait for reviewable output.";
  }

  if (status === "user_only") {
    return "Keep the source visible so the user can make the final decision.";
  }

  const roleCopy = item.assignedRoles.map((role) => {
    switch (role) {
      case "design":
        return "create a reviewable artifact";
      case "coding":
        return "prepare a coding plan";
      case "automation":
        return "run a quality-checked automation";
      case "productivity":
        return "draft the reply or admin step";
    }
  });
  const stopCopy = permission === "approval" ? " and stop before any send/share/submit step" : "";
  return `${dedupe(roleCopy).join(", then ")}${stopCopy}.`;
}

function scoreItem(item: WorkItem, assignments: WorkAssignment[], status: ProactiveWorkStatus, now: number): number {
  const priorityScore = item.priority === "high" ? 80 : item.priority === "medium" ? 48 : 18;
  const statusScore = status === "needs_review" ? 90 : status === "ready_to_start" ? 70 : status === "already_working" ? 28 : 10;
  const roleScore = item.assignedRoles.some((role) => role === "design" || role === "coding" || role === "automation") ? 18 : 6;
  const stalePenalty = Math.min(18, Math.floor(Math.max(0, now - item.updatedAt) / (24 * 60 * 60 * 1000)) * 2);
  const failedPenalty = assignments.some((assignment) => assignment.state === "failed") ? -24 : 0;
  return priorityScore + statusScore + roleScore - stalePenalty + failedPenalty;
}

function groupAssignmentsByWorkItemId(assignments: WorkAssignment[]): Map<string, WorkAssignment[]> {
  const map = new Map<string, WorkAssignment[]>();
  for (const assignment of assignments) {
    map.set(assignment.workItemId, [...(map.get(assignment.workItemId) ?? []), assignment]);
  }
  return map;
}

function dedupe(values: string[]): string[] {
  return [...new Set(values)];
}

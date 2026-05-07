import {
  getWorkItemOwnership,
  getWorkItemPermissionLevel,
  getWorkItemSourceSummary,
  needsRouteReview,
  type WorkAssignment,
  type WorkItem,
  type WorkItemPermissionLevel,
  type WorkspaceRole
} from "./workItems.js";

export type TodaysCallBucket = "ai_can_handle" | "ai_working" | "needs_approval" | "user_must_handle";

export type TodaysCallMove = {
  id: string;
  workItemId: string;
  title: string;
  instruction: string;
  source: string;
  reason: string;
  status: string;
  actionLabel: string;
  bucket: TodaysCallBucket;
  roles: WorkspaceRole[];
  priority: WorkItem["priority"];
  permission: WorkItemPermissionLevel;
  score: number;
  dueAt?: number;
};

export type TodaysCallPlan = {
  generatedAt: number;
  headline: string;
  subheadline: string;
  empty: boolean;
  openCount: number;
  urgentCount: number;
  aiCanHandleCount: number;
  aiWorkingCount: number;
  needsApprovalCount: number;
  userMustHandleCount: number;
  focusMinutes: number;
  sourceCount: number;
  sourceBreakdown: Array<{ label: string; count: number }>;
  topMove: TodaysCallMove | null;
  firstUserMove: TodaysCallMove | null;
  firstAutopilotMove: TodaysCallMove | null;
  approvalQueue: TodaysCallMove[];
  nextMoves: TodaysCallMove[];
  buckets: Record<TodaysCallBucket, TodaysCallMove[]>;
};

export type BuildTodaysCallPlanInput = {
  workItems: WorkItem[];
  assignments: WorkAssignment[];
  now?: number;
};

const BUCKET_LABELS: Record<TodaysCallBucket, string> = {
  ai_can_handle: "Needs doing",
  ai_working: "AI working",
  needs_approval: "Needs approval",
  user_must_handle: "User must handle"
};

export function buildTodaysCallPlan(input: BuildTodaysCallPlanInput): TodaysCallPlan {
  const now = input.now ?? Date.now();
  const openItems = input.workItems.filter((item) => item.state !== "done");
  const assignmentsByWorkItemId = groupAssignmentsByWorkItemId(input.assignments);
  const moves = openItems.map((item) => createMove(item, assignmentsByWorkItemId.get(item.id) ?? [], now)).sort((left, right) => right.score - left.score);
  const buckets = groupMovesByBucket(moves);
  const topMove = moves[0] ?? null;
  const firstUserMove = buckets.user_must_handle[0] ?? null;
  const firstAutopilotMove = buckets.ai_can_handle[0] ?? buckets.ai_working[0] ?? null;
  const approvalQueue = buckets.needs_approval.slice(0, 8);
  const urgentCount = openItems.filter((item) => item.priority === "high" || isUrgentText(`${item.title} ${item.context}`)).length;
  const sourceBreakdown = buildSourceBreakdown(openItems);
  const focusMinutes = estimateFocusMinutes(moves);
  const headline = topMove
    ? `${openItems.length} ${openItems.length === 1 ? "thing needs" : "things need"} action. Start with ${truncateForHeadline(topMove.title)}.`
    : "Nothing needs action yet.";
  const subheadline = topMove
    ? `${topMove.reason} Autopilot should ${topMove.instruction.toLowerCase()}`
    : "Connect Gmail and Calendar, then Autopilot will build the day plan and start preparing what it can.";

  return {
    generatedAt: now,
    headline,
    subheadline,
    empty: moves.length === 0,
    openCount: openItems.length,
    urgentCount,
    aiCanHandleCount: buckets.ai_can_handle.length,
    aiWorkingCount: buckets.ai_working.length,
    needsApprovalCount: buckets.needs_approval.length,
    userMustHandleCount: buckets.user_must_handle.length,
    focusMinutes,
    sourceCount: sourceBreakdown.length,
    sourceBreakdown,
    topMove,
    firstUserMove,
    firstAutopilotMove,
    approvalQueue,
    nextMoves: moves.slice(0, 5),
    buckets
  };
}

function createMove(item: WorkItem, assignments: WorkAssignment[], now: number): TodaysCallMove {
  const bucket = getMoveBucket(item, assignments);
  const permission = getWorkItemPermissionLevel(item);
  const dueAt = item.source.eventStartAt;
  const roles = item.assignedRoles;
  return {
    id: `today:${item.id}`,
    workItemId: item.id,
    title: item.title,
    instruction: getMoveInstruction(item, bucket),
    source: getWorkItemSourceSummary(item),
    reason: getMoveReason(item, bucket, dueAt, now),
    status: BUCKET_LABELS[bucket],
    actionLabel: getMoveActionLabel(bucket),
    bucket,
    roles,
    priority: item.priority,
    permission,
    score: scoreMove(item, bucket, assignments, now),
    dueAt
  };
}

function getMoveBucket(item: WorkItem, assignments: WorkAssignment[]): TodaysCallBucket {
  if (item.source.provider === "google-calendar") {
    return "user_must_handle";
  }

  if (needsRouteReview(item)) {
    return "needs_approval";
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
    return "needs_approval";
  }

  if (assignments.some((assignment) => assignment.state === "running")) {
    return "ai_working";
  }

  if (getWorkItemOwnership(item) === "user" && !item.assignedRoles.some((role) => role === "design" || role === "coding" || role === "automation")) {
    return "user_must_handle";
  }

  return "ai_can_handle";
}

function getMoveInstruction(item: WorkItem, bucket: TodaysCallBucket): string {
  if (bucket === "needs_approval") {
    return "review the prepared output and approve, edit, or reject it.";
  }

  if (bucket === "ai_working") {
    return "keep working and show the run log, output, and next approval step.";
  }

  if (bucket === "user_must_handle") {
    return "put this in front of you with the source and the decision that only you can make.";
  }

  const roleActions = item.assignedRoles.map((role) => {
    switch (role) {
      case "design":
        return "create the document, deck, or design artifact";
      case "coding":
        return "prepare a coding plan and reviewable change";
      case "automation":
        return "run the reusable workflow and quality-check the result";
      case "productivity":
        return "draft the reply, scheduling step, or admin follow-up";
    }
  });
  return dedupe(roleActions).join(", then ") || "prepare the first draft.";
}

function getMoveReason(item: WorkItem, bucket: TodaysCallBucket, dueAt: number | undefined, now: number): string {
  if (bucket === "needs_approval") {
    return needsRouteReview(item)
      ? "Autopilot needs you to confirm the route before it starts this low-confidence handoff."
      : "Work is already prepared; the fastest progress is reviewing the final step.";
  }

  if (bucket === "ai_working") {
    return "Autopilot is already moving on this, so the useful move is to monitor progress.";
  }

  if (typeof dueAt === "number") {
    const hoursUntilDue = (dueAt - now) / (60 * 60 * 1000);
    if (hoursUntilDue >= 0 && hoursUntilDue <= 24) {
      return "This is tied to a calendar event in the next 24 hours.";
    }
  }

  if (item.priority === "high" || isUrgentText(`${item.title} ${item.context}`)) {
    return "It is marked high priority or contains urgent language.";
  }

  if (bucket === "user_must_handle") {
    return "This needs your judgment, attendance, confirmation, or final decision.";
  }

  return "It is the best AI-handleable item Autopilot can prepare next.";
}

function getMoveActionLabel(bucket: TodaysCallBucket): string {
  switch (bucket) {
    case "ai_can_handle":
      return "Start Autopilot";
    case "ai_working":
      return "View progress";
    case "needs_approval":
      return "Review output";
    case "user_must_handle":
      return "Open details";
  }
}

function scoreMove(item: WorkItem, bucket: TodaysCallBucket, assignments: WorkAssignment[], now: number): number {
  const priorityScore = item.priority === "high" ? 70 : item.priority === "medium" ? 42 : 18;
  const bucketScore = bucket === "needs_approval" ? 86 : bucket === "ai_can_handle" ? 36 : bucket === "user_must_handle" ? 26 : 16;
  const urgentScore = isUrgentText(`${item.title} ${item.context}`) ? 24 : 0;
  const roleScore = item.assignedRoles.some((role) => role === "design" || role === "coding" || role === "automation") ? 10 : 0;
  const failedPenalty = assignments.some((assignment) => assignment.state === "failed") ? -12 : 0;
  const dueScore = getDueScore(item.source.eventStartAt, now);
  const recencyScore = Math.max(0, 8 - Math.floor(Math.max(0, now - item.updatedAt) / (6 * 60 * 60 * 1000)));
  return priorityScore + bucketScore + urgentScore + roleScore + dueScore + recencyScore + failedPenalty;
}

function getDueScore(dueAt: number | undefined, now: number): number {
  if (typeof dueAt !== "number") {
    return 0;
  }

  const hoursUntilDue = (dueAt - now) / (60 * 60 * 1000);
  if (hoursUntilDue < -1) {
    return -10;
  }
  if (hoursUntilDue <= 3) {
    return 36;
  }
  if (hoursUntilDue <= 24) {
    return 26;
  }
  if (hoursUntilDue <= 72) {
    return 12;
  }
  return 0;
}

function buildSourceBreakdown(items: WorkItem[]): Array<{ label: string; count: number }> {
  const counts = new Map<string, number>();
  for (const item of items) {
    const label = item.source.provider === "google-calendar" ? "Calendar" : item.source.provider === "gmail" ? "Gmail" : item.source.label || item.source.provider;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}

function groupAssignmentsByWorkItemId(assignments: WorkAssignment[]): Map<string, WorkAssignment[]> {
  const map = new Map<string, WorkAssignment[]>();
  for (const assignment of assignments) {
    map.set(assignment.workItemId, [...(map.get(assignment.workItemId) ?? []), assignment]);
  }
  return map;
}

function groupMovesByBucket(moves: TodaysCallMove[]): Record<TodaysCallBucket, TodaysCallMove[]> {
  return {
    ai_can_handle: moves.filter((move) => move.bucket === "ai_can_handle"),
    ai_working: moves.filter((move) => move.bucket === "ai_working"),
    needs_approval: moves.filter((move) => move.bucket === "needs_approval"),
    user_must_handle: moves.filter((move) => move.bucket === "user_must_handle")
  };
}

function estimateFocusMinutes(moves: TodaysCallMove[]): number {
  return moves.reduce((total, move) => {
    if (move.bucket === "needs_approval") {
      return total + 8;
    }
    if (move.bucket === "ai_can_handle") {
      return total + 6;
    }
    if (move.bucket === "ai_working") {
      return total + 4;
    }
    return total + 18;
  }, 0);
}

function isUrgentText(text: string): boolean {
  return /\b(urgent|today|deadline|due|overdue|priority|asap|blocked|final|by friday|by monday)\b/iu.test(text);
}

function dedupe(values: string[]): string[] {
  return [...new Set(values)];
}

function truncateForHeadline(value: string): string {
  return value.length > 86 ? `${value.slice(0, 83).trim()}...` : value;
}

import type { ProductivityTask, ProductivityTaskSource } from "./productivity.js";
import { inferPermissionRiskLevel } from "./permissionPolicy.js";

export type WorkspaceRole = "productivity" | "design" | "coding" | "automation";

export type WorkItemState = "open" | "working" | "waiting_for_user" | "done";

export type WorkAssignmentState = "queued" | "running" | "waiting_for_user" | "completed" | "failed";

export type WorkItemOwnership = "ai" | "user";

export type WorkItemPermissionLevel = "read" | "draft" | "approval";
export type WorkAssignmentRunState = "not_started" | "planning" | "running" | "quality_check" | "waiting_for_approval" | "done" | "failed";

export type WorkItem = {
  id: string;
  taskId: string;
  title: string;
  context: string;
  source: ProductivityTaskSource;
  state: WorkItemState;
  priority: ProductivityTask["priority"];
  assignedRoles: WorkspaceRole[];
  dueAt?: number;
  people: string[];
  requestedOutput: string;
  extractedRequirements: string[];
  sourceRisk: "low" | "medium" | "high";
  aiSuggestedPrep?: string;
  userOnlyReason?: string;
  routeConfidence: number;
  routeReason: string;
  permissionLevel: WorkItemPermissionLevel;
  createdAt: number;
  updatedAt: number;
};

export type WorkAssignment = {
  id: string;
  workItemId: string;
  role: WorkspaceRole;
  state: WorkAssignmentState;
  title: string;
  reason: string;
  linkedDraftId?: string;
  linkedArtifactId?: string;
  linkedAutomationRunId?: string;
  linkedCodingProjectPath?: string;
  runLogId?: string;
  runState?: WorkAssignmentRunState;
  lastRunSummary?: string;
  approvalRequiredReason?: string;
  qualityScore?: number;
  outputRefs: Array<{ kind: "draft" | "artifact" | "automation" | "coding"; id: string; label: string }>;
  failureReason?: string;
  approvalState: "not_required" | "needs_review" | "approved" | "rejected";
  createdAt: number;
  updatedAt: number;
};

export type WorkRouteResult = {
  workItem: WorkItem;
  assignments: WorkAssignment[];
};

export const ROUTE_REVIEW_CONFIDENCE_THRESHOLD = 70;

export type ProductivityRouteWorkItemResult =
  | {
      success: true;
      workItem: WorkItem;
      assignments: WorkAssignment[];
      workItems: WorkItem[];
      allAssignments: WorkAssignment[];
    }
  | {
      success: false;
      reason: string;
      workItems: WorkItem[];
      allAssignments: WorkAssignment[];
    };

export function createWorkItemFromTask(task: ProductivityTask, existing?: WorkItem): WorkItem {
  const now = Date.now();
  const assignedRoles = routeWorkspaceRoles(task);
  const isCalendarEvent = task.source.provider === "google-calendar";
  const permissionLevel = isCalendarEvent ? "read" : getWorkItemPermissionLevel({ ...task, assignedRoles });
  return {
    id: existing?.id ?? `work:${task.id}`,
    taskId: task.id,
    title: task.title,
    context: task.context,
    source: task.source,
    state: task.state === "done" ? "done" : isCalendarEvent ? "open" : existing?.state === "done" ? "done" : existing?.state ?? "open",
    priority: task.priority,
    assignedRoles,
    dueAt: task.source.provider === "google-calendar" ? task.source.eventStartAt : existing?.dueAt,
    people: getPeopleFromSource(task.source),
    requestedOutput: isCalendarEvent ? (task.source.eventAllDay ? "deadline tracking" : "calendar commitment") : task.source.requestedOutput ?? inferRequestedOutput(task.title, task.context, assignedRoles),
    extractedRequirements: extractRequirements(task),
    sourceRisk: getSourceRisk(task),
    aiSuggestedPrep: getAiSuggestedPrep(task, assignedRoles),
    userOnlyReason: getWorkItemOwnership({ ...task, assignedRoles }) === "user" ? getUserOnlyReason({ ...task, assignedRoles }) : undefined,
    routeConfidence: task.source.actionConfidence ?? getRouteConfidence(task, assignedRoles),
    routeReason: task.source.routeReason ?? getRouteReason(task, assignedRoles),
    permissionLevel,
    createdAt: existing?.createdAt ?? task.createdAt ?? now,
    updatedAt: now
  };
}

export function createAssignmentsForWorkItem(workItem: WorkItem, existing: WorkAssignment[] = []): WorkAssignment[] {
  const now = Date.now();
  const existingByRole = new Map(existing.map((assignment) => [assignment.role, assignment]));
  return workItem.assignedRoles.map((role) => {
    const previous = existingByRole.get(role);
    return {
      id: previous?.id ?? `assignment:${workItem.id}:${role}`,
      workItemId: workItem.id,
      role,
      state: previous?.state ?? "queued",
      title: getAssignmentTitle(workItem, role),
      reason: getAssignmentReason(workItem, role),
      linkedDraftId: previous?.linkedDraftId,
      linkedArtifactId: previous?.linkedArtifactId,
      linkedAutomationRunId: previous?.linkedAutomationRunId,
      linkedCodingProjectPath: previous?.linkedCodingProjectPath,
      runLogId: previous?.runLogId,
      runState: previous?.runState ?? "not_started",
      lastRunSummary: previous?.lastRunSummary,
      approvalRequiredReason: previous?.approvalRequiredReason ?? getApprovalRequiredReason(workItem),
      qualityScore: previous?.qualityScore,
      outputRefs: previous?.outputRefs ?? getAssignmentOutputRefs(previous),
      failureReason: previous?.failureReason,
      approvalState: previous?.approvalState ?? (previous?.state === "waiting_for_user" ? "needs_review" : "not_required"),
      createdAt: previous?.createdAt ?? now,
      updatedAt: now
    };
  });
}

export function needsRouteReview(workItem: Pick<WorkItem, "routeConfidence" | "source">): boolean {
  return workItem.source.provider !== "google-calendar" && workItem.routeConfidence < ROUTE_REVIEW_CONFIDENCE_THRESHOLD;
}

export function getRouteReviewReason(workItem: Pick<WorkItem, "routeConfidence" | "routeReason" | "title" | "source">): string {
  if (workItem.source.provider === "google-calendar") {
    return "Calendar events stay user-owned. Autopilot can prepare context separately, but it will not route the event itself.";
  }

  return `Route confidence is ${workItem.routeConfidence}/100. Review the source and workspace assignment before Autopilot starts "${workItem.title}". ${workItem.routeReason}`;
}

export function routeWorkspaceRoles(task: ProductivityTask): WorkspaceRole[] {
  if (task.source.provider === "google-calendar") {
    return ["productivity"];
  }

  const text = `${task.title} ${task.context} ${task.source.subject ?? ""} ${task.source.label}`.toLowerCase();
  const roles = new Set<WorkspaceRole>();

  if (isExplicitDesignArtifactRequest(text)) {
    roles.add("design");
  }

  if (/\b(code|repo|repository|github|bug|debug|build|compile|test|deploy|api|pull request|typescript|javascript|website build|implement|implementation)\b/u.test(text)) {
    roles.add("coding");
  }

  if (/\b(automation|automate|daily|weekly|recurring|industry|research|brief|competitive|competitor|trend|market scan|monitor)\b/u.test(text)) {
    roles.add("automation");
  }

  if (/\b(reply|follow up|follow-up|schedule|reschedule|meeting|calendar|admin|approve|confirm|send|sending|submit|submitting|deadline|due)\b/u.test(text)) {
    roles.add("productivity");
  }

  if (roles.size === 0) {
    roles.add("productivity");
  }

  return [...roles];
}

function isExplicitDesignArtifactRequest(text: string): boolean {
  return /\b(slide|slides|deck|presentation|pitch|document|doc|report|proposal|writeup|write up|memo|client brief|project brief|website|landing page|mockup|design|figma|homepage)\b/u.test(
    text
  );
}

export function getWorkItemOwnership(workItem: Pick<WorkItem, "assignedRoles" | "context" | "source" | "title">): WorkItemOwnership {
  if (workItem.source.provider === "google-calendar") {
    return "user";
  }

  const text = `${workItem.title} ${workItem.context} ${workItem.source.subject ?? ""} ${workItem.source.label}`.toLowerCase();
  const asksForPreparatoryWork = /\b(draft|write|prepare|create|generate|summarize|respond|reply|follow up|follow-up|research|brief|plan|outline|document|slides|deck|debug|build)\b/u.test(
    text
  );
  const inferredRisk = inferPermissionRiskLevel(text);
  if (inferredRisk === "destructive" || (inferredRisk === "external_write" && !asksForPreparatoryWork)) {
    return "user";
  }

  if (/\b(approve|approving|decide|sign|signing|vote|attend|interview|present|negotiate|confirm|pay|paying|purchase|purchasing|submit|submitting|delete|deleting|overwrite|overwriting)\b/u.test(text)) {
    return "user";
  }

  if (workItem.assignedRoles.some((role) => role === "design" || role === "coding" || role === "automation")) {
    return "ai";
  }

  if (asksForPreparatoryWork && (workItem.source.provider === "gmail" || workItem.source.provider === "web")) {
    return "ai";
  }

  if (/\b(send|sending|sent|share|sharing|publish|publishing)\b/u.test(text) && !asksForPreparatoryWork) {
    return "user";
  }

  return workItem.source.provider === "gmail" || workItem.source.provider === "web" ? "ai" : "user";
}

export function getWorkItemPermissionLevel(workItem: Pick<WorkItem, "assignedRoles" | "context" | "source" | "title">): WorkItemPermissionLevel {
  if (workItem.source.provider === "google-calendar") {
    return "read";
  }

  const text = `${workItem.title} ${workItem.context} ${workItem.source.subject ?? ""} ${workItem.source.label}`.toLowerCase();
  const inferredRisk = inferPermissionRiskLevel(text);
  if (inferredRisk === "external_write" || inferredRisk === "destructive" || /\b(approve|approving)\b/u.test(text)) {
    return "approval";
  }

  if (workItem.assignedRoles.some((role) => role === "design" || role === "coding" || role === "automation")) {
    return "draft";
  }

  return "read";
}

export function getWorkItemSourceSummary(workItem: Pick<WorkItem, "source">): string {
  const source = workItem.source;
  if (source.provider === "gmail") {
    return [source.from, source.subject].filter(Boolean).join(" - ") || source.label;
  }

  if (source.provider === "google-calendar") {
    return [source.calendarName, source.subject].filter(Boolean).join(" - ") || source.label;
  }

  return source.subject ? `${source.label} - ${source.subject}` : source.label;
}

export function summarizeWorkAssignmentTrail(assignment: WorkAssignment): string[] {
  const runState = assignment.runState ?? getRunStateFromAssignmentState(assignment.state);
  const trail = [`Run: ${getWorkAssignmentRunStateLabel(runState)}`];

  if (typeof assignment.qualityScore === "number" && Number.isFinite(assignment.qualityScore)) {
    trail.push(`Quality: ${Math.max(0, Math.min(100, Math.round(assignment.qualityScore)))}/100`);
  }

  const outputLabels = assignment.outputRefs.map((outputRef) => outputRef.label).filter(Boolean);
  if (outputLabels.length > 0) {
    trail.push(`Output: ${outputLabels.join(", ")}`);
  }

  if (assignment.approvalState === "needs_review") {
    trail.push("Approval: needs review");
  } else if (assignment.approvalState === "approved") {
    trail.push("Approval: approved");
  } else if (assignment.approvalState === "rejected") {
    trail.push("Approval: rejected");
  }

  if (assignment.failureReason) {
    trail.push(`Issue: ${assignment.failureReason}`);
  } else if (assignment.lastRunSummary) {
    trail.push(`Last run: ${assignment.lastRunSummary}`);
  }

  return trail;
}

export function getWorkAssignmentRunStateLabel(state: WorkAssignmentRunState): string {
  switch (state) {
    case "not_started":
      return "not started";
    case "planning":
      return "planning";
    case "running":
      return "running";
    case "quality_check":
      return "quality check";
    case "waiting_for_approval":
      return "waiting for approval";
    case "done":
      return "done";
    case "failed":
      return "failed";
  }
}

export function sanitizeWorkItems(value: unknown): WorkItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }
    const workItem = item as Partial<WorkItem>;
    const title = cleanString(workItem.title, 180);
    const taskId = cleanString(workItem.taskId, 180);
    if (!title || !taskId) {
      return [];
    }

    return [
      {
        id: cleanString(workItem.id, 220) || `work:${taskId}`,
        taskId,
        title,
        context: cleanString(workItem.context, 320) || "No extra context",
        source: sanitizeWorkItemSource(workItem.source),
        state: sanitizeWorkItemState(workItem.state),
        priority: workItem.priority === "high" || workItem.priority === "low" ? workItem.priority : "medium",
        assignedRoles: sanitizeWorkspaceRoles(workItem.assignedRoles),
        dueAt: typeof workItem.dueAt === "number" && Number.isFinite(workItem.dueAt) ? workItem.dueAt : undefined,
        people: Array.isArray(workItem.people) ? workItem.people.map((person) => cleanString(person, 160)).filter(Boolean).slice(0, 12) : [],
        requestedOutput: cleanString(workItem.requestedOutput, 160) || "reviewable work",
        extractedRequirements: Array.isArray(workItem.extractedRequirements)
          ? workItem.extractedRequirements.map((requirement) => cleanString(requirement, 180)).filter(Boolean).slice(0, 8)
          : [],
        sourceRisk: workItem.sourceRisk === "high" || workItem.sourceRisk === "medium" ? workItem.sourceRisk : "low",
        aiSuggestedPrep: cleanString(workItem.aiSuggestedPrep, 220) || undefined,
        userOnlyReason: cleanString(workItem.userOnlyReason, 260) || undefined,
        routeConfidence: typeof workItem.routeConfidence === "number" && Number.isFinite(workItem.routeConfidence) ? Math.max(0, Math.min(100, Math.round(workItem.routeConfidence))) : 68,
        routeReason: cleanString(workItem.routeReason, 260) || "Autopilot routed this from the source text.",
        permissionLevel:
          workItem.permissionLevel === "approval" || workItem.permissionLevel === "draft" || workItem.permissionLevel === "read"
            ? workItem.permissionLevel
            : getWorkItemPermissionLevel({
                title,
                context: cleanString(workItem.context, 320) || "No extra context",
                source: sanitizeWorkItemSource(workItem.source),
                assignedRoles: sanitizeWorkspaceRoles(workItem.assignedRoles)
              }),
        createdAt: cleanTime(workItem.createdAt),
        updatedAt: cleanTime(workItem.updatedAt)
      }
    ];
  });
}

export function sanitizeWorkAssignments(value: unknown): WorkAssignment[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }
    const assignment = item as Partial<WorkAssignment>;
    const workItemId = cleanString(assignment.workItemId, 220);
    const role = sanitizeWorkspaceRole(assignment.role);
    if (!workItemId || !role) {
      return [];
    }

    return [
      {
        id: cleanString(assignment.id, 260) || `assignment:${workItemId}:${role}`,
        workItemId,
        role,
        state: sanitizeAssignmentState(assignment.state),
        title: cleanString(assignment.title, 180) || `${role} work`,
        reason: cleanString(assignment.reason, 320) || "Routed by Autopilot.",
        linkedDraftId: cleanString(assignment.linkedDraftId, 180) || undefined,
        linkedArtifactId: cleanString(assignment.linkedArtifactId, 180) || undefined,
        linkedAutomationRunId: cleanString(assignment.linkedAutomationRunId, 180) || undefined,
        linkedCodingProjectPath: cleanString(assignment.linkedCodingProjectPath, 2048) || undefined,
        runLogId: cleanString(assignment.runLogId, 180) || undefined,
        runState: sanitizeAssignmentRunState(assignment.runState, assignment.state),
        lastRunSummary: cleanString(assignment.lastRunSummary, 360) || undefined,
        approvalRequiredReason: cleanString(assignment.approvalRequiredReason, 360) || undefined,
        qualityScore: typeof assignment.qualityScore === "number" && Number.isFinite(assignment.qualityScore) ? Math.max(0, Math.min(100, Math.round(assignment.qualityScore))) : undefined,
        outputRefs: Array.isArray(assignment.outputRefs)
          ? assignment.outputRefs.flatMap((outputRef) => sanitizeOutputRef(outputRef) ?? []).slice(0, 8)
          : getAssignmentOutputRefs(assignment),
        failureReason: cleanString(assignment.failureReason, 800) || undefined,
        approvalState: sanitizeApprovalState(assignment.approvalState, assignment.state),
        createdAt: cleanTime(assignment.createdAt),
        updatedAt: cleanTime(assignment.updatedAt)
      }
    ];
  });
}

function getPeopleFromSource(source: ProductivityTaskSource): string[] {
  return [source.from].filter((person): person is string => Boolean(person));
}

function extractRequirements(task: Pick<ProductivityTask, "title" | "context" | "source">): string[] {
  const sourceParts = [task.title, task.context, task.source.subject].filter(Boolean).join(". ");
  const sentences = sourceParts
    .split(/(?<=[.!?])\s+|\n+/u)
    .map((sentence) => cleanString(sentence, 180))
    .filter((sentence) => /\b(please|need|needs|must|should|can you|could you|prepare|draft|create|send|review|fix|build|schedule|due|deadline)\b/iu.test(sentence));
  return sentences.length > 0 ? [...new Set(sentences)].slice(0, 5) : [cleanString(task.title, 180)].filter(Boolean);
}

function getSourceRisk(task: Pick<ProductivityTask, "title" | "context" | "source">): WorkItem["sourceRisk"] {
  const text = `${task.title} ${task.context} ${task.source.subject ?? ""}`.toLowerCase();
  if (/\b(pay|purchase|bank|password|social security|ssn|medical|health|delete|overwrite|sign|legal|tax)\b/u.test(text)) {
    return "high";
  }
  if (/\b(send|submit|publish|share|approve|confirm|security|account)\b/u.test(text)) {
    return "medium";
  }
  return "low";
}

function getAiSuggestedPrep(task: Pick<ProductivityTask, "title" | "context" | "source">, roles: WorkspaceRole[]): string | undefined {
  if (task.source.provider === "google-calendar") {
    return "Prepare context, reminders, and materials for this calendar commitment without marking the event as AI-owned.";
  }
  if (roles.includes("design")) {
    return "Create a reviewable document, deck, or design artifact from the source request.";
  }
  if (roles.includes("coding")) {
    return "Create a coding plan, inspect relevant files, and prepare a reviewable diff.";
  }
  if (roles.includes("automation")) {
    return "Create a reusable automation run with sources, output, and quality score.";
  }
  if (roles.includes("productivity")) {
    return "Draft the reply, scheduling step, or admin follow-up for review.";
  }
  return undefined;
}

function getUserOnlyReason(workItem: Pick<WorkItem, "assignedRoles" | "context" | "source" | "title">): string {
  if (workItem.source.provider === "google-calendar") {
    return "Calendar events are commitments for the user; Autopilot can prepare context but cannot attend or complete the event.";
  }
  if (getWorkItemPermissionLevel(workItem) === "approval") {
    return "This includes an external-impact step that needs explicit user approval.";
  }
  return "This needs the user's judgment or final decision.";
}

function getApprovalRequiredReason(workItem: WorkItem): string | undefined {
  if (workItem.permissionLevel !== "approval") {
    return undefined;
  }
  return "Approval is required before sending, sharing, publishing, submitting, deleting, overwriting, paying, purchasing, signing, committing, or pushing.";
}

function inferRequestedOutput(title: string, context: string, roles: WorkspaceRole[]): string {
  const text = `${title} ${context}`.toLowerCase();
  if (/\b(slide|slides|deck|presentation)\b/u.test(text)) {
    return "slide deck";
  }
  if (/\b(website|landing page|homepage|design|mockup)\b/u.test(text)) {
    return "website design";
  }
  if (/\b(doc|document|report|proposal|memo|writeup|write up)\b/u.test(text)) {
    return "document";
  }
  if (roles.includes("coding")) {
    return "coding plan or patch";
  }
  if (roles.includes("automation")) {
    return "automation run";
  }
  if (/\b(reply|respond|follow up|follow-up)\b/u.test(text)) {
    return "reply draft";
  }
  return "reviewable work";
}

function getRouteConfidence(task: ProductivityTask, roles: WorkspaceRole[]): number {
  const text = `${task.title} ${task.context} ${task.source.subject ?? ""}`.toLowerCase();
  if (task.source.provider === "google-calendar") {
    return 95;
  }
  if (roles.length > 1) {
    return 82;
  }
  if (/\b(slide|deck|code|repo|daily|weekly|reply|respond|response|follow up|follow-up|schedule|prepare|document|website|design|debug)\b/u.test(text)) {
    return 88;
  }
  return 64;
}

function getRouteReason(task: ProductivityTask, roles: WorkspaceRole[]): string {
  if (task.source.provider === "google-calendar") {
    return "Calendar events stay in Productivity as user commitments; Autopilot can create prep separately.";
  }
  return `Matched ${roles.map((role) => `${role} work`).join(", ")} from the source request.`;
}

function getAssignmentOutputRefs(assignment?: Partial<WorkAssignment>): WorkAssignment["outputRefs"] {
  if (!assignment) {
    return [];
  }
  return [
    assignment.linkedDraftId ? { kind: "draft" as const, id: assignment.linkedDraftId, label: "Productivity draft" } : null,
    assignment.linkedArtifactId ? { kind: "artifact" as const, id: assignment.linkedArtifactId, label: "Design artifact" } : null,
    assignment.linkedAutomationRunId ? { kind: "automation" as const, id: assignment.linkedAutomationRunId, label: "Automation run" } : null,
    assignment.linkedCodingProjectPath ? { kind: "coding" as const, id: assignment.linkedCodingProjectPath, label: "Coding project" } : null
  ].filter((ref): ref is WorkAssignment["outputRefs"][number] => Boolean(ref));
}

function sanitizeOutputRef(value: unknown): WorkAssignment["outputRefs"][number] | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const outputRef = value as Partial<WorkAssignment["outputRefs"][number]>;
  if (outputRef.kind !== "draft" && outputRef.kind !== "artifact" && outputRef.kind !== "automation" && outputRef.kind !== "coding") {
    return null;
  }
  const id = cleanString(outputRef.id, 2048);
  const label = cleanString(outputRef.label, 120);
  return id && label ? { kind: outputRef.kind, id, label } : null;
}

function sanitizeApprovalState(value: unknown, state: unknown): WorkAssignment["approvalState"] {
  if (value === "needs_review" || value === "approved" || value === "rejected" || value === "not_required") {
    return value;
  }
  return state === "waiting_for_user" ? "needs_review" : "not_required";
}

function getAssignmentTitle(workItem: WorkItem, role: WorkspaceRole): string {
  switch (role) {
    case "design":
      return `Create artifact for ${workItem.title}`;
    case "coding":
      return `Prepare coding work for ${workItem.title}`;
    case "automation":
      return `Automate ${workItem.title}`;
    case "productivity":
      return `Handle admin step for ${workItem.title}`;
  }
}

function getAssignmentReason(workItem: WorkItem, role: WorkspaceRole): string {
  switch (role) {
    case "design":
      return "The request needs a document, deck, website design, or draft artifact.";
    case "coding":
      return "The request mentions code, repos, debugging, building, or deployment.";
    case "automation":
      return "The request is recurring, research-heavy, or suitable for a repeatable workflow.";
    case "productivity":
      return workItem.source.provider === "google-calendar"
        ? "Calendar events stay user-owned; Autopilot keeps the source visible and can prepare separate context."
        : "The request needs a reply, follow-up, schedule, approval, or user-facing admin step.";
  }
}

function sanitizeWorkItemSource(value: unknown): ProductivityTaskSource {
  if (!value || typeof value !== "object") {
    return { provider: "manual", label: "Manual" };
  }
  const source = value as Partial<ProductivityTaskSource>;
  const provider =
    source.provider === "gmail" ||
    source.provider === "google-calendar" ||
    source.provider === "slack" ||
    source.provider === "chat" ||
    source.provider === "outlook" ||
    source.provider === "web" ||
    source.provider === "coding"
      ? source.provider
      : "manual";
  return {
    provider,
    label: cleanString(source.label, 140) || provider,
    messageId: cleanString(source.messageId, 220) || undefined,
    url: cleanString(source.url, 2048) || undefined,
    from: cleanString(source.from, 180) || undefined,
    subject: cleanString(source.subject, 260) || undefined,
    calendarId: cleanString(source.calendarId, 220) || undefined,
    calendarName: cleanString(source.calendarName, 140) || undefined,
    eventStartAt: typeof source.eventStartAt === "number" && Number.isFinite(source.eventStartAt) ? source.eventStartAt : undefined,
    eventEndAt: typeof source.eventEndAt === "number" && Number.isFinite(source.eventEndAt) ? source.eventEndAt : undefined,
    eventAllDay: typeof source.eventAllDay === "boolean" ? source.eventAllDay : undefined,
    eventRecurringId: cleanString(source.eventRecurringId, 220) || undefined,
    eventRecurrence: sanitizeWorkItemCalendarRecurrence(source.eventRecurrence),
    eventRecurrenceLabel: cleanString(source.eventRecurrenceLabel, 80) || undefined,
    eventRecurrenceInterval:
      typeof source.eventRecurrenceInterval === "number" &&
      Number.isFinite(source.eventRecurrenceInterval) &&
      source.eventRecurrenceInterval >= 1 &&
      source.eventRecurrenceInterval <= 52
        ? Math.floor(source.eventRecurrenceInterval)
        : undefined,
    eventRecurrenceWeekdays: sanitizeWorkItemCalendarWeekdays(source.eventRecurrenceWeekdays),
    actionSummary: cleanString(source.actionSummary, 260) || undefined,
    actionConfidence:
      typeof source.actionConfidence === "number" && Number.isFinite(source.actionConfidence)
        ? Math.max(0, Math.min(100, Math.round(source.actionConfidence)))
        : undefined,
    requestedOutput: cleanString(source.requestedOutput, 80) || undefined,
    recommendedAssistant: cleanString(source.recommendedAssistant, 80) || undefined,
    routeReason: cleanString(source.routeReason, 220) || undefined,
    draftSuggested: typeof source.draftSuggested === "boolean" ? source.draftSuggested : undefined
  };
}

function sanitizeWorkItemCalendarRecurrence(value: unknown): ProductivityTaskSource["eventRecurrence"] {
  return value === "daily" || value === "weekly" || value === "monthly" || value === "monthly-day" ? value : undefined;
}

function sanitizeWorkItemCalendarWeekdays(value: unknown): number[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const weekdays = [...new Set(value.filter((weekday): weekday is number => Number.isInteger(weekday) && weekday >= 0 && weekday <= 6))].sort(
    (leftDay, rightDay) => leftDay - rightDay
  );
  return weekdays.length > 0 ? weekdays : undefined;
}

function sanitizeWorkItemState(value: unknown): WorkItemState {
  return value === "working" || value === "waiting_for_user" || value === "done" ? value : "open";
}

function sanitizeAssignmentState(value: unknown): WorkAssignmentState {
  return value === "running" || value === "waiting_for_user" || value === "completed" || value === "failed" ? value : "queued";
}

function sanitizeAssignmentRunState(value: unknown, assignmentState: unknown): WorkAssignmentRunState {
  if (
    value === "not_started" ||
    value === "planning" ||
    value === "running" ||
    value === "quality_check" ||
    value === "waiting_for_approval" ||
    value === "done" ||
    value === "failed"
  ) {
    return value;
  }
  if (assignmentState === "running") {
    return "running";
  }
  if (assignmentState === "waiting_for_user") {
    return "waiting_for_approval";
  }
  if (assignmentState === "completed") {
    return "done";
  }
  if (assignmentState === "failed") {
    return "failed";
  }
  return "not_started";
}

function getRunStateFromAssignmentState(state: WorkAssignmentState): WorkAssignmentRunState {
  switch (state) {
    case "running":
      return "running";
    case "waiting_for_user":
      return "waiting_for_approval";
    case "completed":
      return "done";
    case "failed":
      return "failed";
    case "queued":
      return "not_started";
  }
}

function sanitizeWorkspaceRoles(value: unknown): WorkspaceRole[] {
  const roles = Array.isArray(value) ? value.flatMap((role) => sanitizeWorkspaceRole(role) ?? []) : [];
  return roles.length > 0 ? [...new Set(roles)] : ["productivity"];
}

function sanitizeWorkspaceRole(value: unknown): WorkspaceRole | null {
  return value === "productivity" || value === "design" || value === "coding" || value === "automation" ? value : null;
}

function cleanString(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, maxLength) : "";
}

function cleanTime(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : Date.now();
}

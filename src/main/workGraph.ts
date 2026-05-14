import fs from "node:fs/promises";
import path from "node:path";

import type { BrowserSnapshot } from "../shared/browserModel.js";
import type { EmailMessageSummary } from "../shared/email.js";
import { buildGeneratedArtifactReview, type Artifact } from "../shared/artifacts.js";
import type { AutomationRun } from "../shared/automation.js";
import type { CodingSnapshot } from "../shared/coding.js";
import type { ActionPlan, AgentRun } from "../shared/agent.js";
import { decidePermission } from "../shared/permissionPolicy.js";
import {
  evaluateAutomationOutputQuality,
  evaluateBrowserActionQuality,
  evaluateCodingRunQuality,
  evaluateEmailDraftQuality,
  toWorkGraphQuality
} from "../shared/outputQuality.js";
import type { WorkAssignment, WorkItem, WorkspaceRole } from "../shared/workItems.js";
import {
  getWorkGraphCounts,
  getWorkGraphItemSortValue,
  type ShadowModeRule,
  type ShadowModeRun,
  type WorkGraphActionResult,
  type WorkGraphApproval,
  type WorkGraphItem,
  type WorkGraphMakeRuleResult,
  type WorkGraphOutput,
  type WorkGraphRun,
  type WorkGraphSnapshot,
  type WorkGraphSourceKind
} from "../shared/workGraph.js";

type WorkGraphPersistedState = {
  approvals: Record<string, WorkGraphApproval>;
  rules: ShadowModeRule[];
  shadowRuns: ShadowModeRun[];
};

export type WorkGraphBuildInput = {
  browserSnapshot: BrowserSnapshot;
  emailMessages: EmailMessageSummary[];
  workItems: WorkItem[];
  workAssignments: WorkAssignment[];
  artifacts: Artifact[];
  actionPlans: ActionPlan[];
  agentRuns: AgentRun[];
  automationRuns: AutomationRun[];
  codingSnapshot: CodingSnapshot;
};

const WORK_GRAPH_FILE = "work-graph.json";
const MAX_GRAPH_ITEMS = 80;
const MAX_SHADOW_RUNS = 120;

export class WorkGraphStore {
  private state: WorkGraphPersistedState | null = null;

  constructor(private readonly getUserDataPath: () => string) {}

  async buildSnapshot(input: WorkGraphBuildInput): Promise<WorkGraphSnapshot> {
    const persisted = await this.loadState();
    const items = [
      ...buildWorkItemGraph(input.workItems, input.workAssignments, persisted.approvals),
      ...buildEmailSourceGraph(input.emailMessages, input.workItems, persisted.approvals),
      ...buildArtifactGraph(input.artifacts, input.actionPlans, persisted.approvals),
      ...buildAutomationGraph(input.automationRuns, persisted.approvals),
      ...buildCodingGraph(input.codingSnapshot, persisted.approvals),
      ...buildBrowserGraph(input.browserSnapshot, persisted.approvals)
    ]
      .sort((left, right) => getWorkGraphItemSortValue(right) - getWorkGraphItemSortValue(left))
      .slice(0, MAX_GRAPH_ITEMS);

    return {
      items,
      shadowRuns: persisted.shadowRuns.slice(0, MAX_SHADOW_RUNS),
      rules: persisted.rules,
      counts: getWorkGraphCounts(items, persisted.rules),
      generatedAt: Date.now()
    };
  }

  async approve(itemId: string): Promise<void> {
    const state = await this.loadState();
    state.approvals[itemId] = {
      state: "approved",
      approvedAt: Date.now()
    };
    await this.saveState(state);
  }

  async reject(itemId: string, reason = "User rejected this output."): Promise<void> {
    const state = await this.loadState();
    state.approvals[itemId] = {
      state: "rejected",
      rejectedAt: Date.now(),
      rejectedReason: reason.slice(0, 360)
    };
    await this.saveState(state);
  }

  async makeRule(item: WorkGraphItem): Promise<WorkGraphMakeRuleResult> {
    if (!item.shadow.eligible) {
      return {
        success: false,
        reason: "This item is not eligible for a trusted Shadow Mode rule because it may require user judgment or external impact."
      };
    }

    const state = await this.loadState();
    const now = Date.now();
    const rule: ShadowModeRule = {
      id: `shadow-rule:${now.toString(36)}:${Math.random().toString(36).slice(2, 8)}`,
      name: `When ${item.source.label}, ${item.route.workspace} prepares ${item.output.kind.replace(/_/gu, " ")}`,
      sourceKind: item.source.kind,
      routeWorkspace: item.route.workspace,
      safeActions: item.run.safeActions,
      enabled: true,
      createdFromItemId: item.id,
      createdAt: now,
      updatedAt: now
    };
    state.rules = [rule, ...state.rules].slice(0, 80);
    await this.saveState(state);
    return { success: true, rule };
  }

  async recordShadowRun(item: WorkGraphItem, stateOverride: ShadowModeRun["state"] = "needs_approval"): Promise<ShadowModeRun> {
    const state = await this.loadState();
    const now = Date.now();
    const run: ShadowModeRun = {
      id: `shadow-run:${now.toString(36)}:${Math.random().toString(36).slice(2, 8)}`,
      workGraphItemId: item.id,
      state: stateOverride,
      sourceLabel: item.source.label,
      plan: item.run.plan,
      outputSummary: item.output.summary || item.summary,
      approvalRequired: item.externalAction.requiresApproval,
      reason: item.shadow.why,
      visibleRunLog: [
        `Read source: ${item.source.label}`,
        `Routed to ${item.route.workspace}: ${item.route.reason}`,
        ...item.run.visibleRunLog,
        item.externalAction.requiresApproval ? `Stopped before external action: ${item.externalAction.label}` : "Completed safe local work."
      ].slice(0, 12),
      startedAt: now,
      completedAt: now
    };
    state.shadowRuns = [run, ...state.shadowRuns].slice(0, MAX_SHADOW_RUNS);
    await this.saveState(state);
    return run;
  }

  async setRuleEnabled(ruleId: string, enabled: boolean): Promise<ShadowModeRule[]> {
    const state = await this.loadState();
    state.rules = state.rules.map((rule) => (rule.id === ruleId ? { ...rule, enabled, updatedAt: Date.now() } : rule));
    await this.saveState(state);
    return state.rules;
  }

  async listShadowRuns(): Promise<ShadowModeRun[]> {
    return (await this.loadState()).shadowRuns.slice(0, MAX_SHADOW_RUNS);
  }

  async listRules(): Promise<ShadowModeRule[]> {
    return (await this.loadState()).rules;
  }

  async applyActionResult(input: WorkGraphBuildInput, itemId: string, action: "approve" | "reject", reason?: string): Promise<WorkGraphActionResult> {
    if (action === "approve") {
      await this.approve(itemId);
    } else {
      await this.reject(itemId, reason);
    }
    const snapshot = await this.buildSnapshot(input);
    return {
      success: true,
      item: snapshot.items.find((item) => item.id === itemId),
      snapshot
    };
  }

  private async loadState(): Promise<WorkGraphPersistedState> {
    if (this.state) {
      return this.state;
    }

    try {
      const raw = await fs.readFile(this.getStatePath(), "utf8");
      this.state = normalizePersistedState(JSON.parse(raw) as Partial<WorkGraphPersistedState>);
    } catch {
      this.state = normalizePersistedState({});
    }
    return this.state;
  }

  private async saveState(state: WorkGraphPersistedState): Promise<void> {
    this.state = state;
    await fs.mkdir(path.dirname(this.getStatePath()), { recursive: true });
    await fs.writeFile(this.getStatePath(), JSON.stringify(state, null, 2), "utf8");
  }

  private getStatePath(): string {
    return path.join(this.getUserDataPath(), WORK_GRAPH_FILE);
  }
}

function normalizePersistedState(value: Partial<WorkGraphPersistedState>): WorkGraphPersistedState {
  return {
    approvals: value.approvals && typeof value.approvals === "object" ? value.approvals : {},
    rules: Array.isArray(value.rules) ? value.rules.filter(isShadowModeRule).slice(0, 80) : [],
    shadowRuns: Array.isArray(value.shadowRuns) ? value.shadowRuns.filter(isShadowModeRun).slice(0, MAX_SHADOW_RUNS) : []
  };
}

function isShadowModeRule(value: unknown): value is ShadowModeRule {
  const rule = value as Partial<ShadowModeRule>;
  return Boolean(rule && typeof rule.id === "string" && typeof rule.name === "string" && typeof rule.sourceKind === "string");
}

function isShadowModeRun(value: unknown): value is ShadowModeRun {
  const run = value as Partial<ShadowModeRun>;
  return Boolean(run && typeof run.id === "string" && typeof run.workGraphItemId === "string" && typeof run.startedAt === "number");
}

function buildWorkItemGraph(workItems: WorkItem[], assignments: WorkAssignment[], approvals: Record<string, WorkGraphApproval>): WorkGraphItem[] {
  const assignmentsByWorkItem = groupBy(assignments, (assignment) => assignment.workItemId);
  return workItems.map((workItem) => {
    const workItemAssignments = assignmentsByWorkItem.get(workItem.id) ?? [];
    const primaryAssignment = choosePrimaryAssignment(workItemAssignments);
    const id = `work-item:${workItem.id}`;
    const run = getRunFromWorkItem(workItem, workItemAssignments, primaryAssignment);
    const output = getOutputFromAssignment(primaryAssignment, workItem);
    const approval = approvals[id] ?? getApprovalFromAssignment(primaryAssignment, workItem);
    const quality = getWorkItemGraphQuality(primaryAssignment, output, workItem, run);
    return {
      id,
      title: workItem.title,
      summary: workItem.context,
      source: {
        kind: getSourceKind(workItem.source.provider),
        id: workItem.source.messageId ?? workItem.source.eventRecurringId ?? workItem.source.url ?? workItem.id,
        label: workItem.source.label,
        provider: workItem.source.provider,
        url: workItem.source.url,
        excerpt: workItem.source.actionSummary ?? workItem.context,
        createdAt: workItem.createdAt
      },
      route: {
        workspace: primaryAssignment?.role ?? workItem.assignedRoles[0] ?? "productivity",
        confidence: workItem.routeConfidence,
        reason: workItem.routeReason
      },
      run,
      output,
      quality,
      approval,
      externalAction: getExternalAction(workItem.permissionLevel === "approval" ? "Send or share final output" : "Review prepared work"),
      shadow: getShadowState(workItem.source.provider === "google-calendar", run, workItem.assignedRoles),
      createdAt: workItem.createdAt,
      updatedAt: Math.max(workItem.updatedAt, ...workItemAssignments.map((assignment) => assignment.updatedAt))
    };
  });
}

function buildEmailSourceGraph(messages: EmailMessageSummary[], workItems: WorkItem[], approvals: Record<string, WorkGraphApproval>): WorkGraphItem[] {
  const routedMessageIds = new Set(workItems.map((item) => item.source.messageId).filter(Boolean));
  return messages
    .filter((message) => !routedMessageIds.has(message.id))
    .slice(0, 10)
    .map((message) => {
      const id = `email:${message.id}`;
      const run: WorkGraphRun = {
        state: "ready_to_start",
        safeActions: ["classify email", "draft reply", "suggest route", "suggest Gmail labels"],
        plan: "Analyze this email for real work and optional Gmail organization. Keep newsletters and low-confidence findings in the inbox.",
        visibleRunLog: ["Email is cached locally.", "Autopilot can classify it and suggest labels without sending, deleting, or changing Gmail."]
      };
      return {
        id,
        title: message.subject || "Email source",
        summary: message.snippet || message.actionText || "Email is ready for classification.",
        source: {
          kind: "gmail",
          id: message.id,
          label: [message.from, message.subject].filter(Boolean).join(" - ") || "Gmail message",
          provider: "gmail",
          url: message.url,
          excerpt: message.snippet || message.actionText,
          createdAt: message.receivedAt
        },
        route: { workspace: "productivity", confidence: 55, reason: "Unclassified inbox source. Needs AI triage before becoming queue work." },
        run,
        output: {
          kind: "source_review",
          title: "Email triage candidate",
          summary: "Ready for safe classification and user-approved Gmail organization. It is not yet an Action Queue task.",
          workspace: "productivity"
        },
        approval: approvals[id] ?? { state: "not_required" },
        externalAction: getExternalAction("Classify only"),
        shadow: getShadowState(false, run, ["productivity"]),
        createdAt: message.receivedAt,
        updatedAt: message.receivedAt
      };
    });
}

function buildArtifactGraph(artifacts: Artifact[], actionPlans: ActionPlan[], approvals: Record<string, WorkGraphApproval>): WorkGraphItem[] {
  const plansByArtifactId = new Map(actionPlans.filter((plan) => plan.artifactId).map((plan) => [plan.artifactId, plan]));
  return artifacts.slice(0, 16).map((artifact) => {
    const plan = plansByArtifactId.get(artifact.id);
    const id = `artifact:${artifact.id}`;
    const needsApproval = Boolean(plan?.finalApproval.required && !plan.finalApproval.approvedAt);
    const review = buildGeneratedArtifactReview(artifact);
    const qualityScore = review.qualityReport.score;
    const run: WorkGraphRun = {
      state: needsApproval ? "needs_approval" : qualityScore >= 80 ? "handled_safely" : "blocked",
      safeActions: ["revise artifact", "quality check", "prepare export"],
      plan: plan?.steps.map((step) => step.title).join(" -> ") || "Review artifact quality, source trail, and export readiness.",
      visibleRunLog: plan?.steps.map((step) => `${step.state}: ${step.title}`) ?? ["Artifact exists in Design."]
    };
    return {
      id,
      title: artifact.title,
      summary: artifact.summary,
      source: {
        kind: "design-artifact",
        id: artifact.id,
        label: "Design artifact",
        provider: "design",
        excerpt: artifact.summary,
        createdAt: artifact.createdAt
      },
      route: { workspace: "design", confidence: 92, reason: "Generated artifact is ready for Design review and approval." },
      run,
      output: { kind: "artifact", title: artifact.title, summary: artifact.summary, refId: artifact.id, workspace: "design" },
      quality: review.qualityReport
        ? {
            score: review.qualityReport.score,
            passed: review.qualityReport.passed,
            summary: review.qualityReport.summary
          }
        : undefined,
      approval: approvals[id] ?? { state: needsApproval ? "needs_approval" : "not_required", requiredReason: plan?.finalApproval.reason },
      externalAction: getExternalAction(plan?.finalApproval.required ? "Share approved artifact" : "Export or share artifact"),
      shadow: getShadowState(false, run, ["design"]),
      createdAt: artifact.createdAt,
      updatedAt: artifact.updatedAt
    };
  });
}

function buildAutomationGraph(runs: AutomationRun[], approvals: Record<string, WorkGraphApproval>): WorkGraphItem[] {
  return runs.slice(0, 12).map((run) => {
    const id = `automation:${run.id}`;
    const runState: WorkGraphRun["state"] = run.state === "running" ? "ai_working" : run.state === "failed" ? "blocked" : run.state === "completed" ? "handled_safely" : "ready_to_start";
    const quality = getAutomationGraphQuality(run);
    return {
      id,
      title: run.outputTitle || run.recipeName,
      summary: run.outputSummary || run.failureReason || "Automation run is available for review.",
      source: {
        kind: "automation-run",
        id: run.id,
        label: run.recipeName,
        provider: "automation",
        excerpt: run.outputSummary,
        createdAt: run.startedAt
      },
      route: { workspace: "automation", confidence: 88, reason: "Automation run has a stored log, output, and quality score." },
      run: {
        state: runState,
        safeActions: ["run recipe", "save output", "quality check"],
        plan: run.steps.join(" -> ") || "Review automation output and next run.",
        visibleRunLog: run.visibleRunLog.length > 0 ? run.visibleRunLog : run.steps,
        startedAt: run.startedAt,
        completedAt: run.completedAt,
        failureReason: run.failureReason
      },
      output: { kind: "automation_run", title: run.outputTitle || run.recipeName, summary: run.outputSummary || "", refId: run.id, workspace: "automation" },
      quality,
      approval: approvals[id] ?? { state: run.state === "completed" ? "not_required" : "needs_approval" },
      externalAction: getExternalAction("Review automation output"),
      shadow: getShadowState(false, { state: runState } as WorkGraphRun, ["automation"]),
      createdAt: run.startedAt,
      updatedAt: run.completedAt ?? run.startedAt
    };
  });
}

function buildCodingGraph(snapshot: CodingSnapshot, approvals: Record<string, WorkGraphApproval>): WorkGraphItem[] {
  if (!snapshot.activeProject) {
    return [];
  }
  const id = `coding:${snapshot.activeProject.rootPath}`;
  const run: WorkGraphRun = {
    state: "ready_to_start",
    safeActions: ["inspect files", "prepare plan", "show diff"],
    plan: "Inspect the active project, prepare a coding plan, and wait for approval before external impact.",
    visibleRunLog: ["Project is open.", "Coding agent can inspect files and prepare a reviewable plan."]
  };
  const quality = toWorkGraphQuality(
    evaluateCodingRunQuality({
      plan: run.plan,
      changedFiles: snapshot.tree?.children?.map((entry) => entry.path).slice(0, 4) ?? [snapshot.activeProject.rootPath],
      diffSummary: "No diff yet. The coding agent must show changed files and diff before approval.",
      testSummary: "Verification is pending until the user starts the coding run.",
      approvalRequired: true
    })
  );
  return [
    {
      id,
      title: snapshot.activeProject.name,
      summary: `Coding project open at ${snapshot.activeProject.rootPath}.`,
      source: {
        kind: "coding-project",
        id: snapshot.activeProject.rootPath,
        label: snapshot.activeProject.name,
        provider: "coding",
        excerpt: snapshot.activeProject.rootPath,
        createdAt: snapshot.activeProject.openedAt
      },
      route: { workspace: "coding", confidence: 90, reason: "Active project can support inspect, edit, test, diff, approve." },
      run,
      output: { kind: "coding_plan", title: "Coding plan candidate", summary: "Ready for a Codex-style run.", refId: snapshot.activeProject.rootPath, workspace: "coding" },
      quality,
      approval: approvals[id] ?? { state: "not_required" },
      externalAction: getExternalAction("Plan code changes"),
      shadow: getShadowState(false, run, ["coding"]),
      createdAt: snapshot.activeProject.openedAt,
      updatedAt: Date.now()
    }
  ];
}

function buildBrowserGraph(snapshot: BrowserSnapshot, approvals: Record<string, WorkGraphApproval>): WorkGraphItem[] {
  const activeTab = snapshot.tabs.find((tab) => tab.id === snapshot.activeTabId);
  if (!activeTab) {
    return [];
  }
  const id = `browser:${activeTab.id}`;
  const run: WorkGraphRun = {
    state: activeTab.navigationError ? "blocked" : "ready_to_start",
    safeActions: ["read page", "summarize page", "inspect DOM"],
    plan: "Read the active tab and prepare a grounded summary or safe browser action plan.",
    visibleRunLog: activeTab.navigationError ? [`Navigation error: ${activeTab.navigationError.reason}`] : ["Active tab is available for page-read."]
  };
  const quality = toWorkGraphQuality(
    evaluateBrowserActionQuality({
      summary: activeTab.navigationError
        ? `Navigation failed for browser tab ${activeTab.url}. User needs a recoverable page state.`
        : `Browser tab ${activeTab.url} is ready for page read, DOM inspection, and safe action planning.`,
      observations: activeTab.navigationError ? [activeTab.navigationError.reason] : ["Active page context is available.", "Submit/send/pay/delete remains approval-gated."],
      stoppedBeforeExternalAction: true,
      approvalRequired: false
    })
  );
  return [
    {
      id,
      title: activeTab.title || "Active browser tab",
      summary: activeTab.url,
      source: {
        kind: "browser-tab",
        id: activeTab.id,
        label: activeTab.title || activeTab.url,
        provider: "browser",
        url: activeTab.url,
        excerpt: activeTab.navigationError?.reason,
        createdAt: Date.now()
      },
      route: { workspace: "browser", confidence: activeTab.navigationError ? 40 : 82, reason: "Browser assistant can read the active tab and stop before external actions." },
      run,
      output: { kind: "browser_summary", title: "Page-read candidate", summary: "Ready to summarize or inspect safely.", refId: activeTab.id, workspace: "browser" },
      quality,
      approval: approvals[id] ?? { state: "not_required" },
      externalAction: getExternalAction("Read page only"),
      shadow: getShadowState(false, run, ["productivity"]),
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  ];
}

function choosePrimaryAssignment(assignments: WorkAssignment[]): WorkAssignment | undefined {
  return [...assignments].sort((left, right) => getAssignmentWeight(right) - getAssignmentWeight(left))[0];
}

function getAssignmentWeight(assignment: WorkAssignment): number {
  const stateWeight = assignment.approvalState === "needs_review" ? 70 : assignment.state === "running" ? 60 : assignment.state === "completed" ? 50 : assignment.state === "failed" ? 40 : 20;
  return stateWeight + (assignment.qualityScore ?? 0) / 100;
}

function getWorkItemGraphQuality(
  primaryAssignment: WorkAssignment | undefined,
  output: WorkGraphOutput,
  workItem: WorkItem,
  run: WorkGraphRun
): WorkGraphItem["quality"] {
  if (typeof primaryAssignment?.qualityScore === "number") {
    return {
      score: primaryAssignment.qualityScore,
      passed: primaryAssignment.qualityScore >= 80,
      summary: primaryAssignment.failureReason ?? primaryAssignment.lastRunSummary ?? "Quality score available."
    };
  }

  const sourceText = [workItem.source.label, workItem.source.subject, workItem.source.actionSummary, workItem.context].filter(Boolean).join(" ");
  const outputText = [output.title, output.summary, primaryAssignment?.lastRunSummary, run.plan].filter(Boolean).join(" ");
  switch (output.kind) {
    case "draft":
      return toWorkGraphQuality(
        evaluateEmailDraftQuality({
          draft: outputText,
          sourceText,
          requiresSendApproval: workItem.permissionLevel === "approval"
        })
      );
    case "coding_plan":
      return toWorkGraphQuality(
        evaluateCodingRunQuality({
          plan: run.plan,
          changedFiles: primaryAssignment?.linkedCodingProjectPath ? [primaryAssignment.linkedCodingProjectPath] : [],
          diffSummary: output.summary,
          testSummary: primaryAssignment?.lastRunSummary ?? "Verification waits for the coding run.",
          approvalRequired: workItem.permissionLevel === "approval" || workItem.assignedRoles.includes("coding")
        })
      );
    case "automation_run":
      return toWorkGraphQuality(
        evaluateAutomationOutputQuality({
          output: outputText,
          sources: [workItem.source.label],
          qualityBar: primaryAssignment?.qualityScore ?? 82,
          approvalRequired: true
        })
      );
    case "browser_summary":
      return toWorkGraphQuality(
        evaluateBrowserActionQuality({
          summary: outputText,
          observations: run.visibleRunLog,
          stoppedBeforeExternalAction: true,
          approvalRequired: workItem.permissionLevel === "approval"
        })
      );
    case "artifact":
    case "source_review":
    case "none":
      return undefined;
  }
}

function getAutomationGraphQuality(run: AutomationRun): WorkGraphItem["quality"] {
  if (typeof run.qualityScore === "number") {
    return {
      score: run.qualityScore,
      passed: run.qualityScore >= 80,
      summary: run.qualityChecks.join(", ") || run.qualityReport?.summary || "Quality checked."
    };
  }

  return toWorkGraphQuality(
    evaluateAutomationOutputQuality({
      output: [run.outputTitle, run.outputSummary, run.outputMarkdown, ...run.visibleRunLog].filter(Boolean).join(" "),
      sources: run.sources.map((source) => [source.provider, source.title, source.snippet].filter(Boolean).join(" ")),
      qualityBar: 82,
      approvalRequired: run.state !== "completed"
    })
  );
}

function getRunFromWorkItem(workItem: WorkItem, assignments: WorkAssignment[], primaryAssignment?: WorkAssignment): WorkGraphRun {
  const runningAssignment = assignments.find((assignment) => assignment.state === "running");
  const reviewAssignment = assignments.find((assignment) => assignment.approvalState === "needs_review" || assignment.state === "waiting_for_user");
  const failedAssignment = assignments.find((assignment) => assignment.state === "failed");
  const state: WorkGraphRun["state"] =
    workItem.source.provider === "google-calendar"
      ? "user_must_handle"
      : runningAssignment
        ? "ai_working"
        : reviewAssignment
          ? "needs_approval"
          : failedAssignment
            ? "blocked"
            : workItem.state === "done"
              ? "done"
              : primaryAssignment
                ? "handled_safely"
                : "ready_to_start";

  return {
    state,
    safeActions: getSafeActions(workItem.assignedRoles),
    plan: workItem.aiSuggestedPrep ?? (workItem.extractedRequirements.join(" -> ") || `Route to ${workItem.assignedRoles.join(", ")} and prepare reviewable output.`),
    visibleRunLog: assignments
      .flatMap((assignment) => [assignment.lastRunSummary, assignment.failureReason])
      .filter((entry): entry is string => Boolean(entry))
      .slice(0, 8),
    startedAt: runningAssignment?.updatedAt,
    completedAt: assignments.find((assignment) => assignment.state === "completed")?.updatedAt,
    failureReason: failedAssignment?.failureReason
  };
}

function getOutputFromAssignment(assignment: WorkAssignment | undefined, workItem: WorkItem): WorkGraphOutput {
  const outputRef = assignment?.outputRefs[0];
  if (outputRef) {
    return {
      kind: outputRef.kind === "artifact" ? "artifact" : outputRef.kind === "automation" ? "automation_run" : outputRef.kind === "coding" ? "coding_plan" : "draft",
      title: outputRef.label,
      summary: assignment.lastRunSummary ?? assignment.reason,
      refId: outputRef.id,
      workspace: assignment.role
    };
  }

  return {
    kind: "none",
    title: workItem.requestedOutput,
    summary: "No output has been produced yet.",
    workspace: workItem.assignedRoles[0] ?? "productivity"
  };
}

function getApprovalFromAssignment(assignment: WorkAssignment | undefined, workItem: WorkItem): WorkGraphApproval {
  if (workItem.source.provider === "google-calendar") {
    return { state: "not_required", requiredReason: "Calendar commitments stay user-owned." };
  }
  if (!assignment) {
    return { state: workItem.permissionLevel === "approval" ? "needs_approval" : "not_required", requiredReason: workItem.userOnlyReason };
  }
  if (assignment.approvalState === "needs_review") {
    return { state: "needs_approval", requiredReason: assignment.approvalRequiredReason };
  }
  if (assignment.approvalState === "approved") {
    return { state: "approved" };
  }
  if (assignment.approvalState === "rejected") {
    return { state: "rejected", rejectedReason: assignment.failureReason };
  }
  return { state: "not_required" };
}

function getExternalAction(label: string) {
  const permission = decidePermission({ action: label });
  const requiresApproval = permission.requiresApproval;
  return {
    label,
    risk: permission.riskLevel === "destructive" || permission.riskLevel === "external_write" ? ("red" as const) : permission.riskLevel === "read" ? ("green" as const) : ("yellow" as const),
    requiresApproval,
    disabledReason: permission.allowed ? undefined : permission.reason
  };
}

function getShadowState(isUserOwnedCalendar: boolean, run: WorkGraphRun, roles: WorkspaceRole[]): WorkGraphItem["shadow"] {
  const eligible = !isUserOwnedCalendar && (run.state === "ready_to_start" || run.state === "needs_approval" || run.state === "handled_safely");
  return {
    eligible,
    active: run.state === "ai_working",
    why: eligible
      ? `Safe to run Shadow Mode for ${roles.join(", ")} because it only reads, drafts, summarizes, prepares, or plans.`
      : isUserOwnedCalendar
        ? "Calendar events are user-owned commitments. Autopilot may prepare context but will not take over the event."
        : "This item is not ready for Shadow Mode."
  };
}

function getSafeActions(roles: WorkspaceRole[]): string[] {
  const actions = new Set<string>(["read source", "summarize"]);
  for (const role of roles) {
    if (role === "productivity") {
      actions.add("draft reply");
    }
    if (role === "design") {
      actions.add("prepare artifact");
    }
    if (role === "coding") {
      actions.add("plan code edit");
    }
    if (role === "automation") {
      actions.add("suggest recipe");
    }
  }
  return [...actions];
}

function getSourceKind(provider: string): WorkGraphSourceKind {
  switch (provider) {
    case "gmail":
      return "gmail";
    case "google-calendar":
      return "google-calendar";
    case "coding":
      return "coding-project";
    case "slack":
    case "chat":
      return "chat";
    case "web":
      return "browser-tab";
    default:
      return "manual";
  }
}

function groupBy<T>(items: T[], getKey: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = getKey(item);
    map.set(key, [...(map.get(key) ?? []), item]);
  }
  return map;
}

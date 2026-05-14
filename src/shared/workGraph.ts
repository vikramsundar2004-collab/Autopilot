import type { ArtifactQualityReport } from "./artifactQuality.js";
import { isExternalImpactActionText } from "./permissionPolicy.js";

export type WorkGraphWorkspace = "home" | "browser" | "productivity" | "design" | "coding" | "automation" | "chatting";

export type WorkGraphSourceKind =
  | "gmail"
  | "google-calendar"
  | "browser-tab"
  | "design-artifact"
  | "coding-project"
  | "automation-run"
  | "payment-request"
  | "chat"
  | "manual";

export type WorkGraphRunState = "ready_to_start" | "ai_working" | "needs_approval" | "handled_safely" | "user_must_handle" | "blocked" | "done";

export type WorkGraphApprovalState = "not_required" | "needs_approval" | "approved" | "rejected";

export type WorkGraphRiskLevel = "green" | "yellow" | "red";

export type WorkGraphSource = {
  kind: WorkGraphSourceKind;
  id: string;
  label: string;
  provider?: string;
  url?: string;
  excerpt?: string;
  createdAt?: number;
};

export type WorkGraphRoute = {
  workspace: Exclude<WorkGraphWorkspace, "home">;
  confidence: number;
  reason: string;
};

export type WorkGraphRun = {
  state: WorkGraphRunState;
  safeActions: string[];
  plan: string;
  visibleRunLog: string[];
  startedAt?: number;
  completedAt?: number;
  failureReason?: string;
};

export type WorkGraphOutput = {
  kind: "draft" | "artifact" | "coding_plan" | "automation_run" | "browser_summary" | "source_review" | "payment_proposal" | "payment_receipt" | "none";
  title: string;
  summary: string;
  refId?: string;
  workspace: Exclude<WorkGraphWorkspace, "home">;
};

export type WorkGraphApproval = {
  state: WorkGraphApprovalState;
  requiredReason?: string;
  approvedAt?: number;
  rejectedAt?: number;
  rejectedReason?: string;
};

export type WorkGraphExternalAction = {
  label: string;
  risk: WorkGraphRiskLevel;
  requiresApproval: boolean;
  disabledReason?: string;
};

export type WorkGraphShadow = {
  eligible: boolean;
  active: boolean;
  why: string;
};

export type WorkGraphItem = {
  id: string;
  title: string;
  summary: string;
  source: WorkGraphSource;
  route: WorkGraphRoute;
  run: WorkGraphRun;
  output: WorkGraphOutput;
  quality?: Pick<ArtifactQualityReport, "score" | "passed" | "summary">;
  approval: WorkGraphApproval;
  externalAction: WorkGraphExternalAction;
  shadow: WorkGraphShadow;
  createdAt: number;
  updatedAt: number;
};

export type WorkTwinItem = WorkGraphItem;

export type ChatWorkTwinSuggestion = {
  id: string;
  title: string;
  summary: string;
  routeWorkspace: Extract<WorkGraphWorkspace, "productivity" | "design" | "coding" | "automation">;
  confidence: number;
  organizationName: string;
  channelLabel: string;
  sourceMessageId: string | null;
  sourceMessageBody?: string;
  authorLabel?: string;
  assigneeLabel?: string;
  createdAt: number;
  acceptedAt: number | null;
};

export type WorkTwinReplayStep = {
  id: string;
  label: string;
  detail: string;
  state: "source" | "understood" | "route" | "plan" | "output" | "quality" | "approval" | "external_action";
  timestamp?: number;
};

export type ProofModeReport = {
  itemId: string;
  source: string;
  understood: string;
  route: string;
  plan: string;
  output: string;
  quality: string;
  approval: string;
  externalAction: string;
  replay: WorkTwinReplayStep[];
};

export type ShadowModeRule = {
  id: string;
  name: string;
  sourceKind: WorkGraphSourceKind;
  routeWorkspace: Exclude<WorkGraphWorkspace, "home">;
  safeActions: string[];
  enabled: boolean;
  createdFromItemId?: string;
  createdAt: number;
  updatedAt: number;
};

export type ShadowModeRun = {
  id: string;
  workGraphItemId: string;
  ruleId?: string;
  state: "queued" | "running" | "needs_approval" | "completed" | "blocked" | "failed";
  sourceLabel: string;
  plan: string;
  outputSummary: string;
  approvalRequired: boolean;
  reason: string;
  visibleRunLog: string[];
  startedAt: number;
  completedAt?: number;
};

export type WorkGraphSnapshot = {
  items: WorkGraphItem[];
  shadowRuns: ShadowModeRun[];
  rules: ShadowModeRule[];
  counts: WorkGraphCounts;
  generatedAt: number;
};

export type WorkGraphCounts = {
  total: number;
  readyToStart: number;
  aiWorking: number;
  needsApproval: number;
  handledSafely: number;
  userMustHandle: number;
  blocked: number;
  rulesSuggested: number;
};

export type WorkGraphActionResult = {
  success: boolean;
  item?: WorkGraphItem;
  snapshot?: WorkGraphSnapshot;
  reason?: string;
};

export type WorkGraphMakeRuleResult = {
  success: boolean;
  rule?: ShadowModeRule;
  snapshot?: WorkGraphSnapshot;
  reason?: string;
};

export function getWorkGraphCounts(items: WorkGraphItem[], rules: ShadowModeRule[] = []): WorkGraphCounts {
  return {
    total: items.length,
    readyToStart: items.filter((item) => item.run.state === "ready_to_start").length,
    aiWorking: items.filter((item) => item.run.state === "ai_working").length,
    needsApproval: items.filter((item) => item.run.state === "needs_approval" || item.approval.state === "needs_approval").length,
    handledSafely: items.filter((item) => item.run.state === "handled_safely" || item.run.state === "done").length,
    userMustHandle: items.filter((item) => item.run.state === "user_must_handle").length,
    blocked: items.filter((item) => item.run.state === "blocked").length,
    rulesSuggested: items.filter((item) => item.shadow.eligible).length + rules.filter((rule) => rule.enabled).length
  };
}

export function isExternalImpactAction(label: string): boolean {
  return isExternalImpactActionText(label);
}

export function buildWorkTwinReplay(item: WorkGraphItem): WorkTwinReplayStep[] {
  const steps: WorkTwinReplayStep[] = [
    {
      id: `${item.id}:source`,
      label: "Source",
      detail: `${item.source.kind}: ${item.source.label}${item.source.excerpt ? ` - ${item.source.excerpt}` : ""}`,
      state: "source",
      timestamp: item.source.createdAt ?? item.createdAt
    },
    {
      id: `${item.id}:understood`,
      label: "Understood ask",
      detail: item.summary || item.output.summary || "Autopilot has not inferred a detailed ask yet.",
      state: "understood",
      timestamp: item.createdAt
    },
    {
      id: `${item.id}:route`,
      label: "Route",
      detail: `${item.route.workspace} (${item.route.confidence}%): ${item.route.reason}`,
      state: "route",
      timestamp: item.updatedAt
    },
    {
      id: `${item.id}:plan`,
      label: "Plan",
      detail: item.run.plan || "No plan has been recorded yet.",
      state: "plan",
      timestamp: item.run.startedAt
    },
    {
      id: `${item.id}:output`,
      label: "Output",
      detail: `${item.output.title}: ${item.output.summary || "No output has been produced yet."}`,
      state: "output",
      timestamp: item.run.completedAt
    },
    {
      id: `${item.id}:quality`,
      label: "Quality",
      detail: item.quality ? `${item.quality.score}/100 - ${item.quality.summary}` : "No quality report yet.",
      state: "quality",
      timestamp: item.run.completedAt
    },
    {
      id: `${item.id}:approval`,
      label: "Approval",
      detail:
        item.approval.state === "approved"
          ? "Approved by user."
          : item.approval.state === "rejected"
            ? `Rejected: ${item.approval.rejectedReason ?? "No reason recorded."}`
            : item.approval.state === "needs_approval"
              ? item.approval.requiredReason ?? "User approval is required before the next step."
              : "No approval required for this safe local step.",
      state: "approval",
      timestamp: item.approval.approvedAt ?? item.approval.rejectedAt
    },
    {
      id: `${item.id}:external-action`,
      label: "External action",
      detail: item.externalAction.requiresApproval
        ? `${item.externalAction.label} is blocked until approval.`
        : `${item.externalAction.label} is safe local work.`,
      state: "external_action",
      timestamp: item.updatedAt
    }
  ];

  return steps;
}

export function buildProofModeReport(item: WorkGraphItem): ProofModeReport {
  return {
    itemId: item.id,
    source: `${item.source.kind}: ${item.source.label}`,
    understood: item.summary,
    route: `${item.route.workspace} (${item.route.confidence}%): ${item.route.reason}`,
    plan: item.run.plan,
    output: `${item.output.title}: ${item.output.summary}`,
    quality: item.quality ? `${item.quality.score}/100 - ${item.quality.summary}` : "No quality report yet.",
    approval: item.approval.state,
    externalAction: item.externalAction.requiresApproval
      ? `${item.externalAction.label} requires approval`
      : `${item.externalAction.label} is safe`,
    replay: buildWorkTwinReplay(item)
  };
}

export function buildChatWorkTwinItems(suggestions: ChatWorkTwinSuggestion[], now = Date.now()): WorkGraphItem[] {
  return suggestions
    .filter((suggestion) => !suggestion.acceptedAt)
    .map((suggestion) => {
      const sourceLabel = `${suggestion.organizationName} / ${suggestion.channelLabel}`;
      const assignee = suggestion.assigneeLabel ? ` Assigned to ${suggestion.assigneeLabel}.` : "";
      const run: WorkGraphRun = {
        state: "needs_approval",
        safeActions: ["read chat source", "summarize ask", "create linked work item"],
        plan: `Review the chat ask, confirm the owner, then create a linked ${suggestion.routeWorkspace} work item.${assignee}`,
        visibleRunLog: [
          `Read chat source: ${sourceLabel}`,
          `Detected ask: ${suggestion.summary}`,
          "Waiting for user approval before adding it to Productivity."
        ]
      };

      return {
        id: `chat-suggestion:${suggestion.id}`,
        title: suggestion.title,
        summary: suggestion.summary,
        source: {
          kind: "chat",
          id: suggestion.sourceMessageId ?? suggestion.id,
          label: sourceLabel,
          provider: "chatting",
          excerpt: suggestion.sourceMessageBody ?? suggestion.summary,
          createdAt: suggestion.createdAt
        },
        route: {
          workspace: suggestion.routeWorkspace,
          confidence: Math.max(0, Math.min(100, Math.round(suggestion.confidence))),
          reason: "Enterprise chat AI detected an assignable ask. It stays a suggestion until the user approves it."
        },
        run,
        output: {
          kind:
            suggestion.routeWorkspace === "coding"
              ? "coding_plan"
              : suggestion.routeWorkspace === "automation"
                ? "automation_run"
                : suggestion.routeWorkspace === "design"
                  ? "artifact"
                  : "source_review",
          title: `Create ${suggestion.routeWorkspace} work item`,
          summary: "No workspace task has been created yet. Approval creates the linked work item.",
          workspace: suggestion.routeWorkspace
        },
        approval: {
          state: "needs_approval",
          requiredReason: "Approve before this chat suggestion becomes routed work."
        },
        externalAction: {
          label: "Create linked Productivity work item",
          risk: "yellow",
          requiresApproval: false
        },
        shadow: {
          eligible: true,
          active: false,
          why: "Safe to turn this chat suggestion into a local review item. It does not post messages or change external systems."
        },
        createdAt: suggestion.createdAt,
        updatedAt: now
      };
    });
}

export function getWorkGraphItemSortValue(item: WorkGraphItem): number {
  const stateWeight: Record<WorkGraphRunState, number> = {
    needs_approval: 600,
    ready_to_start: 500,
    ai_working: 400,
    blocked: 300,
    user_must_handle: 250,
    handled_safely: 100,
    done: 50
  };
  return stateWeight[item.run.state] + item.route.confidence + Math.min(99, Math.max(0, Date.now() - item.updatedAt) / -100000000);
}

export type PermissionRiskLevel = "read" | "local_write" | "external_write" | "high_impact_external" | "destructive";

export type PermissionMode = "normal" | "shadow" | "trusted_rule";

export type PermissionPolicyInput = {
  action: string;
  riskLevel?: PermissionRiskLevel;
  mode?: PermissionMode;
  approved?: boolean;
  trustedRule?: boolean;
};

export type PermissionPolicyDecision = {
  action: string;
  riskLevel: PermissionRiskLevel;
  allowed: boolean;
  requiresApproval: boolean;
  blocked: boolean;
  reason: string;
  policy:
    | "safe_read"
    | "safe_local_write"
    | "approval_required"
    | "high_impact_approval_required"
    | "shadow_block"
    | "trusted_rule_allowed"
    | "destructive_block";
};

const DESTRUCTIVE_PATTERN =
  /\b(delete|deleting|destroy|drop\s+table|rm\s+-rf|reset\s+--hard|wipe|purge|erase|permanently\s+delete|force\s+push|unsubscribe|revoke|disable\s+account)\b/iu;
const HIGH_IMPACT_EXTERNAL_PATTERN =
  /\b(commit|push|merge|deploy|production|pay|payment|purchase|quote|invoice|transfer\s+money|wire\s+money|refund|dispute|sign(?:ing)?|contract|send\s+money|move\s+money)\b/iu;
const EXTERNAL_WRITE_PATTERN =
  /\b(send|sending|sent|forward|share|publish|submit|post|apply\s+labels?|archive|mark\s+read|mark\s+unread|star|unstar|snooze|write\s+calendar|save\s+to\s+google|update\s+calendar|create\s+event)\b/iu;
const LOCAL_WRITE_PATTERN =
  /\b(draft|prepare|create artifact|revise|summarize|classify|label plan|plan code|propose edit|inspect|read|review|quality check|export local|save local)\b/iu;

export function inferPermissionRiskLevel(action: string, fallback: PermissionRiskLevel = "read"): PermissionRiskLevel {
  const normalized = action.trim();
  if (!normalized) {
    return fallback;
  }
  if (DESTRUCTIVE_PATTERN.test(normalized)) {
    return "destructive";
  }
  if (HIGH_IMPACT_EXTERNAL_PATTERN.test(normalized)) {
    return "high_impact_external";
  }
  if (EXTERNAL_WRITE_PATTERN.test(normalized)) {
    return "external_write";
  }
  if (LOCAL_WRITE_PATTERN.test(normalized)) {
    return normalized.toLowerCase().includes("read") || normalized.toLowerCase().includes("classify") ? "read" : "local_write";
  }
  return fallback;
}

export function isExternalImpactActionText(action: string): boolean {
  const riskLevel = inferPermissionRiskLevel(action);
  return riskLevel === "external_write" || riskLevel === "high_impact_external" || riskLevel === "destructive";
}

export function decidePermission(input: PermissionPolicyInput): PermissionPolicyDecision {
  const action = input.action.trim() || "Unnamed action";
  const mode = input.mode ?? "normal";
  const approved = input.approved === true;
  const trustedRule = input.trustedRule === true;
  const riskLevel = input.riskLevel ?? inferPermissionRiskLevel(action);

  if (riskLevel === "destructive") {
    return {
      action,
      riskLevel,
      allowed: false,
      requiresApproval: true,
      blocked: true,
      reason: "Destructive actions are blocked from Autopilot's shared runtime. The user must perform them directly in the source system.",
      policy: "destructive_block"
    };
  }

  if (mode === "shadow" && (riskLevel === "external_write" || riskLevel === "high_impact_external")) {
    return {
      action,
      riskLevel,
      allowed: false,
      requiresApproval: true,
      blocked: false,
      reason:
        riskLevel === "high_impact_external"
          ? "Shadow Mode may prepare proposals, but it cannot commit, push, deploy, sign, or move money."
          : "Shadow Mode may read, classify, draft, plan, and prepare, but it cannot change external systems.",
      policy: "shadow_block"
    };
  }

  if (riskLevel === "high_impact_external") {
    if (approved) {
      return {
        action,
        riskLevel,
        allowed: true,
        requiresApproval: true,
        blocked: false,
        reason: "Allowed only after explicit user approval, proof review, and any required step-up confirmation.",
        policy: "high_impact_approval_required"
      };
    }

    return {
      action,
      riskLevel,
      allowed: false,
      requiresApproval: true,
      blocked: false,
      reason: "High-impact actions require an explicit command, proof review, and per-action approval before Autopilot can run them.",
      policy: "high_impact_approval_required"
    };
  }

  if (riskLevel === "external_write") {
    if (approved) {
      return {
        action,
        riskLevel,
        allowed: true,
        requiresApproval: true,
        blocked: false,
        reason: trustedRule
          ? "Allowed by a narrow trusted rule after explicit user approval."
          : "Allowed after explicit user approval for this action.",
        policy: trustedRule ? "trusted_rule_allowed" : "approval_required"
      };
    }

    return {
      action,
      riskLevel,
      allowed: false,
      requiresApproval: true,
      blocked: false,
      reason: "External-impact actions require explicit user approval before Autopilot can run them.",
      policy: "approval_required"
    };
  }

  if (riskLevel === "local_write") {
    return {
      action,
      riskLevel,
      allowed: true,
      requiresApproval: false,
      blocked: false,
      reason: "Allowed because this only prepares local, reviewable work.",
      policy: "safe_local_write"
    };
  }

  return {
    action,
    riskLevel,
    allowed: true,
    requiresApproval: false,
    blocked: false,
    reason: "Allowed because this is read-only context gathering.",
    policy: "safe_read"
  };
}

export function getPermissionPolicySummary(): Array<{ riskLevel: PermissionRiskLevel; label: string; detail: string }> {
  return [
    {
      riskLevel: "read",
      label: "Read",
      detail: "Allowed for source review, summarization, classification, and context gathering."
    },
    {
      riskLevel: "local_write",
      label: "Local write",
      detail: "Allowed for drafts, artifacts, code plans, quality checks, and reviewable local outputs."
    },
    {
      riskLevel: "external_write",
      label: "External write",
      detail: "Blocked until explicit approval; Shadow Mode cannot run it."
    },
    {
      riskLevel: "high_impact_external",
      label: "High-impact external",
      detail: "Commit, push, deploy, signing, and money movement require proof review, explicit approval, and step-up where applicable."
    },
    {
      riskLevel: "destructive",
      label: "Destructive",
      detail: "Blocked from the shared runtime even if the model asks for it."
    }
  ];
}

export type WorkOutputQualityKind =
  | "email_draft"
  | "coding_run"
  | "browser_action"
  | "automation_output"
  | "agent_runtime";

export type WorkOutputQualityCheckId =
  | "clear_intent"
  | "source_grounded"
  | "reviewable_output"
  | "approval_safe"
  | "specific_next_step"
  | "verification_visible"
  | "not_placeholder";

export type WorkOutputQualityCheck = {
  id: WorkOutputQualityCheckId;
  label: string;
  passed: boolean;
  detail: string;
};

export type WorkOutputQualityReport = {
  kind: WorkOutputQualityKind;
  passed: boolean;
  score: number;
  exportReady: boolean;
  approvalRequired: boolean;
  failedReasonCodes: WorkOutputQualityCheckId[];
  checks: WorkOutputQualityCheck[];
  passedChecks: WorkOutputQualityCheck[];
  failedChecks: WorkOutputQualityCheck[];
  summary: string;
};

export type EmailDraftQualityInput = {
  draft: string;
  sourceText: string;
  requiresSendApproval?: boolean;
};

export type CodingRunQualityInput = {
  plan: string;
  changedFiles?: string[];
  diffSummary?: string;
  testSummary?: string;
  approvalRequired?: boolean;
};

export type BrowserActionQualityInput = {
  summary: string;
  observations?: string[];
  stoppedBeforeExternalAction?: boolean;
  approvalRequired?: boolean;
};

export type AutomationOutputQualityInput = {
  output: string;
  sources?: string[];
  qualityBar?: number;
  approvalRequired?: boolean;
};

export type AgentRuntimeQualityInput = {
  prompt: string;
  selectedToolNames: string[];
  allowedToolNames: string[];
  blockedToolNames: string[];
  permissionDecisionCount: number;
};

export function evaluateEmailDraftQuality(input: EmailDraftQualityInput): WorkOutputQualityReport {
  const draft = normalizeWhitespace(input.draft);
  const sourceText = normalizeWhitespace(input.sourceText);
  const checks: WorkOutputQualityCheck[] = [
    check("clear_intent", "Clear reply intent", countWords(draft) >= 35 && /\b(hi|hello|thanks|thank you|following up|next step|let me know)\b/iu.test(draft), "Drafts need enough complete reply copy to be reviewable."),
    check("source_grounded", "Grounded in source", hasSharedMeaning(draft, sourceText), "The draft should reflect the source email instead of generic filler."),
    check("reviewable_output", "Reviewable output", /\n|[.!?].{8,}[.!?]/u.test(draft), "The user needs a coherent draft, not a fragment."),
    check("approval_safe", "Send approval required", input.requiresSendApproval !== false && !/\b(sent|i sent|already sent|will send automatically)\b/iu.test(draft), "Draft quality must not imply Autopilot sent or will silently send email."),
    check("specific_next_step", "Specific next step", /\b(call|meet|review|approve|send|share|schedule|confirm|update|deadline|by\s+\w+|next)\b/iu.test(draft), "Good drafts should include a concrete next move when the source asks for work."),
    check("not_placeholder", "Not placeholder", !hasPlaceholderLanguage(draft), "Fallback or placeholder copy is not export-ready.")
  ];
  return buildWorkOutputQualityReport("email_draft", checks, input.requiresSendApproval !== false);
}

export function evaluateCodingRunQuality(input: CodingRunQualityInput): WorkOutputQualityReport {
  const joined = normalizeWhitespace([input.plan, input.diffSummary, input.testSummary, ...(input.changedFiles ?? [])].filter(Boolean).join(" "));
  const checks: WorkOutputQualityCheck[] = [
    check("clear_intent", "Clear coding intent", /\b(inspect|plan|edit|fix|implement|refactor|test|verify|diff)\b/iu.test(joined), "Coding output should show what the agent is trying to change."),
    check("source_grounded", "Codebase grounded", /\b(file|path|component|module|function|test|repo|project)\b/iu.test(joined) || (input.changedFiles?.length ?? 0) > 0, "Coding work needs file, module, or project context."),
    check("reviewable_output", "Reviewable diff", Boolean(input.diffSummary || (input.changedFiles?.length ?? 0) > 0 || /\bdiff\b/iu.test(joined)), "The user should see changed files or a diff summary before approving."),
    check("verification_visible", "Verification visible", /\b(test|build|check|typecheck|lint|verify|verification|passed|failed)\b/iu.test(joined), "Coding work should show how it was or will be verified."),
    check("approval_safe", "Approval before external impact", input.approvalRequired !== false, "Edits, commands, pushes, and deploys need a review gate."),
    check("not_placeholder", "Not placeholder", !hasPlaceholderLanguage(joined), "A shell coding response is not a real agent run.")
  ];
  return buildWorkOutputQualityReport("coding_run", checks, input.approvalRequired !== false);
}

export function evaluateBrowserActionQuality(input: BrowserActionQualityInput): WorkOutputQualityReport {
  const joined = normalizeWhitespace([input.summary, ...(input.observations ?? [])].filter(Boolean).join(" "));
  const checks: WorkOutputQualityCheck[] = [
    check("clear_intent", "Clear browser intent", /\b(read|summarize|inspect|field|form|click|fill|page|tab|dom)\b/iu.test(joined), "Browser work should state whether it read, inspected, filled, or clicked."),
    check("source_grounded", "Page grounded", /\b(page|tab|url|dom|field|selector|visible|form)\b/iu.test(joined), "Browser actions need visible page context."),
    check("reviewable_output", "Reviewable observation", countWords(joined) >= 12, "The user needs an observation trail, not just a success badge."),
    check("approval_safe", "Stops before submit", input.stoppedBeforeExternalAction === true || input.approvalRequired === true, "Browser agent must stop before submit, send, pay, delete, or publish."),
    check("specific_next_step", "Specific next action", /\b(next|approve|review|submit|continue|field|button|selector|action)\b/iu.test(joined), "The result should explain the next safe step."),
    check("not_placeholder", "Not placeholder", !hasPlaceholderLanguage(joined), "Browser output cannot masquerade as real page inspection.")
  ];
  return buildWorkOutputQualityReport("browser_action", checks, input.approvalRequired === true);
}

export function evaluateAutomationOutputQuality(input: AutomationOutputQualityInput): WorkOutputQualityReport {
  const output = normalizeWhitespace(input.output);
  const sourceText = normalizeWhitespace((input.sources ?? []).join(" "));
  const bar = Math.max(0, Math.min(100, input.qualityBar ?? 82));
  const checks: WorkOutputQualityCheck[] = [
    check("clear_intent", "Clear automation output", countWords(output) >= 45, "Automation runs need enough detail to be useful later."),
    check("source_grounded", "Source-backed", (input.sources?.length ?? 0) > 0 && hasSharedMeaning(output, sourceText), "Recurring work should show where the result came from."),
    check("reviewable_output", "Reviewable run log", /\b(summary|result|finding|next|recommend|action|source|quality)\b/iu.test(output), "Automation output should look like a run result, not a raw note."),
    check("verification_visible", "Quality bar visible", /\bquality|check|score|passed|failed|review\b/iu.test(output) || bar >= 0, "Automation should expose its quality bar and result."),
    check("approval_safe", "External action gated", input.approvalRequired !== false, "Automation can prepare work, but external-impact actions need approval."),
    check("not_placeholder", "Not placeholder", !hasPlaceholderLanguage(output), "Placeholder automation output should remain blocked.")
  ];
  const report = buildWorkOutputQualityReport("automation_output", checks, input.approvalRequired !== false);
  return report.score >= bar || !report.passed
    ? report
    : {
        ...report,
        passed: false,
        exportReady: false,
        failedChecks: [
          ...report.failedChecks,
          check("verification_visible", "Meets configured bar", false, `Score ${report.score}/100 is below the configured ${bar}/100 bar.`)
        ],
        failedReasonCodes: [...report.failedReasonCodes, "verification_visible"],
        summary: `Quality needs review at ${report.score}/100. Score is below the configured ${bar}/100 bar.`
      };
}

export function evaluateAgentRuntimeQuality(input: AgentRuntimeQualityInput): WorkOutputQualityReport {
  const joined = normalizeWhitespace(`${input.prompt} ${input.selectedToolNames.join(" ")} ${input.allowedToolNames.join(" ")} ${input.blockedToolNames.join(" ")}`);
  const checks: WorkOutputQualityCheck[] = [
    check("clear_intent", "Intent inferred", countWords(input.prompt) >= 3, "Agent runs need a clear user ask."),
    check("source_grounded", "Tools scoped", input.selectedToolNames.length > 0 && input.selectedToolNames.length <= 8, "Runtime should load a small relevant tool set, not every tool."),
    check("reviewable_output", "Reviewable plan", /\b(read|inspect|plan|draft|create|revise|run|suggest|fill|click)\b/iu.test(joined), "Runtime output should show what the agent can do."),
    check("approval_safe", "Permission decisions recorded", input.permissionDecisionCount === input.selectedToolNames.length, "Every selected tool needs a permission decision."),
    check("verification_visible", "Blocked actions visible", input.blockedToolNames.every((toolName) => joined.includes(toolName)), "Approval gates should be visible in the trace."),
    check("not_placeholder", "Not placeholder", !hasPlaceholderLanguage(joined), "Runtime traces cannot be fake or fallback-only.")
  ];
  return buildWorkOutputQualityReport("agent_runtime", checks, input.blockedToolNames.length > 0);
}

export function toWorkGraphQuality(report: WorkOutputQualityReport): { score: number; passed: boolean; summary: string } {
  return {
    score: report.score,
    passed: report.passed,
    summary: report.summary
  };
}

function buildWorkOutputQualityReport(
  kind: WorkOutputQualityKind,
  checks: WorkOutputQualityCheck[],
  approvalRequired: boolean
): WorkOutputQualityReport {
  const passedChecks = checks.filter((candidate) => candidate.passed);
  const failedChecks = checks.filter((candidate) => !candidate.passed);
  const score = Math.round((passedChecks.length / Math.max(1, checks.length)) * 100);
  const passed = failedChecks.length === 0;
  return {
    kind,
    passed,
    score,
    exportReady: passed && !approvalRequired,
    approvalRequired,
    failedReasonCodes: failedChecks.map((candidate) => candidate.id),
    checks,
    passedChecks,
    failedChecks,
    summary: passed
      ? `Quality gate passed at ${score}/100.`
      : `Quality needs review at ${score}/100: ${failedChecks.map((candidate) => candidate.label).join(", ")}.`
  };
}

function check(id: WorkOutputQualityCheckId, label: string, passed: boolean, detail: string): WorkOutputQualityCheck {
  return { id, label, passed, detail };
}

function hasPlaceholderLanguage(value: string): boolean {
  return /\b(placeholder|lorem ipsum|coming soon|fake ai|offline fallback|fallback draft|ai unavailable|shell ui|todo)\b/iu.test(value);
}

function hasSharedMeaning(output: string, sourceText: string): boolean {
  const sourceTokens = new Set(tokenizeMeaning(sourceText));
  if (sourceTokens.size === 0) {
    return true;
  }
  return tokenizeMeaning(output).filter((token) => sourceTokens.has(token)).length >= 2;
}

function tokenizeMeaning(value: string): string[] {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/https?:\/\/\S+/gu, " ")
    .match(/\b[\p{L}\p{N}][\p{L}\p{N}'-]{3,}\b/gu) ?? [];
}

function countWords(value: string): number {
  return value.match(/\b[\w'-]{2,}\b/gu)?.length ?? 0;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/gu, " ").trim();
}

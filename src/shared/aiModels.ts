export type AiModelTier = "nano" | "mini" | "standard" | "frontier";

export type AiModelTask =
  | "general"
  | "assistant"
  | "browser_summary"
  | "email_triage"
  | "email_organization"
  | "productivity_calendar_chat"
  | "home_recap"
  | "chat_action_extract"
  | "artifact_generation"
  | "artifact_plan"
  | "artifact_draft"
  | "artifact_critique"
  | "artifact_revision"
  | "artifact_quality"
  | "design_generation"
  | "design_prompt_translate"
  | "design_prompt_suggestions"
  | "coding_prompt_translate"
  | "coding_agent"
  | "coding_review"
  | "coding_browser_feedback"
  | "automation_planning";

export type AiModelRoutingConfig = {
  nano: string;
  mini: string;
  standard: string;
  frontier: string;
};

export type AiModelSelection = {
  task: AiModelTask;
  tier: AiModelTier;
  model: string;
  reason: string;
};

export const DEFAULT_AUTOPILOT_OPENAI_MODEL = "gpt-5.5";

const TASK_TIERS: Record<AiModelTask, AiModelTier> = {
  general: "standard",
  assistant: "standard",
  browser_summary: "mini",
  email_triage: "standard",
  email_organization: "standard",
  productivity_calendar_chat: "mini",
  home_recap: "standard",
  chat_action_extract: "mini",
  artifact_generation: "standard",
  artifact_plan: "mini",
  artifact_draft: "standard",
  artifact_critique: "mini",
  artifact_revision: "frontier",
  artifact_quality: "nano",
  design_generation: "frontier",
  design_prompt_translate: "mini",
  design_prompt_suggestions: "nano",
  coding_prompt_translate: "mini",
  coding_agent: "frontier",
  coding_review: "standard",
  coding_browser_feedback: "mini",
  automation_planning: "standard"
};

const TASK_REASONS: Record<AiModelTask, string> = {
  general: "General assistant work uses the standard tier unless a caller requests a stronger model.",
  assistant: "Workspace assistant answers need balanced quality and cost.",
  browser_summary: "Page summaries are high-volume read tasks, so they use the mini tier.",
  email_triage: "Productivity triage decides real work and routing, so it uses the standard reasoning tier.",
  email_organization: "Mailbox organization can mutate labels after approval, so it uses the standard tier.",
  productivity_calendar_chat: "Quick calendar edits should be fast and cheap before user approval.",
  home_recap: "Home summarizes cross-workspace state and should stay reliable without using the frontier tier.",
  chat_action_extract: "Chat action extraction is bounded routing work, so it uses the mini tier.",
  artifact_generation: "Artifact generation uses the standard tier before targeted revision raises quality when needed.",
  artifact_plan: "Planning is structured extraction, so it can use the mini tier.",
  artifact_draft: "Drafting needs stronger writing than classification but should not always use the frontier tier.",
  artifact_critique: "Critique and quality review are bounded evaluator tasks, so they use the mini tier.",
  artifact_revision: "Final revision carries the visible quality bar, so it uses the frontier tier.",
  artifact_quality: "Quality checks are bounded evaluator tasks, so they use the cheapest configured tier.",
  design_generation: "Design output is a flagship visible surface, so it uses the frontier tier.",
  design_prompt_translate: "Prompt translation expands rough human intent into a better brief before frontier design generation.",
  design_prompt_suggestions: "Prompt ideas are cheap helper work, so they use the cheapest configured tier.",
  coding_prompt_translate: "Coding prompt translation turns rough user intent into a repo-aware brief before the frontier coding agent edits files.",
  coding_agent: "Code edits and repo reasoning are high-risk/high-value, so they use the frontier tier.",
  coding_review: "Review and diff commentary need strong reasoning but can use the standard tier.",
  coding_browser_feedback: "Browser-test feedback is lightweight revision context before the coding agent acts.",
  automation_planning: "Automation planning needs reliable structure without defaulting to the frontier tier."
};

export function isAiModelTask(value: unknown): value is AiModelTask {
  return typeof value === "string" && value in TASK_TIERS;
}

export function createAiModelRoutingConfig(readEnv: (name: string) => string | undefined): AiModelRoutingConfig {
  const legacyDefault = clean(readEnv("AUTOPILOT_OPENAI_MODEL")) || clean(readEnv("OPENAI_MODEL")) || DEFAULT_AUTOPILOT_OPENAI_MODEL;
  const frontier = clean(readEnv("AUTOPILOT_OPENAI_MODEL_FRONTIER")) || clean(readEnv("OPENAI_MODEL_FRONTIER")) || legacyDefault;
  const standard = clean(readEnv("AUTOPILOT_OPENAI_MODEL_STANDARD")) || clean(readEnv("OPENAI_MODEL_STANDARD")) || frontier;
  const mini =
    clean(readEnv("AUTOPILOT_OPENAI_MODEL_MINI")) ||
    clean(readEnv("OPENAI_MODEL_MINI")) ||
    clean(readEnv("AUTOPILOT_OPENAI_MODEL_CHEAP")) ||
    clean(readEnv("OPENAI_MODEL_CHEAP")) ||
    standard;
  const nano = clean(readEnv("AUTOPILOT_OPENAI_MODEL_NANO")) || clean(readEnv("OPENAI_MODEL_NANO")) || mini;

  return {
    nano,
    mini,
    standard,
    frontier
  };
}

export function selectAiModel(
  task: AiModelTask | undefined,
  config: AiModelRoutingConfig,
  explicitModel?: string
): AiModelSelection {
  const normalizedTask = task && task in TASK_TIERS ? task : "general";
  const tier = TASK_TIERS[normalizedTask];
  const model = clean(explicitModel) || config[tier] || config.frontier || DEFAULT_AUTOPILOT_OPENAI_MODEL;
  return {
    task: normalizedTask,
    tier,
    model,
    reason: TASK_REASONS[normalizedTask]
  };
}

export function getDefaultAiModel(config: AiModelRoutingConfig): string {
  return config.frontier || DEFAULT_AUTOPILOT_OPENAI_MODEL;
}

export function describeAiModelRouting(config: AiModelRoutingConfig): string {
  return `nano=${config.nano}; mini=${config.mini}; standard=${config.standard}; frontier=${config.frontier}`;
}

function clean(value: string | undefined): string {
  return value?.trim() ?? "";
}

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

type AiModelTier = "nano" | "mini" | "standard" | "frontier";

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

export function getModelForTask(requestedModel: unknown, task: AiModelTask = "general"): string {
  if (typeof requestedModel === "string" && requestedModel.trim()) {
    return requestedModel.trim();
  }

  const routing = getModelRoutingConfig();
  const tier = TASK_TIERS[task] ?? "standard";
  return routing[tier] || routing.frontier || "gpt-5.5";
}

export function getModelRoutingSummary(): Record<AiModelTier, string> {
  return getModelRoutingConfig();
}

function getModelRoutingConfig(): Record<AiModelTier, string> {
  const legacyDefault = readModel("AUTOPILOT_OPENAI_MODEL") || readModel("OPENAI_MODEL") || "gpt-5.5";
  const frontier = readModel("AUTOPILOT_OPENAI_MODEL_FRONTIER") || readModel("OPENAI_MODEL_FRONTIER") || legacyDefault;
  const standard = readModel("AUTOPILOT_OPENAI_MODEL_STANDARD") || readModel("OPENAI_MODEL_STANDARD") || frontier;
  const mini =
    readModel("AUTOPILOT_OPENAI_MODEL_MINI") ||
    readModel("OPENAI_MODEL_MINI") ||
    readModel("AUTOPILOT_OPENAI_MODEL_CHEAP") ||
    readModel("OPENAI_MODEL_CHEAP") ||
    standard;
  const nano = readModel("AUTOPILOT_OPENAI_MODEL_NANO") || readModel("OPENAI_MODEL_NANO") || mini;
  return { nano, mini, standard, frontier };
}

function readModel(name: string): string {
  return Deno.env.get(name)?.trim() ?? "";
}

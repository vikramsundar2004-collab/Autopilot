import { requireSupabaseUser } from "./_shared/auth.ts";
import { json, options, readJson } from "./_shared/http.ts";
import { generateWithOpenAi } from "./_shared/openai.ts";
import {
  buildArtifactCritiquePrompt,
  buildArtifactDraftPrompt,
  buildArtifactPlanningPrompt,
  buildArtifactRevisionPrompt,
  extractRequestText,
  parseJsonObject,
  type AiArtifactKind,
  type ArtifactCritiquePayload,
  type ArtifactGenerationTrace,
  type ArtifactPlanPayload
} from "./_shared/artifactPrompts.ts";

type ArtifactRequest = {
  kind?: AiArtifactKind;
  prompt?: string;
  source?: unknown;
  model?: string;
};

const PLAN_INSTRUCTIONS = "You are Autopilot Browser's planning step. Read the source and infer the real deliverable. Be specific. Return JSON only.";
const DRAFT_INSTRUCTIONS = "You are Autopilot Browser's drafting step. Produce the finished artifact. Do not restate the source. Return JSON only.";
const CRITIQUE_INSTRUCTIONS = "You are Autopilot Browser's adversarial critic. Be brutally specific. No compliments. Return JSON only.";
const REVISE_INSTRUCTIONS = "You are Autopilot Browser's revision step. Rewrite the draft into a client-ready artifact. Fix every critique item. Return JSON only.";

export default async function handler(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") {
    return options();
  }
  if (request.method !== "POST") {
    return json({ success: false, reason: "Use POST for artifact generation." }, 405);
  }

  const auth = await requireSupabaseUser(request);
  if (!auth.success) {
    return auth.response;
  }

  const parsed = await readJson<ArtifactRequest>(request);
  if (!parsed.success) {
    return parsed.response;
  }

  const promptText = (parsed.body.prompt ?? "").trim();
  if (!promptText) {
    return json({ success: false, reason: "Prompt is required." }, 400);
  }

  const kind = sanitizeKind(parsed.body.kind);
  const requestText = extractRequestText(promptText, parsed.body.source);
  const model = parsed.body.model;
  const userContext = {
    authenticatedUser: { email: auth.user.email, id: auth.user.id }
  };

  // ---- Call 1: Plan ----
  const planResult = await generateWithOpenAi({
    instructions: PLAN_INSTRUCTIONS,
    prompt: buildArtifactPlanningPrompt(requestText, kind),
    context: userContext,
    model,
    task: "artifact_plan",
    responseFormat: "json_object"
  });
  if (!planResult.success) {
    return json(
      { success: false, model: planResult.model, reason: `Planning step failed: ${planResult.reason}` },
      planResult.status ?? 502
    );
  }

  const plan = parseJsonObject<ArtifactPlanPayload>(planResult.outputText) ?? {};
  const planJson = stableStringify(plan);
  const resolvedKind = sanitizeKind(plan.deliverableKind) || kind;

  // ---- Call 2: Draft ----
  const draftResult = await generateWithOpenAi({
    instructions: DRAFT_INSTRUCTIONS,
    prompt: buildArtifactDraftPrompt(requestText, resolvedKind, planJson),
    context: userContext,
    model,
    task: "artifact_draft",
    responseFormat: "json_object"
  });
  if (!draftResult.success) {
    return json(
      { success: false, model: draftResult.model, reason: `Drafting step failed: ${draftResult.reason}` },
      draftResult.status ?? 502
    );
  }

  const draftJson = draftResult.outputText.trim();
  const draftArtifact = parseJsonObject<unknown>(draftJson);
  if (!draftArtifact) {
    return json(
      { success: false, model: draftResult.model, reason: "Drafting step returned non-JSON output." },
      502
    );
  }

  // ---- Call 3: Critique (graceful — fall back to draft on failure) ----
  let critique: ArtifactCritiquePayload = { flaws: [], revisionStrategy: "" };
  let critiqueOk = true;
  const critiqueResult = await generateWithOpenAi({
    instructions: CRITIQUE_INSTRUCTIONS,
    prompt: buildArtifactCritiquePrompt(resolvedKind, planJson, draftJson),
    context: userContext,
    model,
    task: "artifact_critique",
    responseFormat: "json_object"
  });
  if (!critiqueResult.success) {
    critiqueOk = false;
  } else {
    critique = parseJsonObject<ArtifactCritiquePayload>(critiqueResult.outputText) ?? critique;
  }

  // ---- Call 4: Revise (graceful — fall back to draft on failure) ----
  let finalArtifact: unknown = draftArtifact;
  let finalModel = draftResult.model;
  let revisionSummary = "Draft used as final (no critique applied).";
  let attempts = 2; // plan + draft
  let reviseOk = false;

  if (critiqueOk && (critique.flaws?.length ?? 0) > 0) {
    const reviseResult = await generateWithOpenAi({
      instructions: REVISE_INSTRUCTIONS,
      prompt: buildArtifactRevisionPrompt(requestText, resolvedKind, planJson, draftJson, stableStringify(critique)),
      context: userContext,
      model,
      task: "artifact_revision",
      responseFormat: "json_object"
    });
    attempts += 2; // critique + revise
    if (reviseResult.success) {
      const revised = parseJsonObject<unknown>(reviseResult.outputText);
      if (revised) {
        finalArtifact = revised;
        finalModel = reviseResult.model;
        revisionSummary = summarizeRevision(critique);
        reviseOk = true;
      }
    }
    if (!reviseOk) {
      revisionSummary = "Revision step failed; returning the draft.";
    }
  } else if (critiqueOk) {
    revisionSummary = "Critique returned no flaws; draft was already client-ready.";
    attempts += 1; // critique
  } else {
    revisionSummary = "Critique step failed; returning the draft.";
  }

  const trace: ArtifactGenerationTrace = {
    inferredAsk: stringField(plan.inferredAsk),
    audience: stringField(plan.audience),
    deliverableKind: resolvedKind,
    planningNotes: stringArrayField(plan.planningNotes),
    critique: stringArrayField(critique.flaws),
    revisionSummary,
    attempts,
    modelRouting: {
      plan: planResult.model,
      draft: draftResult.model,
      critique: critiqueResult.success ? critiqueResult.model : "not-run",
      revision: finalModel
    },
    visualPlan: plan.visualPlan
  };

  return json({
    success: true,
    artifact: finalArtifact,
    trace,
    model: finalModel
  });
}

function sanitizeKind(value: unknown): AiArtifactKind {
  if (value === "slide_deck" || value === "website_design" || value === "action_list" || value === "document") {
    return value;
  }
  return "document";
}

function stringField(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function stringArrayField(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
}

function stableStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return "{}";
  }
}

function summarizeRevision(critique: ArtifactCritiquePayload): string {
  const flawCount = critique.flaws?.length ?? 0;
  if (flawCount === 0) {
    return "Revision applied (no specific flaws noted).";
  }
  return `Revision applied. Addressed ${flawCount} critique ${flawCount === 1 ? "flaw" : "flaws"}.`;
}

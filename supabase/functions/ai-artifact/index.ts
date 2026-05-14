import {
  buildCritiquePrompt,
  buildDraftPrompt,
  buildPlanningPrompt,
  buildRevisionPrompt,
  type AiArtifactKind
} from "../_shared/artifactPrompts.ts";
import { getModelForTask, getModelRoutingSummary } from "../_shared/modelRouting.ts";

type AiArtifactRequest = {
  kind?: AiArtifactKind;
  prompt?: string;
  source?: unknown;
  model?: string;
};

type SupabaseUser = {
  id?: string;
  email?: string;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
const OPENAI_BASE_URL = (Deno.env.get("OPENAI_BASE_URL") ?? "https://api.openai.com/v1").replace(/\/+$/u, "");
const MAX_ATTEMPTS = 3;

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return json({ success: true });
  }

  if (request.method === "GET") {
    return json({
      success: Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && OPENAI_API_KEY),
      backend: "autopilot-supabase-ai-artifact",
      defaultModel: getModelForTask(undefined, "artifact_generation"),
      modelRouting: getModelRoutingSummary(),
      openAiConfigured: Boolean(OPENAI_API_KEY),
      supabaseConfigured: Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)
    });
  }

  if (request.method !== "POST") {
    return json({ success: false, reason: "Use POST for artifact generation." }, 405);
  }

  if (!OPENAI_API_KEY) {
    return json({ success: false, reason: "OPENAI_API_KEY is not configured in Supabase secrets." }, 503);
  }

  const auth = await requireSupabaseUser(request);
  if (!auth.success) {
    return auth.response;
  }

  let body: AiArtifactRequest;
  try {
    body = (await request.json()) as AiArtifactRequest;
  } catch {
    return json({ success: false, reason: "Request body must be valid JSON." }, 400);
  }

  const kind = cleanKind(body.kind);
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) {
    return json({ success: false, reason: "Prompt is required." }, 400);
  }

  const sourceText = buildSourceText(prompt, body.source);
  const explicitModel = typeof body.model === "string" && body.model.trim() ? body.model.trim() : undefined;
  const planModel = getModelForTask(explicitModel, "artifact_plan");
  const draftModel = getModelForTask(explicitModel, "artifact_draft");
  const critiqueModel = getModelForTask(explicitModel, "artifact_critique");
  const revisionModel = getModelForTask(explicitModel, "artifact_revision");
  const plan = await callOpenAiJson(planModel, buildPlanningPrompt(sourceText, kind), "Plan the artifact before drafting.");
  if (!plan.success) {
    return json(plan, plan.status ?? 502);
  }

  const planJson = plan.outputText;
  const draft = await callOpenAiJson(draftModel, buildDraftPrompt(sourceText, kind, planJson), "Draft the artifact from the plan.");
  if (!draft.success) {
    return json(draft, draft.status ?? 502);
  }

  const critique = await callOpenAiJson(critiqueModel, buildCritiquePrompt(kind, planJson, draft.outputText), "Critique the draft with no compliments.");
  if (!critique.success) {
    return json(critique, critique.status ?? 502);
  }

  let finalArtifact = await callOpenAiJson(
    revisionModel,
    buildRevisionPrompt(sourceText, kind, planJson, draft.outputText, critique.outputText),
    "Revise the artifact into final JSON."
  );
  if (!finalArtifact.success) {
    return json(finalArtifact, finalArtifact.status ?? 502);
  }

  let attempts = 1;
  let quality = evaluateArtifactJson(finalArtifact.outputText, sourceText, kind, attempts);
  while (!quality.passed && attempts < MAX_ATTEMPTS) {
    attempts += 1;
    finalArtifact = await callOpenAiJson(
      revisionModel,
      buildRevisionPrompt(sourceText, kind, planJson, finalArtifact.outputText, critique.outputText, summarizeQualityFailure(quality)),
      "Regenerate the artifact to satisfy the failed quality checks."
    );
    if (!finalArtifact.success) {
      return json(finalArtifact, finalArtifact.status ?? 502);
    }
    quality = evaluateArtifactJson(finalArtifact.outputText, sourceText, kind, attempts);
  }

  return json({
    success: true,
    model: revisionModel,
    artifact: parseJson(finalArtifact.outputText) ?? finalArtifact.outputText,
    trace: {
      plan: parseJson(planJson) ?? planJson,
      critique: parseJson(critique.outputText) ?? critique.outputText,
      revisionSummary: quality.passed ? "Revised draft passed the strict quality gate." : "Best attempt still needs review.",
      attempts,
      modelRouting: {
        plan: planModel,
        draft: draftModel,
        critique: critiqueModel,
        revision: revisionModel
      },
      qualityReport: quality
    }
  });
});

async function requireSupabaseUser(
  request: Request
): Promise<{ success: true; user: SupabaseUser } | { success: false; response: Response }> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { success: false, response: json({ success: false, reason: "Supabase runtime env is not available." }, 503) };
  }

  const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/iu, "").trim();
  if (!token) {
    return { success: false, response: json({ success: false, reason: "Missing Supabase session token." }, 401) };
  }

  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      authorization: `Bearer ${token}`
    }
  });
  if (!response.ok) {
    return { success: false, response: json({ success: false, reason: "Supabase session is invalid or expired." }, 401) };
  }

  return { success: true, user: (await response.json()) as SupabaseUser };
}

async function callOpenAiJson(model: string, prompt: string, instructions: string): Promise<{ success: true; outputText: string } | { success: false; reason: string; status?: number }> {
  const response = await fetch(`${OPENAI_BASE_URL}/responses`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${OPENAI_API_KEY}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      input: [{ content: prompt, role: "user" }],
      instructions: `${instructions}\nReturn only valid JSON. Do not include markdown fences.`,
      model,
      store: false
    })
  });
  const result = await safeJson(response);
  if (!response.ok) {
    return { success: false, reason: getOpenAiErrorMessage(result) || "OpenAI request failed.", status: response.status };
  }
  return { success: true, outputText: getResponsesOutputText(result) };
}

function evaluateArtifactJson(outputText: string, sourceText: string, kind: AiArtifactKind, attempts: number) {
  const parsedOutput = parseJson(outputText);
  const text = JSON.stringify(parsedOutput ?? outputText);
  const artifactRecord = parsedOutput && typeof parsedOutput === "object" ? parsedOutput as Record<string, unknown> : {};
  const replyDraft = typeof artifactRecord.replyDraftMarkdown === "string" ? artifactRecord.replyDraftMarkdown : "";
  const failures: Array<{ id: string; label: string; detail: string }> = [];
  if (/\b(what autopilot understood|the email mentions|based on the source|autopilot prepared this)\b/iu.test(text)) {
    failures.push({ id: "not_source_restatement", label: "Not source restatement", detail: "Remove meta commentary about reading the email." });
  }
  const copyRatio = calculateCopyRatio(text, sourceText);
  if (copyRatio > 0.3) {
    failures.push({ id: "low_source_copy_ratio", label: "Low source-copy ratio", detail: `Copied ${Math.round(copyRatio * 100)}%; target is 30% or less.` });
  }
  if (!/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/u.test(text) && !/\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/iu.test(text)) {
    failures.push({ id: "named_email_context", label: "Named people or organizations", detail: "Add named people, organizations, or roles." });
  }
  if (!/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}\b|\bQ[1-4]\b|\bdate to confirm\b|\b\d{1,2}[/-]\d{1,2}/iu.test(text)) {
    failures.push({ id: "named_email_context", label: "Date or deadline", detail: "Add a real date, quarter, deadline, or Date to confirm." });
  }
  if (!/\b(decision|decide|recommend|approve|owner|deadline|next step|action|send|publish|deliverable)\b/iu.test(text)) {
    failures.push({ id: "actionable", label: "Decision or action", detail: "Add a decision, owner, next step, or approval point." });
  }
  if (
    replyDraft.trim().split(/\s+/u).filter(Boolean).length < 35 ||
    /\b(sent|already sent|will send automatically|what autopilot understood|based on the source)\b/iu.test(replyDraft)
  ) {
    failures.push({
      id: "reply_draft_quality",
      label: "Reply draft quality",
      detail: "Add a polished replyDraftMarkdown that is grounded in the source and safe for human review before sending."
    });
  }
  if (kind === "slide_deck" && (text.match(/"title"\s*:/gu) ?? []).length < 3) {
    failures.push({ id: "structure", label: "Deck structure", detail: "Decks need at least three slides." });
  }
  if (kind === "website_design" && !/\b(hero|cta|call to action|<h1|<main)\b/iu.test(text)) {
    failures.push({ id: "structure", label: "Website structure", detail: "Website designs need a hero, CTA, and previewable HTML." });
  }
  if ((kind === "document" || kind === "action_list") && (text.match(/#{1,3}\s|\n\s*[-*]\s/gu) ?? []).length < 3) {
    failures.push({ id: "structure", label: "Document/action structure", detail: "Documents and action lists need multiple structured sections or items." });
  }
  const passed = failures.length === 0;
  const checks = [
    { id: "not_source_restatement", label: "Not just a source restatement", passed: !failures.some((failure) => failure.id === "not_source_restatement"), detail: "Transforms the email into work." },
    { id: "low_source_copy_ratio", label: "Low source-copy ratio", passed: !failures.some((failure) => failure.id === "low_source_copy_ratio"), detail: `Copied ${Math.round(copyRatio * 100)}%; target is 30% or less.` },
    { id: "named_email_context", label: "Named people, dates, and decisions", passed: !failures.some((failure) => failure.id === "named_email_context"), detail: "Includes people/orgs, dates, and decisions." },
    { id: "actionable", label: "Concrete next steps", passed: !failures.some((failure) => failure.id === "actionable"), detail: "Includes action or approval points." },
    { id: "reply_draft_quality", label: "Polished reply draft", passed: !failures.some((failure) => failure.id === "reply_draft_quality"), detail: "Includes a reviewable response draft that does not claim to be sent." },
    { id: "structure", label: "Clear deliverable structure", passed: !failures.some((failure) => failure.id === "structure"), detail: "Meets the artifact structure bar." }
  ];
  return {
    passed,
    score: Math.round((checks.filter((check) => check.passed).length / checks.length) * 100),
    copyRatio,
    sourceCopyRatio: copyRatio,
    exportReady: passed,
    attempts,
    strictMode: true,
    failedReasonCodes: failures.map((failure) => failure.id),
    approveAnywayRequired: !passed,
    checks,
    passedChecks: checks.filter((check) => check.passed),
    failedChecks: checks.filter((check) => !check.passed),
    summary: passed ? "Strict email-to-artifact quality gate passed." : "Strict email-to-artifact quality gate needs review.",
    regeneration: passed ? (attempts > 1 ? "regenerated" : "not_needed") : "needs_review"
  };
}

function summarizeQualityFailure(report: ReturnType<typeof evaluateArtifactJson>): string {
  return report.failedChecks.map((check) => `${check.label}: ${check.detail}`).join(" ");
}

function buildSourceText(prompt: string, source: unknown): string {
  return [prompt, typeof source === "undefined" ? "" : JSON.stringify(source, null, 2)].filter(Boolean).join("\n\nSource metadata:\n");
}

function cleanKind(value: unknown): AiArtifactKind {
  return value === "slide_deck" || value === "website_design" || value === "action_list" || value === "document" ? value : "document";
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value.trim().replace(/^```(?:json)?/u, "").replace(/```$/u, "").trim());
  } catch {
    return null;
  }
}

function calculateCopyRatio(output: string, source: string): number {
  const outputWords = tokenize(output);
  const sourceWords = tokenize(source);
  if (outputWords.length < 30 || sourceWords.length < 30) {
    return 0;
  }
  const sourceShingles = new Set(makeShingles(sourceWords, 6));
  const outputShingles = makeShingles(outputWords, 6);
  if (outputShingles.length === 0) {
    return 0;
  }
  return outputShingles.filter((shingle) => sourceShingles.has(shingle)).length / outputShingles.length;
}

function tokenize(value: string): string[] {
  return value.toLowerCase().replace(/https?:\/\/\S+/gu, " ").match(/\b[\p{L}\p{N}']{3,}\b/gu) ?? [];
}

function makeShingles(words: string[], size: number): string[] {
  const shingles: string[] = [];
  for (let index = 0; index <= words.length - size; index += 1) {
    shingles.push(words.slice(index, index + size).join(" "));
  }
  return shingles;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "access-control-allow-headers": "authorization,content-type",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-origin": "*",
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8"
    }
  });
}

async function safeJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function getOpenAiErrorMessage(body: unknown): string {
  return typeof body === "object" && body !== null && "error" in body
    ? String((body as { error?: { message?: string } }).error?.message ?? "")
    : "";
}

function getResponsesOutputText(body: unknown): string {
  if (typeof body !== "object" || body === null) {
    return "";
  }
  const response = body as {
    output_text?: unknown;
    output?: Array<{ content?: Array<{ text?: unknown }> }>;
  };
  if (typeof response.output_text === "string" && response.output_text.trim()) {
    return response.output_text.trim();
  }
  return (
    response.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => (typeof content.text === "string" ? content.text : ""))
      .join("")
      .trim() ?? ""
  );
}

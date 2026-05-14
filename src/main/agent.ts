import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import {
  createArtifactSourceFromEmail,
  defaultArtifactContent,
  type Artifact,
  type ArtifactContent,
  type ArtifactKind,
  type SlideArtifactSlide,
  type WebsiteDesignSection
} from "../shared/artifacts.js";
import {
  buildManualEmailLikeMessage,
  chooseArtifactKindFromText,
  getActionToolForArtifactKind,
  type ActionPlan,
  type ActionStep,
  type AgentPlanFromEmailRequest,
  type AgentPlanResult,
  type AgentRun,
  type AgentRunEvent,
  type AgentStartRunRequest
} from "../shared/agent.js";
import {
  buildArtifactCritiquePrompt,
  buildArtifactDraftPrompt,
  buildArtifactPlanningPrompt,
  buildArtifactRevisionPrompt,
  parseJsonObject,
  type AiArtifactKind,
  type ArtifactCritiquePayload,
  type ArtifactGenerationTrace,
  type ArtifactPlanPayload
} from "../shared/artifactPrompts.js";
import type { EmailMessageSummary } from "../shared/email.js";
import type { ArtifactStore } from "./artifacts.js";
import type { EmailService } from "./email.js";
import { evaluateArtifactQuality, summarizeQualityFailure, type ArtifactQualityResult } from "../shared/artifactQuality.js";
import { AiGateway } from "./aiGateway.js";

type AgentStateFile = {
  version: 1;
  plans: ActionPlan[];
  runs: AgentRun[];
};

type GeneratedArtifactPayload = {
  title?: string;
  summary?: string;
  artifactKind?: ArtifactKind;
  replyDraftMarkdown?: string;
  documentMarkdown?: string;
  slides?: Array<{
    title?: string;
    bullets?: string[];
    speakerNotes?: string;
  }>;
  websiteHtml?: string;
  websiteCss?: string;
  websiteSections?: Array<{
    name?: string;
    summary?: string;
  }>;
  finalApprovalReason?: string;
  humanQuestion?: string;
};

type ArtifactAiResult = {
  payload: GeneratedArtifactPayload | null;
  model: string;
  usedFallback: boolean;
  reason?: string;
  trace?: ArtifactGenerationTrace;
};

const AGENT_STATE_FILE = "agent-runs.json";
const ARTIFACT_ENDPOINT_TIMEOUT_MS = 90_000;
const ARTIFACT_PLAN_TIMEOUT_MS = 20_000;
const ARTIFACT_DRAFT_TIMEOUT_MS = 45_000;
const ARTIFACT_CRITIQUE_TIMEOUT_MS = 20_000;
const ARTIFACT_REVISION_TIMEOUT_MS = 45_000;
const EMAIL_ARTIFACT_MAX_ATTEMPTS = 3;

export class AgentService {
  private state: AgentStateFile | null = null;

  constructor(
    private readonly artifactStore: ArtifactStore,
    private readonly emailService: EmailService,
    private readonly dataRoot: string | (() => string),
    private readonly aiGateway = new AiGateway()
  ) {}

  async listRuns(): Promise<AgentRun[]> {
    const state = await this.ensureState();
    return structuredClone(state.runs);
  }

  async planFromEmail(input: AgentPlanFromEmailRequest): Promise<AgentPlanResult> {
    const message = this.emailService.listCachedMessages().find((candidate) => candidate.id === input.messageId);
    if (!message) {
      return {
        success: false,
        reason: "Autopilot could not find that email in the local inbox cache. Sync Gmail and try again."
      };
    }

    return this.generateWorkFromMessage(message, input.preferredKind);
  }

  async startRun(input: AgentStartRunRequest): Promise<AgentPlanResult> {
    const prompt = input.prompt.replace(/\s+/g, " ").trim();
    if (!prompt) {
      return {
        success: false,
        reason: "Describe what Autopilot should generate first."
      };
    }

    return this.generateWorkFromMessage(buildManualEmailLikeMessage(prompt), input.preferredKind);
  }

  async listPlans(): Promise<ActionPlan[]> {
    const state = await this.ensureState();
    return structuredClone(state.plans);
  }

  async approveFinalStep(planId: string): Promise<AgentRun[]> {
    const state = await this.ensureState();
    const now = Date.now();
    state.plans = state.plans.map((plan) =>
      plan.id === planId
        ? {
            ...plan,
            finalApproval: {
              ...plan.finalApproval,
              approvedAt: now
            },
            steps: plan.steps.map((step) =>
              step.requiresFinalApproval
                ? {
                    ...step,
                    state: "completed"
                  }
                : step
            ),
            updatedAt: now
          }
        : plan
    );
    state.runs = state.runs.map((run) =>
      run.planId === planId
        ? {
            ...run,
            state: "completed",
            updatedAt: now,
            events: [
              ...run.events,
              {
                id: makeId("event"),
                createdAt: now,
                level: "success",
                message: "Final approval recorded."
              }
            ]
          }
        : run
    );
    await this.saveState();
    return structuredClone(state.runs);
  }

  private async generateWorkFromMessage(message: EmailMessageSummary, preferredKind?: ArtifactKind): Promise<AgentPlanResult> {
    const requestText = buildEmailWorkRequestText(message);
    const fallbackKind = chooseArtifactKindFromText(requestText, preferredKind);
    let aiResult = await generateArtifactWithOpenAi(this.aiGateway, requestText, fallbackKind, 1);
    let payload = aiResult.payload ?? buildFallbackArtifactPayload(message, fallbackKind);
    let kind = chooseArtifactKindFromText(`${payload.artifactKind ?? ""} ${requestText}`, preferredKind ?? payload.artifactKind ?? fallbackKind);
    let content = buildArtifactContent(kind, payload, message);
    let qualityResult: ArtifactQualityResult = evaluateArtifactQuality(content, requestText, {
      requireSources: isResearchLikeRequest(requestText),
      emailToArtifact: true,
      attempts: aiResult.trace?.attempts ?? 1
    });

    for (let attempt = 2; attempt <= EMAIL_ARTIFACT_MAX_ATTEMPTS && !qualityResult.passed && !aiResult.usedFallback; attempt += 1) {
      const retryResult = await generateArtifactWithOpenAi(this.aiGateway, requestText, kind, attempt, summarizeQualityFailure(qualityResult));
      if (retryResult.payload) {
        const retryKind = chooseArtifactKindFromText(`${retryResult.payload.artifactKind ?? ""} ${requestText}`, preferredKind ?? retryResult.payload.artifactKind ?? kind);
        const retryContent = buildArtifactContent(retryKind, retryResult.payload, message);
        const retryQuality = evaluateArtifactQuality(retryContent, requestText, {
          requireSources: isResearchLikeRequest(requestText),
          emailToArtifact: true,
          attempts: retryResult.trace?.attempts ?? attempt,
          regeneration: "regenerated"
        });
        if (retryQuality.score >= qualityResult.score || retryQuality.passed) {
          aiResult = retryResult;
          payload = retryResult.payload;
          kind = retryKind;
          content = retryContent;
          qualityResult = retryQuality;
        }
      } else if (retryResult.reason) {
        aiResult = {
          ...aiResult,
          reason: [aiResult.reason, retryResult.reason].filter(Boolean).join(" ")
        };
      }
    }

    if (!qualityResult.passed) {
      qualityResult = {
        ...qualityResult,
        passed: false,
        exportReady: false,
        regeneration: "needs_review",
        summary: `Quality gate blocked this artifact after ${aiResult.usedFallback ? "the AI backend was unavailable" : `${EMAIL_ARTIFACT_MAX_ATTEMPTS} attempts`}.`
      };
      payload = {
        ...payload,
        summary: `Needs review: Autopilot could not meet the email-to-artifact quality bar. ${summarizeQualityFailure(qualityResult)}`.slice(0, 260),
        humanQuestion:
          payload.humanQuestion ||
          "Autopilot could not produce a clean enough artifact from this email. Review the failed checks, then ask for a narrower deliverable or add the missing people, dates, or decision context."
      };
    }

    const qualitySummary = qualityResult.passed
      ? ` Quality score: ${qualityResult.score}/100.`
      : ` Needs review: ${summarizeQualityFailure(qualityResult)}`;
    const fallbackSummary = aiResult.usedFallback ? "AI unavailable fallback draft. " : "";
    const emailDraftMarkdown = buildReplyDraftMarkdown(message, payload, kind, qualityResult, aiResult.usedFallback);
    const artifact = await this.artifactStore.createArtifact({
      kind,
      title: cleanText(payload.title, 140) || fallbackTitle(message, kind),
      summary: `${fallbackSummary}${cleanText(payload.summary, 260) || `Generated from ${message.from} - ${message.subject}`}${qualitySummary}`.slice(0, 360),
      emailDraftMarkdown,
      prompt: buildPersistedEmailArtifactPrompt(message),
      source: message.id.startsWith("manual:") ? { provider: "manual", label: "Manual prompt" } : createArtifactSourceFromEmail(message),
      content
    });
    const plan = createActionPlanFromArtifact(message, artifact, payload.finalApprovalReason, payload.humanQuestion, qualityResult);
    const run = createAgentRun(plan, aiResult.usedFallback, aiResult.reason, qualityResult, aiResult.trace);

    const state = await this.ensureState();
    state.plans = [plan, ...state.plans.filter((candidate) => candidate.id !== plan.id)].slice(0, 100);
    state.runs = [run, ...state.runs].slice(0, 120);
    await this.saveState();

    return {
      success: true,
      plan,
      artifact,
      run,
      model: aiResult.model,
      usedFallback: aiResult.usedFallback,
      reason: aiResult.reason,
      aiSource: aiResult.usedFallback ? "fallback" : "openai",
      artifactTrace: aiResult.trace
    };
  }

  private async ensureState(): Promise<AgentStateFile> {
    if (this.state) {
      return this.state;
    }

    try {
      const parsed = JSON.parse(await fs.readFile(this.getStatePath(), "utf8")) as Partial<AgentStateFile>;
      this.state = {
        version: 1,
        plans: Array.isArray(parsed.plans) ? parsed.plans.filter(isActionPlan) : [],
        runs: Array.isArray(parsed.runs) ? parsed.runs.filter(isAgentRun) : []
      };
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? (error as NodeJS.ErrnoException).code : undefined;
      if (code !== "ENOENT") {
        console.warn("Autopilot could not load agent runs.", error);
      }
      this.state = {
        version: 1,
        plans: [],
        runs: []
      };
    }

    return this.state;
  }

  private async saveState(): Promise<void> {
    if (!this.state) {
      return;
    }

    const statePath = this.getStatePath();
    await fs.mkdir(path.dirname(statePath), { recursive: true });
    await fs.writeFile(statePath, JSON.stringify(this.state, null, 2), "utf8");
  }

  private getStatePath(): string {
    const dataRoot = typeof this.dataRoot === "function" ? this.dataRoot() : this.dataRoot;
    return path.join(dataRoot, AGENT_STATE_FILE);
  }
}

async function generateArtifactWithOpenAi(
  aiGateway: AiGateway,
  requestText: string,
  fallbackKind: ArtifactKind,
  attempt = 1,
  previousFailure?: string
): Promise<ArtifactAiResult> {
  const artifactKind: AiArtifactKind = fallbackKind;
  const artifactEndpointResult = await aiGateway.generateArtifact({
    kind: artifactKind,
    prompt: requestText,
    source: { text: requestText },
    task: "artifact_generation",
    timeoutMs: ARTIFACT_ENDPOINT_TIMEOUT_MS
  });
  if (artifactEndpointResult.success) {
    const payload = parseGeneratedArtifactValue(artifactEndpointResult.artifact);
    if (payload) {
      return {
        payload,
        model: artifactEndpointResult.model,
        usedFallback: false,
        trace: buildArtifactTraceFromProxy(artifactEndpointResult.trace, artifactKind, attempt)
      };
    }
  }

  const planResult = await aiGateway.generateText({
    prompt: buildArtifactPlanningPrompt(requestText, artifactKind),
    instructions:
      "You are Autopilot's email-to-work planner. Think before writing. Return only valid JSON.",
    task: "artifact_plan",
    responseFormat: "json_object",
    timeoutMs: ARTIFACT_PLAN_TIMEOUT_MS
  });

  if (!planResult.success) {
    return {
      payload: null,
      model: planResult.model,
      usedFallback: true,
      reason: planResult.reason || "AI artifact planning is not configured; Autopilot used an offline placeholder."
    };
  }

  const planPayload = parseJsonObject<ArtifactPlanPayload>(planResult.outputText) ?? {};
  const planJson = JSON.stringify(planPayload, null, 2);
  const draftResult = await aiGateway.generateText({
    prompt: buildArtifactDraftPrompt(requestText, artifactKind, planJson),
    instructions:
      "You are Autopilot's artifact drafter. Create the finished deliverable from the plan. Return only valid JSON.",
    task: "artifact_draft",
    responseFormat: "json_object",
    timeoutMs: ARTIFACT_DRAFT_TIMEOUT_MS
  });

  if (!draftResult.success) {
    return {
      payload: null,
      model: draftResult.model || planResult.model,
      usedFallback: true,
      reason: draftResult.reason || "AI artifact drafting failed; Autopilot used an offline placeholder.",
      trace: buildArtifactTrace(planPayload, artifactKind, [], "Drafting failed.", attempt)
    };
  }

  const draftJson = draftResult.outputText.trim();
  const critiqueResult = await aiGateway.generateText({
    prompt: buildArtifactCritiquePrompt(artifactKind, planJson, draftJson),
    instructions:
      "You are Autopilot's artifact critic. Be strict and concrete. Return only valid JSON.",
    task: "artifact_critique",
    responseFormat: "json_object",
    timeoutMs: ARTIFACT_CRITIQUE_TIMEOUT_MS
  });
  const critiquePayload = critiqueResult.success ? parseJsonObject<ArtifactCritiquePayload>(critiqueResult.outputText) ?? {} : {};
  const critiqueJson = JSON.stringify(critiquePayload, null, 2);
  const revisionResult = await aiGateway.generateText({
    prompt: buildArtifactRevisionPrompt(requestText, artifactKind, planJson, draftJson, critiqueJson, previousFailure),
    instructions:
      "You are Autopilot's artifact reviser. Fix the critique and return the final artifact JSON only.",
    task: "artifact_revision",
    responseFormat: "json_object",
    timeoutMs: ARTIFACT_REVISION_TIMEOUT_MS
  });

  if (!revisionResult.success) {
    return {
      payload: null,
      model: revisionResult.model || critiqueResult.model || draftResult.model || planResult.model,
      usedFallback: true,
      reason: revisionResult.reason || "AI artifact revision failed; Autopilot used an offline placeholder.",
      trace: buildArtifactTrace(planPayload, artifactKind, critiquePayload.flaws ?? [], "Revision failed.", attempt)
    };
  }

  const payload = parseGeneratedArtifactPayload(revisionResult.outputText);
  if (payload) {
    return {
      payload,
      model: revisionResult.model,
      usedFallback: false,
      trace: buildArtifactTrace(
        planPayload,
        artifactKind,
        critiquePayload.flaws ?? [],
        cleanText(critiquePayload.revisionStrategy, 220) || "Revised from the critique before quality review.",
        attempt
      )
    };
  }

  return {
    payload: null,
    model: revisionResult.model,
    usedFallback: true,
    reason: "The AI backend returned text that was not valid artifact JSON; Autopilot used an offline placeholder.",
    trace: buildArtifactTrace(planPayload, artifactKind, critiquePayload.flaws ?? [], "Final JSON parsing failed.", attempt)
  };
}

function buildArtifactTrace(
  plan: ArtifactPlanPayload,
  fallbackKind: AiArtifactKind,
  critique: string[],
  revisionSummary: string,
  attempts: number
): ArtifactGenerationTrace {
  return {
    inferredAsk: cleanText(plan.inferredAsk, 220) || "Infer the actual deliverable from the source email.",
    audience: cleanText(plan.audience, 160) || "User-selected audience",
    deliverableKind: plan.deliverableKind ?? fallbackKind,
    planningNotes: Array.isArray(plan.planningNotes)
      ? plan.planningNotes.map((note) => cleanText(note, 180)).filter(Boolean).slice(0, 6)
      : [
          ...((plan.mustInclude ?? []).map((item) => `Include: ${cleanText(item, 150)}`)),
          ...((plan.mustAvoid ?? []).map((item) => `Avoid: ${cleanText(item, 150)}`))
        ].filter(Boolean).slice(0, 6),
    critique: critique.map((item) => cleanText(item, 220)).filter(Boolean).slice(0, 5),
    revisionSummary: cleanText(revisionSummary, 260) || "Revised after self-critique.",
    attempts: Math.max(1, attempts)
  };
}

function buildArtifactTraceFromProxy(trace: unknown, fallbackKind: AiArtifactKind, fallbackAttempt: number): ArtifactGenerationTrace {
  const value = typeof trace === "object" && trace !== null ? (trace as Record<string, unknown>) : {};
  const rawPlan = typeof value.plan === "object" && value.plan !== null ? (value.plan as ArtifactPlanPayload) : {};
  const rawCritique = typeof value.critique === "object" && value.critique !== null ? (value.critique as ArtifactCritiquePayload) : {};
  const rawQuality = typeof value.qualityReport === "object" && value.qualityReport !== null ? (value.qualityReport as { attempts?: unknown }) : {};
  const rawModelRouting = typeof value.modelRouting === "object" && value.modelRouting !== null ? (value.modelRouting as Record<string, unknown>) : {};
  const attempts = typeof rawQuality.attempts === "number" && Number.isFinite(rawQuality.attempts)
    ? rawQuality.attempts
    : typeof value.attempts === "number" && Number.isFinite(value.attempts)
      ? value.attempts
      : fallbackAttempt;
  const revisionSummary = typeof value.revisionSummary === "string" ? value.revisionSummary : "Revised by the secure artifact endpoint.";
  const traceResult = buildArtifactTrace(rawPlan, fallbackKind, rawCritique.flaws ?? [], revisionSummary, attempts);
  const modelRouting = Object.fromEntries(
    Object.entries(rawModelRouting)
      .filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].trim().length > 0)
      .map(([key, model]) => [key, model.trim()])
  );
  return Object.keys(modelRouting).length > 0 ? { ...traceResult, modelRouting } : traceResult;
}

function parseGeneratedArtifactValue(value: unknown): GeneratedArtifactPayload | null {
  if (typeof value === "string") {
    return parseGeneratedArtifactPayload(value);
  }
  if (!value || typeof value !== "object") {
    return null;
  }
  return value as GeneratedArtifactPayload;
}

function parseGeneratedArtifactPayload(content: string): GeneratedArtifactPayload | null {
  const trimmed = content.trim().replace(/^```(?:json)?/u, "").replace(/```$/u, "").trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed) as GeneratedArtifactPayload;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (error) {
    warnAgentIssue("AI artifact JSON parse failed.", error);
    return null;
  }
}

function buildArtifactContent(kind: ArtifactKind, payload: GeneratedArtifactPayload, message: EmailMessageSummary): ArtifactContent {
  if (kind === "document") {
    return {
      kind,
      markdown: cleanBlock(payload.documentMarkdown) || buildFallbackDocument(message)
    };
  }

  if (kind === "slide_deck") {
    const slides = Array.isArray(payload.slides)
      ? payload.slides
          .map((slide): SlideArtifactSlide | null => {
            const title = cleanText(slide.title, 140);
            if (!title) {
              return null;
            }
            return {
              id: makeId("slide"),
              title,
              bullets: Array.isArray(slide.bullets)
                ? slide.bullets.map((bullet) => cleanText(bullet, 180)).filter(Boolean).slice(0, 6)
                : ["Add supporting detail."],
              speakerNotes: cleanBlock(slide.speakerNotes).slice(0, 900) || undefined
            };
          })
          .filter((slide): slide is SlideArtifactSlide => Boolean(slide))
      : [];

    return {
      kind,
      slides: slides.length > 0 ? slides.slice(0, 16) : buildFallbackSlides(message)
    };
  }

  const sections = Array.isArray(payload.websiteSections)
    ? payload.websiteSections
        .map((section): WebsiteDesignSection | null => {
          const name = cleanText(section.name, 120);
          if (!name) {
            return null;
          }
          return {
            id: makeId("section"),
            name,
            summary: cleanText(section.summary, 260) || "Generated website section."
          };
        })
        .filter((section): section is WebsiteDesignSection => Boolean(section))
    : [];
  const fallback = defaultArtifactContent("website_design");
  return {
    kind,
    html: cleanBlock(payload.websiteHtml) || (fallback.kind === "website_design" ? buildFallbackWebsiteHtml(message) : ""),
    css: cleanBlock(payload.websiteCss) || (fallback.kind === "website_design" ? fallback.css : ""),
    sections: sections.length > 0 ? sections.slice(0, 16) : [{ id: makeId("section"), name: "Hero", summary: "Generated from the email request." }]
  };
}

function createActionPlanFromArtifact(
  message: EmailMessageSummary,
  artifact: Artifact,
  finalApprovalReason: string | undefined,
  humanQuestion: string | undefined,
  qualityResult: ArtifactQualityResult | null
): ActionPlan {
  const now = Date.now();
  const tool = getActionToolForArtifactKind(artifact.kind);
  const finalReason =
    cleanText(finalApprovalReason, 260) ||
    (/\b(send|share|publish|submit|email|reply)\b/iu.test(`${message.subject} ${message.snippet} ${message.actionText ?? ""}`)
      ? "User approval is required before Autopilot sends, submits, publishes, or shares this work."
      : "No final external action is ready yet.");
  const needsApproval = finalReason !== "No final external action is ready yet.";
  const humanQuestionText = cleanText(humanQuestion, 260);
  const steps: ActionStep[] = [
    {
      id: makeId("step"),
      title: "Read the source email and identify the requested deliverable",
      tool,
      state: "completed",
      risk: "local",
      requiresFinalApproval: false
    },
    {
      id: makeId("step"),
      title: `Generate ${artifactKindLabel(artifact.kind)} in the Design tab`,
      tool,
      state: "completed",
      risk: "local",
      requiresFinalApproval: false,
      artifactId: artifact.id
    }
  ];

  if (qualityResult) {
    steps.push({
      id: makeId("step"),
      title: qualityResult.passed
        ? `Quality check passed (${qualityResult.score}/100)`
        : `Quality check needs review (${qualityResult.score}/100)`,
      tool,
      state: qualityResult.passed ? "completed" : "needs_user",
      risk: "local",
      requiresFinalApproval: false,
      artifactId: artifact.id
    });
  }

  if (humanQuestionText) {
    steps.push({
      id: makeId("step"),
      title: "Ask for the missing detail needed to finish the work",
      tool: "question",
      state: "needs_user",
      risk: "local",
      requiresFinalApproval: false,
      humanInput: {
        id: makeId("input"),
        question: humanQuestionText,
        reason: "Autopilot needs this answer to finish the artifact accurately."
      }
    });
  }

  steps.push({
    id: makeId("step"),
    title: needsApproval ? "Wait for final approval before sending or sharing" : "Ready for review in Artifact Studio",
    tool,
    state: needsApproval ? "needs_user" : "completed",
    risk: needsApproval ? "external_approval" : "local",
    requiresFinalApproval: needsApproval,
    artifactId: artifact.id
  });

  return {
    id: makeId("plan"),
    title: artifact.title,
    summary: artifact.summary,
    source: {
      provider: message.id.startsWith("manual:") ? "manual" : "gmail",
      label: `${message.from} - ${message.subject}`.slice(0, 160),
      messageId: message.id,
      url: message.url
    },
    tool,
    artifactId: artifact.id,
    steps,
    finalApproval: {
      required: needsApproval,
      reason: finalReason
    },
    createdAt: now,
    updatedAt: now
  };
}

function createAgentRun(
  plan: ActionPlan,
  usedFallback: boolean,
  fallbackReason?: string,
  qualityResult?: ArtifactQualityResult | null,
  trace?: ArtifactGenerationTrace
): AgentRun {
  const now = Date.now();
  const events: AgentRunEvent[] = [
    {
      id: makeId("event"),
      createdAt: now,
      level: "info",
      message: "Autopilot read the source and routed it to Artifact Studio."
    },
    {
      id: makeId("event"),
      createdAt: now,
      level: "success",
      message: `Created ${plan.tool.replace("_", " ")} artifact.`
    }
  ];
  if (qualityResult) {
    events.push({
      id: makeId("event"),
      createdAt: now,
      level: qualityResult.passed ? "success" : "warning",
      message: qualityResult.passed
        ? `Quality checked at ${qualityResult.score}/100.`
        : `Quality needs review at ${qualityResult.score}/100: ${summarizeQualityFailure(qualityResult)}`
    });
  }
  if (trace) {
    events.push({
      id: makeId("event"),
      createdAt: now,
      level: "info",
      message: `Planned artifact: ${trace.inferredAsk} Audience: ${trace.audience}.`
    });
    if (trace.critique.length > 0) {
      events.push({
        id: makeId("event"),
        createdAt: now,
        level: "info",
        message: `Self-critique before revision: ${trace.critique.slice(0, 3).join(" ")}`
      });
    }
  }
  if (usedFallback) {
    events.push({
      id: makeId("event"),
      createdAt: now,
      level: "warning",
      message: fallbackReason ?? "Used local artifact generation fallback."
    });
  }

  if (plan.finalApproval.required) {
    events.push({
      id: makeId("event"),
      createdAt: now,
      level: "warning",
      message: plan.finalApproval.reason
    });
  }

  return {
    id: makeId("run"),
    planId: plan.id,
    state: plan.steps.some((step) => step.state === "needs_user") ? "waiting_for_user" : "completed",
    events,
    artifactTrace: trace,
    createdAt: now,
    updatedAt: now
  };
}

function buildFallbackArtifactPayload(message: EmailMessageSummary, kind: ArtifactKind): GeneratedArtifactPayload {
  const details = extractUsefulSourceDetails(cleanBlock(message.actionText || message.snippet || ""));
  return {
    artifactKind: kind,
    title: fallbackTitle(message, kind),
    summary: `AI unavailable fallback draft from ${message.from} - ${message.subject}. Do not send or export without regenerating with the AI backend.`,
    replyDraftMarkdown: buildFallbackReplyDraft(message, kind, true),
    documentMarkdown: buildFallbackDocument(message),
    slides: buildFallbackSlides(message),
    websiteHtml: buildFallbackWebsiteHtml(message),
    websiteCss:
      ".artifact-page{min-height:100vh;padding:72px;font-family:Inter,system-ui,sans-serif;background:#fff8ed;color:#123c2b}.artifact-hero{max-width:900px}.artifact-kicker{text-transform:uppercase;color:#b67349;font-weight:800}.artifact-title{font-size:72px;line-height:.95;margin:10px 0 18px}.artifact-copy{font-size:20px;max-width:680px;color:#6b5d4d}.artifact-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;margin-top:42px}.artifact-card{border:1px solid #cdb99f;border-radius:16px;padding:22px;background:#fffaf2}@media(max-width:760px){.artifact-page{padding:32px}.artifact-title{font-size:44px}.artifact-grid{grid-template-columns:1fr}}",
    websiteSections: [
      { name: "Hero", summary: `Frame the request around ${message.subject || "the requested work"}.` },
      { name: "Key Details", summary: details[0] ?? "Surface the most important source details instead of generic filler." },
      { name: "Next Step", summary: details[1] ?? "Give the viewer a clear review, export, or approval action." }
    ]
  };
}

function buildReplyDraftMarkdown(
  message: EmailMessageSummary,
  payload: GeneratedArtifactPayload,
  artifactKind: ArtifactKind,
  qualityResult: ArtifactQualityResult,
  usedFallback: boolean
): string {
  const modelDraft = cleanBlock(payload.replyDraftMarkdown);
  const draft = modelDraft || buildFallbackReplyDraft(message, artifactKind, usedFallback);
  const qualityLine = qualityResult.passed
    ? `\n\n---\nDraft quality: paired with artifact quality ${qualityResult.score}/100. Review and approve before sending.`
    : `\n\n---\nDraft quality: needs review with artifact quality ${qualityResult.score}/100. ${summarizeQualityFailure(qualityResult)}`;
  return `${draft}${qualityLine}`.trim().slice(0, 24000);
}

function buildFallbackReplyDraft(message: EmailMessageSummary, artifactKind: ArtifactKind, usedFallback = false): string {
  const source = cleanBlock(message.actionText || message.snippet || "");
  const details = extractUsefulSourceDetails(source);
  const senderFirstName = cleanText(message.from, 80).split(/\s+/u)[0] || "there";
  const deliverable =
    artifactKind === "slide_deck"
      ? "the deck"
      : artifactKind === "website_design"
        ? "the website design"
        : "the document";
  const fallbackNotice = usedFallback
    ? "\n\nNote for review: Autopilot could not reach the secure AI backend, so this is a blocked fallback draft. Please regenerate before sending."
    : "";
  return `Hi ${senderFirstName},

Thanks for sending this over. I prepared ${deliverable} for review and pulled the key next steps into a cleaner shape.

${details[0] ? `I focused first on: ${details[0]}` : "I focused first on the core request, the expected deliverable, and the next approval step."}
${details[1] ? `I also noted: ${details[1]}` : "I also noted the owner, deadline, and any missing detail that should be confirmed before sending anything out."}

Next step: I will review the final version, make any needed edits, and confirm before sharing it externally.

Best,${fallbackNotice}`;
}

function buildFallbackDocument(message: EmailMessageSummary): string {
  const source = cleanBlock(message.actionText || message.snippet || "No readable body was available.");
  const details = extractUsefulSourceDetails(source);
  const subject = message.subject || "Generated document";
  return `# AI unavailable fallback: ${message.subject || "Generated document"}

> Offline placeholder. Autopilot could not reach the AI backend, so this is a review scaffold, not a finished deliverable.

## Executive Summary
This scaffold names the source from ${message.from || "the source"} and keeps the work blocked until the secure AI backend can generate a real client-ready deliverable. Date to confirm: review the original email for any deadline tied to "${subject}".

## Draft Deliverable
Use this only as a placeholder checklist:

- Acknowledge the request and confirm the core outcome.
- Address the most important details first: ${details[0] ?? "the main request, deadline, and expected response"}.
- Include the supporting detail that matters: ${details[1] ?? "who needs the work, where it will be used, and what decision it enables"}.
- Close with a clear next step and ask for any missing detail only if it blocks final delivery.

## Decision Needed
Owner: ${message.from || "source sender"}. Decision needed: regenerate this artifact with the AI backend before sending, sharing, publishing, or exporting.

## Action Plan
- Review the source details and confirm whether any date, audience, or format requirement is missing.
- Regenerate this draft in the Design workspace after AI configuration is healthy.
- Export or approve only after the final send/share step is clear.

## Source Notes
- From: ${message.from}${message.fromEmail ? ` <${message.fromEmail}>` : ""}
- Subject: ${subject}
- Key detail: ${details[2] ?? (cleanText(source, 180) || "No additional readable source detail was available.")}
`;
}

function extractUsefulSourceDetails(source: string): string[] {
  return source
    .replace(/\r/g, "")
    .split(/(?<=[.!?])\s+|\n+/u)
    .map((line) => cleanText(line, 180))
    .filter((line) => line.length > 20)
    .filter((line) => !/^https?:\/\//iu.test(line))
    .slice(0, 4);
}

function buildFallbackSlides(message: EmailMessageSummary): SlideArtifactSlide[] {
  const subject = message.subject || "Requested work";
  const source = cleanBlock(message.actionText || message.snippet || "");
  const details = extractUsefulSourceDetails(source);
  const context = (details[0] ?? cleanText(source, 180)) || "Review the source and confirm the missing details.";
  return [
    {
      id: makeId("slide"),
      title: `AI unavailable: ${subject}`,
      bullets: ["Offline placeholder. Regenerate with the AI backend before presenting.", context, "Date to confirm from the original email."]
    },
    {
      id: makeId("slide"),
      title: "Decision needed",
      bullets: [
        `Owner: ${message.from || "source sender"}.`,
        details[2] ?? "Confirm audience, deadline, and approval path.",
        "Do not send, share, submit, or publish this fallback."
      ]
    },
    {
      id: makeId("slide"),
      title: "Next step",
      bullets: [
        details[3] ?? "Reconnect the secure AI backend, then regenerate the deck in Artifact Studio.",
        "Export or approve only when the wording and format are ready."
      ]
    }
  ];
}

function buildFallbackWebsiteHtml(message: EmailMessageSummary): string {
  const title = message.subject || "Generated website design";
  const source = cleanBlock(message.actionText || message.snippet || "");
  const details = extractUsefulSourceDetails(source);
  const copy = (details[0] ?? cleanText(source, 260)) || "AI unavailable fallback draft. Regenerate before using this page.";
  return `<main class="artifact-page">
  <section class="artifact-hero">
    <p class="artifact-kicker">AI unavailable fallback</p>
    <h1 class="artifact-title">${escapeHtml(title)}</h1>
    <p class="artifact-copy">${escapeHtml(copy)}</p>
    <div class="artifact-grid">
      <article class="artifact-card"><strong>Context</strong><p>${escapeHtml(details[1] ?? "Use the source request to focus the page on one clear outcome.")}</p></article>
      <article class="artifact-card"><strong>Decision needed</strong><p>${escapeHtml(details[2] ?? `Owner: ${message.from || "source sender"}. Date to confirm before launch.`)}</p></article>
      <article class="artifact-card"><strong>Approval</strong><p>${escapeHtml(details[3] ?? "Regenerate with AI, then export as HTML and CSS only after the user approves the final version.")}</p></article>
    </div>
  </section>
</main>`;
}

function fallbackTitle(message: EmailMessageSummary, kind: ArtifactKind): string {
  const prefix = kind === "slide_deck" ? "Deck" : kind === "website_design" ? "Design" : "Document";
  return `${prefix}: ${message.subject || "Generated work"}`.slice(0, 140);
}

function buildEmailWorkRequestText(message: EmailMessageSummary): string {
  const body = cleanBlock(message.actionText || message.snippet || "");
  return [
    "Autopilot is generating work from a real Gmail message. Read the source carefully before writing.",
    "Infer the actual requested deliverable. If the message only needs a reply, generate a polished reply draft. If it asks for a deck, document, website, or action plan, build that deliverable and keep any reply draft secondary.",
    "Do not restate the email back to the user. Produce the useful output the sender implicitly needs.",
    `From: ${message.from}${message.fromEmail ? ` <${message.fromEmail}>` : ""}`,
    `Received: ${new Date(message.receivedAt).toISOString()}`,
    `Subject: ${message.subject}`,
    `Thread: ${message.threadId}`,
    `Gmail URL: ${message.url}`,
    `Snippet: ${message.snippet}`,
    "Full email body:",
    body || "(No readable body was available; use the sender, subject, and snippet only.)"
  ].join("\n");
}

function buildPersistedEmailArtifactPrompt(message: EmailMessageSummary): string {
  const body = cleanBlock(message.actionText || message.snippet || "");
  const bodyExcerpt = cleanText(body, 1200);
  return [
    "Email-to-artifact request metadata. Autopilot used the full selected source during generation, but stores only this compact local prompt on the artifact.",
    `From: ${cleanText(message.from, 160)}${message.fromEmail ? ` <${cleanText(message.fromEmail, 180)}>` : ""}`,
    `Received: ${new Date(message.receivedAt).toISOString()}`,
    `Subject: ${cleanText(message.subject, 220)}`,
    `Thread: ${cleanText(message.threadId, 180)}`,
    message.url ? `Gmail URL: ${message.url}` : "Gmail URL: unavailable",
    `Snippet: ${cleanText(message.snippet, 600) || "(No snippet available.)"}`,
    `Body excerpt: ${bodyExcerpt || "(No readable body was available; use the source link to reopen the original email.)"}`
  ].join("\n");
}

function isResearchLikeRequest(requestText: string): boolean {
  return /\b(research|brief|sources|market|industry|competitor|analysis|report|cite|citation|latest)\b/iu.test(requestText);
}

function warnAgentIssue(message: string, error?: unknown): void {
  const detail = error instanceof Error ? error.message : typeof error === "string" ? error : undefined;
  console.warn(detail ? `${message} ${detail}` : message);
}

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, maxLength) : "";
}

function cleanBlock(value: unknown): string {
  return typeof value === "string" ? value.replace(/\r/g, "").trim() : "";
}

function artifactKindLabel(kind: ArtifactKind): string {
  switch (kind) {
    case "slide_deck":
      return "slide deck";
    case "website_design":
      return "website design";
    case "document":
      return "document";
  }
}

function isActionPlan(value: unknown): value is ActionPlan {
  return Boolean(value && typeof value === "object" && typeof (value as Partial<ActionPlan>).id === "string");
}

function isAgentRun(value: unknown): value is AgentRun {
  return Boolean(value && typeof value === "object" && typeof (value as Partial<AgentRun>).id === "string");
}

function makeId(prefix: string): string {
  return `${prefix}:${randomUUID()}`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return character;
    }
  });
}

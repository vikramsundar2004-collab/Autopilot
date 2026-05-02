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
import type { EmailMessageSummary } from "../shared/email.js";
import type { ArtifactStore } from "./artifacts.js";
import type { EmailService } from "./email.js";

type AgentStateFile = {
  version: 1;
  plans: ActionPlan[];
  runs: AgentRun[];
};

type GeneratedArtifactPayload = {
  title?: string;
  summary?: string;
  artifactKind?: ArtifactKind;
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

type OpenAiResponsesResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
    }>;
  }>;
  error?: {
    message?: string;
  };
};

type OpenAiChatCompletionsResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

const AGENT_STATE_FILE = "agent-runs.json";
const DEFAULT_OPENAI_MODEL = "gpt-5.5";
const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_OPENAI_REQUEST_TIMEOUT_MS = 60_000;

export class AgentService {
  private state: AgentStateFile | null = null;

  constructor(
    private readonly artifactStore: ArtifactStore,
    private readonly emailService: EmailService,
    private readonly dataRoot: string | (() => string)
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
    const aiResult = await generateArtifactWithOpenAi(requestText, fallbackKind);
    const payload = aiResult.payload ?? buildFallbackArtifactPayload(message, fallbackKind);
    const kind = chooseArtifactKindFromText(`${payload.artifactKind ?? ""} ${requestText}`, preferredKind ?? payload.artifactKind ?? fallbackKind);
    const artifact = await this.artifactStore.createArtifact({
      kind,
      title: cleanText(payload.title, 140) || fallbackTitle(message, kind),
      summary: cleanText(payload.summary, 320) || `Generated from ${message.from} - ${message.subject}`,
      prompt: requestText,
      source: message.id.startsWith("manual:") ? { provider: "manual", label: "Manual prompt" } : createArtifactSourceFromEmail(message),
      content: buildArtifactContent(kind, payload, message)
    });
    const plan = createActionPlanFromArtifact(message, artifact, payload.finalApprovalReason, payload.humanQuestion);
    const run = createAgentRun(plan, aiResult.usedFallback, aiResult.reason);

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
      usedFallback: aiResult.usedFallback
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
  requestText: string,
  fallbackKind: ArtifactKind
): Promise<{ payload: GeneratedArtifactPayload | null; model: string; usedFallback: boolean; reason?: string }> {
  const apiKey = getOpenAiApiKey();
  const model = getOpenAiModel();
  if (!apiKey) {
    return {
      payload: null,
      model,
      usedFallback: true,
      reason: "OpenAI key is not configured; Autopilot used the local artifact builder."
    };
  }

  const prompt = buildArtifactGenerationPrompt(requestText, fallbackKind);
  const responsesResult = await callOpenAiResponses(apiKey, model, prompt);
  if (responsesResult.payload) {
    return {
      payload: responsesResult.payload,
      model,
      usedFallback: false
    };
  }

  const chatResult = await callOpenAiChatCompletions(apiKey, model, prompt);
  if (chatResult.payload) {
    return {
      payload: chatResult.payload,
      model,
      usedFallback: false
    };
  }

  return {
    payload: null,
    model,
    usedFallback: true,
    reason: chatResult.reason || responsesResult.reason || "OpenAI artifact generation failed; Autopilot used the local artifact builder."
  };
}

async function callOpenAiResponses(
  apiKey: string,
  model: string,
  prompt: string
): Promise<{ payload: GeneratedArtifactPayload | null; reason?: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getOpenAiRequestTimeoutMs());

  try {
    const response = await fetch(new URL("responses", `${getOpenAiBaseUrl()}/`), {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "system",
            content:
              "You are Autopilot's artifact builder. Return only valid JSON for an in-app artifact. Do not include markdown fences."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        store: false
      }),
      signal: controller.signal
    });
    const body = (await response.json()) as OpenAiResponsesResponse;
    if (!response.ok) {
      return { payload: null, reason: body.error?.message || `OpenAI Responses request failed with status ${response.status}.` };
    }

    return { payload: parseGeneratedArtifactPayload(getResponsesOutputText(body)) };
  } catch (error) {
    return {
      payload: null,
      reason:
        error instanceof Error && error.name === "AbortError"
          ? `OpenAI artifact generation timed out after ${Math.round(getOpenAiRequestTimeoutMs() / 1000)} seconds.`
          : error instanceof Error
            ? error.message
            : "OpenAI artifact generation failed."
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function callOpenAiChatCompletions(
  apiKey: string,
  model: string,
  prompt: string
): Promise<{ payload: GeneratedArtifactPayload | null; reason?: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getOpenAiRequestTimeoutMs());

  try {
    const response = await fetch(new URL("chat/completions", `${getOpenAiBaseUrl()}/`), {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are Autopilot's artifact builder. Return only valid JSON for an in-app artifact. Do not include markdown fences."
          },
          {
            role: "user",
            content: prompt
          }
        ]
      }),
      signal: controller.signal
    });
    const body = (await response.json()) as OpenAiChatCompletionsResponse;
    if (!response.ok) {
      return { payload: null, reason: body.error?.message || `OpenAI chat request failed with status ${response.status}.` };
    }

    return { payload: parseGeneratedArtifactPayload(body.choices?.[0]?.message?.content ?? "") };
  } catch (error) {
    return {
      payload: null,
      reason:
        error instanceof Error && error.name === "AbortError"
          ? `OpenAI artifact generation timed out after ${Math.round(getOpenAiRequestTimeoutMs() / 1000)} seconds.`
          : error instanceof Error
            ? error.message
            : "OpenAI artifact generation failed."
    };
  } finally {
    clearTimeout(timeout);
  }
}

function buildArtifactGenerationPrompt(requestText: string, fallbackKind: ArtifactKind): string {
  return `Read the email or prompt below and generate the requested work product.

Choose artifactKind as one of: document, slide_deck, website_design.
If the request says slides, deck, pitch, or presentation, use slide_deck.
If it says website, landing page, mockup, UI, Figma, design, or homepage, use website_design.
If it asks for a report, proposal, writeup, memo, assignment, or reply draft, use document.

Return JSON only:
{
  "title": "artifact title",
  "summary": "short summary",
  "artifactKind": "${fallbackKind}",
  "documentMarkdown": "# Title\\n...",
  "slides": [{"title":"Slide title","bullets":["bullet"],"speakerNotes":"notes"}],
  "websiteHtml": "<main>...</main>",
  "websiteCss": "body{...}",
  "websiteSections": [{"name":"Hero","summary":"..."}],
  "finalApprovalReason": "why the user must approve before sending/publishing/sharing, or empty",
  "humanQuestion": "only if missing information blocks the work"
}

Use the email details. Do the work now; do not tell the user to do it.

Email or prompt:
${requestText}`;
}

function parseGeneratedArtifactPayload(content: string): GeneratedArtifactPayload | null {
  const trimmed = content.trim().replace(/^```(?:json)?/u, "").replace(/```$/u, "").trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed) as GeneratedArtifactPayload;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
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
  humanQuestion: string | undefined
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

function createAgentRun(plan: ActionPlan, usedFallback: boolean, fallbackReason?: string): AgentRun {
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
    createdAt: now,
    updatedAt: now
  };
}

function buildFallbackArtifactPayload(message: EmailMessageSummary, kind: ArtifactKind): GeneratedArtifactPayload {
  return {
    artifactKind: kind,
    title: fallbackTitle(message, kind),
    summary: `Prepared from ${message.from} - ${message.subject}`,
    documentMarkdown: buildFallbackDocument(message),
    slides: buildFallbackSlides(message),
    websiteHtml: buildFallbackWebsiteHtml(message),
    websiteCss:
      ".artifact-page{min-height:100vh;padding:72px;font-family:Inter,system-ui,sans-serif;background:#fff8ed;color:#123c2b}.artifact-hero{max-width:900px}.artifact-kicker{text-transform:uppercase;color:#b67349;font-weight:800}.artifact-title{font-size:72px;line-height:.95;margin:10px 0 18px}.artifact-copy{font-size:20px;max-width:680px;color:#6b5d4d}.artifact-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;margin-top:42px}.artifact-card{border:1px solid #cdb99f;border-radius:16px;padding:22px;background:#fffaf2}@media(max-width:760px){.artifact-page{padding:32px}.artifact-title{font-size:44px}.artifact-grid{grid-template-columns:1fr}}",
    websiteSections: [
      { name: "Hero", summary: "Introduces the requested topic." },
      { name: "Key Details", summary: "Highlights the details pulled from the source." },
      { name: "Next Step", summary: "Gives the viewer a clear action." }
    ]
  };
}

function buildFallbackDocument(message: EmailMessageSummary): string {
  const body = cleanBlock(message.actionText || message.snippet || "No readable body was available.");
  return `# ${message.subject || "Generated document"}

## Source
${message.from}${message.fromEmail ? ` <${message.fromEmail}>` : ""}

## What Autopilot understood
${body}

## Draft
Autopilot prepared this document from the source email. Review the details, ask for changes in the Design tab, then export or approve the final send/share step.
`;
}

function buildFallbackSlides(message: EmailMessageSummary): SlideArtifactSlide[] {
  const subject = message.subject || "Requested work";
  const context = cleanText(message.snippet || message.actionText, 180) || "Details came from the source email.";
  return [
    {
      id: makeId("slide"),
      title: subject,
      bullets: ["Generated from the source email.", context]
    },
    {
      id: makeId("slide"),
      title: "What matters",
      bullets: ["Autopilot identified the requested deliverable.", "The deck is ready for review and revision."]
    },
    {
      id: makeId("slide"),
      title: "Next step",
      bullets: ["Review the slides in Artifact Studio.", "Approve only when ready to share or send."]
    }
  ];
}

function buildFallbackWebsiteHtml(message: EmailMessageSummary): string {
  const title = message.subject || "Generated website design";
  const copy = cleanText(message.snippet || message.actionText, 260) || "Autopilot generated this web design from the source email.";
  return `<main class="artifact-page">
  <section class="artifact-hero">
    <p class="artifact-kicker">Autopilot design</p>
    <h1 class="artifact-title">${escapeHtml(title)}</h1>
    <p class="artifact-copy">${escapeHtml(copy)}</p>
    <div class="artifact-grid">
      <article class="artifact-card"><strong>Context</strong><p>Built from the email request.</p></article>
      <article class="artifact-card"><strong>Direction</strong><p>Ready for AI revision in the Design tab.</p></article>
      <article class="artifact-card"><strong>Export</strong><p>Export as HTML and CSS when approved.</p></article>
    </div>
  </section>
</main>`;
}

function fallbackTitle(message: EmailMessageSummary, kind: ArtifactKind): string {
  const prefix = kind === "slide_deck" ? "Deck" : kind === "website_design" ? "Design" : "Document";
  return `${prefix}: ${message.subject || "Generated work"}`.slice(0, 140);
}

function buildEmailWorkRequestText(message: EmailMessageSummary): string {
  return [
    `From: ${message.from}${message.fromEmail ? ` <${message.fromEmail}>` : ""}`,
    `Subject: ${message.subject}`,
    `Snippet: ${message.snippet}`,
    `Body: ${message.actionText || message.snippet}`
  ].join("\n");
}

function getResponsesOutputText(body: OpenAiResponsesResponse): string {
  if (body.output_text?.trim()) {
    return body.output_text;
  }

  return (
    body.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => content.text ?? "")
      .join("\n")
      .trim() ?? ""
  );
}

function getOpenAiApiKey(): string {
  return (process.env.AUTOPILOT_OPENAI_API_KEY || process.env.OPENAI_API_KEY || "").trim();
}

function getOpenAiModel(): string {
  return (process.env.AUTOPILOT_OPENAI_MODEL || DEFAULT_OPENAI_MODEL).trim();
}

function getOpenAiBaseUrl(): string {
  return (process.env.AUTOPILOT_OPENAI_BASE_URL || DEFAULT_OPENAI_BASE_URL).trim().replace(/\/+$/u, "");
}

function getOpenAiRequestTimeoutMs(): number {
  const value = Number.parseInt(process.env.AUTOPILOT_OPENAI_REQUEST_TIMEOUT_MS || "", 10);
  return Number.isInteger(value) && value >= 5000 && value <= 120000 ? value : DEFAULT_OPENAI_REQUEST_TIMEOUT_MS;
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

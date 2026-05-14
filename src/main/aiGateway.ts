import { app } from "electron";
import {
  createAiModelRoutingConfig,
  describeAiModelRouting,
  getDefaultAiModel,
  selectAiModel,
  type AiModelTask
} from "../shared/aiModels.js";

type OpenAiResponsesResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
      type?: string;
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

type AiProxyResponse = {
  success?: boolean;
  outputText?: string;
  result?: OpenAiResponsesResponse;
  model?: string;
  reason?: string;
  status?: number;
};

type AiArtifactProxyResponse = {
  success?: boolean;
  artifact?: unknown;
  trace?: unknown;
  model?: string;
  reason?: string;
};

type AiEmailActionsProxyResponse = {
  success?: boolean;
  configured?: boolean;
  actions?: unknown[];
  model?: string;
  reason?: string;
};

export type AiGatewayResponseFormat = "text" | "json_object";

export type AiGatewayRequest = {
  prompt: string;
  instructions?: string;
  context?: unknown;
  model?: string;
  task?: AiModelTask;
  responseFormat?: AiGatewayResponseFormat;
  timeoutMs?: number;
};

export type AiGatewayResult = {
  success: boolean;
  outputText: string;
  model: string;
  provider: "proxy" | "local";
  reason?: string;
};

export type AiGatewayReadiness = {
  aiProxyUrl: string | null;
  aiArtifactUrl: string | null;
  aiEmailActionsUrl: string | null;
  hasProxy: boolean;
  hasArtifactEndpoint: boolean;
  hasEmailActionsEndpoint: boolean;
  hasLocalDevelopmentKey: boolean;
  defaultModel: string;
  modelRouting: string;
};

export type AiGatewayArtifactRequest = {
  kind: string;
  prompt: string;
  source?: unknown;
  model?: string;
  task?: AiModelTask;
  timeoutMs?: number;
};

export type AiGatewayArtifactResult = {
  success: boolean;
  artifact?: unknown;
  trace?: unknown;
  model: string;
  provider: "proxy" | "local";
  reason?: string;
};

export type AiGatewayEmailActionsRequest = {
  messages: unknown[];
  model?: string;
  task?: AiModelTask;
  timeoutMs?: number;
};

export type AiGatewayEmailActionsResult = {
  success: boolean;
  configured: boolean;
  actions: unknown[];
  model: string;
  provider: "proxy" | "local";
  reason?: string;
};

const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_OPENAI_REQUEST_TIMEOUT_MS = 45_000;

export class AiGateway {
  constructor(private readonly getSupabaseAccessToken: () => Promise<string | null> = async () => null) {}

  getReadiness(): AiGatewayReadiness {
    const aiProxyUrl = getAiProxyUrl();
    const aiArtifactUrl = getAiArtifactUrl();
    const aiEmailActionsUrl = getAiEmailActionsUrl();
    const routing = getAiModelRoutingConfig();
    return {
      aiProxyUrl,
      aiArtifactUrl,
      aiEmailActionsUrl,
      hasProxy: Boolean(aiProxyUrl),
      hasArtifactEndpoint: Boolean(aiArtifactUrl),
      hasEmailActionsEndpoint: Boolean(aiEmailActionsUrl),
      hasLocalDevelopmentKey: Boolean(getOpenAiApiKey()),
      defaultModel: getDefaultAiModel(routing),
      modelRouting: describeAiModelRouting(routing)
    };
  }

  async generateArtifact(input: AiGatewayArtifactRequest): Promise<AiGatewayArtifactResult> {
    const selection = selectGatewayModel(input.task ?? "artifact_generation", input.model);
    const artifactUrl = getAiArtifactUrl();
    if (!artifactUrl) {
      return {
        success: false,
        model: selection.model,
        provider: "proxy",
        reason: "Supabase artifact endpoint is not configured."
      };
    }

    const token = await this.getSupabaseAccessToken();
    if (!token) {
      return {
        success: false,
        model: selection.model,
        provider: "proxy",
        reason: "Sign into Autopilot so the secure artifact endpoint can verify this user."
      };
    }

    return callArtifactProxy(artifactUrl, token, {
      kind: input.kind,
      prompt: input.prompt,
      source: input.source,
      model: input.model,
      task: input.task ?? "artifact_generation",
      timeoutMs: input.timeoutMs
    });
  }

  async analyzeEmailActions(input: AiGatewayEmailActionsRequest): Promise<AiGatewayEmailActionsResult> {
    const selection = selectGatewayModel(input.task ?? "email_triage", input.model);
    const emailActionsUrl = getAiEmailActionsUrl();
    if (!emailActionsUrl) {
      return {
        success: false,
        configured: false,
        actions: [],
        model: selection.model,
        provider: "proxy",
        reason: "Supabase email action endpoint is not configured."
      };
    }

    const token = await this.getSupabaseAccessToken();
    if (!token) {
      return {
        success: false,
        configured: true,
        actions: [],
        model: selection.model,
        provider: "proxy",
        reason: "Sign into Autopilot so the secure email action endpoint can verify this user."
      };
    }

    return callEmailActionsProxy(emailActionsUrl, token, {
      messages: input.messages,
      model: input.model,
      task: input.task ?? "email_triage",
      timeoutMs: input.timeoutMs
    });
  }

  async generateText(input: AiGatewayRequest): Promise<AiGatewayResult> {
    const prompt = input.prompt.trim();
    const selection = selectGatewayModel(input.task, input.model);
    const model = selection.model;
    if (!prompt) {
      return {
        success: false,
        outputText: "",
        model,
        provider: "proxy",
        reason: "Prompt is required."
      };
    }

    const proxyUrl = getAiProxyUrl();
    let proxyReason = "";
    if (proxyUrl) {
      const token = await this.getSupabaseAccessToken();
      if (token) {
        const proxyResult = await callAiProxy(proxyUrl, token, {
          ...input,
          prompt,
          model
        });
        if (proxyResult.success) {
          return proxyResult;
        }
        proxyReason = proxyResult.reason ?? "AI proxy request failed.";
      } else {
        proxyReason = "Sign into Autopilot so the secure AI proxy can verify this user.";
      }
    }

    const apiKey = getOpenAiApiKey();
    if (apiKey) {
      const localResult = await callOpenAiDirect(apiKey, {
        ...input,
        prompt,
        model
      });
      if (localResult.success || !proxyReason) {
        return localResult;
      }
      return {
        ...localResult,
        reason: localResult.reason ? `${proxyReason} Local development fallback also failed: ${localResult.reason}` : proxyReason
      };
    }

    return {
      success: false,
      outputText: "",
      model,
      provider: proxyUrl ? "proxy" : "local",
      reason:
        proxyReason ||
        "AI is not configured. Package AUTOPILOT_AI_PROXY_URL and AUTOPILOT_SUPABASE_ANON_KEY for users, or set AUTOPILOT_OPENAI_API_KEY for local development."
    };
  }
}

async function callArtifactProxy(
  artifactUrl: string,
  accessToken: string,
  input: AiGatewayArtifactRequest
): Promise<AiGatewayArtifactResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getOpenAiRequestTimeoutMs(input.timeoutMs));
  const model = selectGatewayModel(input.task ?? "artifact_generation", input.model).model;

  try {
    const response = await fetch(artifactUrl, {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        kind: input.kind,
        prompt: input.prompt,
        source: input.source,
        ...(input.model?.trim() ? { model: input.model.trim() } : {}),
        task: input.task ?? "artifact_generation"
      }),
      signal: controller.signal
    });
    const body = (await response.json()) as AiArtifactProxyResponse;
    if (!response.ok || !body.success) {
      return {
        success: false,
        model: body.model || model,
        provider: "proxy",
        reason: body.reason || `Artifact endpoint failed with status ${response.status}.`
      };
    }

    return {
      success: true,
      artifact: body.artifact,
      trace: body.trace,
      model: body.model || model,
      provider: "proxy"
    };
  } catch (error) {
    return {
      success: false,
      model,
      provider: "proxy",
      reason: formatAiError(error, "Artifact endpoint request", input.timeoutMs)
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function callEmailActionsProxy(
  emailActionsUrl: string,
  accessToken: string,
  input: AiGatewayEmailActionsRequest
): Promise<AiGatewayEmailActionsResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getOpenAiRequestTimeoutMs(input.timeoutMs));
  const model = selectGatewayModel(input.task ?? "email_triage", input.model).model;

  try {
    const response = await fetch(emailActionsUrl, {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        messages: input.messages,
        ...(input.model?.trim() ? { model: input.model.trim() } : {}),
        task: input.task ?? "email_triage"
      }),
      signal: controller.signal
    });
    const body = (await response.json()) as AiEmailActionsProxyResponse;
    if (!response.ok || !body.success) {
      return {
        success: false,
        configured: Boolean(body.configured),
        actions: [],
        model: body.model || model,
        provider: "proxy",
        reason: body.reason || `Email action endpoint failed with status ${response.status}.`
      };
    }

    return {
      success: true,
      configured: body.configured !== false,
      actions: Array.isArray(body.actions) ? body.actions : [],
      model: body.model || model,
      provider: "proxy"
    };
  } catch (error) {
    return {
      success: false,
      configured: true,
      actions: [],
      model,
      provider: "proxy",
      reason: formatAiError(error, "Email action endpoint request", input.timeoutMs)
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function callAiProxy(proxyUrl: string, accessToken: string, input: AiGatewayRequest): Promise<AiGatewayResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getOpenAiRequestTimeoutMs(input.timeoutMs));
  const model = selectGatewayModel(input.task, input.model).model;

  try {
    const response = await fetch(proxyUrl, {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        prompt: input.prompt,
        instructions: input.instructions,
        context: input.context,
        model,
        task: input.task ?? "general",
        responseFormat: input.responseFormat ?? "text"
      }),
      signal: controller.signal
    });
    const body = (await response.json()) as AiProxyResponse;
    if (!response.ok || !body.success) {
      return {
        success: false,
        outputText: "",
        model,
        provider: "proxy",
        reason: body.reason || `AI proxy request failed with status ${response.status}.`
      };
    }

    return {
      success: true,
      outputText: body.outputText?.trim() || getResponsesOutputText(body.result ?? {}) || "",
      model: body.model || model,
      provider: "proxy"
    };
  } catch (error) {
    return {
      success: false,
      outputText: "",
      model,
      provider: "proxy",
      reason: formatAiError(error, "AI proxy request", input.timeoutMs)
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function callOpenAiDirect(apiKey: string, input: AiGatewayRequest): Promise<AiGatewayResult> {
  const model = selectGatewayModel(input.task, input.model).model;
  const responsesResult = await callOpenAiResponses(apiKey, input);
  if (responsesResult.success && (input.responseFormat !== "json_object" || isJsonObjectOutput(responsesResult.outputText))) {
    return responsesResult;
  }

  const chatResult = await callOpenAiChatCompletions(apiKey, input);
  if (chatResult.success) {
    if (input.responseFormat === "json_object" && !isJsonObjectOutput(chatResult.outputText)) {
      return {
        success: false,
        outputText: "",
        model,
        provider: "local",
        reason: "OpenAI returned text instead of the requested JSON object."
      };
    }
    return chatResult;
  }

  return {
    success: false,
    outputText: "",
    model,
    provider: "local",
    reason: chatResult.reason || responsesResult.reason || "OpenAI request failed."
  };
}

function isJsonObjectOutput(value: string): boolean {
  try {
    const parsed = JSON.parse(value.trim());
    return Boolean(parsed && typeof parsed === "object" && !Array.isArray(parsed));
  } catch {
    return false;
  }
}

async function callOpenAiResponses(apiKey: string, input: AiGatewayRequest): Promise<AiGatewayResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getOpenAiRequestTimeoutMs(input.timeoutMs));
  const model = selectGatewayModel(input.task, input.model).model;
  const instructions = withResponseFormatInstruction(input.instructions, input.responseFormat);

  try {
    const response = await fetch(new URL("responses", `${getOpenAiBaseUrl()}/`), {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model,
        instructions,
        input: [
          {
            role: "user",
            content: input.context === undefined ? input.prompt : JSON.stringify({ prompt: input.prompt, context: input.context })
          }
        ],
        store: false
      }),
      signal: controller.signal
    });
    const body = (await response.json()) as OpenAiResponsesResponse;
    if (!response.ok) {
      return {
        success: false,
        outputText: "",
        model,
        provider: "local",
        reason: body.error?.message || `OpenAI Responses request failed with status ${response.status}.`
      };
    }

    return {
      success: true,
      outputText: getResponsesOutputText(body),
      model,
      provider: "local"
    };
  } catch (error) {
    return {
      success: false,
      outputText: "",
      model,
      provider: "local",
      reason: formatAiError(error, "OpenAI Responses request", input.timeoutMs)
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function callOpenAiChatCompletions(apiKey: string, input: AiGatewayRequest): Promise<AiGatewayResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getOpenAiRequestTimeoutMs(input.timeoutMs));
  const model = selectGatewayModel(input.task, input.model).model;
  const instructions = withResponseFormatInstruction(input.instructions, input.responseFormat);

  try {
    const response = await fetch(new URL("chat/completions", `${getOpenAiBaseUrl()}/`), {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model,
        ...getChatCompletionSamplingOptions(model),
        ...(input.responseFormat === "json_object" ? { response_format: { type: "json_object" } } : {}),
        messages: [
          {
            role: "system",
            content: instructions
          },
          {
            role: "user",
            content: input.context === undefined ? input.prompt : JSON.stringify({ prompt: input.prompt, context: input.context })
          }
        ]
      }),
      signal: controller.signal
    });
    const body = (await response.json()) as OpenAiChatCompletionsResponse;
    if (!response.ok) {
      return {
        success: false,
        outputText: "",
        model,
        provider: "local",
        reason: body.error?.message || `OpenAI chat request failed with status ${response.status}.`
      };
    }

    return {
      success: true,
      outputText: body.choices?.[0]?.message?.content?.trim() || "",
      model,
      provider: "local"
    };
  } catch (error) {
    return {
      success: false,
      outputText: "",
      model,
      provider: "local",
      reason: formatAiError(error, "OpenAI chat request", input.timeoutMs)
    };
  } finally {
    clearTimeout(timeout);
  }
}

function getChatCompletionSamplingOptions(model: string): { temperature?: number } {
  // GPT-5-class chat-completion fallbacks only accept the model default temperature.
  return /^gpt-5(?:\.|-|$)/iu.test(model) ? {} : { temperature: 0.2 };
}

function getResponsesOutputText(body: OpenAiResponsesResponse): string {
  if (body.output_text?.trim()) {
    return body.output_text.trim();
  }

  return (
    body.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => content.text ?? "")
      .join("")
      .trim() ?? ""
  );
}

function withResponseFormatInstruction(instructions: string | undefined, format: AiGatewayResponseFormat | undefined): string {
  const base = instructions?.trim() || "You are Autopilot Browser. Produce useful, concise, reviewable work.";
  return format === "json_object" ? `${base}\nReturn only valid JSON. Do not include markdown fences.` : base;
}

function formatAiError(error: unknown, label: string, timeoutMs?: number): string {
  if (error instanceof Error && error.name === "AbortError") {
    return `${label} timed out after ${Math.round(getOpenAiRequestTimeoutMs(timeoutMs) / 1000)} seconds.`;
  }
  return error instanceof Error ? error.message : `${label} failed.`;
}

function getAiProxyUrl(): string | null {
  const configured = (process.env.AUTOPILOT_AI_PROXY_URL || process.env.NETLIFY_AI_PROXY_URL || "").trim();
  if (!configured) {
    return null;
  }

  try {
    const url = new URL(configured);
    if (url.pathname === "/" || url.pathname === "") {
      url.pathname = "/api/ai";
    }
    return url.toString();
  } catch {
    return configured;
  }
}

function getAiArtifactUrl(): string | null {
  const configured = (process.env.AUTOPILOT_AI_ARTIFACT_URL || "").trim();
  return configured || null;
}

function getAiEmailActionsUrl(): string | null {
  const configured = (process.env.AUTOPILOT_AI_EMAIL_ACTIONS_URL || "").trim();
  return configured || null;
}

function getOpenAiApiKey(): string {
  if (isPackagedApp() && process.env.AUTOPILOT_ALLOW_PACKAGED_LOCAL_OPENAI !== "1") {
    return "";
  }
  return (process.env.AUTOPILOT_OPENAI_API_KEY || process.env.OPENAI_API_KEY || "").trim();
}

function isPackagedApp(): boolean {
  return process.env.AUTOPILOT_FORCE_PACKAGED_AI_POLICY === "1" || app?.isPackaged === true;
}

function selectGatewayModel(task?: AiModelTask, explicitModel?: string) {
  return selectAiModel(task, getAiModelRoutingConfig(), explicitModel);
}

function getAiModelRoutingConfig() {
  return createAiModelRoutingConfig((name) => process.env[name]);
}

function getOpenAiBaseUrl(): string {
  return (process.env.AUTOPILOT_OPENAI_BASE_URL || DEFAULT_OPENAI_BASE_URL).trim().replace(/\/+$/u, "");
}

function getOpenAiRequestTimeoutMs(override?: number): number {
  if (Number.isInteger(override) && override !== undefined && override >= 5000 && override <= 120000) {
    return override;
  }
  const value = Number.parseInt(process.env.AUTOPILOT_OPENAI_REQUEST_TIMEOUT_MS || "", 10);
  return Number.isInteger(value) && value >= 5000 && value <= 120000 ? value : DEFAULT_OPENAI_REQUEST_TIMEOUT_MS;
}

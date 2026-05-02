import {
  sanitizeAssistantRequest,
  sanitizeDesignPromptSuggestionRequest,
  type AssistantContextItem,
  type AssistantRequest,
  type AssistantResponse,
  type DesignPromptSuggestionResponse
} from "../shared/assistant.js";

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

const DEFAULT_OPENAI_MODEL = "gpt-5.5";
const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_OPENAI_REQUEST_TIMEOUT_MS = 45_000;

export class AssistantService {
  async ask(rawRequest: unknown, contextItems: AssistantContextItem[]): Promise<AssistantResponse> {
    const request = sanitizeAssistantRequest(rawRequest);
    const model = getOpenAiModel();
    if (!request.prompt) {
      return {
        success: false,
        answer: "",
        model,
        sources: contextItems,
        reason: "Ask Autopilot a question first."
      };
    }

    const apiKey = getOpenAiApiKey();
    if (!apiKey) {
      return {
        success: false,
        answer: "",
        model,
        sources: contextItems,
        reason: "Paste AUTOPILOT_OPENAI_API_KEY into .env.local, then restart Autopilot to enable the assistant."
      };
    }

    const responsesResult = await this.askWithResponsesApi(request, contextItems, apiKey, model);
    if (responsesResult.success || !responsesResult.shouldFallbackToChatCompletions) {
      return responsesResult.response;
    }

    return this.askWithChatCompletions(request, contextItems, apiKey, model, responsesResult.response.reason);
  }

  async generateDesignPrompts(rawRequest: unknown): Promise<DesignPromptSuggestionResponse> {
    const request = sanitizeDesignPromptSuggestionRequest(rawRequest);
    const title = request.title ?? "New Autopilot design";
    const kind = request.kind ?? "website_design";
    const response = await this.ask(
      {
        prompt: `Generate 5 high-quality design prompt suggestions for this Autopilot artifact. Return only a JSON array of short imperative prompts. Make them specific, useful, and ready to run.\n\nArtifact title: ${title}\nArtifact kind: ${kind}\nSummary: ${request.summary ?? "No summary yet."}\nContent preview: ${request.contentPreview ?? "No content yet."}`,
        sources: ["current-tab"]
      },
      [
        {
          sourceId: "current-tab",
          title,
          text: request.contentPreview ?? request.summary ?? title
        }
      ]
    );

    if (!response.success) {
      return {
        success: false,
        suggestions: [],
        model: response.model,
        reason: response.reason ?? "Autopilot could not generate prompt suggestions."
      };
    }

    const suggestions = parsePromptSuggestions(response.answer);
    return {
      success: suggestions.length > 0,
      suggestions,
      model: response.model,
      reason: suggestions.length > 0 ? undefined : "The model did not return usable prompt suggestions."
    };
  }

  private async askWithResponsesApi(
    request: AssistantRequest,
    contextItems: AssistantContextItem[],
    apiKey: string,
    model: string
  ): Promise<{ response: AssistantResponse; success: boolean; shouldFallbackToChatCompletions: boolean }> {
    const endpoint = new URL("responses", `${getOpenAiBaseUrl()}/`);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), getOpenAiRequestTimeoutMs());

    try {
      const response = await fetch(endpoint, {
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
              content: [
                {
                  type: "input_text",
                  text:
                    "You are Autopilot's local assistant. Answer using only the provided sources when possible. Be concise, practical, and disclose uncertainty."
                }
              ]
            },
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: buildAssistantPrompt(request, contextItems)
                }
              ]
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
          shouldFallbackToChatCompletions: response.status === 404 || /responses|endpoint|not found/i.test(body.error?.message ?? ""),
          response: {
            success: false,
            answer: "",
            model,
            sources: contextItems,
            reason: body.error?.message || `OpenAI Responses request failed with status ${response.status}.`
          }
        };
      }

      const answer = getResponsesOutputText(body);
      return {
        success: true,
        shouldFallbackToChatCompletions: false,
        response: {
          success: true,
          answer: answer || "I could not produce an answer from those sources.",
          model,
          sources: contextItems
        }
      };
    } catch (error) {
      return {
        success: false,
        shouldFallbackToChatCompletions: false,
        response: {
          success: false,
          answer: "",
          model,
          sources: contextItems,
          reason:
            error instanceof Error && error.name === "AbortError"
              ? `OpenAI assistant request timed out after ${Math.round(getOpenAiRequestTimeoutMs() / 1000)} seconds.`
              : error instanceof Error
                ? error.message
                : "OpenAI assistant request failed."
        }
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  private async askWithChatCompletions(
    request: AssistantRequest,
    contextItems: AssistantContextItem[],
    apiKey: string,
    model: string,
    responsesReason?: string
  ): Promise<AssistantResponse> {
    const endpoint = new URL("chat/completions", `${getOpenAiBaseUrl()}/`);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), getOpenAiRequestTimeoutMs());

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content:
                "You are Autopilot's local assistant. Answer using only the provided sources when possible. Be concise, practical, and disclose uncertainty."
            },
            {
              role: "user",
              content: buildAssistantPrompt(request, contextItems)
            }
          ]
        }),
        signal: controller.signal
      });

      const body = (await response.json()) as OpenAiChatCompletionsResponse;
      if (!response.ok) {
        return {
          success: false,
          answer: "",
          model,
          sources: contextItems,
          reason:
            body.error?.message ||
            `${responsesReason ? `${responsesReason} ` : ""}OpenAI chat request failed with status ${response.status}.`
        };
      }

      return {
        success: true,
        answer: body.choices?.[0]?.message?.content?.trim() || "I could not produce an answer from those sources.",
        model,
        sources: contextItems
      };
    } catch (error) {
      return {
        success: false,
        answer: "",
        model,
        sources: contextItems,
        reason:
          error instanceof Error && error.name === "AbortError"
            ? `OpenAI assistant request timed out after ${Math.round(getOpenAiRequestTimeoutMs() / 1000)} seconds.`
            : error instanceof Error
              ? error.message
              : "OpenAI assistant request failed."
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}

function parsePromptSuggestions(value: string): string[] {
  const trimmed = value.trim();
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.map((item) => compact(String(item), 180)).filter(Boolean).slice(0, 5);
    }
  } catch {
    // Fall back to line parsing when the model includes prose around the suggestions.
  }

  return trimmed
    .split(/\r?\n/u)
    .map((line) => line.replace(/^[-*\d.\s"']+/u, "").replace(/["']$/u, "").trim())
    .filter((line) => line.length > 12)
    .slice(0, 5);
}

function buildAssistantPrompt(request: AssistantRequest, contextItems: AssistantContextItem[]): string {
  const context = contextItems.length
    ? contextItems
        .map((item, index) =>
          [
            `Source ${index + 1}`,
            `type: ${item.sourceId}`,
            `title: ${item.title}`,
            item.url ? `url: ${item.url}` : "",
            `text: ${compact(item.text, 5000)}`
          ]
            .filter(Boolean)
            .join("\n")
        )
        .join("\n\n---\n\n")
    : "No source text was shared.";

  return `Question: ${request.prompt}\n\nShared sources:\n${context}`;
}

function compact(value: string, maxLength: number): string {
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
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

function getOpenAiApiKey(): string {
  return (process.env.AUTOPILOT_OPENAI_API_KEY || process.env.OPENAI_API_KEY || "").trim();
}

function getOpenAiModel(): string {
  return (process.env.AUTOPILOT_OPENAI_MODEL || process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL).trim();
}

function getOpenAiBaseUrl(): string {
  return (process.env.AUTOPILOT_OPENAI_BASE_URL || DEFAULT_OPENAI_BASE_URL).trim().replace(/\/+$/u, "");
}

function getOpenAiRequestTimeoutMs(): number {
  const value = Number.parseInt(process.env.AUTOPILOT_OPENAI_REQUEST_TIMEOUT_MS || "", 10);
  return Number.isInteger(value) && value >= 5000 && value <= 120000 ? value : DEFAULT_OPENAI_REQUEST_TIMEOUT_MS;
}

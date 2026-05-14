import {
  sanitizeAssistantRequest,
  sanitizeCodingPromptTranslationRequest,
  sanitizeDesignPromptTranslationRequest,
  sanitizeDesignPromptSuggestionRequest,
  type AssistantContextItem,
  type AssistantRequest,
  type AssistantResponse,
  type CodingPromptTranslationResponse,
  type DesignPromptTranslationResponse,
  type DesignPromptSuggestionResponse
} from "../shared/assistant.js";
import { AiGateway } from "./aiGateway.js";

const DEFAULT_OPENAI_REQUEST_TIMEOUT_MS = 45_000;

export class AssistantService {
  constructor(private readonly aiGateway = new AiGateway()) {}

  async ask(rawRequest: unknown, contextItems: AssistantContextItem[]): Promise<AssistantResponse> {
    const request = sanitizeAssistantRequest(rawRequest);
    const model = this.aiGateway.getReadiness().defaultModel;
    if (!request.prompt) {
      return {
        success: false,
        answer: "",
        model,
        sources: contextItems,
        reason: "Ask Autopilot a question first."
      };
    }

    const response = await this.aiGateway.generateText({
      prompt: buildAssistantPrompt(request, contextItems),
      instructions:
        "You are Autopilot's assistant. Answer using the provided sources when possible. Be concise, practical, and disclose uncertainty.",
      task: request.task ?? "assistant",
      responseFormat: request.responseFormat ?? "text",
      timeoutMs: getOpenAiRequestTimeoutMs(request.timeoutMs)
    });

    if (!response.success) {
      return {
        success: false,
        answer: "",
        model: response.model || model,
        sources: contextItems,
        reason:
          response.reason ||
          "Sign into Autopilot or configure the AI proxy. Local AUTOPILOT_OPENAI_API_KEY is only a development fallback."
      };
    }

    return {
      success: true,
      answer: response.outputText || "I could not produce an answer from those sources.",
      model: response.model,
      sources: contextItems
    };
  }

  async generateDesignPrompts(rawRequest: unknown): Promise<DesignPromptSuggestionResponse> {
    const request = sanitizeDesignPromptSuggestionRequest(rawRequest);
    const title = request.title ?? "New Autopilot design";
    const kind = request.kind ?? "website_design";
    const promptRequest: AssistantRequest = {
      prompt: `Generate 5 high-quality design prompt suggestions for this Autopilot artifact. Return only a JSON array of short imperative prompts. Make them specific, useful, and ready to run.\n\nArtifact title: ${title}\nArtifact kind: ${kind}\nSummary: ${request.summary ?? "No summary yet."}\nContent preview: ${request.contentPreview ?? "No content yet."}`,
      sources: ["current-tab"]
    };
    const contextItems: AssistantContextItem[] = [
      {
        sourceId: "current-tab",
        title,
        text: request.contentPreview ?? request.summary ?? title
      }
    ];
    const response = await this.aiGateway.generateText({
      prompt: buildAssistantPrompt(promptRequest, contextItems),
      instructions:
        "You generate crisp artifact prompt suggestions. Return only a JSON array of short imperative prompts.",
      task: "design_prompt_suggestions",
      timeoutMs: getOpenAiRequestTimeoutMs()
    });

    if (!response.success) {
      return {
        success: false,
        suggestions: [],
        model: response.model,
        reason: response.reason ?? "Autopilot could not generate prompt suggestions."
      };
    }

    const suggestions = parsePromptSuggestions(response.outputText);
    return {
      success: suggestions.length > 0,
      suggestions,
      model: response.model,
      reason: suggestions.length > 0 ? undefined : "The model did not return usable prompt suggestions."
    };
  }

  async translateDesignPrompt(rawRequest: unknown): Promise<DesignPromptTranslationResponse> {
    const request = sanitizeDesignPromptTranslationRequest(rawRequest);
    const model = this.aiGateway.getReadiness().defaultModel;
    if (!request.prompt) {
      return {
        success: false,
        refinedPrompt: "",
        options: [],
        model,
        reason: "Describe what you want Autopilot to design first."
      };
    }

    const response = await this.aiGateway.generateText({
      prompt: [
        `Human prompt: ${request.prompt}`,
        `Source kind: ${request.sourceKind ?? "prompt"}`,
        `Current artifact kind: ${request.currentArtifactKind ?? "unknown"}`,
        `Source preview: ${request.sourcePreview ?? "No source preview shared."}`
      ].join("\n\n"),
      instructions: [
        "You are Autopilot's design prompt translator.",
        "Turn rough user intent into a crisp artifact brief for a frontier design model.",
        "Infer whether the user needs a document, slide deck, or website design.",
        "Ask a follow-up only when the missing detail would materially change the result.",
        "Return only JSON with this shape:",
        '{"refinedPrompt":"detailed brief","inferredArtifactKind":"document|slide_deck|website_design","followUpQuestion":"","options":["option 1","option 2","option 3","custom details"]}'
      ].join("\n"),
      task: "design_prompt_translate",
      timeoutMs: getOpenAiRequestTimeoutMs()
    });

    if (!response.success) {
      return {
        success: false,
        refinedPrompt: request.prompt,
        options: [],
        model: response.model || model,
        reason: response.reason ?? "Autopilot could not translate that design prompt."
      };
    }

    const translated = parseDesignPromptTranslation(response.outputText);
    return {
      success: true,
      refinedPrompt: translated.refinedPrompt || request.prompt,
      inferredArtifactKind: translated.inferredArtifactKind,
      followUpQuestion: translated.followUpQuestion,
      options: translated.options,
      model: response.model
    };
  }

  async translateCodingPrompt(rawRequest: unknown): Promise<CodingPromptTranslationResponse> {
    const request = sanitizeCodingPromptTranslationRequest(rawRequest);
    const model = this.aiGateway.getReadiness().defaultModel;
    if (!request.prompt) {
      return {
        success: false,
        refinedPrompt: "",
        targetFiles: [],
        options: [],
        model,
        reason: "Describe what you want Autopilot to build, edit, test, or explain first."
      };
    }

    const response = await this.aiGateway.generateText({
      prompt: [
        `Human request: ${request.prompt}`,
        `Project: ${request.projectName ?? "No active project name shared."}`,
        `Active file: ${request.activeFilePath ?? "No active file."}`,
        `Open files: ${request.openFiles?.join(", ") || "No open files."}`,
        `Source preview: ${request.sourcePreview ?? "No extra source preview shared."}`
      ].join("\n\n"),
      instructions: [
        "You are Autopilot's coding prompt translator.",
        "Turn rough user intent into a concrete implementation brief for a frontier coding agent.",
        "Do not write code. Do not claim edits were made.",
        "Infer the user's actual desired behavior, likely target files, verification commands, and review expectations.",
        "Ask a follow-up only when the missing detail would materially change the implementation or create unsafe edits.",
        "Keep the refined prompt direct, user-facing, and specific enough for an agent to inspect files, generate a patch, run tests, and show a diff.",
        "Return only JSON with this shape:",
        '{"refinedPrompt":"concrete coding brief","implementationIntent":"short intent","targetFiles":["likely/path.ts"],"followUpQuestion":"","options":["option 1","option 2","option 3","custom details"]}'
      ].join("\n"),
      task: "coding_prompt_translate",
      responseFormat: "json_object",
      timeoutMs: getOpenAiRequestTimeoutMs()
    });

    if (!response.success) {
      return {
        success: false,
        refinedPrompt: request.prompt,
        implementationIntent: "Use the original request because prompt translation was unavailable.",
        targetFiles: [],
        options: [],
        model: response.model || model,
        reason: response.reason ?? "Autopilot could not translate that coding prompt."
      };
    }

    const translated = parseCodingPromptTranslation(response.outputText);
    return {
      success: true,
      refinedPrompt: translated.refinedPrompt || request.prompt,
      implementationIntent: translated.implementationIntent,
      targetFiles: translated.targetFiles,
      followUpQuestion: translated.followUpQuestion,
      options: translated.options,
      model: response.model
    };
  }

}

function parseDesignPromptTranslation(value: string): Omit<DesignPromptTranslationResponse, "success" | "model" | "reason"> {
  try {
    const parsed = JSON.parse(value.trim()) as Partial<DesignPromptTranslationResponse>;
    return {
      refinedPrompt: compact(String(parsed.refinedPrompt ?? ""), 6000),
      inferredArtifactKind:
        parsed.inferredArtifactKind === "document" || parsed.inferredArtifactKind === "slide_deck" || parsed.inferredArtifactKind === "website_design"
          ? parsed.inferredArtifactKind
          : undefined,
      followUpQuestion: compact(String(parsed.followUpQuestion ?? ""), 240) || undefined,
      options: Array.isArray(parsed.options) ? parsed.options.map((option) => compact(String(option), 160)).filter(Boolean).slice(0, 4) : []
    };
  } catch {
    return {
      refinedPrompt: compact(value, 6000),
      options: []
    };
  }
}

function parseCodingPromptTranslation(value: string): Omit<CodingPromptTranslationResponse, "success" | "model" | "reason"> {
  try {
    const parsed = JSON.parse(value.trim()) as Partial<CodingPromptTranslationResponse>;
    return {
      refinedPrompt: compact(String(parsed.refinedPrompt ?? ""), 8000),
      implementationIntent: compact(String(parsed.implementationIntent ?? ""), 240) || undefined,
      targetFiles: Array.isArray(parsed.targetFiles)
        ? parsed.targetFiles.map((filePath) => compact(String(filePath), 260)).filter(Boolean).slice(0, 10)
        : [],
      followUpQuestion: compact(String(parsed.followUpQuestion ?? ""), 240) || undefined,
      options: Array.isArray(parsed.options) ? parsed.options.map((option) => compact(String(option), 160)).filter(Boolean).slice(0, 4) : []
    };
  } catch {
    return {
      refinedPrompt: compact(value, 8000),
      targetFiles: [],
      options: []
    };
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

function getOpenAiRequestTimeoutMs(override?: number): number {
  if (Number.isInteger(override) && override !== undefined && override >= 5_000 && override <= 120_000) {
    return override;
  }
  const value = Number.parseInt(process.env.AUTOPILOT_OPENAI_REQUEST_TIMEOUT_MS || "", 10);
  return Number.isInteger(value) && value >= 5000 && value <= 120000 ? value : DEFAULT_OPENAI_REQUEST_TIMEOUT_MS;
}

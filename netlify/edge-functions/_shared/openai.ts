import { getOpenAiApiKey, getOpenAiBaseUrl, getOpenAiModel, type AiModelTask } from "./env.ts";
import { safeJson } from "./http.ts";

export type AiResponseFormat = "text" | "json_object";

export type OpenAiGenerateInput = {
  prompt: string;
  instructions?: string;
  context?: unknown;
  model?: unknown;
  task?: AiModelTask;
  responseFormat?: AiResponseFormat;
};

export type OpenAiGenerateResult =
  | {
      success: true;
      model: string;
      outputText: string;
      result: unknown;
    }
  | {
      success: false;
      model: string;
      reason: string;
      status?: number;
    };

export async function generateWithOpenAi(input: OpenAiGenerateInput): Promise<OpenAiGenerateResult> {
  const apiKey = getOpenAiApiKey();
  const model = getOpenAiModel(input.model, input.task);
  if (!apiKey) {
    return { success: false, model, reason: "OpenAI API key is not configured on the backend.", status: 503 };
  }

  const prompt = input.prompt.trim();
  if (!prompt) {
    return { success: false, model, reason: "Prompt is required.", status: 400 };
  }

  const wantsJson = input.responseFormat === "json_object";
  const instructions = [
    input.instructions || "You are Autopilot Browser. Produce useful, concise, reviewable work.",
    wantsJson ? "Return only valid JSON. Do not include markdown fences." : ""
  ]
    .filter(Boolean)
    .join("\n");

  const response = await fetch(`${getOpenAiBaseUrl()}/responses`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      input: [
        {
          content: JSON.stringify({
            prompt,
            context: input.context ?? null
          }),
          role: "user"
        }
      ],
      instructions,
      model,
      store: false
    })
  });

  const result = await safeJson(response);
  if (!response.ok) {
    return {
      success: false,
      model,
      reason: getErrorMessage(result) || "OpenAI request failed.",
      status: response.status
    };
  }

  return {
    success: true,
    model,
    outputText: getResponsesOutputText(result),
    result
  };
}

function getErrorMessage(body: unknown): string {
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
    output?: Array<{
      content?: Array<{
        text?: unknown;
      }>;
    }>;
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

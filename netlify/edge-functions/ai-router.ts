import { requireSupabaseUser } from "./_shared/auth.ts";
import type { AiModelTask } from "./_shared/env.ts";
import { json, options, readJson } from "./_shared/http.ts";
import { generateWithOpenAi, type AiResponseFormat } from "./_shared/openai.ts";

type AiProxyRequest = {
  prompt?: string;
  instructions?: string;
  model?: string;
  task?: AiModelTask;
  context?: unknown;
  responseFormat?: AiResponseFormat;
};

export default async function handler(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") {
    return options();
  }

  if (request.method !== "POST") {
    return json({ success: false, reason: "Use POST for AI requests." }, 405);
  }

  const auth = await requireSupabaseUser(request);
  if (!auth.success) {
    return auth.response;
  }

  const parsed = await readJson<AiProxyRequest>(request);
  if (!parsed.success) {
    return parsed.response;
  }

  const result = await generateWithOpenAi({
    context: {
      ...(typeof parsed.body.context === "object" && parsed.body.context !== null ? parsed.body.context : { value: parsed.body.context ?? null }),
      authenticatedUser: {
        email: auth.user.email,
        id: auth.user.id
      }
    },
    instructions: parsed.body.instructions,
    model: parsed.body.model,
    task: parsed.body.task,
    prompt: typeof parsed.body.prompt === "string" ? parsed.body.prompt : "",
    responseFormat: parsed.body.responseFormat
  });

  if (!result.success) {
    return json(result, result.status ?? 502);
  }

  return json(result);
}

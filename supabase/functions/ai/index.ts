import { getModelForTask, getModelRoutingSummary, type AiModelTask } from "../_shared/modelRouting.ts";

type AiProxyRequest = {
  prompt?: string;
  instructions?: string;
  model?: string;
  task?: AiModelTask;
  context?: unknown;
  responseFormat?: "text" | "json_object";
};

type SupabaseUser = {
  id?: string;
  email?: string;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
const OPENAI_BASE_URL = (Deno.env.get("OPENAI_BASE_URL") ?? "https://api.openai.com/v1").replace(/\/+$/u, "");

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return json({ success: true });
  }

  if (request.method === "GET") {
    return json({
      success: Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && OPENAI_API_KEY),
      backend: "autopilot-supabase-edge",
      defaultModel: getModelForTask(undefined, "general"),
      modelRouting: getModelRoutingSummary(),
      openAiConfigured: Boolean(OPENAI_API_KEY),
      supabaseConfigured: Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)
    });
  }

  if (request.method !== "POST") {
    return json({ success: false, reason: "Use POST for AI requests." }, 405);
  }

  if (!OPENAI_API_KEY) {
    return json({ success: false, reason: "OPENAI_API_KEY is not configured in Supabase secrets." }, 503);
  }

  const auth = await requireSupabaseUser(request);
  if (!auth.success) {
    return auth.response;
  }

  let body: AiProxyRequest;
  try {
    body = (await request.json()) as AiProxyRequest;
  } catch {
    return json({ success: false, reason: "Request body must be valid JSON." }, 400);
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) {
    return json({ success: false, reason: "Prompt is required." }, 400);
  }

  const model = getModelForTask(body.model, body.task ?? "general");
  const wantsJson = body.responseFormat === "json_object";
  const instructions = [
    body.instructions || "You are Autopilot Browser. Produce useful, concise, reviewable work.",
    wantsJson ? "Return only valid JSON. Do not include markdown fences." : ""
  ]
    .filter(Boolean)
    .join("\n");

  const openAiResponse = await fetch(`${OPENAI_BASE_URL}/responses`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${OPENAI_API_KEY}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      input: [
        {
          content: JSON.stringify({
            prompt,
            context: body.context ?? null,
            authenticatedUser: {
              id: auth.user.id,
              email: auth.user.email
            }
          }),
          role: "user"
        }
      ],
      instructions,
      model,
      store: false
    })
  });

  const result = await safeJson(openAiResponse);
  if (!openAiResponse.ok) {
    return json(
      {
        success: false,
        model,
        reason: getOpenAiErrorMessage(result) || "OpenAI request failed.",
        status: openAiResponse.status
      },
      openAiResponse.status
    );
  }

  return json({
    success: true,
    model,
    outputText: getResponsesOutputText(result),
    result
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

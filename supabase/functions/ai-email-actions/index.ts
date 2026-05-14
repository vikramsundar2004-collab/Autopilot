import { getModelForTask, getModelRoutingSummary } from "../_shared/modelRouting.ts";

type EmailCandidate = {
  id?: string;
  from?: string;
  fromEmail?: string;
  subject?: string;
  snippet?: string;
  body?: string;
  receivedAt?: string | number;
};

type EmailActionRequest = {
  messages?: EmailCandidate[];
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

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return json({ success: true });
  }

  if (request.method === "GET") {
    return json({
      success: Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && OPENAI_API_KEY),
      backend: "autopilot-supabase-ai-email-actions",
      defaultModel: getModelForTask(undefined, "email_triage"),
      modelRouting: getModelRoutingSummary(),
      openAiConfigured: Boolean(OPENAI_API_KEY),
      supabaseConfigured: Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)
    });
  }

  if (request.method !== "POST") {
    return json({ success: false, reason: "Use POST for email action analysis." }, 405);
  }

  if (!OPENAI_API_KEY) {
    return json({ success: false, reason: "OPENAI_API_KEY is not configured in Supabase secrets." }, 503);
  }

  const auth = await requireSupabaseUser(request);
  if (!auth.success) {
    return auth.response;
  }

  let body: EmailActionRequest;
  try {
    body = (await request.json()) as EmailActionRequest;
  } catch {
    return json({ success: false, reason: "Request body must be valid JSON." }, 400);
  }

  const messages = Array.isArray(body.messages) ? body.messages.slice(0, 24) : [];
  if (messages.length === 0) {
    return json({ success: true, configured: true, actions: [], reason: "No email candidates were provided." });
  }

  const model = getModelForTask(body.model, "email_triage");
  const prompt = `Extract real work from these emails for ${auth.user.email ?? "this user"}.

Rules:
- The Action Queue is not an inbox. Include only real tasks.
- Exclude newsletters, receipts, marketing, FYI, generic alerts, and low-confidence items.
- Drafting is allowed. Sending is never allowed without explicit user confirmation.
- Organization actions like archive, label, unread, star, snooze, and move require a user command.
- Default ordinary follow-ups to requestedOutput="reply" and recommendedAssistant="productivity".
- Only choose document, slide_deck, website_design, code_change, or research_brief when the email explicitly asks for that deliverable.
- Do not turn a long, formal, or detailed email into a document/slideshow unless the sender clearly requested a document, memo, report, proposal, deck, slides, website, code change, or research brief.
- Verification emails, receipts, newsletters, and alerts with no user work should return no actions.

Return JSON only:
{
  "actions": [
    {
      "title": "specific next action",
      "summary": "what is needed",
      "context": "sender - subject plus useful detail",
      "sourceMessageId": "email id",
      "priority": "high|medium|low",
      "confidence": 0.0,
      "recommendedAssistant": "productivity|design|coding|automation",
      "requestedOutput": "reply|document|slide_deck|website_design|code_change|research_brief|scheduling|task",
      "reason": "why this is real user work",
      "draftSuggested": true,
      "permission": "read_only|organize_with_user_command|draft_locally|requires_send_confirmation"
    }
  ]
}

Emails:
${JSON.stringify(messages, null, 2)}`;

  const response = await fetch(`${OPENAI_BASE_URL}/responses`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${OPENAI_API_KEY}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      input: [{ content: prompt, role: "user" }],
      instructions: "You are Autopilot's Superhuman-grade email triage classifier. Return only valid JSON. Do not include markdown fences.",
      model,
      store: false
    })
  });
  const result = await safeJson(response);
  if (!response.ok) {
    return json({ success: false, configured: true, actions: [], model, reason: getOpenAiErrorMessage(result) || "OpenAI request failed." }, response.status);
  }

  const outputText = getResponsesOutputText(result);
  const parsed = parseJson(outputText);
  const actions = typeof parsed === "object" && parsed !== null && Array.isArray((parsed as { actions?: unknown }).actions)
    ? (parsed as { actions: unknown[] }).actions
    : [];
  return json({
    success: true,
    configured: true,
    model,
    actions
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

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value.trim().replace(/^```(?:json)?/u, "").replace(/```$/u, "").trim());
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

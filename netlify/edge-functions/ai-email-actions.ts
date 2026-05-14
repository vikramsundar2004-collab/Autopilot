import { requireSupabaseUser } from "./_shared/auth.ts";
import { json, options, readJson } from "./_shared/http.ts";
import { generateWithOpenAi } from "./_shared/openai.ts";

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

export default async function handler(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") {
    return options();
  }
  if (request.method !== "POST") {
    return json({ success: false, reason: "Use POST for email action analysis." }, 405);
  }

  const auth = await requireSupabaseUser(request);
  if (!auth.success) {
    return auth.response;
  }

  const parsed = await readJson<EmailActionRequest>(request);
  if (!parsed.success) {
    return parsed.response;
  }

  const messages = Array.isArray(parsed.body.messages) ? parsed.body.messages.slice(0, 24) : [];
  if (messages.length === 0) {
    return json({ success: true, actions: [], reason: "No email candidates were provided." });
  }

  const result = await generateWithOpenAi({
    instructions:
      "You are Autopilot's email-to-work classifier. Return JSON only as {\"actions\":[{\"title\":\"specific next action\",\"summary\":\"what is needed\",\"sourceMessageId\":\"email id\",\"priority\":\"high|medium|low\",\"confidence\":0.0,\"recommendedAssistant\":\"productivity|design|coding|automation\",\"requestedOutput\":\"reply|document|slide_deck|website_design|code_change|research_brief|scheduling|task\",\"reason\":\"why this is real user work\",\"draftSuggested\":true}]}. Exclude newsletters, receipts, marketing, FYI, and low-confidence items.",
    model: parsed.body.model,
    task: "email_triage",
    prompt: `Extract real work from these emails for ${auth.user.email ?? "this user"}:\n\n${JSON.stringify(messages, null, 2)}`,
    responseFormat: "json_object"
  });

  if (!result.success) {
    return json(result, result.status ?? 502);
  }

  return json(result);
}

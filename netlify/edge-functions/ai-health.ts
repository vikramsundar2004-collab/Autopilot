import { getBackendReadiness } from "./_shared/env.ts";
import { json, options } from "./_shared/http.ts";

export default async function handler(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") {
    return options();
  }

  if (request.method !== "GET") {
    return json({ success: false, reason: "Use GET for backend health." }, 405);
  }

  const readiness = getBackendReadiness();
  return json({
    success: readiness.supabaseConfigured && readiness.openAiConfigured,
    backend: "autopilot-netlify-edge",
    defaultModel: readiness.defaultModel,
    openAiConfigured: readiness.openAiConfigured,
    supabaseConfigured: readiness.supabaseConfigured
  });
}

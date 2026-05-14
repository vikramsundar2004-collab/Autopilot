import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

function read(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("Netlify AI backend", () => {
  it("routes the generic and specialized AI edge functions", () => {
    const netlifyToml = read("netlify.toml");

    expect(netlifyToml).toContain('function = "ai-router"');
    expect(netlifyToml).toContain('path = "/api/ai"');
    expect(netlifyToml).toContain('function = "ai-health"');
    expect(netlifyToml).toContain('path = "/api/ai/health"');
    expect(netlifyToml).toContain('function = "ai-email-actions"');
    expect(netlifyToml).toContain('path = "/api/ai/email-actions"');
    expect(netlifyToml).toContain('function = "ai-artifact"');
    expect(netlifyToml).toContain('path = "/api/ai/artifact"');
  });

  it("keeps backend secrets on Netlify and validates Supabase users before OpenAI calls", () => {
    const envHelper = read("netlify/edge-functions/_shared/env.ts");
    const authHelper = read("netlify/edge-functions/_shared/auth.ts");
    const openAiHelper = read("netlify/edge-functions/_shared/openai.ts");
    const router = read("netlify/edge-functions/ai-router.ts");

    expect(envHelper).toContain("globalThis");
    expect(envHelper).toContain("OPENAI_API_KEY");
    expect(envHelper).toContain("SUPABASE_ANON_KEY");
    expect(authHelper).toContain("/auth/v1/user");
    expect(router).toContain("requireSupabaseUser");
    expect(openAiHelper).toContain("/responses");
    expect(openAiHelper).toContain("store: false");
    expect(`${envHelper}\n${authHelper}\n${openAiHelper}`).not.toContain("service_role");
  });
});

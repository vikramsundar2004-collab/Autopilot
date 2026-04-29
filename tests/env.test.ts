import { describe, expect, it } from "vitest";

import path from "node:path";

import { getAutopilotEnvFileCandidates, parseEnvText } from "../src/main/env";

describe("parseEnvText", () => {
  it("parses Gmail credentials from env text", () => {
    expect(
      parseEnvText(`
# Gmail
AUTOPILOT_GOOGLE_CLIENT_ID="client-id"
AUTOPILOT_GOOGLE_CLIENT_SECRET=client-secret
AUTOPILOT_OPENAI_API_KEY='openai-key'
`)
    ).toEqual({
      AUTOPILOT_GOOGLE_CLIENT_ID: "client-id",
      AUTOPILOT_GOOGLE_CLIENT_SECRET: "client-secret",
      AUTOPILOT_OPENAI_API_KEY: "openai-key"
    });
  });

  it("checks both env.local and .env.local with the non-dotted file first", () => {
    const candidates = getAutopilotEnvFileCandidates("C:\\dist-root", "C:\\project-root");

    expect(candidates.slice(0, 4)).toEqual([
      path.join("C:\\project-root", "env.local"),
      path.join("C:\\project-root", ".env.local"),
      path.join("C:\\project-root", "env"),
      path.join("C:\\project-root", ".env")
    ]);
  });
});

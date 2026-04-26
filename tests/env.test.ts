import { describe, expect, it } from "vitest";

import { parseEnvText } from "../src/main/env";

describe("parseEnvText", () => {
  it("parses Gmail credentials from env text", () => {
    expect(
      parseEnvText(`
# Gmail
AUTOPILOT_GOOGLE_CLIENT_ID="client-id"
AUTOPILOT_GOOGLE_CLIENT_SECRET=client-secret
`)
    ).toEqual({
      AUTOPILOT_GOOGLE_CLIENT_ID: "client-id",
      AUTOPILOT_GOOGLE_CLIENT_SECRET: "client-secret"
    });
  });
});

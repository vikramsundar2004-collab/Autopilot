import { describe, expect, it } from "vitest";

import {
  AUTOPILOT_COMPETITIVE_THREATS,
  buildCompetitiveThreatAppendix,
  buildThreatResponseMatrix,
  getThreatRowsByOwnerSurface,
  validateThreatResponses,
  isCompetitorAnalysisPrompt
} from "../src/shared/competitiveThreats";

describe("competitive threat appendix", () => {
  it("detects competitor analysis prompts", () => {
    expect(isCompetitorAnalysisPrompt("do a comp analysis for Autopilot Browser")).toBe(true);
    expect(isCompetitorAnalysisPrompt("compare competitors in the AI browser market")).toBe(true);
    expect(isCompetitorAnalysisPrompt("summarize this current tab")).toBe(false);
  });

  it("renders a threat/action table for the end of competitor analysis", () => {
    const markdown = buildCompetitiveThreatAppendix();

    expect(markdown).toContain("## Threat Appendix");
    expect(markdown).toContain("| # | Threat | Likelihood | Horizon | Severity | Action this week |");
    expect(markdown).toContain("Distribution failure");
    expect(markdown).toContain("Gemini in Chrome normalizes page/context agents");
    expect(markdown).toContain("Privacy incident in connected data");
    expect(AUTOPILOT_COMPETITIVE_THREATS).toHaveLength(12);
  });

  it("keeps every threat tied to a product response, verification path, and owner surface", () => {
    expect(validateThreatResponses()).toEqual([]);
    expect(AUTOPILOT_COMPETITIVE_THREATS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          threat: "Distribution failure",
          productResponse: expect.stringContaining("Package without .env.local"),
          verification: expect.stringContaining("dist:win"),
          ownerSurface: "release"
        }),
        expect.objectContaining({
          threat: "Superhuman owns productivity perception",
          productResponse: expect.stringContaining("keyboard-first"),
          verification: expect.stringContaining("Inbox visible"),
          ownerSurface: "productivity"
        }),
        expect.objectContaining({
          threat: "Gemini in Chrome normalizes page/context agents",
          productResponse: expect.stringContaining("active-tab reading"),
          verification: expect.stringContaining("Browser assistant E2E"),
          ownerSurface: "browser"
        }),
        expect.objectContaining({
          threat: "Claude/ChatGPT connector ecosystems outpace us",
          productResponse: expect.stringContaining("connector tools"),
          verification: expect.stringContaining("Connector readiness"),
          ownerSurface: "settings"
        }),
        expect.objectContaining({
          threat: "Figma/Canva/Gamma make Design look weak",
          productResponse: expect.stringContaining("result-first artifact studio"),
          verification: expect.stringContaining("Design visual QA"),
          ownerSurface: "design"
        }),
        expect.objectContaining({
          threat: "Payment/security incident",
          productResponse: expect.stringContaining("invoice verification"),
          verification: expect.stringContaining("Payment safety tests"),
          ownerSurface: "backend"
        })
      ])
    );
  });

  it("renders the threat response matrix used by release-readiness reviews", () => {
    const markdown = buildThreatResponseMatrix();

    expect(markdown).toContain("## Threat Response Matrix");
    expect(markdown).toContain("| # | Threat | Product response | Verification | Owner surface |");
    expect(markdown).toContain("Package without .env.local");
    expect(markdown).toContain("Browser assistant E2E");
    expect(markdown).toContain("AiGateway tests");
  });

  it("groups threat rows by owner surface so workspace reviews can focus", () => {
    expect(getThreatRowsByOwnerSurface("design").map((row) => row.threat)).toEqual(["Figma/Canva/Gamma make Design look weak"]);
    expect(getThreatRowsByOwnerSurface("backend").map((row) => row.threat)).toEqual([
      "Payment/security incident",
      "Model cost shock"
    ]);
  });
});

import { describe, expect, it } from "vitest";

import {
  evaluateAutomationOutputQuality,
  evaluateBrowserActionQuality,
  evaluateCodingRunQuality,
  evaluateEmailDraftQuality,
  toWorkGraphQuality
} from "../src/shared/outputQuality";

describe("stage 8 output quality gates", () => {
  it("passes a grounded email draft but blocks placeholder or auto-send language", () => {
    const good = evaluateEmailDraftQuality({
      sourceText: "Jordan asked for the Acme launch packet by Friday and wants next steps confirmed.",
      draft:
        "Hi Jordan,\n\nThanks for sending the Acme launch packet request. I can prepare the launch packet by Friday, include the next steps, and flag the approval points before anything goes out. Please confirm whether the renewal-risk section should stay in the executive summary or move into the appendix.\n\nBest,\nVikram"
    });
    expect(good.passed).toBe(true);
    expect(good.exportReady).toBe(false);

    const bad = evaluateEmailDraftQuality({
      sourceText: "Jordan asked for Acme next steps.",
      draft: "AI unavailable fallback draft. I already sent this."
    });
    expect(bad.passed).toBe(false);
    expect(bad.failedReasonCodes).toEqual(expect.arrayContaining(["approval_safe", "not_placeholder"]));
  });

  it("requires coding runs to show plan, files or diff, tests, and approval state", () => {
    const report = evaluateCodingRunQuality({
      plan: "Inspect src/main/auth.ts, update the magic-link redirect handling, then run npm test.",
      changedFiles: ["src/main/auth.ts", "tests/auth.test.ts"],
      diffSummary: "Diff updates redirect URI validation and adds a regression test.",
      testSummary: "npm test passed.",
      approvalRequired: true
    });

    expect(report.passed).toBe(true);
    expect(toWorkGraphQuality(report)).toEqual(expect.objectContaining({ score: 100, passed: true }));

    const weak = evaluateCodingRunQuality({
      plan: "I will fix it.",
      approvalRequired: false
    });
    expect(weak.passed).toBe(false);
    expect(weak.failedReasonCodes).toEqual(expect.arrayContaining(["source_grounded", "reviewable_output", "verification_visible", "approval_safe"]));
  });

  it("requires browser actions to be page-grounded and stop before external impact", () => {
    const report = evaluateBrowserActionQuality({
      summary: "Read the active page, inspected DOM fields, filled the email field, and stopped before the submit button.",
      observations: ["Visible form field selector: input[type=email]", "Next action: approve submit if the user wants it."],
      stoppedBeforeExternalAction: true
    });
    expect(report.passed).toBe(true);

    const unsafe = evaluateBrowserActionQuality({
      summary: "Clicked submit.",
      observations: ["Done."]
    });
    expect(unsafe.passed).toBe(false);
    expect(unsafe.failedReasonCodes).toContain("approval_safe");
  });

  it("keeps automations from passing without source-backed output", () => {
    const report = evaluateAutomationOutputQuality({
      output:
        "Market scan summary from the Competitor newsletter and Jordan Lee Gmail source: the strongest next action is to review the source-backed competitor notes, decide whether the design artifact needs revision, confirm the owner for the next report, note the customer-facing recommendation, and approve the weekly report quality check before sharing.",
      sources: ["Competitor newsletter", "Gmail source: Jordan Lee"],
      qualityBar: 82,
      approvalRequired: true
    });
    expect(report.passed).toBe(true);

    const noSources = evaluateAutomationOutputQuality({
      output: "Quality checked report with next actions, but no source trail.",
      sources: [],
      qualityBar: 82
    });
    expect(noSources.passed).toBe(false);
    expect(noSources.failedReasonCodes).toContain("source_grounded");
  });
});

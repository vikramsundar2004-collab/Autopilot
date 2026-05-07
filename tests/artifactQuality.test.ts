import { describe, expect, it } from "vitest";

import { evaluateArtifactQuality, evaluateDocumentQuality, summarizeQualityFailure } from "../src/shared/artifactQuality";

describe("artifact quality checks", () => {
  it("rejects placeholder documents that simply restate the source", () => {
    const result = evaluateDocumentQuality(
      `# Security alert

## What Autopilot understood
Autopilot prepared this document from the source email. Review the details, ask for changes, then export or approve the final send/share step.`,
      "Security alert. You allowed an app access to your Google Account data.",
      { minWords: 20 }
    );

    expect(result.passed).toBe(false);
    expect(result.failedChecks.map((check) => check.id)).toContain("not_source_restatement");
    expect(summarizeQualityFailure(result)).toContain("Not just a source restatement");
  });

  it("accepts structured deliverables with actions and sources", () => {
    const markdown = `# AI Browser Market Brief

## Executive Brief
Autopilot should focus on trusted work execution rather than another tab organizer. The highest-value angle is reading user work sources, identifying what needs doing, and producing reviewable drafts, artifacts, and coding plans.

## Recommendations
- Position the product around approved work completion, not passive summaries.
- Ship visible source disclosure so users know which emails, calendar events, and pages informed each output.
- Keep the final approval step for sending, publishing, sharing, and deleting.
- Make recurring briefs reusable automation recipes with run history.

## Action Plan
- Build the Productivity queue as the intake layer.
- Route document and design requests into Design artifacts.
- Route implementation requests into Coding with command approval.
- Save every automation run with sources, quality checks, and failure reasons.

## Sources
- Browser automation product landscape: https://example.com/browser-ai
- AI coding assistant workflow notes: https://example.com/coding-ai
`;

    const result = evaluateDocumentQuality(markdown, "Summarize AI browsers", { minWords: 70, requireSources: true });

    expect(result.passed).toBe(true);
    expect(result.score).toBe(100);
  });

  it("quality-checks slide decks before export", () => {
    const result = evaluateArtifactQuality(
      {
        kind: "slide_deck",
        slides: [
          {
            id: "one",
            title: "Market reality",
            bullets: [
              "AI browsers are converging on assisted research, summaries, and tab actions.",
              "The market still lacks a trusted workflow that turns sources into reviewable finished work."
            ]
          },
          {
            id: "two",
            title: "Autopilot wedge",
            bullets: [
              "Own the work routing layer with Gmail, Calendar, Design, Coding, and Automation.",
              "Recommendation: make every generated output show source, plan, quality score, and approval state."
            ]
          },
          {
            id: "three",
            title: "Next step",
            bullets: [
              "Prepare a reviewable demo that turns email requests into artifacts with approval gates.",
              "Next step: use this deck to align the team on the safest first launch sequence."
            ],
            speakerNotes: "The deck should persuade reviewers that Autopilot completes work safely."
          }
        ]
      },
      "Make a competitor deck about AI browsers and action routing."
    );

    expect(result.passed).toBe(true);
    expect(result.exportReady).toBe(true);
  });

  it("flags weak website designs that only restate the source", () => {
    const result = evaluateArtifactQuality(
      {
        kind: "website_design",
        html: "<main><h1>What Autopilot understood</h1><p>Autopilot prepared this design from the source email.</p></main>",
        css: "main { color: #123c2b; }",
        sections: [{ id: "hero", name: "Hero", summary: "Generated from source" }]
      },
      "Please design a polished landing page for a study planner."
    );

    expect(result.passed).toBe(false);
    expect(result.failedChecks.map((check) => check.id)).toContain("not_source_restatement");
    expect(result.exportReady).toBe(true);
  });
});

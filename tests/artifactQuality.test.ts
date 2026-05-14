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
    expect(result.score).toBeLessThan(100);
    expect(result.summary).toContain("not a guarantee");
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

  it("applies a stricter email-to-artifact bar with named context", () => {
    const result = evaluateArtifactQuality(
      {
        kind: "document",
        markdown: `# Acme Q4 Leadership Brief

## Executive Summary
Maya Chen needs a leadership-ready Acme update by Dec 13. The brief should help Jordan Lee and Priya Shah decide whether the pilot expands into the enterprise tier and which renewal risks need immediate follow-up before the customer story is shared outside the team.

## Key Questions
- Decision needed: approve the enterprise-tier expansion recommendation or keep the pilot in its current scope.
- Owner needed: assign renewal-risk follow-up to Jordan Lee or another account owner before Friday.
- Date to confirm: final client-send timing after the Dec 13 leadership review.

## Recommended Next Moves
- Prepare a slide-ready customer proof section with wins, renewal blockers, and one recommendation.
- Separate what can be sent to Acme from internal-only risk notes.
- Keep final sharing behind user approval until the decision owner confirms the message.

## Approval Checklist
- Maya Chen confirms the narrative.
- Priya Shah checks the renewal-risk language.
- Jordan Lee approves the next customer-facing step.

## Client-Ready Output Shape
The artifact should become a leadership deck, not a transcript of the source message. The first slide should name the Acme decision, the middle slides should separate wins from risks, and the closing slide should make the approval path easy for Maya Chen to use in the Friday meeting. Keep any internal uncertainty visible as open questions instead of hiding it in generic copy.`,
      },
      "From: Maya Chen <maya@acme.example>\nSubject: Q4 customer update\nBody: Please make a Q4 deck by Dec 13 for Jordan and Priya. We need a decision on enterprise expansion and renewal-risk owner.",
      { emailToArtifact: true }
    );

    expect(result.passed).toBe(true);
    expect(result.sourceCopyRatio).toBeLessThanOrEqual(0.3);
    expect(result.strictMode).toBe(true);
    expect(result.attempts).toBe(1);
    expect(result.approveAnywayRequired).toBe(false);
  });

  it("rejects email-to-artifact drafts that omit people, dates, or decisions", () => {
    const result = evaluateArtifactQuality(
      {
        kind: "document",
        markdown: `# Customer Update

## Summary
The email asks for a customer update. The requested work should be prepared in a useful way.

## Notes
- Include the main request.
- Add next steps.
- Make it ready to review.`,
      },
      "From: Maya Chen <maya@acme.example>\nSubject: Q4 customer update\nBody: Please make a Q4 deck by Dec 13 for Jordan and Priya. We need a decision on enterprise expansion and renewal-risk owner.",
      { emailToArtifact: true, minWords: 20 }
    );

    expect(result.passed).toBe(false);
    expect(result.failedChecks.map((check) => check.id)).toContain("named_email_context");
    expect(result.failedReasonCodes).toContain("named_email_context");
    expect(result.strictMode).toBe(true);
    expect(result.approveAnywayRequired).toBe(true);
  });

  it("does not let offline fallback text pass as finished AI work", () => {
    const result = evaluateArtifactQuality(
      {
        kind: "slide_deck",
        slides: [
          { id: "1", title: "AI unavailable: Q4 update", bullets: ["Offline placeholder. Regenerate with the AI backend before presenting.", "Date to confirm."] },
          { id: "2", title: "Decision needed", bullets: ["Owner: Maya Chen.", "Do not send this fallback."] },
          { id: "3", title: "Next step", bullets: ["Reconnect AI and regenerate."] }
        ]
      },
      "Please create a deck for Maya Chen by Dec 13."
    );

    expect(result.passed).toBe(false);
    expect(result.failedChecks.map((check) => check.id)).toContain("not_source_restatement");
  });
});

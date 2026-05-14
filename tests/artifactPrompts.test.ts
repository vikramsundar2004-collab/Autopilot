import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  ACTION_LIST_SPEC_V1,
  DOCUMENT_SPEC_V1,
  SLIDE_DECK_SPEC_V1,
  WEBSITE_DESIGN_SPEC_V1,
  buildArtifactCritiquePrompt,
  buildArtifactDraftPrompt,
  buildArtifactPlanningPrompt,
  buildArtifactRevisionPrompt
} from "../src/shared/artifactPrompts";

describe("artifact prompt pipeline", () => {
  it("uses specialized specs instead of one generic artifact prompt", () => {
    expect(SLIDE_DECK_SPEC_V1).toContain("Each slide is one claim");
    expect(DOCUMENT_SPEC_V1).toContain("executive summary");
    expect(WEBSITE_DESIGN_SPEC_V1).toContain("one primary CTA");
    expect(ACTION_LIST_SPEC_V1).toContain("SMART action items");
  });

  it("builds a plan, draft, critique, revise sequence for email-to-artifact work", () => {
    const source = "From: Maya Chen. Please make a Q4 update deck by Dec 13 for Jordan and Priya.";
    const planPrompt = buildArtifactPlanningPrompt(source, "slide_deck");
    const draftPrompt = buildArtifactDraftPrompt(source, "slide_deck", '{"inferredAsk":"Q4 update deck"}');
    const critiquePrompt = buildArtifactCritiquePrompt("slide_deck", "{}", '{"slides":[]}');
    const revisionPrompt = buildArtifactRevisionPrompt(source, "slide_deck", "{}", '{"slides":[]}', '{"flaws":["too generic"]}', "copy ratio too high");

    expect(planPrompt).toContain("Before writing anything");
    expect(planPrompt).toContain("inferredAsk");
    expect(planPrompt).toContain("replyDraftPlan");
    expect(draftPrompt).toContain("Do not summarize the source");
    expect(draftPrompt).toContain("replyDraftMarkdown");
    expect(critiquePrompt).toContain("No compliments");
    expect(critiquePrompt).toContain("separate AI quality-review pass");
    expect(revisionPrompt).toContain("Keep source-copy ratio below 30%");
    expect(revisionPrompt).toContain("Include replyDraftMarkdown");
    expect(revisionPrompt).toContain("copy ratio too high");
  });

  it("teaches each spec visual discipline, not only content correctness", () => {
    expect(SLIDE_DECK_SPEC_V1).toContain("Layout discipline");
    expect(SLIDE_DECK_SPEC_V1).toContain("Accent rotation");
    expect(SLIDE_DECK_SPEC_V1).toContain("Bullets max");
    expect(DOCUMENT_SPEC_V1).toContain("Pull quotes");
    expect(DOCUMENT_SPEC_V1).toContain("Visual hierarchy");
    expect(DOCUMENT_SPEC_V1).toContain("Rhythm");
    expect(WEBSITE_DESIGN_SPEC_V1).toContain("Color discipline");
    expect(WEBSITE_DESIGN_SPEC_V1).toContain("Typography pair");
    expect(WEBSITE_DESIGN_SPEC_V1).toContain("Spacing scale");
    expect(ACTION_LIST_SPEC_V1).toContain("Visual grouping");
    expect(ACTION_LIST_SPEC_V1).toContain("priority badge");
  });

  it("plans visual decisions up front in the planning prompt", () => {
    const planPrompt = buildArtifactPlanningPrompt("source", "slide_deck");
    expect(planPrompt).toContain("visualPlan");
    expect(planPrompt).toContain("deckAccent");
    expect(planPrompt).toContain("perSlideLayout");
    expect(planPrompt).toContain("websitePalette");
    expect(planPrompt).toContain("documentRhythm");
  });

  it("draft step is told to honor the visualPlan, not treat it as optional polish", () => {
    const draftPrompt = buildArtifactDraftPrompt("source", "slide_deck", '{"visualPlan":{"deckAccent":"forest"}}');
    expect(draftPrompt).toContain("visualPlan");
    expect(draftPrompt).toContain("honor it");
    expect(draftPrompt).toContain('"layout":"cover|bullets|two_column|quote|closing"');
  });

  it("critique step flags visual flaws alongside content flaws", () => {
    const critiquePrompt = buildArtifactCritiquePrompt("slide_deck", "{}", "{}");
    expect(critiquePrompt).toContain("visual quality");
    expect(critiquePrompt).toContain("varied layouts");
    expect(critiquePrompt).toContain("accent color");
    expect(critiquePrompt).toContain("pull quotes");
  });

  it("revision step is required to honor the visualPlan when fixing flaws", () => {
    const revisionPrompt = buildArtifactRevisionPrompt("source", "document", "{}", "{}", '{"flaws":["wall of text"]}');
    expect(revisionPrompt).toContain("Honor the visualPlan");
    expect(revisionPrompt).toContain("documentRhythm");
  });

  it("keeps the Design deck renderer ready for five visual layouts", () => {
    const slideTemplate = readFileSync(path.join(process.cwd(), "src", "renderer", "components", "SlideTemplate.tsx"), "utf8");
    const app = readFileSync(path.join(process.cwd(), "src", "renderer", "App.tsx"), "utf8");
    const styles = readFileSync(path.join(process.cwd(), "src", "renderer", "styles.css"), "utf8");

    for (const layout of ["cover", "bullets", "two_column", "quote", "closing"]) {
      expect(slideTemplate).toContain(layout);
    }

    expect(app).toContain('return "cover"');
    expect(app).toContain('return "closing"');
    expect(app).toContain('return "quote"');
    expect(app).toContain('return "two-column"');
    expect(styles).toContain(".slide-preview-card.cover");
    expect(styles).toContain(".slide-preview-card.two-column");
    expect(styles).toContain(".slide-preview-card.quote");
    expect(styles).toContain(".slide-preview-card.closing");
  });
});

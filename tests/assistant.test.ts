import { describe, expect, it } from "vitest";

import { sanitizeAssistantRequest, sanitizeDesignPromptSuggestionRequest, summarizeAssistantSources } from "../src/shared/assistant";

describe("assistant models", () => {
  it("sanitizes prompts and source ids", () => {
    expect(
      sanitizeAssistantRequest({
        prompt: "  Summarize this tab   ",
        sources: ["current-tab", "gmail", "bad-source"],
        activeTabId: "abc"
      })
    ).toEqual({
      prompt: "Summarize this tab",
      sources: ["current-tab", "gmail"],
      activeTabId: "abc"
    });
  });

  it("summarizes disclosed sources", () => {
    expect(
      summarizeAssistantSources([
        {
          sourceId: "current-tab",
          title: "Autopilot Home",
          text: "Search"
        },
        {
          sourceId: "downloads",
          title: "Recent downloads",
          text: "installer.exe"
        }
      ])
    ).toBe("Autopilot Home (current-tab), Recent downloads (downloads)");
  });

  it("sanitizes design prompt suggestion context", () => {
    expect(
      sanitizeDesignPromptSuggestionRequest({
        artifactId: "artifact-1",
        title: "  Landing page  ",
        kind: "website_design",
        summary: "  Make it polished  ",
        contentPreview: "  <main>Hero</main>  "
      })
    ).toEqual({
      artifactId: "artifact-1",
      title: "Landing page",
      kind: "website_design",
      summary: "Make it polished",
      contentPreview: "<main>Hero</main>"
    });
  });
});

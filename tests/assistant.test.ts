import { describe, expect, it } from "vitest";

import {
  sanitizeAssistantRequest,
  sanitizeCodingPromptTranslationRequest,
  sanitizeDesignPromptSuggestionRequest,
  sanitizeDesignPromptTranslationRequest,
  summarizeAssistantSources
} from "../src/shared/assistant";

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

  it("preserves line breaks for coding prompts and longer file context", () => {
    const prompt = `  Change this file:\n\nfunction App() {\n  return <main>Snake</main>;\n}\n`;
    const sanitized = sanitizeAssistantRequest({
      prompt,
      sources: ["coding-project"]
    });

    expect(sanitized.prompt).toContain("function App() {\n  return <main>Snake</main>;\n}");
    expect(sanitized.prompt.length).toBeGreaterThan(40);
  });

  it("preserves valid task routing for coding and design helper calls", () => {
    expect(
      sanitizeAssistantRequest({
        prompt: "Generate the code patch",
        sources: ["coding-project"],
        task: "coding_agent",
        timeoutMs: 110_000
      }).task
    ).toBe("coding_agent");
    expect(
      sanitizeAssistantRequest({
        prompt: "Generate the code patch",
        sources: ["coding-project"],
        task: "coding_agent",
        timeoutMs: 110_000,
        responseFormat: "json_object"
      }).timeoutMs
    ).toBe(110_000);
    expect(
      sanitizeAssistantRequest({
        prompt: "Generate the code patch",
        sources: ["coding-project"],
        task: "coding_agent",
        timeoutMs: 110_000,
        responseFormat: "json_object"
      }).responseFormat
    ).toBe("json_object");

    expect(
      sanitizeAssistantRequest({
        prompt: "Generate the code patch",
        sources: ["coding-project"],
        task: "bad-task"
      })
    ).not.toHaveProperty("task");
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

  it("sanitizes design prompt translation requests", () => {
    expect(
      sanitizeDesignPromptTranslationRequest({
        prompt: "  make a clean website  ",
        sourceKind: "prompt",
        currentArtifactKind: "website_design",
        sourcePreview: "  client email  "
      })
    ).toEqual({
      prompt: "make a clean website",
      sourceKind: "prompt",
      currentArtifactKind: "website_design",
      sourcePreview: "client email"
    });
  });

  it("sanitizes coding prompt translation requests", () => {
    expect(
      sanitizeCodingPromptTranslationRequest({
        prompt: "  build snake game  ",
        projectName: "  Arcade  ",
        activeFilePath: "  src/App.tsx  ",
        openFiles: ["  src/App.tsx  ", "  package.json  ", "", 42],
        sourcePreview: "  recent file summary  "
      })
    ).toEqual({
      prompt: "build snake game",
      projectName: "Arcade",
      activeFilePath: "src/App.tsx",
      openFiles: ["src/App.tsx", "package.json"],
      sourcePreview: "recent file summary"
    });
  });
});

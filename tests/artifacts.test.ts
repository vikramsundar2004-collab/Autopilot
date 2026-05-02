import { describe, expect, it } from "vitest";

import { chooseArtifactKindFromText, getActionToolForArtifactKind } from "../src/shared/agent";
import {
  defaultArtifactContent,
  getActiveArtifactVersion,
  sanitizeArtifacts,
  type Artifact
} from "../src/shared/artifacts";

describe("artifact models", () => {
  it("routes email text to the expected artifact kind", () => {
    expect(chooseArtifactKindFromText("Please make a slide deck for the meeting")).toBe("slide_deck");
    expect(chooseArtifactKindFromText("Can you design a landing page mockup?")).toBe("website_design");
    expect(chooseArtifactKindFromText("Write a report from these notes")).toBe("document");
  });

  it("maps artifact kinds to agent tools", () => {
    expect(getActionToolForArtifactKind("document")).toBe("document");
    expect(getActionToolForArtifactKind("slide_deck")).toBe("slide_deck");
    expect(getActionToolForArtifactKind("website_design")).toBe("website_design");
  });

  it("keeps active versions and preserves website markup", () => {
    const artifact: Artifact = {
      id: "artifact",
      kind: "website_design",
      title: "Landing page",
      summary: "Website",
      source: { provider: "manual", label: "Manual" },
      visibility: "user_project",
      pinned: false,
      activeVersionId: "version-2",
      versions: [
        {
          id: "version-1",
          createdAt: 1,
          prompt: "first",
          summary: "first",
          content: defaultArtifactContent("website_design")
        },
        {
          id: "version-2",
          createdAt: 2,
          prompt: "second",
          summary: "second",
          content: {
            kind: "website_design",
            html: "<main>\n  <h1>Hello</h1>\n</main>",
            css: "main {\n  color: red;\n}",
            sections: [{ id: "hero", name: "Hero", summary: "Opening" }]
          }
        }
      ],
      createdAt: 1,
      updatedAt: 2
    };

    const [sanitized] = sanitizeArtifacts([artifact]);
    const version = getActiveArtifactVersion(sanitized);
    expect(version.id).toBe("version-2");
    expect(version.content.kind).toBe("website_design");
    if (version.content.kind === "website_design") {
      expect(version.content.html).toContain("\n  <h1>Hello</h1>");
      expect(version.content.css).toContain("\n  color: red;");
    }
  });

  it("defaults Gmail artifacts into AI generated projects", () => {
    const [gmailArtifact, manualArtifact] = sanitizeArtifacts([
      {
        kind: "document",
        title: "Email work",
        source: { provider: "gmail", label: "Gmail request" },
        activeVersionId: "version-1",
        versions: [
          {
            id: "version-1",
            createdAt: 1,
            prompt: "email",
            summary: "email",
            content: defaultArtifactContent("document")
          }
        ]
      },
      {
        kind: "website_design",
        title: "Manual work",
        source: { provider: "manual", label: "Prompt" },
        activeVersionId: "version-2",
        versions: [
          {
            id: "version-2",
            createdAt: 1,
            prompt: "manual",
            summary: "manual",
            content: defaultArtifactContent("website_design")
          }
        ]
      }
    ]);

    expect(gmailArtifact.visibility).toBe("ai_generated");
    expect(manualArtifact.visibility).toBe("user_project");
  });
});

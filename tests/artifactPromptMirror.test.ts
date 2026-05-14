import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

function extractTemplateConstant(source: string, name: string): string {
  const match = source.match(new RegExp("export const " + name + " = `([\\s\\S]*?)`;", "u"));
  if (!match) {
    throw new Error(`Could not find ${name}.`);
  }
  return match[1].replace(/\s+/gu, " ").trim();
}

describe("artifact prompt mirrors", () => {
  it("keeps Supabase/edge prompt specs in sync with the renderer/shared prompt specs", () => {
    const shared = readFileSync(path.join(process.cwd(), "src", "shared", "artifactPrompts.ts"), "utf8");
    const supabase = readFileSync(path.join(process.cwd(), "supabase", "functions", "_shared", "artifactPrompts.ts"), "utf8");
    const netlify = readFileSync(path.join(process.cwd(), "netlify", "edge-functions", "_shared", "artifactPrompts.ts"), "utf8");

    for (const name of ["SLIDE_DECK_SPEC_V1", "DOCUMENT_SPEC_V1", "WEBSITE_DESIGN_SPEC_V1", "ACTION_LIST_SPEC_V1"]) {
      const sharedSpec = extractTemplateConstant(shared, name);
      expect(extractTemplateConstant(supabase, name)).toBe(sharedSpec);
      expect(extractTemplateConstant(netlify, name)).toBe(sharedSpec);
    }
  });
});

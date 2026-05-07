import { describe, expect, it } from "vitest";

import { buildCodingDiff, parseUnifiedGitDiff } from "../src/renderer/codingDiff";

describe("buildCodingDiff", () => {
  it("returns no hunks when content is unchanged", () => {
    const diff = buildCodingDiff("const name = 'Autopilot';\n", "const name = 'Autopilot';\n");

    expect(diff.changed).toBe(false);
    expect(diff.added).toBe(0);
    expect(diff.removed).toBe(0);
    expect(diff.hunks).toHaveLength(0);
  });

  it("marks a changed line as deleted and added", () => {
    const diff = buildCodingDiff("alpha\nbeta\ngamma", "alpha\nbetter\ngamma");

    expect(diff.changed).toBe(true);
    expect(diff.added).toBe(1);
    expect(diff.removed).toBe(1);
    expect(diff.hunks).toHaveLength(1);
    expect(diff.hunks[0].lines.map((line) => line.kind)).toEqual(["context", "removed", "added", "context"]);
    expect(diff.hunks[0].lines.find((line) => line.kind === "added")).toMatchObject({ text: "better", newLine: 2 });
    expect(diff.hunks[0].lines.find((line) => line.kind === "removed")).toMatchObject({ text: "beta", oldLine: 2 });
  });

  it("tracks insertions and deletions with useful line numbers", () => {
    const diff = buildCodingDiff("one\ntwo\nthree\nfour", "zero\none\nthree\nfour\nfive", { contextLines: 1 });

    expect(diff.added).toBe(2);
    expect(diff.removed).toBe(1);
    expect(diff.hunks.length).toBeGreaterThanOrEqual(1);
    expect(diff.hunks.flatMap((hunk) => hunk.lines).filter((line) => line.kind === "added")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ text: "zero", newLine: 1 }),
        expect.objectContaining({ text: "five", newLine: 5 })
      ])
    );
    expect(diff.hunks.flatMap((hunk) => hunk.lines).filter((line) => line.kind === "removed")).toEqual([
      expect.objectContaining({ text: "two", oldLine: 2 })
    ]);
  });
});

describe("parseUnifiedGitDiff", () => {
  it("turns a git patch into red and green review lines", () => {
    const diff = parseUnifiedGitDiff(`diff --git a/src/app.ts b/src/app.ts
index 123..456 100644
--- a/src/app.ts
+++ b/src/app.ts
@@ -1,3 +1,4 @@
 import app from "./app";
-const label = "old";
+const label = "new";
+const ready = true;
 export default app;
`);

    expect(diff.changed).toBe(true);
    expect(diff.added).toBe(2);
    expect(diff.removed).toBe(1);
    expect(diff.hunks).toHaveLength(1);
    expect(diff.hunks[0].lines.map((line) => line.kind)).toEqual(["context", "removed", "added", "added", "context"]);
  });
});

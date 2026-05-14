import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("electron", () => ({
  app: {
    getPath: () => ""
  }
}));

import { DiagnosticStore } from "../src/main/diagnostics";
import { createDiagnosticLogEntry, redactDiagnosticText } from "../src/shared/diagnostics";

const tempRoots: string[] = [];

async function makeTempRoot(label: string): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), `autopilot-${label}-`));
  tempRoots.push(root);
  return root;
}

afterEach(async () => {
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (root) {
      await rm(root, { recursive: true, force: true });
    }
  }
});

describe("diagnostics", () => {
  it("redacts common secret shapes", () => {
    expect(redactDiagnosticText("authorization=Bearer sk-testsecret1234567890")).not.toContain("sk-testsecret");
    expect(redactDiagnosticText("password=hunter2")).toContain("password= [redacted]");
  });

  it("normalizes diagnostic entries", () => {
    expect(
      createDiagnosticLogEntry({
        message: "OpenAI failed",
        details: "api_key=secret-value",
        workspace: "productivity",
        source: "ai"
      })
    ).toMatchObject({
      severity: "error",
      workspace: "productivity",
      source: "ai",
      message: "OpenAI failed",
      details: "api_key= [redacted]"
    });
  });

  it("persists newest-first diagnostics and prunes old entries", async () => {
    let now = 1_000;
    const root = await makeTempRoot("diagnostics");
    const store = new DiagnosticStore(root, () => now, 50);

    await store.append({ message: "Old issue", workspace: "browser" });
    now = 2_000;
    await store.append({ message: "Fresh issue", workspace: "coding", severity: "warning" });

    expect((await store.list()).map((entry) => entry.message)).toEqual(["Fresh issue"]);
  });

  it("ignores corrupt log lines", async () => {
    const root = await makeTempRoot("diagnostics-corrupt");
    await writeFile(
      path.join(root, "diagnostics.jsonl"),
      [
        "{nope}",
        JSON.stringify({
          id: "entry",
          severity: "error",
          workspace: "system",
          source: "test",
          message: "Kept",
          createdAt: 10
        })
      ].join("\n"),
      "utf8"
    );

    const store = new DiagnosticStore(root, () => 20);
    expect(await store.list()).toEqual([expect.objectContaining({ id: "entry", message: "Kept" })]);
  });
});

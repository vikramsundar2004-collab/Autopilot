import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("electron", () => ({
  app: {
    getPath: () => ""
  }
}));

import { ObservabilityStore } from "../src/main/observability";

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

describe("ObservabilityStore", () => {
  it("persists run log events as a newest-first JSONL trail", async () => {
    let now = 1_000;
    const root = await makeTempRoot("run-log");
    const store = new ObservabilityStore(root, () => now);

    await store.append({
      kind: "assignment_routed",
      message: "Routed work to Design.",
      workspace: "design",
      entityId: "work-1",
      metadata: {
        routeConfidence: 88,
        ignored: { nested: true }
      }
    });
    now = 2_000;
    await store.append({
      kind: "assignment_updated",
      message: "Assignment needs review.",
      workspace: "productivity",
      severity: "warning",
      entityId: "assignment-1"
    });

    const events = await store.list();
    expect(events.map((event) => event.kind)).toEqual(["assignment_updated", "assignment_routed"]);
    expect(events[1]).toMatchObject({
      message: "Routed work to Design.",
      workspace: "design",
      metadata: {
        routeConfidence: 88
      }
    });
    expect(events[1].metadata).not.toHaveProperty("ignored");
  });

  it("ignores corrupt lines and prunes events outside the retention window", async () => {
    const root = await makeTempRoot("run-log-prune");
    const filePath = path.join(root, "runs.jsonl");
    await writeFile(
      filePath,
      [
        JSON.stringify({
          id: "old",
          kind: "assignment_updated",
          createdAt: 10,
          message: "Old event",
          severity: "info",
          metadata: {}
        }),
        "{not json}",
        JSON.stringify({
          id: "fresh",
          kind: "assignment_updated",
          createdAt: 100,
          message: "Fresh event",
          severity: "info",
          metadata: {}
        })
      ].join("\n"),
      "utf8"
    );

    const store = new ObservabilityStore(root, () => 120, 50);
    await store.prune();

    expect(await store.list()).toEqual([
      expect.objectContaining({
        id: "fresh",
        message: "Fresh event"
      })
    ]);
  });
});

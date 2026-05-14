import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const appSource = readFileSync(new URL("../src/renderer/App.tsx", import.meta.url), "utf8");
const cssSource = readFileSync(new URL("../src/renderer/styles.css", import.meta.url), "utf8");

describe("productivity action queue UI", () => {
  it("shows routed work state in the queue instead of only the raw task state", () => {
    expect(appSource).toContain("workItemByTaskId");
    expect(appSource).toContain("getWorkItemStatusLabel(queueWorkItem)");
    expect(appSource).toContain("Being worked on");
    expect(cssSource).toContain(".work-state-summary");
  });

  it("opens copy-ready reply drafts as a Productivity drill-in instead of a separate workspace", () => {
    expect(appSource).toContain("productivityDraftReaderOpen");
    expect(appSource).toContain("showProductivityDraftReader");
    expect(appSource).toContain("Copy-ready replies without artifact spend");
    expect(appSource).toContain("Back to inbox");
    expect(appSource).toContain("copyProductivityDraftBody");
    expect(cssSource).toContain(".productivity-draft-reader-page");
    expect(cssSource).toContain(".productivity-draft-reader-row");
  });

  it("keeps large action queues scrollable and compact", () => {
    expect(appSource).toContain("visibleLaneItems = lane.items.slice(0, 12)");
    expect(appSource).toContain("work-lane-more");
    expect(cssSource).toContain("max-height: min(680px, calc(100vh - 220px))");
  });
});

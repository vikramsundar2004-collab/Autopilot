import { describe, expect, it } from "vitest";

import { extractActionItemTitles } from "../src/renderer/productivity";

describe("extractActionItemTitles", () => {
  it("extracts actionable lines from email-like text", () => {
    expect(
      extractActionItemTitles(`Hi there,

Please send the draft by Friday.
Can you follow up with the design team?
Thanks!`)
    ).toEqual(["Please send the draft by Friday.", "Can you follow up with the design team?"]);
  });

  it("falls back to useful lines when no action words are present", () => {
    expect(extractActionItemTitles("Review quarterly plan\nShare notes")).toEqual(["Review quarterly plan", "Share notes"]);
  });
});

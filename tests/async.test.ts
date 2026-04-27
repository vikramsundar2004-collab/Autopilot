import { describe, expect, it } from "vitest";

import { mapWithConcurrency } from "../src/shared/async";

describe("mapWithConcurrency", () => {
  it("preserves result order while limiting active work", async () => {
    let active = 0;
    let maxActive = 0;

    const result = await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (value) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      return value * 2;
    });

    expect(result).toEqual([2, 4, 6, 8, 10]);
    expect(maxActive).toBeLessThanOrEqual(2);
  });

  it("treats invalid concurrency as one worker", async () => {
    let active = 0;
    let maxActive = 0;

    await mapWithConcurrency([1, 2, 3], 0, async (value) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 1));
      active -= 1;
      return value;
    });

    expect(maxActive).toBe(1);
  });
});

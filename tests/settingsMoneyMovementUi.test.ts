import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const appSource = readFileSync("src/renderer/App.tsx", "utf8");
const stylesSource = readFileSync("src/renderer/styles.css", "utf8");
const highImpactSource = readFileSync("src/shared/highImpactActions.ts", "utf8");

describe("Settings money-management UI", () => {
  it("explains verification, provider setup, and safety as guided cards instead of a crowded action strip", () => {
    expect(appSource).toContain("money-management-action-board");
    expect(appSource).toContain("sends a 6-digit key");
    expect(appSource).toContain("Payment verification key");
    expect(appSource).toContain("Confirm 6-digit key");
    expect(appSource).toContain("pattern=\"[0-9]{6}\"");
    expect(appSource).toContain("money-management-code-key");
    expect(appSource).toContain("Autopilot never pays from the app owner");
    expect(appSource).toContain("Disabling money movement blocks new payment execution immediately");
    expect(appSource).toContain("payment-method-strip");
    expect(appSource).toContain("Supported payment methods");
    expect(highImpactSource).toContain("Cash App Pay");
    expect(highImpactSource).toContain("Klarna");
    expect(appSource).toContain("Provider-hosted");
    expect(appSource).not.toContain("backend-status-actions money-management-actions");
    expect(stylesSource).toContain(".money-management-action-board");
    expect(stylesSource).toContain(".money-management-action-card.primary");
    expect(stylesSource).toContain(".money-management-code-key");
    expect(stylesSource).toContain(".money-management-status-note");
    expect(stylesSource).toContain(".payment-method-card");
  });
});

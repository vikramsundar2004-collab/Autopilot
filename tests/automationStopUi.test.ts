import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const appSource = readFileSync("src/renderer/App.tsx", "utf8");
const stylesSource = readFileSync("src/renderer/styles.css", "utf8");

describe("automation stop controls", () => {
  it("lets users stop recurring automations from running again without deleting receipts or history", () => {
    expect(appSource).toContain("setAutomationRecipeEnabled");
    expect(appSource).toContain("Stop future runs");
    expect(appSource).toContain("Existing receipts and run history were kept");
    expect(appSource).toContain("autopilot.automation.updateRecipe({ id: recipe.id, enabled })");
    expect(appSource).toContain("automation-recipe-control-list");
    expect(stylesSource).toContain(".automation-recipe-control-row");
  });
});

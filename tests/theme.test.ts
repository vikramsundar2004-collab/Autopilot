import { describe, expect, it } from "vitest";

import { DEFAULT_THEME } from "../src/shared/browserModel";
import { contrastRatio, isHexColor, sanitizeTheme } from "../src/renderer/theme";

describe("theme utilities", () => {
  it("accepts six-digit hex colors", () => {
    expect(isHexColor("#1f4a37")).toBe(true);
    expect(isHexColor("1f4a37")).toBe(false);
    expect(isHexColor("#123")).toBe(false);
  });

  it("falls back to defaults for invalid colors", () => {
    const theme = sanitizeTheme({ primary: "green", bg: "#000000" });

    expect(theme.primary).toBe(DEFAULT_THEME.primary);
    expect(theme.bg).toBe("#000000");
  });

  it("computes high contrast for the default primary button", () => {
    expect(contrastRatio(DEFAULT_THEME.surface, DEFAULT_THEME.primary)).toBeGreaterThan(4.5);
  });
});

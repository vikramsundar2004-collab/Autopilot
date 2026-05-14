import { describe, expect, it } from "vitest";

import { DEFAULT_THEME } from "../src/shared/browserModel";
import { BLUE_THEME, DARK_THEME, THEME_PRESETS, applyTheme, contrastRatio, isHexColor, sanitizeTheme } from "../src/renderer/theme";

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

  it("ships a valid accessible blue preset", () => {
    expect(THEME_PRESETS.some((preset) => preset.id === "blue")).toBe(true);
    expect(BLUE_THEME.bg).toBe("#ffffff");
    expect(BLUE_THEME.surface).toBe("#ffffff");
    expect(Object.values(BLUE_THEME).every(isHexColor)).toBe(true);
    expect(contrastRatio(BLUE_THEME.surface, BLUE_THEME.primary)).toBeGreaterThan(4.5);
    expect(contrastRatio(BLUE_THEME.sidebarText, BLUE_THEME.sidebarBg)).toBeGreaterThan(4.5);
  });

  it("ships a valid dark preset and marks the root with data-theme", () => {
    expect(THEME_PRESETS.some((preset) => preset.id === "dark")).toBe(true);
    expect(Object.values(DARK_THEME).every(isHexColor)).toBe(true);
    expect(contrastRatio(DARK_THEME.text, DARK_THEME.surface)).toBeGreaterThan(4.5);
    expect(contrastRatio(DARK_THEME.sidebarText, DARK_THEME.sidebarBg)).toBeGreaterThan(4.5);

    const style = new Map<string, string>();
    const root = {
      dataset: {} as Record<string, string>,
      style: {
        setProperty: (key: string, value: string) => style.set(key, value)
      }
    } as unknown as HTMLElement;
    applyTheme(DARK_THEME, root);
    expect(root.dataset.theme).toBe("dark");
  });
});

import { DEFAULT_THEME, type BrowserTheme } from "../shared/browserModel";

const STORAGE_KEY = "autopilot.theme";

const themeEntries = Object.keys(DEFAULT_THEME) as Array<keyof BrowserTheme>;

export const BLUE_THEME: BrowserTheme = {
  bg: "#ffffff",
  surface: "#ffffff",
  surface2: "#eef5ff",
  primary: "#153e75",
  primaryHover: "#0d2d57",
  sidebarBg: "#0b2447",
  sidebarBgSoft: "#254f85",
  sidebarText: "#f6fbff",
  sidebarTextMuted: "#b8cbe1",
  sidebarBorder: "#41678f",
  titlebarBg: "#102f5f",
  sage: "#5f9fc8",
  sageMuted: "#e3eef9",
  clay: "#c47d4f",
  text: "#102033",
  textMuted: "#607086",
  border: "#bacadd",
  danger: "#a43a43",
  focus: "#2f6bdf"
};

const LEGACY_BLUE_THEME: BrowserTheme = {
  bg: "#e8f0f8",
  surface: "#f8fbff",
  surface2: "#d9e7f5",
  primary: "#153e75",
  primaryHover: "#0d2d57",
  sidebarBg: "#0b2447",
  sidebarBgSoft: "#254f85",
  sidebarText: "#f6fbff",
  sidebarTextMuted: "#b8cbe1",
  sidebarBorder: "#41678f",
  titlebarBg: "#102f5f",
  sage: "#5f9fc8",
  sageMuted: "#e3eef9",
  clay: "#c47d4f",
  text: "#102033",
  textMuted: "#607086",
  border: "#bacadd",
  danger: "#a43a43",
  focus: "#2f6bdf"
};

export type ThemePreset = {
  id: "classic" | "blue";
  label: string;
  description: string;
  theme: BrowserTheme;
  swatches: string[];
};

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "classic",
    label: "Classic",
    description: "Forest, parchment, and clay.",
    theme: DEFAULT_THEME,
    swatches: [DEFAULT_THEME.sidebarBg, DEFAULT_THEME.primary, DEFAULT_THEME.surface, DEFAULT_THEME.clay]
  },
  {
    id: "blue",
    label: "Blue Pilot",
    description: "Deep navy chrome with white browser surfaces.",
    theme: BLUE_THEME,
    swatches: [BLUE_THEME.sidebarBg, BLUE_THEME.primary, BLUE_THEME.surface, BLUE_THEME.clay]
  }
];

const LEGACY_DARK_THEME: BrowserTheme = {
  bg: "#020817",
  surface: "#081020",
  surface2: "#111a2d",
  primary: "#4f9cff",
  primaryHover: "#2f7eea",
  sidebarBg: "#081020",
  sidebarBgSoft: "#111a2d",
  sidebarText: "#f5f8ff",
  sidebarTextMuted: "#8492ad",
  sidebarBorder: "#1b2840",
  titlebarBg: "#081020",
  sage: "#2fe38a",
  sageMuted: "#263754",
  clay: "#a873ff",
  text: "#f5f8ff",
  textMuted: "#8492ad",
  border: "#1b2840",
  danger: "#ff5b6e",
  focus: "#6aa9ff"
};

export function isHexColor(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value);
}

export function sanitizeTheme(input: Partial<BrowserTheme>): BrowserTheme {
  return themeEntries.reduce<BrowserTheme>((theme, key) => {
    const value = input[key];
    theme[key] = typeof value === "string" && isHexColor(value) ? value : DEFAULT_THEME[key];
    return theme;
  }, { ...DEFAULT_THEME });
}

function themeMatches(theme: Partial<BrowserTheme>, target: BrowserTheme): boolean {
  return themeEntries.every((key) => theme[key]?.toLowerCase() === target[key].toLowerCase());
}

export function loadTheme(storage: Storage = localStorage): BrowserTheme {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) {
    return DEFAULT_THEME;
  }

  try {
    const theme = sanitizeTheme(JSON.parse(raw) as Partial<BrowserTheme>);
    const legacyTheme = JSON.parse(raw) as Partial<BrowserTheme>;
    const legacyKeys: Array<keyof BrowserTheme> = [
      "bg",
      "surface",
      "surface2",
      "primary",
      "primaryHover",
      "sage",
      "sageMuted",
      "clay",
      "text",
      "textMuted",
      "border",
      "danger",
      "focus"
    ];
    const isLegacyDefault = legacyKeys.every((key) => legacyTheme[key]?.toLowerCase() === LEGACY_DARK_THEME[key].toLowerCase());
    if (isLegacyDefault) {
      return DEFAULT_THEME;
    }

    if (themeMatches(theme, LEGACY_BLUE_THEME)) {
      return BLUE_THEME;
    }

    return theme;
  } catch {
    return DEFAULT_THEME;
  }
}

export function saveTheme(theme: BrowserTheme, storage: Storage = localStorage): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(sanitizeTheme(theme)));
}

export function resetTheme(storage: Storage = localStorage): BrowserTheme {
  storage.removeItem(STORAGE_KEY);
  return DEFAULT_THEME;
}

export function applyTheme(theme: BrowserTheme, root: HTMLElement = document.documentElement): void {
  root.style.setProperty("--bg", theme.bg);
  root.style.setProperty("--surface", theme.surface);
  root.style.setProperty("--surface-2", theme.surface2);
  root.style.setProperty("--primary", theme.primary);
  root.style.setProperty("--primary-hover", theme.primaryHover);
  root.style.setProperty("--sidebar-bg", theme.sidebarBg);
  root.style.setProperty("--sidebar-bg-soft", theme.sidebarBgSoft);
  root.style.setProperty("--sidebar-text", theme.sidebarText);
  root.style.setProperty("--sidebar-text-muted", theme.sidebarTextMuted);
  root.style.setProperty("--sidebar-border", theme.sidebarBorder);
  root.style.setProperty("--titlebar-bg", theme.titlebarBg);
  root.style.setProperty("--sage", theme.sage);
  root.style.setProperty("--sage-muted", theme.sageMuted);
  root.style.setProperty("--clay", theme.clay);
  root.style.setProperty("--text", theme.text);
  root.style.setProperty("--text-muted", theme.textMuted);
  root.style.setProperty("--border", theme.border);
  root.style.setProperty("--danger", theme.danger);
  root.style.setProperty("--focus", theme.focus);
}

function channelToLinear(channel: number): number {
  const normalized = channel / 255;
  return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);

  return 0.2126 * channelToLinear(r) + 0.7152 * channelToLinear(g) + 0.0722 * channelToLinear(b);
}

export function contrastRatio(foreground: string, background: string): number {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

export function getThemeWarnings(theme: BrowserTheme): string[] {
  const warnings: string[] = [];

  if (contrastRatio(theme.text, theme.surface) < 4.5) {
    warnings.push("Text and surface contrast is below 4.5:1.");
  }

  if (contrastRatio(theme.surface, theme.primary) < 4.5) {
    warnings.push("Primary button contrast is below 4.5:1.");
  }

  if (contrastRatio(theme.sidebarText, theme.sidebarBg) < 4.5) {
    warnings.push("Sidebar text and sidebar background contrast is below 4.5:1.");
  }

  return warnings;
}

import { describe, expect, it } from "vitest";

import {
  HISTORY_STORAGE_KEY,
  addHistoryEntry,
  displayHistoryHost,
  isHistoryUrl,
  loadHistoryEntries,
  saveHistoryEntries
} from "../src/renderer/history";

function createStorage(seed: Record<string, string> = {}) {
  const values = new Map(Object.entries(seed));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    }
  };
}

describe("history utilities", () => {
  it("only records real web URLs", () => {
    expect(isHistoryUrl("https://example.com")).toBe(true);
    expect(isHistoryUrl("http://localhost:5173")).toBe(true);
    expect(isHistoryUrl("autopilot://home")).toBe(false);
    expect(isHistoryUrl("chrome://settings")).toBe(false);
  });

  it("does not keep accidental searches for generated Autopilot pages", () => {
    const generatedHistorySearch = `https://www.google.com/search?q=${encodeURIComponent(
      'data:text/html;charset=utf-8,%3Cbody%20data-autopilot-page%3D%22history%22%3E'
    )}`;

    expect(isHistoryUrl(generatedHistorySearch)).toBe(false);
  });

  it("shows readable hosts for URLs", () => {
    expect(displayHistoryHost("https://www.google.com/search?q=autopilot")).toBe("google.com");
    expect(displayHistoryHost("not a url")).toBe("not a url");
  });

  it("adds new entries at the top and deduplicates by URL", () => {
    const entries = addHistoryEntry(
      [{ title: "Old", url: "https://example.com/", visitedAt: 1 }],
      { title: "Example", url: "https://example.com/", visitedAt: 2 }
    );

    expect(entries).toEqual([{ title: "Example", url: "https://example.com/", visitedAt: 2 }]);
  });

  it("loads valid saved entries and ignores malformed ones", () => {
    const storage = createStorage({
      [HISTORY_STORAGE_KEY]: JSON.stringify([
        { title: "Local app", url: "http://localhost:5173/", visitedAt: 10 },
        { title: "Settings", url: "chrome://settings", visitedAt: 11 },
        { title: "Duplicate", url: "http://localhost:5173/", visitedAt: 12 },
        { nope: true }
      ])
    });

    expect(loadHistoryEntries(storage)).toEqual([{ title: "Local app", url: "http://localhost:5173/", visitedAt: 10 }]);
  });

  it("saves entries to storage", () => {
    const storage = createStorage();
    saveHistoryEntries([{ title: "Docs", url: "https://developer.mozilla.org/", visitedAt: 3 }], storage);

    expect(JSON.parse(storage.getItem(HISTORY_STORAGE_KEY) ?? "[]")).toEqual([
      { title: "Docs", url: "https://developer.mozilla.org/", visitedAt: 3 }
    ]);
  });
});

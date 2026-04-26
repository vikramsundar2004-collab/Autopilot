import { describe, expect, it } from "vitest";

import { countBookmarks, createBookmarkNodeKey, parseChromiumBookmarks } from "../src/shared/bookmarks";
import { filterProfileRootsBySource, getChromiumProfileRoots } from "../src/shared/bookmarkSources";

describe("parseChromiumBookmarks", () => {
  it("extracts and deduplicates web bookmarks from Chromium bookmark files", () => {
    const bookmarks = parseChromiumBookmarks(
      {
        roots: {
          bookmark_bar: {
            children: [
              { type: "url", name: "Canvas", url: "https://canvas.instructure.com/" },
              { type: "url", name: "Canvas duplicate", url: "https://canvas.instructure.com/" },
              { type: "url", name: "Internal", url: "chrome://settings" },
              {
                type: "folder",
                name: "School",
                children: [{ type: "url", name: "Calendar", url: "https://calendar.google.com/" }]
              }
            ]
          }
        }
      },
      "Chrome"
    );

    expect(countBookmarks(bookmarks)).toBe(2);
    expect(bookmarks).toEqual([
      { kind: "bookmark", title: "Canvas", url: "https://canvas.instructure.com/", source: "Chrome" },
      {
        kind: "folder",
        title: "School",
        source: "Chrome",
        children: [{ kind: "bookmark", title: "Calendar", url: "https://calendar.google.com/", source: "Chrome" }]
      }
    ]);
  });

  it("returns an empty list for malformed input", () => {
    expect(parseChromiumBookmarks({ nope: true }, "Chrome")).toEqual([]);
  });
});

describe("bookmark node keys", () => {
  it("creates stable keys for bookmark mutation targets", () => {
    expect(
      createBookmarkNodeKey({
        kind: "bookmark",
        source: "Autopilot",
        title: "Example",
        url: "https://example.com/",
        path: ["School"]
      })
    ).toBe(
      createBookmarkNodeKey({
        kind: "bookmark",
        source: "autopilot",
        title: "Different title",
        url: "https://example.com/",
        path: [" school "]
      })
    );
  });
});

describe("getChromiumProfileRoots", () => {
  it("finds Chromium-family bookmark locations on Windows", () => {
    const roots = getChromiumProfileRoots({
      platform: "win32",
      homeDir: "C:\\Users\\student",
      env: {
        LOCALAPPDATA: "C:\\Users\\student\\AppData\\Local",
        APPDATA: "C:\\Users\\student\\AppData\\Roaming"
      }
    });

    expect(roots).toEqual(
      expect.arrayContaining([
        { source: "Chrome", root: "C:\\Users\\student\\AppData\\Local\\Google\\Chrome\\User Data" },
        { source: "Edge", root: "C:\\Users\\student\\AppData\\Local\\Microsoft\\Edge\\User Data" },
        { source: "Brave", root: "C:\\Users\\student\\AppData\\Local\\BraveSoftware\\Brave-Browser\\User Data" },
        { source: "Opera GX", root: "C:\\Users\\student\\AppData\\Roaming\\Opera Software\\Opera GX Stable" }
      ])
    );
  });

  it("finds Chromium-family bookmark locations on macOS and Linux", () => {
    const macRoots = getChromiumProfileRoots({
      platform: "darwin",
      homeDir: "/Users/student",
      env: {}
    });
    const linuxRoots = getChromiumProfileRoots({
      platform: "linux",
      homeDir: "/home/student",
      env: {}
    });

    expect(macRoots).toEqual(
      expect.arrayContaining([
        { source: "Chrome", root: "/Users/student/Library/Application Support/Google/Chrome" },
        { source: "Arc", root: "/Users/student/Library/Application Support/Arc/User Data" }
      ])
    );
    expect(linuxRoots).toEqual(
      expect.arrayContaining([
        { source: "Chrome", root: "/home/student/.config/google-chrome" },
        { source: "Chromium Snap", root: "/home/student/snap/chromium/common/chromium" }
      ])
    );
  });

  it("only keeps bookmark roots for explicitly selected browsers", () => {
    const roots = [
      { source: "Chrome", root: "chrome-root" },
      { source: "Edge", root: "edge-root" },
      { source: "Brave", root: "brave-root" }
    ];

    expect(filterProfileRootsBySource(roots, [])).toEqual([]);
    expect(filterProfileRootsBySource(roots, ["Edge"])).toEqual([{ source: "Edge", root: "edge-root" }]);
  });
});

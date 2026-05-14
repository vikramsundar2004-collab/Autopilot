import { describe, expect, it } from "vitest";

import { getMostRecentWorkspaceTabId, sanitizeWorkspaceState, upsertWorkspaceTabSnapshot } from "../src/shared/workspaces";

describe("workspace models", () => {
  it("keeps default workspaces and removes invalid active ids", () => {
    const state = sanitizeWorkspaceState({
      activeWorkspaceId: "missing",
      profiles: [
        {
          id: "browsing",
          label: "browsing",
          view: "browser",
          icon: "globe",
          color: "blue",
          profilePartition: "persist:autopilot",
          theme: {
            sidebarBg: "#123456",
            bad: "not-a-color"
          }
        }
      ]
    });

    expect(state.activeWorkspaceId).toBe("browsing");
    expect(state.profiles.map((profile) => profile.id)).toEqual(["home", "browsing", "coding", "productivity", "chatting", "design"]);
    const browsing = state.profiles.find((profile) => profile.id === "browsing");
    expect(browsing?.theme.sidebarBg).toBe("#123456");
    expect("bad" in (browsing?.theme ?? {})).toBe(false);
  });

  it("migrates stale built-in workspace labels and views", () => {
    const state = sanitizeWorkspaceState({
      activeWorkspaceId: "design",
      profiles: [
        {
          id: "browsing",
          label: "main",
          view: "browser",
          icon: "globe",
          color: "blue"
        },
        {
          id: "coding",
          label: "work",
          view: "browser",
          icon: "globe",
          color: "blue"
        },
        {
          id: "design",
          label: "design",
          view: "browser",
          icon: "globe",
          color: "blue"
        }
      ]
    });

    expect(state.activeWorkspaceId).toBe("design");
    expect(state.profiles.find((profile) => profile.id === "browsing")).toMatchObject({
      label: "browsing",
      view: "browser",
      icon: "globe",
      color: "blue"
    });
    expect(state.profiles.find((profile) => profile.id === "coding")).toMatchObject({
      label: "coding",
      view: "coding",
      icon: "code",
      color: "violet"
    });
    expect(state.profiles.find((profile) => profile.id === "home")).toMatchObject({
      label: "home",
      view: "home",
      icon: "home",
      color: "forest"
    });
    expect(state.profiles.find((profile) => profile.id === "chatting")).toMatchObject({
      label: "chatting",
      view: "chatting",
      icon: "chat",
      color: "orange"
    });
    expect(state.profiles.find((profile) => profile.id === "responses")).toBeUndefined();
    expect(state.profiles.find((profile) => profile.id === "design")).toMatchObject({
      label: "design",
      view: "design",
      icon: "palette",
      color: "pink"
    });
  });

  it("migrates the legacy responses workspace back into Productivity", () => {
    const state = sanitizeWorkspaceState({
      activeWorkspaceId: "responses",
      profiles: [
        {
          id: "responses",
          label: "responses",
          view: "productivity",
          icon: "chat",
          color: "green"
        }
      ]
    });

    expect(state.activeWorkspaceId).toBe("productivity");
    expect(state.profiles.find((profile) => profile.id === "responses")).toBeUndefined();
  });

  it("persists a browser tab snapshot on the selected workspace", () => {
    const state = sanitizeWorkspaceState(null);
    const nextState = upsertWorkspaceTabSnapshot(
      state,
      "browsing",
      [
        {
          id: "tab-1",
          title: "Docs",
          url: "https://docs.google.com/",
          isLoading: false,
          canGoBack: false,
          canGoForward: false,
          memoryBytes: 42,
          pinned: true
        }
      ],
      "tab-1"
    );

    const browsing = nextState.profiles.find((profile) => profile.id === "browsing");
    expect(browsing?.savedTabs).toHaveLength(1);
    expect(browsing?.savedTabs[0]).toMatchObject({
      id: "tab-1",
      title: "Docs",
      url: "https://docs.google.com/",
      memoryBytes: 42,
      pinned: true
    });
  });

  it("finds the saved tab that should be restored as active", () => {
    expect(
      getMostRecentWorkspaceTabId([
        {
          id: "old",
          title: "Old",
          url: "https://old.example",
          lastActiveAt: 10
        },
        {
          id: "new",
          title: "New",
          url: "https://new.example",
          lastActiveAt: 20
        }
      ])
    ).toBe("new");
    expect(getMostRecentWorkspaceTabId([])).toBeNull();
  });
});

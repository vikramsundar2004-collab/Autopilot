import { describe, expect, it } from "vitest";

import { sanitizeWorkspaceState, upsertWorkspaceTabSnapshot } from "../src/shared/workspaces";

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
    expect(state.profiles.map((profile) => profile.id)).toEqual(["browsing", "coding", "productivity", "chatting", "design"]);
    expect(state.profiles[0].theme.sidebarBg).toBe("#123456");
    expect("bad" in state.profiles[0].theme).toBe(false);
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
    expect(state.profiles.find((profile) => profile.id === "design")).toMatchObject({
      label: "design",
      view: "design",
      icon: "palette",
      color: "pink"
    });
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
});

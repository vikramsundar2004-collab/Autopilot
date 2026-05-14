import type { BrowserTheme, Tab } from "./browserModel.js";

export type WorkspaceView = "home" | "browser" | "coding" | "productivity" | "chatting" | "design" | "settings";

export type WorkspaceTheme = Partial<
  Pick<
    BrowserTheme,
    | "bg"
    | "surface"
    | "surface2"
    | "primary"
    | "primaryHover"
    | "sidebarBg"
    | "sidebarBgSoft"
    | "sidebarText"
    | "sidebarTextMuted"
    | "sidebarBorder"
    | "titlebarBg"
    | "sage"
    | "sageMuted"
    | "clay"
    | "text"
    | "textMuted"
    | "border"
    | "danger"
    | "focus"
  >
>;

export type WorkspaceTabRecord = {
  id: string;
  title: string;
  url: string;
  groupId?: string;
  pinned?: boolean;
  hibernated?: boolean;
  hibernatedUrl?: string;
  memoryBytes?: number;
  lastActiveAt: number;
};

export type WorkspaceProfile = {
  id: string;
  label: string;
  view: WorkspaceView;
  icon: "home" | "globe" | "code" | "check" | "chat" | "palette" | "settings";
  color: "blue" | "violet" | "green" | "orange" | "pink" | "forest";
  isDefault: boolean;
  profilePartition: string;
  theme: WorkspaceTheme;
  pinnedUrls: Array<{ title: string; url: string }>;
  savedTabs: WorkspaceTabRecord[];
  tabGroups: WorkspaceTabGroup[];
  splitView: SplitView | null;
  linkRoutes: LinkRoute[];
  updatedAt: number;
};

export type WorkspaceTabGroup = {
  id: string;
  name: string;
  color: string;
  tabIds: string[];
  collapsed: boolean;
  createdAt: number;
  updatedAt: number;
};

export type SplitView = {
  id: string;
  leftTabId: string;
  rightTabId: string;
  ratio: number;
  createdAt: number;
};

export type LinkRoute = {
  id: string;
  pattern: string;
  workspaceId: string;
  enabled: boolean;
  createdAt: number;
};

export type WorkspaceState = {
  activeWorkspaceId: string;
  profiles: WorkspaceProfile[];
};

const DEFAULT_PARTITION = "persist:autopilot";
const DEFAULT_UPDATED_AT = 1;

export const DEFAULT_WORKSPACE_PROFILES: WorkspaceProfile[] = [
  {
    id: "home",
    label: "home",
    view: "home",
    icon: "home",
    color: "forest",
    isDefault: true,
    profilePartition: DEFAULT_PARTITION,
    theme: {},
    pinnedUrls: [],
    savedTabs: [],
    tabGroups: [],
    splitView: null,
    linkRoutes: [],
    updatedAt: DEFAULT_UPDATED_AT
  },
  {
    id: "browsing",
    label: "browsing",
    view: "browser",
    icon: "globe",
    color: "blue",
    isDefault: true,
    profilePartition: DEFAULT_PARTITION,
    theme: {},
    pinnedUrls: [],
    savedTabs: [],
    tabGroups: [],
    splitView: null,
    linkRoutes: [],
    updatedAt: DEFAULT_UPDATED_AT
  },
  {
    id: "coding",
    label: "coding",
    view: "coding",
    icon: "code",
    color: "violet",
    isDefault: true,
    profilePartition: DEFAULT_PARTITION,
    theme: {},
    pinnedUrls: [],
    savedTabs: [],
    tabGroups: [],
    splitView: null,
    linkRoutes: [],
    updatedAt: DEFAULT_UPDATED_AT
  },
  {
    id: "productivity",
    label: "productivity",
    view: "productivity",
    icon: "check",
    color: "green",
    isDefault: true,
    profilePartition: DEFAULT_PARTITION,
    theme: {},
    pinnedUrls: [],
    savedTabs: [],
    tabGroups: [],
    splitView: null,
    linkRoutes: [],
    updatedAt: DEFAULT_UPDATED_AT
  },
  {
    id: "chatting",
    label: "chatting",
    view: "chatting",
    icon: "chat",
    color: "orange",
    isDefault: true,
    profilePartition: DEFAULT_PARTITION,
    theme: {},
    pinnedUrls: [],
    savedTabs: [],
    tabGroups: [],
    splitView: null,
    linkRoutes: [],
    updatedAt: DEFAULT_UPDATED_AT
  },
  {
    id: "design",
    label: "design",
    view: "design",
    icon: "palette",
    color: "pink",
    isDefault: true,
    profilePartition: DEFAULT_PARTITION,
    theme: {},
    pinnedUrls: [],
    savedTabs: [],
    tabGroups: [],
    splitView: null,
    linkRoutes: [],
    updatedAt: DEFAULT_UPDATED_AT
  }
];

const VALID_VIEWS: WorkspaceView[] = ["home", "browser", "coding", "productivity", "chatting", "design", "settings"];
const VALID_ICONS: WorkspaceProfile["icon"][] = ["home", "globe", "code", "check", "chat", "palette", "settings"];
const VALID_COLORS: WorkspaceProfile["color"][] = ["blue", "violet", "green", "orange", "pink", "forest"];

export function sanitizeWorkspaceState(value: unknown): WorkspaceState {
  const candidate = value && typeof value === "object" ? (value as Partial<WorkspaceState>) : {};
  const profiles = sanitizeWorkspaceProfiles(candidate.profiles);
  const requestedActiveWorkspaceId = typeof candidate.activeWorkspaceId === "string" ? candidate.activeWorkspaceId : "";
  const activeWorkspaceId =
    requestedActiveWorkspaceId && profiles.some((profile) => profile.id === requestedActiveWorkspaceId)
      ? requestedActiveWorkspaceId
      : requestedActiveWorkspaceId === "responses" && profiles.some((profile) => profile.id === "productivity")
      ? "productivity"
      : "browsing";

  return {
    activeWorkspaceId,
    profiles
  };
}

export function sanitizeWorkspaceProfiles(value: unknown): WorkspaceProfile[] {
  const byId = new Map<string, WorkspaceProfile>();
  for (const profile of DEFAULT_WORKSPACE_PROFILES) {
    byId.set(profile.id, structuredClone(profile));
  }

  if (Array.isArray(value)) {
    for (const rawProfile of value) {
      const profile = sanitizeWorkspaceProfile(rawProfile);
      if (profile?.id === "responses") {
        continue;
      }
      if (profile) {
        byId.set(profile.id, profile);
      }
    }
  }

  return [...byId.values()].sort((left, right) => getWorkspaceSortOrder(left.id) - getWorkspaceSortOrder(right.id));
}

export function upsertWorkspaceTabSnapshot(state: WorkspaceState, workspaceId: string, tabs: Tab[], activeTabId: string | null): WorkspaceState {
  const now = Date.now();
  const savedTabs = tabs.map((tab) => ({
    id: tab.id,
    title: tab.title,
    url: tab.url,
    groupId: tab.groupId,
    pinned: tab.pinned,
    hibernated: tab.hibernated,
    hibernatedUrl: tab.hibernatedUrl,
    memoryBytes: tab.memoryBytes,
    lastActiveAt: tab.id === activeTabId ? now : now - 1
  }));

  return {
    ...state,
    profiles: state.profiles.map((profile) =>
      profile.id === workspaceId
        ? {
            ...profile,
            savedTabs,
            updatedAt: now
          }
        : profile
    )
  };
}

export function getMostRecentWorkspaceTabId(savedTabs: WorkspaceTabRecord[]): string | null {
  const mostRecentTab = savedTabs.reduce<WorkspaceTabRecord | null>((currentMostRecent, tab) => {
    if (!currentMostRecent || tab.lastActiveAt > currentMostRecent.lastActiveAt) {
      return tab;
    }

    return currentMostRecent;
  }, null);

  return mostRecentTab?.id ?? null;
}

function getWorkspaceSortOrder(id: string): number {
  const index = DEFAULT_WORKSPACE_PROFILES.findIndex((profile) => profile.id === id);
  return index === -1 ? DEFAULT_WORKSPACE_PROFILES.length : index;
}

function sanitizeWorkspaceProfile(value: unknown): WorkspaceProfile | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const rawProfile = value as Partial<WorkspaceProfile>;
  if (typeof rawProfile.id !== "string" || !rawProfile.id.trim()) {
    return null;
  }

  const fallback = DEFAULT_WORKSPACE_PROFILES.find((profile) => profile.id === rawProfile.id);
  const id = rawProfile.id.trim().slice(0, 80);
  const label = fallback?.label ?? (typeof rawProfile.label === "string" && rawProfile.label.trim() ? rawProfile.label.trim().slice(0, 80) : id);
  const view = fallback?.view ?? (rawProfile.view && VALID_VIEWS.includes(rawProfile.view) ? rawProfile.view : "browser");
  const icon = fallback?.icon ?? (rawProfile.icon && VALID_ICONS.includes(rawProfile.icon) ? rawProfile.icon : "globe");
  const color = fallback?.color ?? (rawProfile.color && VALID_COLORS.includes(rawProfile.color) ? rawProfile.color : "forest");

  return {
    id,
    label,
    view,
    icon,
    color,
    isDefault: rawProfile.isDefault ?? Boolean(fallback?.isDefault),
    profilePartition:
      typeof rawProfile.profilePartition === "string" && rawProfile.profilePartition.trim()
        ? rawProfile.profilePartition.trim().slice(0, 120)
        : fallback?.profilePartition ?? DEFAULT_PARTITION,
    theme: sanitizeWorkspaceTheme(rawProfile.theme),
    pinnedUrls: sanitizePinnedUrls(rawProfile.pinnedUrls),
    savedTabs: sanitizeSavedTabs(rawProfile.savedTabs),
    tabGroups: sanitizeTabGroups(rawProfile.tabGroups),
    splitView: sanitizeSplitView(rawProfile.splitView),
    linkRoutes: sanitizeLinkRoutes(rawProfile.linkRoutes),
    updatedAt: sanitizeTime(rawProfile.updatedAt)
  };
}

function sanitizeWorkspaceTheme(value: unknown): WorkspaceTheme {
  if (!value || typeof value !== "object") {
    return {};
  }

  const theme: WorkspaceTheme = {};
  for (const [key, rawValue] of Object.entries(value as Record<string, unknown>)) {
    if (typeof rawValue === "string" && /^#[0-9a-f]{6}$/i.test(rawValue)) {
      theme[key as keyof WorkspaceTheme] = rawValue;
    }
  }

  return theme;
}

function sanitizePinnedUrls(value: unknown): Array<{ title: string; url: string }> {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .flatMap((rawItem) => {
      if (!rawItem || typeof rawItem !== "object") {
        return [];
      }

      const item = rawItem as Partial<{ title: string; url: string }>;
      if (typeof item.url !== "string" || !item.url.trim()) {
        return [];
      }

      return [
        {
          title: typeof item.title === "string" && item.title.trim() ? item.title.trim().slice(0, 80) : item.url.trim().slice(0, 80),
          url: item.url.trim().slice(0, 2048)
        }
      ];
    })
    .slice(0, 24);
}

function sanitizeSavedTabs(value: unknown): WorkspaceTabRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .flatMap((rawTab) => {
      if (!rawTab || typeof rawTab !== "object") {
        return [];
      }

      const tab = rawTab as Partial<WorkspaceTabRecord>;
      if (typeof tab.id !== "string" || typeof tab.url !== "string" || !tab.url.trim()) {
        return [];
      }

      return [
        {
          id: tab.id.trim().slice(0, 120),
          title: typeof tab.title === "string" && tab.title.trim() ? tab.title.trim().slice(0, 120) : "Untitled",
          url: tab.url.trim().slice(0, 4096),
          groupId: typeof tab.groupId === "string" && tab.groupId.trim() ? tab.groupId.trim().slice(0, 120) : undefined,
          pinned: Boolean(tab.pinned),
          hibernated: Boolean(tab.hibernated),
          hibernatedUrl: typeof tab.hibernatedUrl === "string" && tab.hibernatedUrl.trim() ? tab.hibernatedUrl.trim().slice(0, 4096) : undefined,
          memoryBytes: typeof tab.memoryBytes === "number" && Number.isFinite(tab.memoryBytes) ? tab.memoryBytes : undefined,
          lastActiveAt: sanitizeTime(tab.lastActiveAt)
        }
      ];
    })
    .slice(0, 80);
}

function sanitizeTabGroups(value: unknown): WorkspaceTabGroup[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .flatMap((rawGroup) => {
      if (!rawGroup || typeof rawGroup !== "object") {
        return [];
      }

      const group = rawGroup as Partial<WorkspaceTabGroup>;
      if (typeof group.id !== "string" || !group.id.trim()) {
        return [];
      }

      return [
        {
          id: group.id.trim().slice(0, 120),
          name: typeof group.name === "string" && group.name.trim() ? group.name.trim().slice(0, 60) : "Group",
          color: typeof group.color === "string" && group.color.trim() ? group.color.trim().slice(0, 32) : "forest",
          tabIds: Array.isArray(group.tabIds) ? group.tabIds.filter((tabId) => typeof tabId === "string").slice(0, 80) : [],
          collapsed: Boolean(group.collapsed),
          createdAt: sanitizeTime(group.createdAt),
          updatedAt: sanitizeTime(group.updatedAt)
        }
      ];
    })
    .slice(0, 32);
}

function sanitizeSplitView(value: unknown): SplitView | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const splitView = value as Partial<SplitView>;
  if (typeof splitView.id !== "string" || typeof splitView.leftTabId !== "string" || typeof splitView.rightTabId !== "string") {
    return null;
  }

  return {
    id: splitView.id.trim().slice(0, 120),
    leftTabId: splitView.leftTabId.trim().slice(0, 120),
    rightTabId: splitView.rightTabId.trim().slice(0, 120),
    ratio: typeof splitView.ratio === "number" && splitView.ratio > 0.2 && splitView.ratio < 0.8 ? splitView.ratio : 0.5,
    createdAt: sanitizeTime(splitView.createdAt)
  };
}

function sanitizeLinkRoutes(value: unknown): LinkRoute[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .flatMap((rawRoute) => {
      if (!rawRoute || typeof rawRoute !== "object") {
        return [];
      }

      const route = rawRoute as Partial<LinkRoute>;
      if (typeof route.id !== "string" || typeof route.pattern !== "string" || typeof route.workspaceId !== "string") {
        return [];
      }

      return [
        {
          id: route.id.trim().slice(0, 120),
          pattern: route.pattern.trim().slice(0, 200),
          workspaceId: route.workspaceId.trim().slice(0, 80),
          enabled: route.enabled !== false,
          createdAt: sanitizeTime(route.createdAt)
        }
      ];
    })
    .slice(0, 80);
}

function sanitizeTime(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : Date.now();
}

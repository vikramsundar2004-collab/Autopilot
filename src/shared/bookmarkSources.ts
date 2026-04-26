export type BrowserProfileRoot = {
  source: string;
  root: string;
};

type BookmarkSourceContext = {
  env: Record<string, string | undefined>;
  homeDir?: string;
  platform: string;
};

type Candidate = {
  source: string;
  parts: string[];
};

const WINDOWS_LOCAL_CANDIDATES: Candidate[] = [
  { source: "Chrome", parts: ["Google", "Chrome", "User Data"] },
  { source: "Chrome Beta", parts: ["Google", "Chrome Beta", "User Data"] },
  { source: "Chrome Canary", parts: ["Google", "Chrome SxS", "User Data"] },
  { source: "Chromium", parts: ["Chromium", "User Data"] },
  { source: "Edge", parts: ["Microsoft", "Edge", "User Data"] },
  { source: "Edge Beta", parts: ["Microsoft", "Edge Beta", "User Data"] },
  { source: "Edge Dev", parts: ["Microsoft", "Edge Dev", "User Data"] },
  { source: "Edge Canary", parts: ["Microsoft", "Edge SxS", "User Data"] },
  { source: "Brave", parts: ["BraveSoftware", "Brave-Browser", "User Data"] },
  { source: "Vivaldi", parts: ["Vivaldi", "User Data"] },
  { source: "Arc", parts: ["Packages", "TheBrowserCompany.Arc_ttt1ap7aakyb4", "LocalCache", "Local", "Arc", "User Data"] }
];

const WINDOWS_ROAMING_CANDIDATES: Candidate[] = [
  { source: "Opera", parts: ["Opera Software", "Opera Stable"] },
  { source: "Opera GX", parts: ["Opera Software", "Opera GX Stable"] }
];

const MAC_CANDIDATES: Candidate[] = [
  { source: "Chrome", parts: ["Google", "Chrome"] },
  { source: "Chrome Beta", parts: ["Google", "Chrome Beta"] },
  { source: "Chrome Canary", parts: ["Google", "Chrome Canary"] },
  { source: "Chromium", parts: ["Chromium"] },
  { source: "Edge", parts: ["Microsoft Edge"] },
  { source: "Edge Beta", parts: ["Microsoft Edge Beta"] },
  { source: "Edge Dev", parts: ["Microsoft Edge Dev"] },
  { source: "Edge Canary", parts: ["Microsoft Edge Canary"] },
  { source: "Brave", parts: ["BraveSoftware", "Brave-Browser"] },
  { source: "Vivaldi", parts: ["Vivaldi"] },
  { source: "Opera", parts: ["com.operasoftware.Opera"] },
  { source: "Opera GX", parts: ["com.operasoftware.OperaGX"] },
  { source: "Arc", parts: ["Arc", "User Data"] }
];

const LINUX_CONFIG_CANDIDATES: Candidate[] = [
  { source: "Chrome", parts: ["google-chrome"] },
  { source: "Chrome Beta", parts: ["google-chrome-beta"] },
  { source: "Chrome Dev", parts: ["google-chrome-unstable"] },
  { source: "Chromium", parts: ["chromium"] },
  { source: "Edge", parts: ["microsoft-edge"] },
  { source: "Edge Beta", parts: ["microsoft-edge-beta"] },
  { source: "Edge Dev", parts: ["microsoft-edge-dev"] },
  { source: "Brave", parts: ["BraveSoftware", "Brave-Browser"] },
  { source: "Vivaldi", parts: ["vivaldi"] },
  { source: "Vivaldi Snapshot", parts: ["vivaldi-snapshot"] },
  { source: "Opera", parts: ["opera"] },
  { source: "Opera Beta", parts: ["opera-beta"] },
  { source: "Opera Developer", parts: ["opera-developer"] }
];

const LINUX_HOME_CANDIDATES: Candidate[] = [
  { source: "Chromium Snap", parts: ["snap", "chromium", "common", "chromium"] },
  { source: "Brave Snap", parts: ["snap", "brave", "current", ".config", "BraveSoftware", "Brave-Browser"] }
];

function compactRoot(root: string | undefined): string | null {
  const trimmed = root?.trim();
  return trimmed ? trimmed.replace(/[\\/]+$/, "") : null;
}

function joinPath(root: string, parts: string[], separator: "\\" | "/"): string {
  return [root, ...parts].join(separator);
}

function addCandidates(
  roots: BrowserProfileRoot[],
  root: string | null,
  candidates: Candidate[],
  separator: "\\" | "/"
): void {
  if (!root) {
    return;
  }

  for (const candidate of candidates) {
    roots.push({
      source: candidate.source,
      root: joinPath(root, candidate.parts, separator)
    });
  }
}

function dedupeRoots(roots: BrowserProfileRoot[]): BrowserProfileRoot[] {
  const seen = new Set<string>();
  return roots.filter((root) => {
    const key = root.root.toLowerCase();
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export function getChromiumProfileRoots(context: BookmarkSourceContext): BrowserProfileRoot[] {
  const roots: BrowserProfileRoot[] = [];

  if (context.platform === "win32") {
    addCandidates(roots, compactRoot(context.env.LOCALAPPDATA), WINDOWS_LOCAL_CANDIDATES, "\\");
    addCandidates(roots, compactRoot(context.env.APPDATA), WINDOWS_ROAMING_CANDIDATES, "\\");
    return dedupeRoots(roots);
  }

  const homeDir = compactRoot(context.homeDir ?? context.env.HOME);
  if (context.platform === "darwin") {
    const appSupport = homeDir ? joinPath(homeDir, ["Library", "Application Support"], "/") : null;
    addCandidates(roots, appSupport, MAC_CANDIDATES, "/");
    return dedupeRoots(roots);
  }

  const configRoot = compactRoot(context.env.XDG_CONFIG_HOME) ?? (homeDir ? joinPath(homeDir, [".config"], "/") : null);
  addCandidates(roots, configRoot, LINUX_CONFIG_CANDIDATES, "/");
  addCandidates(roots, homeDir, LINUX_HOME_CANDIDATES, "/");
  return dedupeRoots(roots);
}

export function filterProfileRootsBySource(
  roots: BrowserProfileRoot[],
  selectedSources: string[]
): BrowserProfileRoot[] {
  if (selectedSources.length === 0) {
    return [];
  }

  const selected = new Set(selectedSources);
  return roots.filter((root) => selected.has(root.source));
}

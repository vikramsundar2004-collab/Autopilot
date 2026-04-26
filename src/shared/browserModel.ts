export const AUTOPILOT_HOME_LABEL = "autopilot://home";
export const AUTOPILOT_HISTORY_LABEL = "autopilot://history";
export const AUTOPILOT_PDF_LABEL = "autopilot://pdf";
export const AUTOPILOT_HISTORY_PAGE_MARKER = `data-autopilot-page="history"`;
export const AUTOPILOT_PDF_NOTICE_MARKER = `data-autopilot-page="pdf-notice"`;

const DATA_HTML_PREFIX = "data:text/html;charset=utf-8,";
const AUTOPILOT_HOME_TITLE_MARKER = encodeURIComponent("<title>Autopilot Home</title>");
const AUTOPILOT_HISTORY_DATA_MARKER = encodeURIComponent(AUTOPILOT_HISTORY_PAGE_MARKER);
const AUTOPILOT_PDF_NOTICE_DATA_MARKER = encodeURIComponent(AUTOPILOT_PDF_NOTICE_MARKER);

export type Tab = {
  id: string;
  title: string;
  url: string;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
};

export type BrowserSnapshot = {
  tabs: Tab[];
  activeTabId: string | null;
};

export type BrowserTheme = {
  bg: string;
  surface: string;
  surface2: string;
  primary: string;
  primaryHover: string;
  sage: string;
  sageMuted: string;
  clay: string;
  text: string;
  textMuted: string;
  border: string;
  danger: string;
  focus: string;
};

export type BrowserHistoryEntry = {
  title: string;
  url: string;
  visitedAt: number;
};

export const DEFAULT_THEME: BrowserTheme = {
  bg: "#f4ebdd",
  surface: "#fffaf2",
  surface2: "#efe3d1",
  primary: "#1f4a37",
  primaryHover: "#17392a",
  sage: "#b9c8aa",
  sageMuted: "#edf3e8",
  clay: "#9a765b",
  text: "#17231d",
  textMuted: "#6f6257",
  border: "#deccb5",
  danger: "#9d3b2f",
  focus: "#2f6b4f"
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "\"":
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

function getHistoryHost(url: string): string {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname.replace(/^www\./, "") || parsedUrl.href;
  } catch {
    return url;
  }
}

function formatHistoryTime(visitedAt: number): string {
  const visitedDate = new Date(visitedAt);
  if (Number.isNaN(visitedDate.getTime())) {
    return "Unknown time";
  }

  return visitedDate.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

export function createHomeUrl(theme: BrowserTheme = DEFAULT_THEME): string {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Autopilot Home</title>
<style>
  :root {
    color-scheme: light;
    --bg: ${theme.bg};
    --surface: ${theme.surface};
    --surface-2: ${theme.surface2};
    --primary: ${theme.primary};
    --primary-hover: ${theme.primaryHover};
    --text: ${theme.text};
    --muted: ${theme.textMuted};
    --border: ${theme.border};
    --sage: ${theme.sageMuted};
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    display: grid;
    place-items: center;
    background:
      radial-gradient(circle at 78% -12%, color-mix(in srgb, var(--surface-2) 80%, transparent), transparent 34%),
      linear-gradient(145deg, var(--surface), var(--bg));
    color: var(--text);
    font-family: Inter, "DM Sans", ui-sans-serif, sans-serif;
  }
  main {
    width: min(680px, calc(100vw - 48px));
    display: grid;
    gap: 20px;
  }
  h1 {
    display: inline-flex;
    align-items: flex-end;
    gap: 14px;
    flex-wrap: wrap;
    margin: 0;
    font-size: clamp(42px, 8vw, 78px);
    font-weight: 800;
    line-height: .94;
    letter-spacing: 0;
  }
  .title-compass-button {
    display: grid;
    place-items: center;
    width: clamp(40px, 8vw, 62px);
    height: clamp(58px, 12vw, 92px);
    margin-bottom: -8px;
    border: 0;
    border-radius: 999px;
    background: transparent;
    cursor: zoom-in;
    padding: 0;
  }
  .title-compass {
    width: 100%;
    height: 100%;
    filter: drop-shadow(0 16px 28px rgba(31, 74, 55, .18));
  }
  .title-compass .disc {
    fill: var(--primary);
  }
  .title-compass .wing {
    stroke: color-mix(in srgb, var(--primary) 82%, #11251a);
    stroke-linejoin: round;
    stroke-width: 5;
  }
  .title-compass .wing-left {
    fill: #e5d0b5;
  }
  .title-compass .wing-right {
    fill: #fffaf2;
  }
  .title-compass .core {
    fill: #df9b55;
    stroke: color-mix(in srgb, var(--primary) 82%, #11251a);
    stroke-linejoin: round;
    stroke-width: 2;
  }
  .title-compass .ridge {
    fill: none;
    opacity: .2;
    stroke: color-mix(in srgb, var(--primary) 82%, #11251a);
    stroke-linecap: round;
    stroke-width: 2;
  }
  p {
    margin: 0;
    max-width: 520px;
    color: var(--muted);
    font-size: 17px;
    line-height: 1.55;
  }
  form {
    display: flex;
    align-items: center;
    gap: 8px;
    max-width: 680px;
    min-height: 58px;
    padding: 7px 8px 7px 18px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface) 92%, white);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, .6),
      0 24px 70px rgba(51, 39, 31, .13);
    transition: border-color .16s ease, box-shadow .16s ease, transform .16s ease;
  }
  form:focus-within {
    border-color: color-mix(in srgb, var(--primary) 54%, var(--border));
    box-shadow:
      0 0 0 4px color-mix(in srgb, var(--primary) 12%, transparent),
      0 28px 78px rgba(31, 74, 55, .14);
    transform: translateY(-1px);
  }
  .search-mark {
    position: relative;
    width: 18px;
    height: 18px;
    flex: 0 0 auto;
  }
  .search-mark::before {
    content: "";
    position: absolute;
    left: 1px;
    top: 1px;
    width: 11px;
    height: 11px;
    border: 2px solid var(--muted);
    border-radius: 999px;
  }
  .search-mark::after {
    content: "";
    position: absolute;
    right: 1px;
    bottom: 1px;
    width: 7px;
    height: 2px;
    border-radius: 999px;
    background: var(--muted);
    transform: rotate(45deg);
  }
  input {
    flex: 1;
    min-width: 0;
    border: 0;
    outline: 0;
    background: transparent;
    color: var(--text);
    font: inherit;
    font-size: 16px;
    padding: 10px 8px;
  }
  input::placeholder {
    color: color-mix(in srgb, var(--muted) 72%, transparent);
  }
  button {
    border: 0;
    border-radius: 14px;
    background: var(--primary);
    color: var(--surface);
    font: inherit;
    font-weight: 700;
    padding: 0 20px;
    min-height: 44px;
    cursor: pointer;
    transition: background .14s ease, transform .14s ease;
  }
  button:hover {
    background: var(--primary-hover);
    transform: translateY(-1px);
  }
  .title-compass-button:hover {
    background: transparent;
    transform: translateY(-1px);
  }
  .shortcuts {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .shortcuts a {
    color: var(--text);
    text-decoration: none;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-2) 78%, var(--surface));
    padding: 8px 12px;
    font-size: 14px;
  }
  .icon-preview-backdrop {
    position: fixed;
    inset: 0;
    z-index: 20;
    display: grid;
    place-items: center;
    background:
      radial-gradient(circle at 50% 34%, color-mix(in srgb, var(--surface-2) 34%, transparent), transparent 34%),
      color-mix(in srgb, var(--text) 34%, transparent);
    backdrop-filter: blur(10px);
    padding: 24px;
  }
  .icon-preview-backdrop[hidden] {
    display: none;
  }
  .icon-preview-dialog {
    position: relative;
    display: grid;
    justify-items: center;
    gap: 14px;
    width: min(360px, calc(100vw - 32px));
    border: 1px solid color-mix(in srgb, var(--border) 82%, white);
    border-radius: 22px;
    background: color-mix(in srgb, var(--surface) 97%, white);
    box-shadow: 0 28px 90px rgba(51, 39, 31, .28);
    padding: 30px 28px 28px;
  }
  .icon-preview-art {
    display: grid;
    place-items: center;
    width: min(228px, 62vw);
    aspect-ratio: 1;
    border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
    border-radius: 42px;
    background:
      radial-gradient(circle at 50% 22%, color-mix(in srgb, var(--surface-2) 70%, transparent), transparent 44%),
      linear-gradient(145deg, color-mix(in srgb, var(--surface) 95%, white), var(--bg));
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, .6),
      0 18px 48px rgba(31, 74, 55, .15);
  }
  .icon-preview-logo {
    width: min(184px, 50vw);
    height: min(184px, 50vw);
    border-radius: 42px;
    box-shadow: 0 18px 44px rgba(31, 74, 55, .25);
  }
  .icon-preview-dialog h2 {
    margin: 0;
    color: var(--text);
    font-size: 32px;
    font-weight: 800;
    line-height: 1;
  }
  .icon-preview-close {
    position: absolute;
    top: 12px;
    right: 12px;
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    min-height: 0;
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-2) 54%, transparent);
    color: var(--muted);
    cursor: pointer;
    padding: 0;
  }
  .icon-preview-close:hover {
    background: var(--surface-2);
    color: var(--text);
  }
</style>
</head>
<body>
<main>
  <h1>
    <span>Autopilot</span>
    <button class="title-compass-button" type="button" id="open-icon-preview" aria-label="Preview Autopilot app icon">
      <svg class="title-compass" viewBox="0 0 64 96" aria-hidden="true">
        <circle class="disc" cx="32" cy="51" r="31" />
        <path class="wing wing-left" d="M32 6 59 89 32 72 5 89Z" />
        <path class="wing wing-right" d="M32 6 59 89 32 72Z" />
        <path class="core" d="M32 22 45 64 32 56 19 64Z" />
        <path class="ridge" d="M32 6 32 72" />
      </svg>
    </button>
  </h1>
  <p>Where to next?</p>
  <form action="https://www.google.com/search" method="get">
    <span class="search-mark" aria-hidden="true"></span>
    <input name="q" aria-label="Search" placeholder="Search Google or enter an address" autofocus />
    <button type="submit">Search</button>
  </form>
  <nav class="shortcuts" aria-label="Shortcuts">
    <a href="https://developer.mozilla.org/">MDN</a>
    <a href="https://news.ycombinator.com/">Hacker News</a>
    <a href="https://github.com/">GitHub</a>
  </nav>
</main>
<div class="icon-preview-backdrop" id="icon-preview" hidden>
  <section class="icon-preview-dialog" role="dialog" aria-modal="true" aria-labelledby="icon-preview-heading">
    <button class="icon-preview-close" type="button" id="close-icon-preview" aria-label="Close icon preview">X</button>
    <div class="icon-preview-art">
      <svg class="icon-preview-logo" viewBox="0 0 256 256" aria-hidden="true">
        <defs>
          <linearGradient id="homeIconBg" x1="36" y1="18" x2="224" y2="242" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="#24583f"/>
            <stop offset=".6" stop-color="#1f4d37"/>
            <stop offset="1" stop-color="#173b2b"/>
          </linearGradient>
          <linearGradient id="homeIconNeedle" x1="93" y1="68" x2="162" y2="198" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="#fffaf2"/>
            <stop offset=".58" stop-color="#f2e3cc"/>
            <stop offset="1" stop-color="#d9c3a3"/>
          </linearGradient>
          <linearGradient id="homeIconRoseGold" x1="118" y1="98" x2="141" y2="156" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="#f4c46e"/>
            <stop offset=".58" stop-color="#df9b55"/>
            <stop offset="1" stop-color="#c96f42"/>
          </linearGradient>
          <filter id="homeIconShadow" x="-25%" y="-25%" width="150%" height="150%">
            <feDropShadow dx="0" dy="10" stdDeviation="9" flood-color="#0b1c14" flood-opacity=".28"/>
          </filter>
          <filter id="homeIconBadgeShadow" x="-35%" y="-35%" width="170%" height="170%">
            <feDropShadow dx="0" dy="8" stdDeviation="7" flood-color="#0b1c14" flood-opacity=".22"/>
          </filter>
        </defs>
        <rect width="256" height="256" rx="42" fill="url(#homeIconBg)"/>
        <path d="M42 70c24-28 55-42 93-42 32 0 59 10 81 29" fill="none" stroke="#fffaf2" stroke-width="2" opacity=".16" stroke-linecap="round"/>
        <circle cx="128" cy="132" r="88" fill="none" stroke="#fffaf2" stroke-width="7" opacity=".2"/>
        <circle cx="128" cy="132" r="68" fill="none" stroke="#fffaf2" stroke-width="5" opacity=".1"/>
        <circle cx="128" cy="132" r="60" fill="#fffaf2" filter="url(#homeIconShadow)"/>
        <g filter="url(#homeIconShadow)">
          <path d="M128 66 166 199 128 176 90 199Z" fill="url(#homeIconNeedle)" stroke="#143425" stroke-width="8" stroke-linejoin="round"/>
          <path d="M128 66 166 199 128 176Z" fill="#fffaf2" opacity=".94"/>
          <path d="M128 66 128 176 90 199Z" fill="#e4d1b7"/>
          <path d="M128 101 145 154 128 143 111 154Z" fill="url(#homeIconRoseGold)"/>
          <path d="M128 101 137 145 128 139Z" fill="#ffd88a" opacity=".72"/>
        </g>
        <g filter="url(#homeIconBadgeShadow)">
          <circle cx="128" cy="52" r="24" fill="#9a765b"/>
          <path d="M120 44 112 52 120 60" fill="none" stroke="#fffaf2" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M136 44 144 52 136 60" fill="none" stroke="#fffaf2" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M132 42 124 62" fill="none" stroke="#fffaf2" stroke-width="5" stroke-linecap="round"/>
          <circle cx="50" cy="101" r="24" fill="#5a9f6d"/>
          <path d="M37 101 47 111 65 91" fill="none" stroke="#fffaf2" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="205" cy="101" r="22" fill="#4d8a63"/>
          <circle cx="205" cy="101" r="11" fill="none" stroke="#fffaf2" stroke-width="4"/>
          <path d="M194 101h22M205 90c4 5 4 17 0 22M205 90c-4 5-4 17 0 22" fill="none" stroke="#fffaf2" stroke-width="4" stroke-linecap="round"/>
          <circle cx="78" cy="209" r="24" fill="#b85a86"/>
          <path d="M67 219 72 205 91 186 100 195 81 214Z" fill="none" stroke="#fffaf2" stroke-width="5" stroke-linejoin="round"/>
          <path d="M86 191 95 200" fill="none" stroke="#fffaf2" stroke-width="5" stroke-linecap="round"/>
          <circle cx="178" cy="209" r="24" fill="#c47a38"/>
          <path d="M162 198h32c6 0 10 4 10 10v8c0 6-4 10-10 10h-18l-12 8v-8h-2c-6 0-10-4-10-10v-8c0-6 4-10 10-10Z" fill="none" stroke="#fffaf2" stroke-width="5" stroke-linejoin="round"/>
        </g>
      </svg>
    </div>
    <h2 id="icon-preview-heading">Autopilot</h2>
  </section>
</div>
<script>
  const openIconPreview = document.getElementById("open-icon-preview");
  const iconPreview = document.getElementById("icon-preview");
  const closeIconPreview = document.getElementById("close-icon-preview");

  function showIconPreview() {
    iconPreview.hidden = false;
    closeIconPreview.focus();
  }

  function hideIconPreview() {
    iconPreview.hidden = true;
    openIconPreview.focus();
  }

  openIconPreview.addEventListener("click", showIconPreview);
  closeIconPreview.addEventListener("click", hideIconPreview);
  iconPreview.addEventListener("click", (event) => {
    if (event.target === iconPreview) {
      hideIconPreview();
    }
  });
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !iconPreview.hidden) {
      hideIconPreview();
    }
  });
</script>
</body>
</html>`;

  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

export function createHistoryUrl(entries: BrowserHistoryEntry[] = [], theme: BrowserTheme = DEFAULT_THEME): string {
  const historyRows =
    entries.length > 0
      ? entries
          .map((entry) => {
            const title = escapeHtml(entry.title || getHistoryHost(entry.url));
            const url = escapeHtml(entry.url);
            const host = escapeHtml(getHistoryHost(entry.url));
            const visitedAt = escapeHtml(formatHistoryTime(entry.visitedAt));
            return `<a class="history-row" href="${url}" title="${url}">
      <span class="favicon">${host[0]?.toUpperCase() || "A"}</span>
      <span class="history-copy">
        <strong>${title}</strong>
        <small>${host}</small>
      </span>
      <time>${visitedAt}</time>
    </a>`;
          })
          .join("")
      : `<section class="empty-history">
      <h2>No history yet</h2>
      <p>Sites you visit in Autopilot will show up here.</p>
    </section>`;

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Autopilot History</title>
<style>
  :root {
    color-scheme: light;
    --bg: ${theme.bg};
    --surface: ${theme.surface};
    --surface-2: ${theme.surface2};
    --primary: ${theme.primary};
    --primary-hover: ${theme.primaryHover};
    --sage: ${theme.sageMuted};
    --text: ${theme.text};
    --muted: ${theme.textMuted};
    --border: ${theme.border};
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    background:
      radial-gradient(circle at 78% -12%, color-mix(in srgb, var(--surface-2) 82%, transparent), transparent 34%),
      linear-gradient(145deg, var(--surface), var(--bg));
    color: var(--text);
    font-family: Inter, "DM Sans", Aptos, ui-sans-serif, system-ui, sans-serif;
  }
  main {
    width: min(920px, calc(100vw - 44px));
    margin: 0 auto;
    padding: clamp(34px, 6vw, 70px) 0;
  }
  header {
    display: grid;
    gap: 10px;
    margin-bottom: 28px;
  }
  .kicker {
    margin: 0;
    color: color-mix(in srgb, var(--primary) 76%, var(--text));
    font-size: 12px;
    font-weight: 850;
    text-transform: uppercase;
  }
  h1 {
    margin: 0;
    font-family: Georgia, serif;
    font-size: clamp(42px, 7vw, 76px);
    line-height: .95;
  }
  header p,
  .empty-history p {
    margin: 0;
    max-width: 620px;
    color: var(--muted);
    font-size: 16px;
    line-height: 1.55;
  }
  .history-list {
    display: grid;
    overflow: hidden;
    border: 1px solid var(--border);
    border-radius: 18px;
    background: color-mix(in srgb, var(--surface) 92%, white);
    box-shadow: 0 24px 72px rgba(51, 39, 31, .13);
  }
  .history-row {
    display: grid;
    grid-template-columns: 42px minmax(0, 1fr) auto;
    align-items: center;
    gap: 14px;
    min-height: 68px;
    border-bottom: 1px solid color-mix(in srgb, var(--border) 76%, transparent);
    color: var(--text);
    padding: 12px 16px;
    text-decoration: none;
    transition: background .14s ease, transform .14s ease;
  }
  .history-row:last-child {
    border-bottom: 0;
  }
  .history-row:hover {
    background: color-mix(in srgb, var(--surface-2) 50%, transparent);
  }
  .favicon {
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border-radius: 9px;
    background: color-mix(in srgb, var(--sage) 74%, white);
    color: var(--primary);
    font-size: 14px;
    font-weight: 900;
  }
  .history-copy {
    display: grid;
    gap: 4px;
    min-width: 0;
  }
  strong,
  small,
  time {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  strong {
    font-size: 15px;
  }
  small,
  time {
    color: var(--muted);
    font-size: 12px;
    font-weight: 700;
  }
  .empty-history {
    display: grid;
    justify-items: center;
    gap: 10px;
    min-height: 260px;
    padding: 36px;
    text-align: center;
  }
  .empty-history h2 {
    margin: 0;
    font-family: Georgia, serif;
    font-size: 30px;
  }
  @media (max-width: 680px) {
    .history-row {
      grid-template-columns: 34px minmax(0, 1fr);
    }
    time {
      grid-column: 2;
    }
  }
</style>
</head>
<body ${AUTOPILOT_HISTORY_PAGE_MARKER}>
<main>
  <header>
    <p class="kicker">Autopilot</p>
    <h1>History</h1>
    <p>All the sites you have visited in this browser.</p>
  </header>
  <section class="history-list" aria-label="Visited sites">
    ${historyRows}
  </section>
</main>
</body>
</html>`;

  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

export function isHomeUrl(url: string): boolean {
  return url === AUTOPILOT_HOME_LABEL || (url.startsWith(DATA_HTML_PREFIX) && url.includes(AUTOPILOT_HOME_TITLE_MARKER));
}

export function isHistoryPageUrl(url: string): boolean {
  return url === AUTOPILOT_HISTORY_LABEL || (url.startsWith(DATA_HTML_PREFIX) && url.includes(AUTOPILOT_HISTORY_DATA_MARKER));
}

export function isHistoryAddressInput(input: string): boolean {
  const normalized = input.trim().toLowerCase().replace(/\/+$/, "");
  return normalized === AUTOPILOT_HISTORY_LABEL || normalized === "autopilot/history";
}

export function isPdfNoticeUrl(url: string): boolean {
  return url.startsWith(DATA_HTML_PREFIX) && url.includes(AUTOPILOT_PDF_NOTICE_DATA_MARKER);
}

export function getDisplayUrl(url: string): string {
  if (isHomeUrl(url)) {
    return AUTOPILOT_HOME_LABEL;
  }

  if (isHistoryPageUrl(url)) {
    return AUTOPILOT_HISTORY_LABEL;
  }

  if (isPdfNoticeUrl(url)) {
    return AUTOPILOT_PDF_LABEL;
  }

  return url;
}

export function normalizeAddressInput(input: string, homeUrl = createHomeUrl()): string {
  const trimmed = input.trim();

  if (!trimmed || trimmed === AUTOPILOT_HOME_LABEL) {
    return homeUrl;
  }

  if (isHistoryAddressInput(trimmed)) {
    return createHistoryUrl();
  }

  if (trimmed.startsWith(DATA_HTML_PREFIX)) {
    return trimmed;
  }

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) {
    return trimmed;
  }

  const host = getInputHost(trimmed);
  if (host && (isLocalHost(host) || hasExplicitPort(trimmed))) {
    return `http://${trimmed}`;
  }

  const looksLikeHost = /^[^\s/]+\.[^\s/]{2,}([/?#].*)?$/i.test(trimmed);
  if (looksLikeHost) {
    return `https://${trimmed}`;
  }

  return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
}

export function isPdfUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const decodedUrl = safeDecode(`${parsed.pathname}${parsed.search}${parsed.hash}`);
    return /(^|[/?#&=;])[^/?#&;]*\.pdf($|[?#&;])/i.test(decodedUrl);
  } catch {
    return /(^|[/?#&=;])[^/?#&;]*\.pdf($|[?#&;])/i.test(url);
  }
}

export function isPdfResponseHeaders(headers: Record<string, string | string[] | undefined> | undefined): boolean {
  const contentTypes = getHeaderValues(headers, "content-type");
  if (contentTypes.some((value) => value.split(";", 1)[0].trim().toLowerCase() === "application/pdf")) {
    return true;
  }

  return getHeaderValues(headers, "content-disposition").some((value) =>
    /filename\*?=[^;]*\.pdf(["']|;|$)/i.test(safeDecode(value))
  );
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function getHeaderValues(
  headers: Record<string, string | string[] | undefined> | undefined,
  headerName: string
): string[] {
  if (!headers) {
    return [];
  }

  const lowerHeaderName = headerName.toLowerCase();
  const entry = Object.entries(headers).find(([key]) => key.toLowerCase() === lowerHeaderName);
  if (!entry) {
    return [];
  }

  const value = entry[1];
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function hasExplicitPort(input: string): boolean {
  return /^(\[[^\]]+\]|[^:/\s?#]+):\d{1,5}([/?#].*)?$/i.test(input);
}

function getInputHost(input: string): string | null {
  const hostAndPort = input.split(/[/?#]/, 1)[0];
  if (!hostAndPort) {
    return null;
  }

  if (hostAndPort.startsWith("[")) {
    const endIndex = hostAndPort.indexOf("]");
    return endIndex > 1 ? hostAndPort.slice(1, endIndex).toLowerCase() : null;
  }

  const portSeparator = hostAndPort.lastIndexOf(":");
  const maybePort = portSeparator > -1 ? hostAndPort.slice(portSeparator + 1) : "";
  const host = maybePort && /^\d{1,5}$/.test(maybePort) ? hostAndPort.slice(0, portSeparator) : hostAndPort;

  return host ? host.toLowerCase() : null;
}

function isLocalHost(host: string): boolean {
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "host.docker.internal" ||
    host.endsWith(".local") ||
    host === "::1"
  ) {
    return true;
  }

  const parts = host.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }

  return (
    parts[0] === 0 ||
    parts[0] === 10 ||
    parts[0] === 127 ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168)
  );
}

export function createTab(url = createHomeUrl(), title = "New tab"): Tab {
  return {
    id: crypto.randomUUID(),
    title,
    url,
    isLoading: false,
    canGoBack: false,
    canGoForward: false
  };
}

export function closeTab(tabs: Tab[], tabId: string, fallbackTab: Tab = createTab()): { tabs: Tab[]; activeId: string } {
  const index = tabs.findIndex((tab) => tab.id === tabId);

  if (index === -1) {
    return { tabs, activeId: tabs[0]?.id ?? fallbackTab.id };
  }

  const nextTabs = tabs.filter((tab) => tab.id !== tabId);

  if (nextTabs.length === 0) {
    return { tabs: [fallbackTab], activeId: fallbackTab.id };
  }

  const nextActive = nextTabs[Math.min(index, nextTabs.length - 1)];
  return { tabs: nextTabs, activeId: nextActive.id };
}

export function updateTab(tabs: Tab[], tabId: string, patch: Partial<Tab>): Tab[] {
  return tabs.map((tab) => (tab.id === tabId ? { ...tab, ...patch } : tab));
}

export function readableTitle(title: string, url: string): string {
  const trimmed = title.trim();
  if (trimmed) {
    return trimmed.length > 42 ? `${trimmed.slice(0, 39)}...` : trimmed;
  }

  if (isHomeUrl(url)) {
    return "New tab";
  }

  if (isHistoryPageUrl(url)) {
    return "History";
  }

  if (isPdfNoticeUrl(url)) {
    return "PDF opened externally";
  }

  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Untitled";
  }
}

export type CompetitiveThreatRow = {
  rank: number;
  threat: string;
  likelihood: "highest" | "very high" | "high" | "medium-high" | "medium";
  horizon: string;
  severity:
    | "existential"
    | "existential for AOI"
    | "existential for trust"
    | "severe"
    | "severe for AOI"
    | "severe but bounded"
    | "moderate";
  actionThisWeek: string;
  productResponse: string;
  verification: string;
  ownerSurface:
    | "home"
    | "browser"
    | "productivity"
    | "coding"
    | "design"
    | "automation"
    | "settings"
    | "backend"
    | "release";
};

export const AUTOPILOT_COMPETITIVE_THREATS: CompetitiveThreatRow[] = [
  {
    rank: 1,
    threat: "Distribution failure",
    likelihood: "highest",
    horizon: "now",
    severity: "existential",
    actionThisWeek: "Keep signed Windows installers working, publish a clean tester build, and run the install/OAuth/AI smoke path.",
    productResponse: "Package without .env.local, launch cleanly, sign in, pass AI health, and run the flagship demo.",
    verification: "npm run dist:win plus clean install/login/AI smoke.",
    ownerSurface: "release"
  },
  {
    rank: 2,
    threat: "Superhuman owns productivity perception",
    likelihood: "very high",
    horizon: "now",
    severity: "severe",
    actionThisWeek: "Ship keyboard-first triage, split inboxes, fast cached rendering, and blocked-sender privacy.",
    productResponse: "Make Productivity feel instant, keyboard-first, detailed by default, and safe to organize only after approval.",
    verification: "Inbox visible under 150ms cached, shortcut tests, split-inbox tests, and blocked-sender privacy tests.",
    ownerSurface: "productivity"
  },
  {
    rank: 3,
    threat: "Gemini in Chrome normalizes page/context agents",
    likelihood: "very high",
    horizon: "now-6 months",
    severity: "severe",
    actionThisWeek: "Make active-tab reading and browser actions visibly work inside Autopilot's assistant.",
    productResponse: "Show active-tab reading, shared-tab context, DOM inspect/click/fill/scroll steps, and approval before submit/pay/send.",
    verification: "Browser assistant E2E covers read page and safe DOM action approval gates.",
    ownerSurface: "browser"
  },
  {
    rank: 4,
    threat: "Claude/ChatGPT connector ecosystems outpace us",
    likelihood: "very high",
    horizon: "now-12 months",
    severity: "severe",
    actionThisWeek: "Add connector action controls and MCP-shaped tool governance.",
    productResponse: "Expose connector tools, scopes, risk levels, allow/deny state, and audit trails in Settings.",
    verification: "Connector readiness and permission tests cover scoped tools, blocked actions, and Work Twin traces.",
    ownerSurface: "settings"
  },
  {
    rank: 5,
    threat: "Claude Code/Cursor expose Coding shallowness",
    likelihood: "very high",
    horizon: "now",
    severity: "severe",
    actionThisWeek: "Prove real edit/test/diff/approval in one E2E.",
    productResponse: "Make Coding show projects/files, recent code, editor/workbench, plan, run log, changed files, diff, tests, and approval.",
    verification: "Coding golden-path E2E opens an existing project, edits a file, runs a check, shows diff, and waits for approval.",
    ownerSurface: "coding"
  },
  {
    rank: 6,
    threat: "Figma/Canva/Gamma make Design look weak",
    likelihood: "high",
    horizon: "now",
    severity: "severe",
    actionThisWeek: "Keep Design canvas result-first and raise export/template quality.",
    productResponse: "Make Design a result-first artifact studio with Built Items, Sources, Drafts, versions, compact quality, and Send to Coding.",
    verification: "Design visual QA and artifact quality tests cover result-first canvas, five slide layouts, exports, and collapsible panels.",
    ownerSurface: "design"
  },
  {
    rank: 7,
    threat: "Microsoft Copilot wins enterprise accounts",
    likelihood: "high",
    horizon: "6-12 months",
    severity: "severe but bounded",
    actionThisWeek: "Position Autopilot around cross-app and local-first Work Twin routing, not Microsoft-only productivity.",
    productResponse: "Route work across Gmail, Calendar, Browser, Coding, Design, Chatting, Automation, Finance, and future Microsoft sources.",
    verification: "Home demo includes cross-app Work Twin items and source-health coverage beyond Microsoft services.",
    ownerSurface: "home"
  },
  {
    rank: 8,
    threat: "Payment/security incident",
    likelihood: "medium",
    horizon: "anytime",
    severity: "existential",
    actionThisWeek: "Keep server-side enforcement, verified email matching, connected-account lock, and no fake receipts.",
    productResponse: "Require user-owned provider setup, invoice verification, vendor verification, proposal, approval, provider confirmation, and receipt verification.",
    verification: "Payment safety tests cover connected account lock, duplicate prevention, provider confirmation, no fake receipts, and Home receipt verification.",
    ownerSurface: "backend"
  },
  {
    rank: 9,
    threat: "Privacy incident in connected data",
    likelihood: "medium",
    horizon: "anytime",
    severity: "existential for trust",
    actionThisWeek: "Document source data flow, keep raw email/artifact data local by default, and never log secrets.",
    productResponse: "Keep raw source bodies local by default, redact logs, block raw passwords/secrets from AI, and expose data controls.",
    verification: "Privacy tests cover blocked senders, secret redaction, packaged config, and local-first source handling.",
    ownerSurface: "settings"
  },
  {
    rank: 10,
    threat: "OAuth scope breakage",
    likelihood: "medium-high",
    horizon: "anytime",
    severity: "severe",
    actionThisWeek: "Document Gmail/Calendar scopes, reconnect behavior, and fallback states now.",
    productResponse: "Show granted scopes, missing scopes, reconnect prompts, and honest unavailable states per Google capability.",
    verification: "Missing-scope tests cover Gmail read/modify/send, Calendar read/write, and Drive source access.",
    ownerSurface: "settings"
  },
  {
    rank: 11,
    threat: "OSS replication of architecture",
    likelihood: "high",
    horizon: "12-24 months",
    severity: "moderate",
    actionThisWeek: "Deepen handoffs, quality gates, sync metadata, Work Twin replay, and local-first privacy.",
    productResponse: "Make Work Twin replay, provenance, quality gates, approvals, and cross-workspace handoffs visible on every generated output.",
    verification: "Work Twin replay tests include source, plan, output, quality, approval, and external-action proof.",
    ownerSurface: "home"
  },
  {
    rank: 12,
    threat: "Model cost shock",
    likelihood: "medium",
    horizon: "12-24 months",
    severity: "moderate",
    actionThisWeek: "Centralize model calls through AiGateway so token budgeting and model swaps happen in one place.",
    productResponse: "Track model, token estimate, cost estimate, duration, failure reason, and fallback label through AiGateway.",
    verification: "AiGateway tests verify cost/token logging, fallback labels, and no scattered direct model calls.",
    ownerSurface: "backend"
  }
];

export function isCompetitorAnalysisPrompt(value: string): boolean {
  return /\b(comp analysis|competitor analysis|competitive analysis|competitors?|market map|versus|vs\.?)\b/iu.test(value);
}

export function buildCompetitiveThreatAppendix(rows: CompetitiveThreatRow[] = AUTOPILOT_COMPETITIVE_THREATS): string {
  const tableRows = rows
    .map(
      (row) =>
        `| ${row.rank} | ${row.threat} | ${row.likelihood} | ${row.horizon} | ${row.severity} | ${row.actionThisWeek} |`
    )
    .join("\n");

  return [
    "## Threat Appendix",
    "",
    "| # | Threat | Likelihood | Horizon | Severity | Action this week |",
    "|---|---|---|---|---|---|",
    tableRows
  ].join("\n");
}

export function buildThreatResponseMatrix(rows: CompetitiveThreatRow[] = AUTOPILOT_COMPETITIVE_THREATS): string {
  const tableRows = rows
    .map(
      (row) =>
        `| ${row.rank} | ${row.threat} | ${row.productResponse} | ${row.verification} | ${row.ownerSurface} |`
    )
    .join("\n");

  return [
    "## Threat Response Matrix",
    "",
    "| # | Threat | Product response | Verification | Owner surface |",
    "|---|---|---|---|---|",
    tableRows
  ].join("\n");
}

export function getThreatRowsByOwnerSurface(
  ownerSurface: CompetitiveThreatRow["ownerSurface"],
  rows: CompetitiveThreatRow[] = AUTOPILOT_COMPETITIVE_THREATS
): CompetitiveThreatRow[] {
  return rows.filter((row) => row.ownerSurface === ownerSurface);
}

export function validateThreatResponses(rows: CompetitiveThreatRow[] = AUTOPILOT_COMPETITIVE_THREATS): string[] {
  const issues: string[] = [];
  const seenRanks = new Set<number>();

  for (const row of rows) {
    if (seenRanks.has(row.rank)) {
      issues.push(`Threat rank ${row.rank} is duplicated.`);
    }
    seenRanks.add(row.rank);

    if (!row.productResponse.trim()) {
      issues.push(`Threat ${row.rank} is missing a product response.`);
    }
    if (!row.verification.trim()) {
      issues.push(`Threat ${row.rank} is missing verification.`);
    }
    if (!row.actionThisWeek.trim()) {
      issues.push(`Threat ${row.rank} is missing this-week action.`);
    }
  }

  return issues;
}

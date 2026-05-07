import type { ArtifactKind } from "./artifacts.js";
import type { ArtifactQualityCheck, ArtifactQualityReport } from "./artifactQuality.js";

export type AutomationSourceKind = "web" | "gmail" | "calendar" | "slack" | "coding";
export type AutomationSchedule = "manual" | "daily" | "weekly";
export type AutomationOutputKind = "brief" | "document" | "draft" | "research_report";
export type AutomationRunState = "running" | "completed" | "needs_review" | "failed";
export type AutomationSourceWorkspace = "browser" | "productivity" | "design" | "coding" | "automation";
export type AutomationFirstRunMode = "run_now" | "schedule_only" | "ask_first";

export type AutomationIntent = {
  isAutomation: boolean;
  triggerReason: string;
  schedule: AutomationSchedule;
  recurrence: string;
  sourceWorkspace: AutomationSourceWorkspace;
  firstRunMode: AutomationFirstRunMode;
  confidence: number;
  normalizedGoal: string;
};

export type AutomationRecipe = {
  id: string;
  name: string;
  goal: string;
  schedule: AutomationSchedule;
  sources: AutomationSourceKind[];
  outputKind: AutomationOutputKind;
  artifactKind: ArtifactKind;
  sourceWorkspace?: AutomationSourceWorkspace;
  qualityBar: number;
  requiresApproval: boolean;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
};

export type AutomationRunSource = {
  title: string;
  url?: string;
  provider: string;
  snippet?: string;
};

export type AutomationRun = {
  id: string;
  recipeId: string;
  recipeName: string;
  state: AutomationRunState;
  startedAt: number;
  completedAt?: number;
  originatingWorkspace?: AutomationSourceWorkspace;
  linkedWorkItemId?: string;
  linkedWorkAssignmentId?: string;
  linkedArtifactId?: string;
  linkedCodingProjectPath?: string;
  scheduleStatus?: "manual" | "scheduled" | "paused";
  nextRunAt?: number;
  steps: string[];
  sources: AutomationRunSource[];
  outputTitle?: string;
  outputSummary?: string;
  outputMarkdown?: string;
  artifactId?: string;
  qualityScore?: number;
  qualityReport?: ArtifactQualityReport;
  visibleRunLog: string[];
  qualityChecks: string[];
  failureReason?: string;
};

export type AutomationCreateRecipeInput = {
  name: string;
  goal: string;
  schedule?: AutomationSchedule;
  sources?: AutomationSourceKind[];
  outputKind?: AutomationOutputKind;
  artifactKind?: ArtifactKind;
  sourceWorkspace?: AutomationSourceWorkspace;
  qualityBar?: number;
  requiresApproval?: boolean;
  enabled?: boolean;
};

export type AutomationUpdateRecipeInput = Partial<AutomationCreateRecipeInput> & {
  id: string;
};

export type AutomationRunResult =
  | {
      success: true;
      recipe: AutomationRecipe;
      run: AutomationRun;
    }
  | {
      success: false;
      reason: string;
      run?: AutomationRun;
    };

export function detectAutomationIntent(prompt: string, sourceWorkspace: AutomationSourceWorkspace = "automation"): AutomationIntent {
  const normalizedGoal = normalizeGoal(prompt);
  const text = normalizedGoal.toLowerCase();
  const matches: Array<{ pattern: RegExp; reason: string; schedule?: AutomationSchedule; recurrence?: string; weight: number }> = [
    { pattern: /\b(every day|daily|each morning|every morning|morning brief)\b/u, reason: "daily recurring request", schedule: "daily", recurrence: "daily", weight: 44 },
    { pattern: /\b(every week|weekly|each week|friday|monday report)\b/u, reason: "weekly recurring request", schedule: "weekly", recurrence: "weekly", weight: 40 },
    { pattern: /\b(keep checking|keep watching|monitor|watch this|track|whenever|each time|every time)\b/u, reason: "monitoring request", schedule: "manual", recurrence: "event-based", weight: 38 },
    { pattern: /\b(send me|give me|generate|create|draft)\b.{0,80}\b(brief|digest|report|summary|update)\b/u, reason: "repeatable output request", schedule: "manual", recurrence: "repeatable", weight: 22 },
    { pattern: /\b(recurring|schedule|automate|automation|background)\b/u, reason: "explicit automation wording", schedule: "manual", recurrence: "recurring", weight: 50 }
  ];
  let score = 0;
  let triggerReason = "";
  let schedule: AutomationSchedule = "manual";
  let recurrence = "one-time";

  for (const match of matches) {
    if (!match.pattern.test(text)) {
      continue;
    }

    score += match.weight;
    triggerReason = triggerReason || match.reason;
    if (match.schedule && schedule === "manual") {
      schedule = match.schedule;
    }
    if (match.recurrence && recurrence === "one-time") {
      recurrence = match.recurrence;
    }
  }

  if (/\b(industry|competitor|market|news|research|trend|brief|digest)\b/u.test(text)) {
    score += 12;
  }

  const confidence = Math.min(100, score);
  return {
    isAutomation: confidence >= 38,
    triggerReason: triggerReason || "one-time request",
    schedule,
    recurrence,
    sourceWorkspace,
    firstRunMode: confidence >= 38 ? "run_now" : "ask_first",
    confidence,
    normalizedGoal
  };
}

export function sanitizeAutomationRecipes(value: unknown): AutomationRecipe[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }
    const recipe = item as Partial<AutomationRecipe>;
    const name = cleanString(recipe.name, 120);
    const goal = cleanString(recipe.goal, 1000);
    if (!name || !goal) {
      return [];
    }

    return [
      {
        id: cleanString(recipe.id, 160) || makeLocalId("automation-recipe"),
        name,
        goal,
        schedule: sanitizeSchedule(recipe.schedule),
        sources: sanitizeSources(recipe.sources),
        outputKind: sanitizeOutputKind(recipe.outputKind),
        artifactKind: sanitizeArtifactKind(recipe.artifactKind),
        sourceWorkspace: sanitizeSourceWorkspace(recipe.sourceWorkspace),
        qualityBar: sanitizeQualityBar(recipe.qualityBar),
        requiresApproval: recipe.requiresApproval !== false,
        enabled: recipe.enabled !== false,
        createdAt: cleanTime(recipe.createdAt),
        updatedAt: cleanTime(recipe.updatedAt)
      }
    ];
  });
}

export function sanitizeAutomationRuns(value: unknown): AutomationRun[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }
    const run = item as Partial<AutomationRun>;
    const recipeId = cleanString(run.recipeId, 160);
    const recipeName = cleanString(run.recipeName, 160);
    if (!recipeId || !recipeName) {
      return [];
    }

    return [
      {
        id: cleanString(run.id, 160) || makeLocalId("automation-run"),
        recipeId,
        recipeName,
        state: sanitizeRunState(run.state),
        startedAt: cleanTime(run.startedAt),
        completedAt: typeof run.completedAt === "number" && Number.isFinite(run.completedAt) ? run.completedAt : undefined,
        originatingWorkspace: sanitizeSourceWorkspace(run.originatingWorkspace),
        linkedWorkItemId: cleanString(run.linkedWorkItemId, 220) || undefined,
        linkedWorkAssignmentId: cleanString(run.linkedWorkAssignmentId, 220) || undefined,
        linkedArtifactId: cleanString(run.linkedArtifactId, 180) || undefined,
        linkedCodingProjectPath: cleanString(run.linkedCodingProjectPath, 2048) || undefined,
        scheduleStatus: run.scheduleStatus === "scheduled" || run.scheduleStatus === "paused" ? run.scheduleStatus : "manual",
        nextRunAt: typeof run.nextRunAt === "number" && Number.isFinite(run.nextRunAt) ? run.nextRunAt : undefined,
        steps: Array.isArray(run.steps) ? run.steps.map((step) => cleanString(step, 220)).filter(Boolean).slice(0, 20) : [],
        sources: Array.isArray(run.sources)
          ? run.sources.flatMap((source) => sanitizeRunSource(source) ?? []).slice(0, 20)
          : [],
        outputTitle: cleanString(run.outputTitle, 180) || undefined,
        outputSummary: cleanString(run.outputSummary, 500) || undefined,
        outputMarkdown: typeof run.outputMarkdown === "string" ? run.outputMarkdown.replace(/\r/g, "").slice(0, 60000) : undefined,
        artifactId: cleanString(run.artifactId, 180) || undefined,
        qualityScore: typeof run.qualityScore === "number" && Number.isFinite(run.qualityScore) ? Math.max(0, Math.min(100, Math.round(run.qualityScore))) : undefined,
        qualityReport: sanitizeQualityReport(run.qualityReport),
        visibleRunLog: Array.isArray(run.visibleRunLog) ? run.visibleRunLog.map((entry) => cleanString(entry, 260)).filter(Boolean).slice(0, 20) : [],
        qualityChecks: Array.isArray(run.qualityChecks) ? run.qualityChecks.map((check) => cleanString(check, 260)).filter(Boolean).slice(0, 12) : [],
        failureReason: cleanString(run.failureReason, 800) || undefined
      }
    ];
  });
}

function normalizeGoal(prompt: string): string {
  return prompt.replace(/\s+/gu, " ").trim().slice(0, 1000);
}

function sanitizeSourceWorkspace(value: unknown): AutomationSourceWorkspace | undefined {
  return value === "browser" || value === "productivity" || value === "design" || value === "coding" || value === "automation" ? value : undefined;
}

function sanitizeRunSource(value: unknown): AutomationRunSource | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const source = value as Partial<AutomationRunSource>;
  const title = cleanString(source.title, 220);
  if (!title) {
    return null;
  }
  return {
    title,
    url: cleanString(source.url, 2048) || undefined,
    provider: cleanString(source.provider, 80) || "web",
    snippet: cleanString(source.snippet, 500) || undefined
  };
}

function sanitizeSources(value: unknown): AutomationSourceKind[] {
  const sources = Array.isArray(value) ? value.flatMap((source) => sanitizeSource(source) ?? []) : [];
  return sources.length > 0 ? [...new Set(sources)] : ["web"];
}

function sanitizeSource(value: unknown): AutomationSourceKind | null {
  return value === "web" || value === "gmail" || value === "calendar" || value === "slack" || value === "coding" ? value : null;
}

function sanitizeSchedule(value: unknown): AutomationSchedule {
  return value === "daily" || value === "weekly" ? value : "manual";
}

function sanitizeOutputKind(value: unknown): AutomationOutputKind {
  return value === "document" || value === "draft" || value === "research_report" ? value : "brief";
}

function sanitizeArtifactKind(value: unknown): ArtifactKind {
  return value === "slide_deck" || value === "website_design" ? value : "document";
}

function sanitizeRunState(value: unknown): AutomationRunState {
  return value === "completed" || value === "needs_review" || value === "failed" ? value : "running";
}

function sanitizeQualityReport(value: unknown): ArtifactQualityReport | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const report = value as Partial<ArtifactQualityReport>;
  const checks = Array.isArray(report.checks)
    ? report.checks.flatMap((check) => sanitizeQualityCheck(check) ?? [])
    : [];
  if (checks.length === 0) {
    return undefined;
  }

  const passedChecks = checks.filter((check) => check.passed);
  const failedChecks = checks.filter((check) => !check.passed);
  const score =
    typeof report.score === "number" && Number.isFinite(report.score)
      ? Math.max(0, Math.min(100, Math.round(report.score)))
      : Math.round((passedChecks.length / checks.length) * 100);
  const sourceCopyRatio =
    typeof report.sourceCopyRatio === "number" && Number.isFinite(report.sourceCopyRatio)
      ? Math.max(0, Math.min(1, report.sourceCopyRatio))
      : typeof report.copyRatio === "number" && Number.isFinite(report.copyRatio)
        ? Math.max(0, Math.min(1, report.copyRatio))
        : 0;
  const regeneration =
    report.regeneration === "regenerated" || report.regeneration === "needs_review" ? report.regeneration : "not_needed";

  return {
    passed: typeof report.passed === "boolean" ? report.passed : failedChecks.length === 0,
    score,
    copyRatio: sourceCopyRatio,
    sourceCopyRatio,
    exportReady: typeof report.exportReady === "boolean" ? report.exportReady : passedChecks.some((check) => check.id === "export_ready"),
    checks,
    passedChecks,
    failedChecks,
    summary: cleanString(report.summary, 280) || (failedChecks.length === 0 ? `Quality passed at ${score}/100.` : `Quality needs review at ${score}/100.`),
    regeneration
  };
}

function sanitizeQualityCheck(value: unknown): ArtifactQualityCheck | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const check = value as Partial<ArtifactQualityCheck>;
  if (
    check.id !== "structure" &&
    check.id !== "not_source_restatement" &&
    check.id !== "actionable" &&
    check.id !== "appropriate_length" &&
    check.id !== "low_source_copy_ratio" &&
    check.id !== "research_sources" &&
    check.id !== "export_ready"
  ) {
    return null;
  }

  const label = cleanString(check.label, 160);
  return {
    id: check.id,
    label: label || check.id,
    passed: check.passed === true,
    detail: cleanString(check.detail, 360) || "No detail provided."
  };
}

function sanitizeQualityBar(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(50, Math.min(100, Math.round(value))) : 82;
}

function cleanString(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, maxLength) : "";
}

function cleanTime(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : Date.now();
}

function makeLocalId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}:${crypto.randomUUID()}`;
  }
  return `${prefix}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 10)}`;
}

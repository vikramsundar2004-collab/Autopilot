import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { evaluateDocumentQuality, summarizeQualityFailure } from "../shared/artifactQuality.js";
import type {
  AutomationCreateRecipeInput,
  AutomationRecipe,
  AutomationRun,
  AutomationRunResult,
  AutomationUpdateRecipeInput
} from "../shared/automation.js";
import { sanitizeAutomationRecipes, sanitizeAutomationRuns } from "../shared/automation.js";
import type { CodingWorkspace } from "./coding.js";
import type { ArtifactStore } from "./artifacts.js";

const AUTOMATION_RECIPES_FILE = "automation-recipes.json";
const AUTOMATION_RUNS_FILE = "automation-runs.json";
const MAX_AUTOMATION_RUNS = 120;
const MAX_CONCURRENT_AUTOMATION_RUNS = 2;

type AutomationRecipeFile = {
  version: 1;
  recipes: AutomationRecipe[];
};

type AutomationRunFile = {
  version: 1;
  runs: AutomationRun[];
};

export class AutomationService {
  private recipes: AutomationRecipe[] | null = null;
  private runs: AutomationRun[] | null = null;
  private activeRecipeRunIds = new Set<string>();
  private activeRunCount = 0;

  constructor(
    private readonly dataRoot: string | (() => string),
    private readonly codingWorkspace: CodingWorkspace,
    private readonly artifactStore: ArtifactStore
  ) {}

  async listRecipes(): Promise<AutomationRecipe[]> {
    return structuredClone(await this.ensureRecipesLoaded());
  }

  async listRuns(): Promise<AutomationRun[]> {
    return structuredClone(await this.ensureRunsLoaded());
  }

  async createRecipe(input: AutomationCreateRecipeInput): Promise<AutomationRecipe[]> {
    const recipes = await this.ensureRecipesLoaded();
    const now = Date.now();
    const [recipe] = sanitizeAutomationRecipes([
      {
        id: makeId("automation-recipe"),
        name: input.name,
        goal: input.goal,
        schedule: input.schedule ?? "manual",
        sources: input.sources ?? ["web"],
        outputKind: input.outputKind ?? "brief",
        artifactKind: input.artifactKind ?? "document",
        sourceWorkspace: input.sourceWorkspace,
        qualityBar: input.qualityBar ?? 82,
        requiresApproval: input.requiresApproval ?? true,
        enabled: input.enabled ?? true,
        createdAt: now,
        updatedAt: now
      }
    ]);

    if (!recipe) {
      return structuredClone(recipes);
    }

    this.recipes = [recipe, ...recipes].slice(0, 100);
    await this.saveRecipes();
    return structuredClone(this.recipes);
  }

  async updateRecipe(input: AutomationUpdateRecipeInput): Promise<AutomationRecipe[]> {
    const recipes = await this.ensureRecipesLoaded();
    const existing = recipes.find((recipe) => recipe.id === input.id);
    if (!existing) {
      return structuredClone(recipes);
    }

    const [updated] = sanitizeAutomationRecipes([
      {
        ...existing,
        ...input,
        updatedAt: Date.now()
      }
    ]);
    if (!updated) {
      return structuredClone(recipes);
    }

    this.recipes = recipes.map((recipe) => (recipe.id === updated.id ? updated : recipe));
    await this.saveRecipes();
    return structuredClone(this.recipes);
  }

  async deleteRecipe(recipeId: string): Promise<AutomationRecipe[]> {
    const recipes = await this.ensureRecipesLoaded();
    this.recipes = recipes.filter((recipe) => recipe.id !== recipeId);
    await this.saveRecipes();
    return structuredClone(this.recipes);
  }

  async runNow(recipeId: string): Promise<AutomationRunResult> {
    const recipe = (await this.ensureRecipesLoaded()).find((candidate) => candidate.id === recipeId);
    if (!recipe) {
      return {
        success: false,
        reason: "Automation recipe was not found."
      };
    }

    const queuedAt = Date.now();
    const idempotencyKey = `${recipe.id}:${recipe.updatedAt}:${Math.floor(queuedAt / 60_000)}`;
    if (this.activeRecipeRunIds.has(recipe.id)) {
      const run = await this.saveBlockedRun(recipe, queuedAt, idempotencyKey, "blocked_duplicate", "This recipe already has an active run. Autopilot will not run it 10 times at once.");
      return { success: false, reason: run.failureReason ?? "Automation recipe already has an active run.", run };
    }
    if (this.activeRunCount >= MAX_CONCURRENT_AUTOMATION_RUNS) {
      const run = await this.saveBlockedRun(recipe, queuedAt, idempotencyKey, "blocked_concurrency", "Two automations are already running. Try again after one finishes.");
      return { success: false, reason: run.failureReason ?? "Automation concurrency limit reached.", run };
    }

    this.activeRecipeRunIds.add(recipe.id);
    this.activeRunCount += 1;
    const startedAt = Date.now();
    const runLock = {
      recipeId: recipe.id,
      runId: makeId("automation-run-lock"),
      acquiredAt: startedAt,
      idempotencyKey
    };
    const baseSteps = [
      "Loaded automation recipe.",
      "Selected web research as the first live capability.",
      "Ran recursive browser-backed research.",
      "Built a structured draft with sources and next steps.",
      "Checked quality before saving output."
    ];

    try {
      if (recipe.outputKind === "payment_proposal") {
        const completedAt = Date.now();
        const runContext = getAutomationRunContext(recipe, startedAt);
        const paymentSteps = [
          "Loaded recurring payment automation.",
          "Confirmed this run may only prepare a payment review, not move money.",
          "Created a payment proposal checklist for Finance and Home.",
          "Stopped before invoice verification, provider approval, or execution."
        ];
        const paymentMarkdown = buildRecurringPaymentAutomationMarkdown(recipe);
        const reviewRun = await this.saveRun({
          id: makeId("automation-run"),
          recipeId: recipe.id,
          recipeName: recipe.name,
          state: "needs_review",
          queuedAt,
          idempotencyKey,
          lock: runLock,
          startedAt,
          completedAt,
          ...runContext,
          steps: paymentSteps,
          sources: recipe.sources.map((source) => ({
            title: `${source} source`,
            provider: source,
            snippet: "Recurring payment automation will inspect this source before preparing each proposal."
          })),
          outputTitle: `${recipe.name}: payment review`,
          outputSummary: "Recurring payment proposal prepared. Invoice and vendor verification are still required before any money can move.",
          outputMarkdown: paymentMarkdown,
          qualityScore: 100,
          visibleRunLog: paymentSteps,
          qualityChecks: [
            "pass: External payment execution stayed blocked.",
            "pass: Finance review remains required.",
            "pass: Home will surface this run for receipt/proposal review."
          ],
          failureReason: "Waiting for user review, invoice verification, and per-payment approval."
        });
        return { success: true, recipe, run: reviewRun };
      }

    const firstReport = await this.codingWorkspace.research(recipe.goal);
    let markdown = buildAutomationMarkdown(recipe, firstReport.success ? firstReport.answer : firstReport.reason, firstReport.success ? firstReport.sources : []);
    let quality = evaluateDocumentQuality(markdown, recipe.goal, {
      minWords: 130,
      requireSources: recipe.sources.includes("web") || recipe.outputKind === "research_report"
    });
    let report = firstReport;

    if (!quality.passed || quality.score < recipe.qualityBar) {
      baseSteps.push("Quality missed the bar, so Autopilot regenerated once with a stricter brief.");
      const retryReport = await this.codingWorkspace.research(`${recipe.goal} concrete recommendations citations next steps current sources`);
      const retryMarkdown = buildAutomationMarkdown(
        recipe,
        retryReport.success ? retryReport.answer : retryReport.reason,
        retryReport.success ? retryReport.sources : []
      );
      const retryQuality = evaluateDocumentQuality(retryMarkdown, recipe.goal, {
        minWords: 130,
        requireSources: recipe.sources.includes("web") || recipe.outputKind === "research_report"
      });
      if (retryQuality.score >= quality.score) {
        markdown = retryMarkdown;
        quality = retryQuality;
        report = retryReport;
      }
    }

    const sources = (report.sources ?? []).map((source) => ({
      title: source.title,
      url: source.url,
      provider: source.provider,
      snippet: source.snippet
    }));
    const outputTitle = `${recipe.name}: ${new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date())}`;
    const completedAt = Date.now();
    const runContext = getAutomationRunContext(recipe, startedAt);

    if (!report.success) {
      const failedRun = await this.saveRun({
        id: makeId("automation-run"),
        recipeId: recipe.id,
        recipeName: recipe.name,
        state: "failed",
        queuedAt,
        idempotencyKey,
        lock: runLock,
        startedAt,
        completedAt,
        ...runContext,
        steps: [...baseSteps, "Automation stopped because research failed."],
        sources,
        outputTitle,
        outputSummary: "Automation could not complete.",
        outputMarkdown: markdown,
        qualityScore: quality.score,
        qualityReport: quality,
        visibleRunLog: [...baseSteps, "Automation stopped because research failed.", report.reason],
        qualityChecks: quality.checks.map((check) => `${check.passed ? "pass" : "fail"}: ${check.label}`),
        failureReason: report.reason
      });
      return { success: false, reason: report.reason, run: failedRun };
    }

    if (!quality.passed || quality.score < recipe.qualityBar) {
      const reason = summarizeQualityFailure(quality);
      const needsReviewRun = await this.saveRun({
        id: makeId("automation-run"),
        recipeId: recipe.id,
        recipeName: recipe.name,
        state: "needs_review",
        queuedAt,
        idempotencyKey,
        lock: runLock,
        startedAt,
        completedAt,
        ...runContext,
        steps: [...baseSteps, "Automation kept the draft in the run log because it did not meet the quality bar."],
        sources,
        outputTitle,
        outputSummary: "Draft needs review before becoming an artifact.",
        outputMarkdown: markdown,
        qualityScore: quality.score,
        qualityReport: quality,
        visibleRunLog: [...baseSteps, "Quality failed after one regeneration.", reason],
        qualityChecks: quality.checks.map((check) => `${check.passed ? "pass" : "fail"}: ${check.label}`),
        failureReason: reason
      });
      return { success: false, reason, run: needsReviewRun };
    }

    const artifact = await this.artifactStore.createArtifact({
      kind: recipe.artifactKind,
      title: outputTitle,
      summary: `Automation completed with a ${quality.score}/100 quality score.`,
      prompt: recipe.goal,
      source: {
        provider: "manual",
        label: `Automation - ${recipe.name}`
      },
      visibility: "ai_generated",
      content: {
        kind: "document",
        markdown
      }
    });

    const completedRun = await this.saveRun({
      id: makeId("automation-run"),
      recipeId: recipe.id,
      recipeName: recipe.name,
      state: "completed",
      queuedAt,
      idempotencyKey,
      lock: runLock,
      startedAt,
      completedAt,
      steps: [...baseSteps, "Saved the finished output as a Design artifact."],
      sources,
      outputTitle,
      outputSummary: artifact.summary,
      outputMarkdown: markdown,
      artifactId: artifact.id,
      linkedArtifactId: artifact.id,
      ...runContext,
      qualityScore: quality.score,
      qualityReport: quality,
      visibleRunLog: [...baseSteps, `Quality passed at ${quality.score}/100.`, "Saved the finished output as a Design artifact."],
      qualityChecks: quality.checks.map((check) => `${check.passed ? "pass" : "fail"}: ${check.label}`)
    });

    return {
      success: true,
      recipe,
      run: completedRun
    };
    } finally {
      this.activeRecipeRunIds.delete(recipe.id);
      this.activeRunCount = Math.max(0, this.activeRunCount - 1);
    }
  }

  async createAndRunAdHoc(input: AutomationCreateRecipeInput): Promise<AutomationRunResult> {
    const recipes = await this.createRecipe(input);
    const recipe = recipes[0];
    if (!recipe) {
      return { success: false, reason: "Automation recipe could not be created." };
    }
    return this.runNow(recipe.id);
  }

  private async saveRun(run: AutomationRun): Promise<AutomationRun> {
    const runs = await this.ensureRunsLoaded();
    this.runs = sanitizeAutomationRuns([run, ...runs]).slice(0, MAX_AUTOMATION_RUNS);
    await this.saveRuns();
    return structuredClone(this.runs[0]);
  }

  private async saveBlockedRun(
    recipe: AutomationRecipe,
    requestedAt: number,
    idempotencyKey: string,
    blockedState: "blocked_duplicate" | "blocked_concurrency",
    reason: string
  ): Promise<AutomationRun> {
    return this.saveRun({
      id: makeId("automation-run"),
      recipeId: recipe.id,
      recipeName: recipe.name,
      state: "failed",
      queuedAt: requestedAt,
      idempotencyKey,
      startedAt: requestedAt,
      completedAt: requestedAt,
      ...getAutomationRunContext(recipe, requestedAt),
      steps: ["Queued automation run.", reason],
      sources: [],
      outputTitle: recipe.name,
      outputSummary: "Automation did not start because the run queue protected the app from duplicate work.",
      visibleRunLog: ["Queued automation run.", `${blockedState}: ${reason}`],
      qualityChecks: [],
      failureReason: reason
    });
  }

  private async ensureRecipesLoaded(): Promise<AutomationRecipe[]> {
    if (this.recipes) {
      return this.recipes;
    }

    try {
      const parsed = JSON.parse(await fs.readFile(this.getRecipesPath(), "utf8")) as Partial<AutomationRecipeFile>;
      this.recipes = sanitizeAutomationRecipes(parsed.recipes);
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? (error as NodeJS.ErrnoException).code : undefined;
      if (code !== "ENOENT") {
        console.warn("Autopilot could not load automation recipes.", error);
      }
      this.recipes = [];
    }

    return this.recipes;
  }

  private async ensureRunsLoaded(): Promise<AutomationRun[]> {
    if (this.runs) {
      return this.runs;
    }

    try {
      const parsed = JSON.parse(await fs.readFile(this.getRunsPath(), "utf8")) as Partial<AutomationRunFile>;
      this.runs = sanitizeAutomationRuns(parsed.runs);
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? (error as NodeJS.ErrnoException).code : undefined;
      if (code !== "ENOENT") {
        console.warn("Autopilot could not load automation runs.", error);
      }
      this.runs = [];
    }

    return this.runs;
  }

  private async saveRecipes(): Promise<void> {
    if (!this.recipes) {
      return;
    }
    const filePath = this.getRecipesPath();
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify({ version: 1, recipes: this.recipes } satisfies AutomationRecipeFile, null, 2), "utf8");
  }

  private async saveRuns(): Promise<void> {
    if (!this.runs) {
      return;
    }
    const filePath = this.getRunsPath();
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify({ version: 1, runs: this.runs } satisfies AutomationRunFile, null, 2), "utf8");
  }

  private getRecipesPath(): string {
    return path.join(this.getDataRoot(), AUTOMATION_RECIPES_FILE);
  }

  private getRunsPath(): string {
    return path.join(this.getDataRoot(), AUTOMATION_RUNS_FILE);
  }

  private getDataRoot(): string {
    return typeof this.dataRoot === "function" ? this.dataRoot() : this.dataRoot;
  }
}

function buildAutomationMarkdown(recipe: AutomationRecipe, researchAnswer: string, sources: Array<{ title: string; url: string; snippet: string }>): string {
  const executiveBrief = cleanAutomationResearchAnswer(researchAnswer, recipe.goal);
  const sourceList =
    sources.length > 0
      ? sources.map((source) => `- ${source.title}: ${source.url}\n  ${source.snippet}`).join("\n")
      : "- No live sources were returned. Treat this as incomplete and rerun with a narrower prompt.";
  const recommendations =
    sources.length > 0
      ? sources
          .slice(0, 4)
          .map((source, index) => `- ${index + 1}. Use "${source.title}" as a signal, then validate the specific implication before acting.`)
          .join("\n")
      : "- Re-run this automation with a more specific industry, company, or time window.";

  return `# ${recipe.name}

## Intended Outcome
${buildAutomationOutcomeSummary(recipe)}

## Executive Brief
${executiveBrief}

## What Autopilot Recommends
${recommendations}

## Action Plan
- Review the live source list and remove anything that is not relevant.
- Turn the strongest signal into a draft, slide, design artifact, or coding task depending on the requested output.
- Ask for final approval before sending, publishing, sharing, submitting, or deleting anything.

## Sources
${sourceList}

## Quality Notes
- Quality bar: ${recipe.qualityBar}/100.
- Approval required: ${recipe.requiresApproval ? "yes" : "no"}.
- Schedule: ${recipe.schedule}.
`;
}

function cleanAutomationResearchAnswer(answer: string, sourcePrompt: string): string {
  const promptOpening = sourcePrompt.replace(/\s+/g, " ").trim().slice(0, 220);
  let cleaned = answer.replace(/\s+/g, " ").trim();
  if (promptOpening.length > 40) {
    cleaned = cleaned.replace(new RegExp(escapeRegExp(promptOpening), "giu"), "").trim();
  }
  cleaned = cleaned
    .replace(/\b(the user asked|the request asks|this prompt asks|you asked)\b[^.]{0,220}\./giu, "")
    .replace(/\bI (read|found|looked at) the (prompt|request)\b[^.]{0,180}\./giu, "")
    .replace(/\s{2,}/gu, " ")
    .trim();

  if (cleaned.length >= 160) {
    return cleaned;
  }

  return [
    "Autopilot prepared this as a review-ready automation brief rather than a source recap.",
    "Use the sources below to validate the specific claims, then turn the best finding into an email-ready report or coding follow-up.",
    "Keep sending, publishing, submitting, deleting, and payments behind explicit approval."
  ].join(" ");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function buildAutomationOutcomeSummary(recipe: AutomationRecipe): string {
  const cadence =
    recipe.schedule === "manual"
      ? "when the user starts it"
      : recipe.schedule === "weekly"
        ? "on a weekly schedule"
        : recipe.schedule === "daily"
          ? "on a daily schedule"
          : recipe.schedule === "hourly"
            ? "on an hourly schedule"
            : recipe.schedule === "startup"
              ? "when Autopilot starts"
              : "on its configured schedule";
  const output =
    recipe.outputKind === "payment_proposal"
      ? "verified payment review"
      : recipe.artifactKind === "slide_deck"
        ? "slide-ready work"
        : recipe.artifactKind === "website_design"
          ? "website design work"
          : "approval-ready brief";
  const sources = recipe.sources.length > 0 ? recipe.sources.join(", ") : "connected Autopilot sources";
  const approvalCopy = recipe.requiresApproval ? "Final external actions stay blocked until approval." : "The result still records a review trail.";

  return `Prepare ${output} ${cadence} using ${sources}. Focus on the requested domain, convert findings into a useful next step, and avoid copying the original instruction back to the user. ${approvalCopy}`;
}

function buildRecurringPaymentAutomationMarkdown(recipe: AutomationRecipe): string {
  return `# ${recipe.name}

## Recurring payment intent
${recipe.goal}

## Safety contract
- This automation can find likely invoices and prepare payment proposals.
- It cannot execute, submit, or open final payment confirmation on its own.
- Every run requires invoice verification, vendor verification, provider readiness, and per-payment approval.
- Completed payments will appear on Home with a Verify receipt action.

## Next review steps
1. Inspect the source invoice or vendor request.
2. Confirm payee, amount, due date, invoice number, and payment destination.
3. Create a payment proposal only after verification passes.
4. Approve and execute through the connected user-owned provider.
5. Verify the provider receipt from Home after the payment finishes.
`;
}

function getAutomationRunContext(recipe: AutomationRecipe, startedAt: number): Pick<AutomationRun, "originatingWorkspace" | "scheduleStatus" | "nextRunAt"> {
  return {
    originatingWorkspace: recipe.sourceWorkspace ?? getWorkspaceFromSources(recipe),
    scheduleStatus: recipe.schedule === "manual" ? "manual" : "scheduled",
    nextRunAt: recipe.schedule === "manual" ? undefined : getNextRunAt(recipe.schedule, startedAt)
  };
}

function getWorkspaceFromSources(recipe: AutomationRecipe): AutomationRun["originatingWorkspace"] {
  if (recipe.sources.includes("coding")) {
    return "coding";
  }
  if (recipe.sources.includes("gmail") || recipe.sources.includes("calendar") || recipe.sources.includes("slack")) {
    return "productivity";
  }
  return "automation";
}

function getNextRunAt(schedule: AutomationRecipe["schedule"], startedAt: number): number | undefined {
  if (schedule === "daily") {
    return startedAt + 24 * 60 * 60 * 1000;
  }
  if (schedule === "weekly") {
    return startedAt + 7 * 24 * 60 * 60 * 1000;
  }
  return undefined;
}

function makeId(prefix: string): string {
  return `${prefix}:${randomUUID()}`;
}

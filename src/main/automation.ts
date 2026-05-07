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

    const startedAt = Date.now();
    const baseSteps = [
      "Loaded automation recipe.",
      "Selected web research as the first live capability.",
      "Ran recursive browser-backed research.",
      "Built a structured draft with sources and next steps.",
      "Checked quality before saving output."
    ];

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

## Goal
${recipe.goal}

## Executive Brief
${researchAnswer}

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

import { describe, expect, it } from "vitest";

import { detectAutomationIntent, sanitizeAutomationRecipes, sanitizeAutomationRuns } from "../src/shared/automation";

describe("automation shared models", () => {
  it("detects recurring automation intent without requiring a global launcher", () => {
    const intent = detectAutomationIntent("Send me a daily AI browser industry brief every morning", "coding");

    expect(intent.isAutomation).toBe(true);
    expect(intent.schedule).toBe("daily");
    expect(intent.sourceWorkspace).toBe("coding");
    expect(intent.firstRunMode).toBe("run_now");
    expect(intent.triggerReason).toContain("daily");
  });

  it("keeps one-time workspace prompts out of automation", () => {
    const intent = detectAutomationIntent("Fix the button label in this screen", "design");

    expect(intent.isAutomation).toBe(false);
    expect(intent.firstRunMode).toBe("ask_first");
  });

  it("detects browser assistant prompts as workspace automations", () => {
    const intent = detectAutomationIntent("Monitor AI browser news and send me a report every Friday", "browser");

    expect(intent.isAutomation).toBe(true);
    expect(intent.schedule).toBe("weekly");
    expect(intent.sourceWorkspace).toBe("browser");
    expect(intent.triggerReason).toMatch(/weekly|monitoring/u);
  });

  it("detects productivity recurring digests without a global start button", () => {
    const intent = detectAutomationIntent("Create a weekly school action digest from Gmail and Calendar", "productivity");

    expect(intent.isAutomation).toBe(true);
    expect(intent.schedule).toBe("weekly");
    expect(intent.sourceWorkspace).toBe("productivity");
    expect(intent.firstRunMode).toBe("run_now");
  });

  it("keeps automation recipes durable and approval-first", () => {
    const [recipe] = sanitizeAutomationRecipes([
      {
        id: "recipe-1",
        name: "Daily AI browser brief",
        goal: "Research industry news and produce a daily brief",
        schedule: "daily",
        sources: ["web", "calendar", "unknown"],
        outputKind: "research_report",
        artifactKind: "document",
        qualityBar: 120,
        requiresApproval: true,
        enabled: true,
        createdAt: 1,
        updatedAt: 1
      }
    ]);

    expect(recipe.sources).toEqual(["web", "calendar"]);
    expect(recipe.qualityBar).toBe(100);
    expect(recipe.requiresApproval).toBe(true);
  });

  it("sanitizes automation runs without inventing fake success", () => {
    const [run] = sanitizeAutomationRuns([
      {
        id: "run-1",
        recipeId: "recipe-1",
        recipeName: "Daily AI browser brief",
        state: "needs_review",
        startedAt: 1,
        originatingWorkspace: "coding",
        linkedWorkItemId: "work-1",
        scheduleStatus: "scheduled",
        nextRunAt: 2,
        steps: ["Loaded recipe", "Quality failed"],
        sources: [{ title: "Source", url: "https://example.com", provider: "web" }],
        qualityScore: 61,
        qualityChecks: ["fail: Concrete recommendations"],
        failureReason: "Quality bar was not met"
      }
    ]);

    expect(run.state).toBe("needs_review");
    expect(run.originatingWorkspace).toBe("coding");
    expect(run.linkedWorkItemId).toBe("work-1");
    expect(run.scheduleStatus).toBe("scheduled");
    expect(run.failureReason).toBe("Quality bar was not met");
    expect(run.sources[0].provider).toBe("web");
  });
});

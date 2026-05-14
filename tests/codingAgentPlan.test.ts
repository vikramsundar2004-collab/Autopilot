import { describe, expect, it } from "vitest";

import {
  advanceCodingAgentPlan,
  assessCodingTask,
  createCodingAgentPlanFromOverview,
  parseGitPorcelainStatus,
  type CodingRepoOverview
} from "../src/shared/coding";

describe("coding agent workflow models", () => {
  it("parses git porcelain status into reviewable changed files", () => {
    expect(parseGitPorcelainStatus(" M src/renderer/App.tsx\nA  tests/new.test.ts\n?? docs/plan.md\nR  old.ts -> src/new.ts")).toEqual([
      {
        path: "src/renderer/App.tsx",
        status: "M",
        staged: false,
        unstaged: true
      },
      {
        path: "tests/new.test.ts",
        status: "A",
        staged: true,
        unstaged: false
      },
      {
        path: "docs/plan.md",
        status: "??",
        staged: false,
        unstaged: true
      },
      {
        path: "src/new.ts",
        status: "R",
        staged: true,
        unstaged: false
      }
    ]);
  });

  it("builds an approval-first Codex-style plan from repo understanding", () => {
    const overview: CodingRepoOverview = {
      projectName: "Autopilot Browser",
      rootPath: "C:/Projects/Autopilot",
      generatedAt: 1,
      packageManager: "npm",
      scripts: [
        { name: "check", command: "npm run check" },
        { name: "test", command: "npm test" },
        { name: "build", command: "npm run build" }
      ],
      frameworkHints: ["Electron", "React", "TypeScript"],
      keyFiles: ["src/main/coding.ts", "src/renderer/App.tsx"],
      gitBranch: "main",
      changedFiles: parseGitPorcelainStatus(" M src/renderer/App.tsx"),
      summary: "Autopilot Browser is an Electron React app with coding workspace APIs."
    };

    const plan = createCodingAgentPlanFromOverview({
      id: "plan-1",
      goal: "Add Codex-style review",
      overview,
      now: 2
    });

    expect(plan.goal).toBe("Add Codex-style review");
    expect(plan.assessment.size).toBe("standard");
    expect(plan.phase).toBe("schema");
    expect(plan.schema.expectedOutput).toContain("Scoped implementation");
    expect(plan.suggestedCommands).toEqual(["npm run check", "npm run test", "npm run build"]);
    expect(plan.steps.map((step) => step.title)).toEqual([
      "Understand the request",
      "Inspect affected files",
      "Implement scoped changes",
      "Run verification",
      "Review diff and ask for approval"
    ]);
    expect(plan.risks.join(" ")).toContain("already changed in git");
    expect(plan.steps.at(-1)?.detail).toContain("approval");
  });

  it("loads project memory into the coding plan before edits", () => {
    const overview: CodingRepoOverview = {
      projectName: "Client Portal",
      rootPath: "C:/Projects/ClientPortal",
      generatedAt: 1,
      packageManager: "npm",
      scripts: [{ name: "check", command: "npm run check" }],
      frameworkHints: ["React", "TypeScript"],
      keyFiles: ["AUTOPILOT.md", "src/App.tsx"],
      gitBranch: "main",
      changedFiles: [],
      summary: "Client Portal project",
      projectMemory: {
        present: true,
        relativePath: "AUTOPILOT.md",
        summary: "Use small scoped edits and write tests.",
        instructions: ["Use small scoped edits", "Write tests before approval"]
      }
    };

    const plan = createCodingAgentPlanFromOverview({
      id: "plan-memory",
      goal: "Add a review panel",
      overview,
      now: 2
    });

    expect(plan.projectMemory?.relativePath).toBe("AUTOPILOT.md");
    expect(plan.assessment.executionLoop[0]).toBe("Load project memory");
    expect(plan.steps[0]).toEqual(
      expect.objectContaining({
        title: "Load project memory",
        state: "completed"
      })
    );
    expect(plan.schema.touchedFiles[0]).toBe("AUTOPILOT.md");
    expect(plan.risks.join(" ")).toContain("Project memory loaded");
  });

  it("classifies minimal and deep tasks before editing", () => {
    expect(assessCodingTask("Fix typo in the settings label").size).toBe("minimal");
    const deepAssessment = assessCodingTask("Redesign the automation architecture so it can scale to millions of users");

    expect(deepAssessment.size).toBe("deep");
    expect(deepAssessment.executionLoop).toContain("Create schema");
  });

  it("advances the agent plan through inspect, edit, test, review, and approval", () => {
    const overview: CodingRepoOverview = {
      projectName: "Autopilot Browser",
      rootPath: "C:/Projects/Autopilot",
      generatedAt: 1,
      packageManager: "npm",
      scripts: [{ name: "check", command: "npm run check" }],
      frameworkHints: ["React"],
      keyFiles: ["src/renderer/App.tsx"],
      gitBranch: "main",
      changedFiles: [],
      summary: "React app"
    };
    const plan = createCodingAgentPlanFromOverview({
      id: "plan-2",
      goal: "Add a standard coding workflow",
      overview,
      now: 2
    });

    const inspected = advanceCodingAgentPlan(plan, "inspected", 3);
    expect(inspected.phase).toBe("editing");
    expect(inspected.steps.find((step) => step.title.includes("Inspect"))?.state).toBe("completed");

    const edited = advanceCodingAgentPlan(inspected, "edited", 4);
    expect(edited.steps.find((step) => step.title.includes("Implement"))?.state).toBe("running");

    const tested = advanceCodingAgentPlan(edited, "command_succeeded", 5);
    expect(tested.phase).toBe("review");
    expect(tested.steps.find((step) => step.title.includes("Run verification"))?.state).toBe("completed");

    const approved = advanceCodingAgentPlan(tested, "approved", 6);
    expect(approved.phase).toBe("approved");
    expect(approved.steps.every((step) => step.state === "completed")).toBe(true);
  });
});

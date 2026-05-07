export type CodingNodeKind = "file" | "folder";

export type CodingTreeNode = {
  kind: CodingNodeKind;
  name: string;
  path: string;
  relativePath: string;
  size: number;
  modifiedAt: number;
  children?: CodingTreeNode[];
  truncated?: boolean;
};

export type CodingProject = {
  name: string;
  rootPath: string;
  openedAt: number;
};

export type CodingAccessMode = "ask" | "full";

export type CodingSnapshot = {
  projects: CodingProject[];
  activeProject: CodingProject | null;
  tree: CodingTreeNode | null;
  accessMode: CodingAccessMode;
};

export type CodingLanguageToolStatus = {
  language: "typescript" | "python";
  serverName: string;
  serverCommand: string;
  available: boolean;
  installCommand: string;
  reason?: string;
};

export type CodingDirectoryEntry = Omit<CodingTreeNode, "children">;

export type CodingFileReadResult =
  | {
      success: true;
      kind: "directory";
      name: string;
      path: string;
      relativePath: string;
      entries: CodingDirectoryEntry[];
    }
  | {
      success: true;
      kind: "text";
      name: string;
      path: string;
      relativePath: string;
      content: string;
      language: string;
      size: number;
      modifiedAt: number;
    }
  | {
      success: true;
      kind: "image";
      name: string;
      path: string;
      relativePath: string;
      dataUrl: string;
      mime: string;
      size: number;
      modifiedAt: number;
    }
  | {
      success: true;
      kind: "document";
      name: string;
      path: string;
      relativePath: string;
      dataUrl: string;
      mime: string;
      size: number;
      modifiedAt: number;
    }
  | {
      success: true;
      kind: "binary";
      name: string;
      path: string;
      relativePath: string;
      reason: string;
      size: number;
      modifiedAt: number;
    }
  | {
      success: false;
      reason: string;
    };

export type CodingWriteResult =
  | {
      success: true;
      savedAt: number;
      size: number;
    }
  | {
      success: false;
      reason: string;
    };

export type CodingOpenedPath = Extract<CodingFileReadResult, { success: true }>;

export type CodingOpenFileResult =
  | {
      success: true;
      snapshot: CodingSnapshot;
      files: CodingOpenedPath[];
    }
  | {
      success: false;
      reason: string;
      snapshot: CodingSnapshot;
      files: CodingOpenedPath[];
    };

export type CodingDeleteResult =
  | {
      success: true;
      deletedPath: string;
      snapshot: CodingSnapshot;
    }
  | {
      success: false;
      reason: string;
    };

export type CodingPlugin = {
  id: string;
  name: string;
  category: string;
  description: string;
  command: string;
};

export type CodingPluginStatusState = "missing" | "installed" | "installing" | "failed" | "cancelled";

export type CodingPluginStatus = {
  id: string;
  name: string;
  command: string;
  status: CodingPluginStatusState;
  installed: boolean;
  version?: string;
  reason?: string;
  startedAt?: number;
  estimatedSeconds?: number;
  elapsedMs?: number;
  stdout?: string;
  stderr?: string;
};

export type CodingPluginInstallResult =
  | {
      success: true;
      status: CodingPluginStatus;
    }
  | {
      success: false;
      reason: string;
      status?: CodingPluginStatus;
    };

export type CodingCommandRequest = {
  command: string;
  cwd?: string;
  approved?: boolean;
};

export type CodingTerminalOpenRequest = {
  cwd?: string;
};

export type CodingTerminalSnapshot = {
  cwd: string;
  shell: string;
  shellName: string;
  output: string;
  running: boolean;
  startedAt: number;
  updatedAt: number;
  pid?: number;
  exitCode?: number | null;
};

export type CodingTerminalOpenResult =
  | {
      success: true;
      cwd: string;
      shell: string;
      shellName: string;
      output: string;
      running: boolean;
      startedAt: number;
      updatedAt: number;
      pid?: number;
    }
  | {
      success: false;
      cwd?: string;
      shell?: string;
      shellName?: string;
      reason: string;
    };

export type CodingTerminalInputRequest = {
  input: string;
};

export type CodingTerminalInputResult =
  | {
      success: true;
      output: string;
      running: boolean;
    }
  | {
      success: false;
      reason: string;
      output?: string;
      running?: boolean;
    };

export type CodingTerminalOutputEvent = {
  output: string;
  chunk: string;
  cwd: string;
  shellName: string;
  running: boolean;
  updatedAt: number;
  pid?: number;
  exitCode?: number | null;
};

export type CodingCommandResult =
  | {
      success: true;
      command: string;
      cwd: string;
      stdout: string;
      stderr: string;
      exitCode: number;
      durationMs: number;
    }
  | {
      success: false;
      command?: string;
      cwd?: string;
      stdout?: string;
      stderr?: string;
      exitCode?: number | null;
      durationMs?: number;
      reason: string;
      requiresApproval?: boolean;
    };

export type CodingSearchResult = {
  kind: CodingNodeKind;
  name: string;
  path: string;
  relativePath: string;
  size: number;
  modifiedAt: number;
  match: "name" | "path";
};

export type CodingResearchResult =
  | {
      success: true;
      input: string;
      url: string;
      title: string;
      snippet: string;
      status: number;
    }
  | {
      success: false;
      input: string;
      url?: string;
      reason: string;
    };

export type CodingResearchSource = {
  title: string;
  url: string;
  snippet: string;
  provider: "google-search" | "google-news" | "web";
  sourceName?: string;
  publishedAt?: number;
  status?: number;
};

export type CodingResearchPass = {
  query: string;
  url: string;
  status: "searched" | "failed";
  summary: string;
  sources: CodingResearchSource[];
  reason?: string;
};

export type CodingResearchReportResult =
  | {
      success: true;
      input: string;
      answer: string;
      generatedAt: number;
      iterations: CodingResearchPass[];
      sources: CodingResearchSource[];
    }
  | {
      success: false;
      input: string;
      reason: string;
      generatedAt: number;
      iterations: CodingResearchPass[];
      sources: CodingResearchSource[];
    };

export type CodingDownloadEntry = {
  id: string;
  filename: string;
  url: string;
  path: string;
  state: "progressing" | "completed" | "cancelled" | "interrupted";
  receivedBytes: number;
  totalBytes: number;
  startedAt: number;
  updatedAt: number;
  reason?: string;
};

export type CodingGitChangedFile = {
  path: string;
  status: string;
  staged: boolean;
  unstaged: boolean;
};

export type CodingGitStatusResult =
  | {
      success: true;
      rootPath: string;
      branch: string;
      changedFiles: CodingGitChangedFile[];
      generatedAt: number;
    }
  | {
      success: false;
      rootPath?: string;
      reason: string;
      generatedAt: number;
    };

export type CodingGitDiffResult =
  | {
      success: true;
      rootPath: string;
      filePath?: string;
      diff: string;
      generatedAt: number;
    }
  | {
      success: false;
      rootPath?: string;
      filePath?: string;
      reason: string;
      generatedAt: number;
    };

export type CodingRepoOverview = {
  projectName: string;
  rootPath: string;
  generatedAt: number;
  packageManager: "npm" | "pnpm" | "yarn" | "bun" | "unknown";
  scripts: Array<{ name: string; command: string }>;
  frameworkHints: string[];
  keyFiles: string[];
  gitBranch: string;
  changedFiles: CodingGitChangedFile[];
  summary: string;
};

export type CodingRepoOverviewResult =
  | {
      success: true;
      overview: CodingRepoOverview;
    }
  | {
      success: false;
      reason: string;
      generatedAt: number;
    };

export type CodingAgentPlanStepState = "pending" | "running" | "completed" | "failed" | "blocked";
export type CodingTaskSize = "minimal" | "standard" | "deep";
export type CodingAgentPhase = "understanding" | "planning" | "schema" | "editing" | "testing" | "review" | "approved";

export type CodingTaskAssessment = {
  size: CodingTaskSize;
  reason: string;
  thinkingDepth: "fast" | "focused" | "deep";
  ambiguities: string[];
  risks: string[];
  executionLoop: string[];
};

export type CodingAgentPlanStep = {
  id: string;
  title: string;
  detail: string;
  state: CodingAgentPlanStepState;
  command?: string;
};

export type CodingAgentPlan = {
  id: string;
  projectName: string;
  projectRootPath: string;
  goal: string;
  summary: string;
  phase: CodingAgentPhase;
  assessment: CodingTaskAssessment;
  schema: {
    dataModels: string[];
    touchedFiles: string[];
    apiChanges: string[];
    uiChanges: string[];
    testPlan: string[];
    safetyRisks: string[];
    expectedOutput: string;
  };
  steps: CodingAgentPlanStep[];
  risks: string[];
  suggestedCommands: string[];
  createdAt: number;
  updatedAt: number;
};

export type CodingAgentRun = {
  id: string;
  planId: string;
  phase: CodingAgentPhase;
  understanding: string;
  schema: CodingAgentPlan["schema"];
  plan: CodingAgentPlanStep[];
  commands: CodingCommandResult[];
  changedFiles: CodingGitChangedFile[];
  testResults: string[];
  diff?: string;
  approvalState: "needs_review" | "approved" | "rejected";
  createdAt: number;
  updatedAt: number;
};

export type CodingAgentPlanResult =
  | {
      success: true;
      plan: CodingAgentPlan;
    }
  | {
      success: false;
      reason: string;
      generatedAt: number;
    };

export type CodingAgentPlanEvent = "inspected" | "edited" | "command_waiting" | "command_succeeded" | "command_failed" | "diff_viewed" | "approved" | "rejected";

export function advanceCodingAgentPlan(plan: CodingAgentPlan, event: CodingAgentPlanEvent, now = Date.now()): CodingAgentPlan {
  const steps = plan.steps.map((step) => ({ ...step }));
  const setStepState = (pattern: RegExp, state: CodingAgentPlanStepState): void => {
    const step = steps.find((candidate) => pattern.test(candidate.title));
    if (step) {
      step.state = state;
    }
  };
  const completeStep = (pattern: RegExp): void => {
    const step = steps.find((candidate) => pattern.test(candidate.title));
    if (step && step.state !== "failed" && step.state !== "blocked") {
      step.state = "completed";
    }
  };

  let phase = plan.phase;

  switch (event) {
    case "inspected":
      completeStep(/reread|understand|schema/iu);
      completeStep(/inspect/iu);
      phase = "editing";
      break;
    case "edited":
      completeStep(/reread|understand|schema|inspect/iu);
      setStepState(/make|implement/iu, "running");
      phase = "editing";
      break;
    case "command_waiting":
      completeStep(/make|implement/iu);
      setStepState(/test|verify|run verification/iu, "blocked");
      phase = "testing";
      break;
    case "command_succeeded":
      completeStep(/make|implement/iu);
      setStepState(/test|verify|run verification/iu, "completed");
      setStepState(/review|diff|approval/iu, "running");
      phase = "review";
      break;
    case "command_failed":
      completeStep(/make|implement/iu);
      setStepState(/test|verify|run verification/iu, "failed");
      phase = "testing";
      break;
    case "diff_viewed":
      setStepState(/review|diff|approval/iu, "running");
      phase = "review";
      break;
    case "approved":
      for (const step of steps) {
        step.state = "completed";
      }
      phase = "approved";
      break;
    case "rejected":
      setStepState(/review|diff|approval/iu, "failed");
      phase = "review";
      break;
  }

  return {
    ...plan,
    phase,
    steps,
    updatedAt: now
  };
}

export function parseGitPorcelainStatus(output: string): CodingGitChangedFile[] {
  return output
    .split(/\r?\n/u)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => {
      const indexStatus = line.slice(0, 1);
      const worktreeStatus = line.slice(1, 2);
      const rawPath = line.slice(3).trim();
      const filePath = rawPath.includes(" -> ") ? rawPath.split(" -> ").pop()?.trim() ?? rawPath : rawPath;
      return {
        path: filePath,
        status: `${indexStatus}${worktreeStatus}`.trim() || "??",
        staged: indexStatus !== " " && indexStatus !== "?",
        unstaged: worktreeStatus !== " " || indexStatus === "?"
      };
    });
}

export function createCodingAgentPlanFromOverview(input: {
  id: string;
  goal: string;
  overview: CodingRepoOverview;
  now: number;
}): CodingAgentPlan {
  const normalizedGoal = input.goal.trim() || "Understand this project and prepare a safe implementation plan.";
  const assessment = assessCodingTask(normalizedGoal, input.overview);
  const commandPriority = ["check", "typecheck", "test", "build", "lint"];
  const suggestedCommands = input.overview.scripts
    .filter((script) => commandPriority.some((keyword) => script.name.toLowerCase().includes(keyword)))
    .slice(0, 4)
    .map((script) => `${getPackageManagerRunCommand(input.overview.packageManager)} ${script.name}`);

  const fallbackCommand = input.overview.scripts.length > 0 ? `${getPackageManagerRunCommand(input.overview.packageManager)} ${input.overview.scripts[0].name}` : undefined;
  const verificationCommand = suggestedCommands[0] ?? fallbackCommand;

  return {
    id: input.id,
    projectName: input.overview.projectName,
    projectRootPath: input.overview.rootPath,
    goal: normalizedGoal,
    summary: buildCodingPlanSummary(input.overview.projectName, assessment),
    phase: assessment.size === "minimal" ? "planning" : "schema",
    assessment,
    schema: createCodingSchema(normalizedGoal, input.overview, assessment, suggestedCommands, verificationCommand),
    steps: createCodingPlanSteps(input.id, input.overview, assessment, verificationCommand),
    risks: [
      ...assessment.risks,
      input.overview.changedFiles.length > 0
        ? `${input.overview.changedFiles.length} file${input.overview.changedFiles.length === 1 ? "" : "s"} already changed in git; avoid mixing unrelated work.`
        : "No git changes detected before this plan.",
      input.overview.frameworkHints.length > 0
        ? `Detected ${input.overview.frameworkHints.join(", ")}; stay inside existing patterns.`
        : "No framework hints found; inspect architecture before introducing dependencies.",
      "Commands, commits, pushes, deletes, and production-impacting steps should remain approval-gated."
    ],
    suggestedCommands,
    createdAt: input.now,
    updatedAt: input.now
  };
}

export function assessCodingTask(goal: string, overview?: Pick<CodingRepoOverview, "changedFiles" | "keyFiles" | "scripts">): CodingTaskAssessment {
  const text = goal.toLowerCase();
  const ambiguities: string[] = [];
  const risks: string[] = [];
  let score = 0;

  if (/\b(redesign|architecture|architect|system|framework|migrate|migration|refactor|security|auth|permissions|database|schema|sync|concurrent|scale|millions|all|everything)\b/u.test(text)) {
    score += 4;
    risks.push("The request touches architecture, safety, scale, auth, or broad behavior.");
  }
  if (/\b(think|plan|strategy|open-ended|improve|make better|competitor|vision|workflow|agentic|automation)\b/u.test(text)) {
    score += 3;
    ambiguities.push("The prompt is open-ended and needs explicit goal/schema work before edits.");
  }
  if (/\b(fix typo|rename|label|spacing|color|button|small|quick|simple|minor|obvious|error message)\b/u.test(text)) {
    score -= 2;
  }
  if ((overview?.changedFiles.length ?? 0) > 0) {
    score += 1;
    risks.push("There are existing git changes, so the agent must avoid mixing unrelated work.");
  }
  if ((overview?.keyFiles.length ?? 0) === 0) {
    score += 1;
    ambiguities.push("No obvious key files were detected yet.");
  }

  if (score >= 5) {
    return {
      size: "deep",
      reason: "Open-ended or high-risk task; requires rereading the prompt, schema, and careful verification before edits.",
      thinkingDepth: "deep",
      ambiguities,
      risks,
      executionLoop: ["Reread prompt", "Restate goal", "Identify risks", "Inspect repo", "Compare options", "Create schema", "Edit", "Test/build", "Diff", "Approve"]
    };
  }

  if (score <= -1) {
    return {
      size: "minimal",
      reason: "Small, clear task; use the fast loop while still leaving a reviewable diff.",
      thinkingDepth: "fast",
      ambiguities,
      risks,
      executionLoop: ["Understand", "Inspect", "Edit", "Test", "Diff", "Approve"]
    };
  }

  return {
    size: "standard",
    reason: "Normal implementation task; plan first, then edit and verify.",
    thinkingDepth: "focused",
    ambiguities,
    risks,
    executionLoop: ["Understand", "Plan", "Edit", "Test", "Diff", "Approve"]
  };
}

function buildCodingPlanSummary(projectName: string, assessment: CodingTaskAssessment): string {
  if (assessment.size === "minimal") {
    return `Autopilot classified this as a minimal task in ${projectName}: inspect the smallest relevant area, fix it, verify, and show the diff before approval.`;
  }
  if (assessment.size === "deep") {
    return `Autopilot classified this as a deep task in ${projectName}: reread the request, build a schema, inspect architecture, verify carefully, and keep all external actions approval-gated.`;
  }
  return `Autopilot classified this as a standard task in ${projectName}: plan, edit, test, show the diff, and wait for approval.`;
}

function createCodingSchema(
  goal: string,
  overview: CodingRepoOverview,
  assessment: CodingTaskAssessment,
  suggestedCommands: string[],
  verificationCommand?: string
): CodingAgentPlan["schema"] {
  const goalText = goal.toLowerCase();
  return {
    dataModels: /\b(model|schema|type|interface|state|store|database)\b/u.test(goalText)
      ? ["Inspect and update existing TypeScript models before wiring UI or IPC."]
      : ["No new data model unless the inspected request flow requires it."],
    touchedFiles: overview.keyFiles.length > 0 ? overview.keyFiles.slice(0, 6) : ["Use search/file picker to identify the request flow before editing."],
    apiChanges: /\b(ipc|api|backend|service|connector|sync)\b/u.test(goalText)
      ? ["Add or extend IPC/service contracts with backward-compatible shape."]
      : ["No public API change expected."],
    uiChanges: /\b(ui|screen|page|sidebar|button|design|layout|workspace)\b/u.test(goalText)
      ? ["Update the relevant workspace UI using existing components/styles."]
      : ["No UI change expected unless inspection shows one is needed."],
    testPlan: suggestedCommands.length > 0 ? suggestedCommands : verificationCommand ? [verificationCommand] : ["Run the project-specific verification command from the terminal."],
    safetyRisks: [...assessment.risks, "Commit, push, destructive commands, and production-impacting actions require approval."],
    expectedOutput: assessment.size === "deep" ? "Schema, implementation, verification output, diff, and approval-ready summary." : "Scoped implementation, verification output, diff, and approval-ready summary."
  };
}

function createCodingPlanSteps(
  id: string,
  overview: CodingRepoOverview,
  assessment: CodingTaskAssessment,
  verificationCommand?: string
): CodingAgentPlanStep[] {
  if (assessment.size === "minimal") {
    return [
      {
        id: `${id}-understand`,
        title: "Understand the small fix",
        detail: assessment.reason,
        state: "completed"
      },
      {
        id: `${id}-inspect`,
        title: "Inspect the narrow area",
        detail: overview.keyFiles.length > 0 ? `Start from ${overview.keyFiles.slice(0, 4).join(", ")}.` : "Find the smallest relevant file before editing.",
        state: "pending"
      },
      {
        id: `${id}-implement`,
        title: "Make the fix",
        detail: "Edit the smallest safe surface and avoid unrelated cleanup.",
        state: "pending"
      },
      {
        id: `${id}-verify`,
        title: "Test the fix",
        detail: verificationCommand ? `Run ${verificationCommand}.` : "Run the nearest relevant check.",
        command: verificationCommand,
        state: "pending"
      },
      {
        id: `${id}-review`,
        title: "Diff and approval",
        detail: "Show changed files and wait for approval.",
        state: "pending"
      }
    ];
  }

  const deepPrefix: CodingAgentPlanStep[] =
    assessment.size === "deep"
      ? [
          {
            id: `${id}-reread`,
            title: "Reread and restate",
            detail: "Read the request more than once, restate the goal, and name ambiguity before changing code.",
            state: "completed"
          },
          {
            id: `${id}-schema`,
            title: "Create implementation schema",
            detail: "Define models, APIs, UI changes, tests, risks, and expected output before editing.",
            state: "completed"
          }
        ]
      : [
          {
            id: `${id}-understand`,
            title: "Understand the request",
            detail: assessment.reason,
            state: "completed"
          }
        ];

  return [
    ...deepPrefix,
    {
      id: `${id}-inspect`,
      title: "Inspect affected files",
      detail:
        overview.keyFiles.length > 0
          ? `Start from ${overview.keyFiles.slice(0, 5).join(", ")} and follow request flow before editing.`
          : "Open the file picker or search to find the request flow before editing.",
      state: "pending"
    },
    {
      id: `${id}-implement`,
      title: "Implement scoped changes",
      detail: "Edit local files directly and keep AI-generated edits separate from manual review.",
      state: "pending"
    },
    {
      id: `${id}-verify`,
      title: "Run verification",
      detail: verificationCommand ? `Run ${verificationCommand} from the active project.` : "No package scripts were detected, so use the terminal for project-specific checks.",
      command: verificationCommand,
      state: "pending"
    },
    {
      id: `${id}-review`,
      title: "Review diff and ask for approval",
      detail: "Show changed files, red/green diffs, command output, and keep commit/push behind explicit approval.",
      state: "pending"
    }
  ];
}

function getPackageManagerRunCommand(packageManager: CodingRepoOverview["packageManager"]): string {
  if (packageManager === "pnpm" || packageManager === "yarn" || packageManager === "bun") {
    return packageManager;
  }

  return "npm run";
}

import { decidePermission, getPermissionPolicySummary, type PermissionPolicyDecision } from "./permissionPolicy.js";
import { evaluateAgentRuntimeQuality, type WorkOutputQualityReport } from "./outputQuality.js";

export type AgentWorkspace = "home" | "browser" | "productivity" | "design" | "coding" | "automation" | "chatting";

export type ToolRiskLevel = "read" | "local_write" | "external_write" | "high_impact_external" | "destructive";

export type AgentRunStepType = "context" | "plan" | "tool_selection" | "permission" | "tool_result" | "quality" | "approval" | "final";

export type ToolDescriptor = {
  name: string;
  description: string;
  workspace: AgentWorkspace;
  connector: string;
  inputSchema: string;
  outputSchema: string;
  riskLevel: ToolRiskLevel;
  shadowModeEligible: boolean;
  approvalRequired: boolean;
};

export type ToolExecutionResult = {
  toolName: string;
  success: boolean;
  observation: string;
  output?: unknown;
  blocked?: boolean;
  reason?: string;
};

export type PermissionDecision = {
  toolName: string;
  riskLevel: ToolRiskLevel;
  allowed: boolean;
  requiresApproval: boolean;
  reason: string;
  policy: PermissionPolicyDecision["policy"];
};

export type ConnectorPermission = "read" | "local_write" | "external_write" | "high_impact_external" | "destructive";

export type ConnectorAuthState = {
  state: "connected" | "missing_auth" | "missing_scope" | "disabled";
  accountLabel?: string;
  grantedScopes: string[];
  missingScopes: string[];
};

export type ConnectorTool = {
  name: string;
  permission: ConnectorPermission;
  enabled: boolean;
  riskLevel: ToolRiskLevel;
};

export type ConnectorDescriptor = {
  id: string;
  label: string;
  description: string;
  auth: ConnectorAuthState;
  tools: ConnectorTool[];
  blockedActions: string[];
};

export type ConnectorResult<T = unknown> = {
  success: boolean;
  connectorId: string;
  toolName: string;
  data?: T;
  reason?: string;
};

export type WorkspaceMemory = {
  id: string;
  scope: "app" | "workspace" | "project" | "source";
  key: string;
  value: string;
  workspace?: AgentWorkspace;
  projectPath?: string;
  sourceId?: string;
  updatedAt: number;
};

export type HookDefinition = {
  id: string;
  name: string;
  event: "before_command" | "after_command" | "before_edit" | "after_edit" | "before_approve";
  workspace: AgentWorkspace;
  enabled: boolean;
  action: "allow" | "require_approval" | "block" | "add_context";
  pattern?: string;
  message: string;
};

export type SubagentDefinition = {
  id: string;
  name: string;
  description: string;
  workspace: AgentWorkspace;
  toolNames: string[];
  allowedRiskLevels: ToolRiskLevel[];
  contextWindow: "focused" | "standard" | "large";
};

export type AgentRunRequest = {
  workspace: AgentWorkspace;
  prompt: string;
  intent?: string;
  sourceId?: string;
  shadowMode?: boolean;
  approvedToolNames?: string[];
};

export type AgentRunStep = {
  id: string;
  type: AgentRunStepType;
  title: string;
  detail: string;
  toolName?: string;
  permission?: PermissionDecision;
  createdAt: number;
};

export type AgentTrace = {
  id: string;
  workspace: AgentWorkspace;
  prompt: string;
  intent: string;
  sourceId?: string;
  status: "planned" | "waiting_for_approval" | "completed" | "blocked";
  selectedTools: ToolDescriptor[];
  permissionDecisions: PermissionDecision[];
  quality?: WorkOutputQualityReport;
  steps: AgentRunStep[];
  finalOutput: string;
  createdAt: number;
  updatedAt: number;
};

export type AgentRuntimeSnapshot = {
  tools: ToolDescriptor[];
  connectors: ConnectorDescriptor[];
  memories: WorkspaceMemory[];
  hooks: HookDefinition[];
  subagents: SubagentDefinition[];
  permissionPolicy: ReturnType<typeof getPermissionPolicySummary>;
};

export function createCoreToolRegistry(): ToolDescriptor[] {
  return [
    tool("gmail.read", "Read selected Gmail messages and metadata.", "productivity", "gmail", "messageIds:string[]", "EmailMessageSummary[]", "read", true, false),
    tool("gmail.suggestOrganization", "Suggest labels, stars, read state, archive, or snooze without changing Gmail.", "productivity", "gmail", "messages:EmailMessageSummary[]", "GmailOrganizationBatch", "read", true, false),
    tool("gmail.applyOrganization", "Apply approved Gmail labels/archive/read/star/snooze actions.", "productivity", "gmail", "EmailOrganizationAction[]", "GmailOrganizationResult", "external_write", false, true),
    tool("gmail.prepareDraft", "Prepare a local reply draft for review without changing Gmail.", "productivity", "gmail", "messageId:string, body:string", "DraftSummary", "local_write", true, false),
    tool("gmail.createDraft", "Create an approved Gmail draft in the user's mailbox.", "productivity", "gmail", "messageId:string, body:string", "DraftSummary", "external_write", false, true),
    tool("gmail.sendDraft", "Send an approved Gmail draft.", "productivity", "gmail", "draftId:string", "SendResult", "external_write", false, true),
    tool("calendar.read", "Read Google Calendar events.", "productivity", "google-calendar", "range", "CalendarEvent[]", "read", true, false),
    tool("calendar.write", "Create or update an approved Google Calendar event.", "productivity", "google-calendar", "CalendarWriteRequest", "CalendarWriteResult", "external_write", false, true),
    tool("browser.readPageText", "Read the active browser tab text.", "browser", "browser-tabs", "tabId:string", "PageTextCaptureResult", "read", true, false),
    tool("browser.readDOM", "Read a simplified DOM snapshot from the active tab.", "browser", "browser-tabs", "tabId:string", "PageDomSnapshotResult", "read", true, false),
    tool("browser.click", "Click a safe page element by selector.", "browser", "browser-tabs", "selector:string", "PageDomActionResult", "external_write", false, true),
    tool("browser.fill", "Fill a safe page input by selector.", "browser", "browser-tabs", "selector:string,value:string", "PageDomActionResult", "external_write", false, true),
    tool("browser.scroll", "Scroll the active browser page.", "browser", "browser-tabs", "target:string|number", "PageDomActionResult", "local_write", true, false),
    tool("design.createArtifact", "Generate a document, deck, website, or draft artifact.", "design", "design-artifacts", "prompt:string,source?:unknown", "Artifact", "local_write", true, false),
    tool("design.reviseArtifact", "Revise an artifact version with user feedback.", "design", "design-artifacts", "artifactId:string,feedback:string", "ArtifactVersion", "local_write", true, false),
    tool("coding.inspectFiles", "Inspect project files before planning edits.", "coding", "local-files", "paths?:string[]", "CodingFileReadResult[]", "read", true, false),
    tool("coding.proposeEdit", "Prepare a code edit plan and diff preview.", "coding", "local-files", "goal:string", "CodingAgentPlanResult", "local_write", true, false),
    tool("coding.applyEdit", "Apply an approved file edit.", "coding", "local-files", "path:string,content:string", "CodingWriteResult", "local_write", false, true),
    tool("coding.runCommand", "Run an approved project command or test.", "coding", "local-shell", "command:string", "CodingCommandResult", "external_write", false, true),
    tool("coding.gitCommit", "Create a git commit after reviewing status, diff, tests, and secret-scan warnings.", "coding", "local-shell", "GitCommitProposal", "GitCommitResult", "high_impact_external", false, true),
    tool("coding.gitPush", "Push approved code changes to a remote repository.", "coding", "local-shell", "branch:string", "GitPushResult", "high_impact_external", false, true),
    tool("coding.gitCommitAndPush", "Commit and then push only after separate explicit approvals for both actions.", "coding", "local-shell", "GitCommitProposal", "GitPushResult", "high_impact_external", false, true),
    tool("automation.suggestRecipe", "Suggest a recurring automation recipe.", "automation", "automation", "prompt:string", "AutomationRecipeDraft", "read", true, false),
    tool("automation.runRecipe", "Run an approved automation recipe.", "automation", "automation", "recipeId:string", "AutomationRunResult", "external_write", false, true),
    tool("chat.readMessages", "Read channel messages and mentions.", "chatting", "chat", "channelId:string", "ChatMessage[]", "read", true, false),
    tool("chat.suggestActions", "Suggest action items from team chat without assigning automatically.", "chatting", "chat", "messages:ChatMessage[]", "ChatActionSuggestion[]", "read", true, false),
    tool("chat.postMessage", "Post an approved message to a team channel.", "chatting", "chat", "channelId:string,body:string", "ChatMessage", "external_write", false, true),
    tool("payments.createProposal", "Prepare a payment proposal with payee, amount, evidence, risk flags, and duplicate checks.", "productivity", "payments", "PaymentProposalInput", "PaymentProposal", "local_write", true, false),
    tool("payments.getQuote", "Quote fees and total cost for a payment proposal.", "productivity", "payments", "proposalId:string", "PaymentQuoteResult", "read", true, false),
    tool("payments.execute", "Execute an approved payment proposal using server-side provider credentials.", "productivity", "payments", "PaymentApproval", "PaymentExecutionResult", "high_impact_external", false, true)
  ];
}

export function createDefaultConnectors(tools: ToolDescriptor[] = createCoreToolRegistry()): ConnectorDescriptor[] {
  const connectorInfo: Array<Pick<ConnectorDescriptor, "id" | "label" | "description" | "blockedActions">> = [
    { id: "gmail", label: "Gmail", description: "Inbox reading, draft prep, and user-approved organization.", blockedActions: ["send without approval", "delete", "unsubscribe"] },
    { id: "google-calendar", label: "Google Calendar", description: "Calendar read/write with recurrence writeback after approval.", blockedActions: ["delete without approval"] },
    { id: "browser-tabs", label: "Browser tabs", description: "Active page reading and safe DOM actions.", blockedActions: ["submit without approval", "pay", "delete"] },
    { id: "design-artifacts", label: "Design artifacts", description: "Docs, decks, websites, drafts, versions, and exports.", blockedActions: ["export failed quality as ready"] },
    { id: "local-files", label: "Local files", description: "Coding workspace file inspection and approved edits.", blockedActions: ["overwrite without approval"] },
    { id: "local-shell", label: "Local shell", description: "Approved project commands and tests.", blockedActions: ["destructive commands", "force push"] },
    { id: "payments", label: "Payments", description: "Stripe-backed payment proposal, quote, approval, and receipt tools.", blockedActions: ["unverified money movement", "automatic payment execution", "raw bank credential handling"] },
    { id: "automation", label: "Automation", description: "Recipes, safe runs, logs, and quality checks.", blockedActions: ["duplicate burst runs", "external writes without approval"] },
    { id: "chat", label: "Chatting", description: "Enterprise messages, mentions, AI notes, and suggestions.", blockedActions: ["post as user without approval"] }
  ];

  return connectorInfo.map((connector) => ({
    ...connector,
    auth: {
      state: connector.id === "local-files" || connector.id === "local-shell" || connector.id === "design-artifacts" || connector.id === "automation" ? "connected" : "missing_auth",
      grantedScopes: [],
      missingScopes: connector.id === "gmail" ? ["gmail.readonly", "gmail.modify"] : connector.id === "google-calendar" ? ["calendar.readonly", "calendar.events"] : []
    },
    tools: tools
      .filter((candidate) => candidate.connector === connector.id)
      .map((candidate) => ({
        name: candidate.name,
        permission: candidate.riskLevel,
        enabled: candidate.riskLevel === "read" || candidate.riskLevel === "local_write",
        riskLevel: candidate.riskLevel
      }))
  }));
}

export function createDefaultHooks(): HookDefinition[] {
  return [
    hook("hook:block-destructive-shell", "Block destructive shell commands", "before_command", "coding", "block", "\\b(rm\\s+-rf|git\\s+reset\\s+--hard|drop\\s+table|git\\s+push\\b[^\\n]*\\s--force(?:-with-lease)?)\\b", "Destructive commands require a separate explicit approval path."),
    hook("hook:approval-before-edit", "Require approval before applying edits", "before_edit", "coding", "require_approval", undefined, "Show plan and diff before writing files."),
    hook("hook:approval-before-external", "Require approval before external impact", "before_approve", "home", "require_approval", undefined, "External actions stay approval-gated.")
  ];
}

export function createDefaultSubagents(): SubagentDefinition[] {
  return [
    subagent("debugger", "Debugger", "Reproduce failures, inspect logs, and propose the smallest fix.", "coding", ["coding.inspectFiles", "coding.runCommand"], ["read", "local_write"], "standard"),
    subagent("code-reviewer", "Code reviewer", "Review diffs for correctness, regressions, and missing tests.", "coding", ["coding.inspectFiles"], ["read"], "focused"),
    subagent("test-runner", "Test runner", "Run approved checks and summarize failures.", "coding", ["coding.runCommand"], ["read", "external_write"], "focused"),
    subagent("design-implementer", "Design implementer", "Turn approved artifacts into website/code handoffs.", "design", ["design.createArtifact", "design.reviseArtifact", "coding.proposeEdit"], ["read", "local_write"], "large"),
    subagent("security-reviewer", "Security reviewer", "Check permission boundaries, secrets, and external-impact actions.", "coding", ["coding.inspectFiles"], ["read"], "standard")
  ];
}

export function createInitialWorkspaceMemory(now = Date.now()): WorkspaceMemory[] {
  return [
    {
      id: "memory:app:approval",
      scope: "app",
      key: "approval_policy",
      value: "External-impact actions require explicit approval unless a narrow trusted rule exists.",
      updatedAt: now
    },
    {
      id: "memory:design:artifact-first",
      scope: "workspace",
      workspace: "design",
      key: "design_default",
      value: "Show generated artifact results first, with sources and drafts collapsible.",
      updatedAt: now
    },
    {
      id: "memory:coding:codex-loop",
      scope: "workspace",
      workspace: "coding",
      key: "coding_loop",
      value: "Inspect, plan, edit, test, diff, then wait for approval.",
      updatedAt: now
    }
  ];
}

export function selectToolsForRun(tools: ToolDescriptor[], request: AgentRunRequest): ToolDescriptor[] {
  const normalized = `${request.workspace} ${request.intent ?? ""} ${request.prompt}`.toLowerCase();
  const workspaceTools = tools.filter((candidate) => candidate.workspace === request.workspace);
  const crossWorkspaceTools = tools.filter((candidate) => {
    if (request.workspace === "productivity" && /\b(deck|document|website|artifact|design)\b/u.test(normalized)) {
      return candidate.workspace === "design" && candidate.riskLevel !== "external_write";
    }
    if (request.workspace === "design" && /\b(code|website|html|css|repo)\b/u.test(normalized)) {
      return candidate.name === "coding.proposeEdit";
    }
    if (request.workspace === "browser" && /\b(form|fill|click|page|tab)\b/u.test(normalized)) {
      return candidate.workspace === "browser";
    }
    return false;
  });
  const selected = [...workspaceTools, ...crossWorkspaceTools].filter((toolDescriptor, index, all) => all.findIndex((item) => item.name === toolDescriptor.name) === index);
  return selected.slice(0, 8);
}

export function decideToolPermission(toolDescriptor: ToolDescriptor, request: Pick<AgentRunRequest, "shadowMode" | "approvedToolNames"> = {}): PermissionDecision {
  const approved = request.approvedToolNames?.includes(toolDescriptor.name) === true;
  if (request.shadowMode && !toolDescriptor.shadowModeEligible) {
    return {
      toolName: toolDescriptor.name,
      riskLevel: toolDescriptor.riskLevel,
      allowed: false,
      requiresApproval: true,
      reason: "Shadow Mode may read, classify, draft, plan, and prepare, but this tool is not eligible for background execution.",
      policy: "shadow_block"
    };
  }

  const permission = decidePermission({
    action: `${toolDescriptor.name}: ${toolDescriptor.description}`,
    riskLevel: toolDescriptor.riskLevel,
    mode: request.shadowMode ? "shadow" : "normal",
    approved
  });
  return {
    toolName: toolDescriptor.name,
    riskLevel: toolDescriptor.riskLevel,
    allowed: permission.allowed && (!toolDescriptor.approvalRequired || approved),
    requiresApproval: permission.requiresApproval || toolDescriptor.approvalRequired,
    reason:
      toolDescriptor.approvalRequired && !approved && permission.allowed
        ? "This tool requires explicit approval before it can run."
        : permission.reason,
    policy: permission.policy
  };
}

export function buildAgentTrace(request: AgentRunRequest, tools: ToolDescriptor[] = createCoreToolRegistry(), now = Date.now()): AgentTrace {
  const selectedTools = selectToolsForRun(tools, request);
  const permissionDecisions = selectedTools.map((toolDescriptor) => decideToolPermission(toolDescriptor, request));
  const runnableTools = selectedTools.filter((toolDescriptor) => permissionDecisions.find((decision) => decision.toolName === toolDescriptor.name)?.allowed);
  const blockedTools = permissionDecisions.filter((decision) => !decision.allowed);
  const status: AgentTrace["status"] = blockedTools.length > 0 && runnableTools.length === 0 ? "waiting_for_approval" : "planned";
  const quality = evaluateAgentRuntimeQuality({
    prompt: request.prompt,
    selectedToolNames: selectedTools.map((toolDescriptor) => toolDescriptor.name),
    allowedToolNames: runnableTools.map((toolDescriptor) => toolDescriptor.name),
    blockedToolNames: blockedTools.map((decision) => decision.toolName),
    permissionDecisionCount: permissionDecisions.length
  });

  const steps: AgentRunStep[] = [
    step("context", "Context selected", `Workspace ${request.workspace}${request.sourceId ? ` with source ${request.sourceId}` : ""}.`, now),
    step("plan", "Plan", buildPlanSummary(request, selectedTools), now + 1),
    ...selectedTools.map((toolDescriptor, index) =>
      step("tool_selection", `Tool: ${toolDescriptor.name}`, `${toolDescriptor.description} Risk: ${toolDescriptor.riskLevel}.`, now + 2 + index, toolDescriptor.name)
    ),
    ...permissionDecisions.map((decision, index) => ({
      ...step("permission", decision.allowed ? `Allowed: ${decision.toolName}` : `Blocked: ${decision.toolName}`, decision.reason, now + 20 + index, decision.toolName),
      permission: decision
    })),
    step("quality", `Runtime quality ${quality.score}/100`, quality.summary, now + 35),
    step("final", "Ready for review", buildFinalSummary(request, runnableTools, blockedTools), now + 40)
  ];

  return {
    id: `agent-trace:${now}:${Math.abs(hashText(`${request.workspace}:${request.prompt}:${request.intent ?? ""}`))}`,
    workspace: request.workspace,
    prompt: request.prompt,
    intent: request.intent?.trim() || inferIntent(request.prompt),
    sourceId: request.sourceId,
    status,
    selectedTools,
    permissionDecisions,
    quality,
    steps,
    finalOutput: buildFinalSummary(request, runnableTools, blockedTools),
    createdAt: now,
    updatedAt: now + 40
  };
}

export function updateWorkspaceMemory(memories: WorkspaceMemory[], patch: Omit<WorkspaceMemory, "id" | "updatedAt"> & { id?: string }, now = Date.now()): WorkspaceMemory[] {
  const id = patch.id ?? `memory:${patch.scope}:${patch.workspace ?? patch.projectPath ?? patch.sourceId ?? "app"}:${patch.key}`;
  const next: WorkspaceMemory = {
    id,
    scope: patch.scope,
    key: patch.key.trim(),
    value: patch.value.trim(),
    workspace: patch.workspace,
    projectPath: patch.projectPath,
    sourceId: patch.sourceId,
    updatedAt: now
  };
  return [next, ...memories.filter((memory) => memory.id !== id)].slice(0, 80);
}

function tool(
  name: string,
  description: string,
  workspace: AgentWorkspace,
  connector: string,
  inputSchema: string,
  outputSchema: string,
  riskLevel: ToolRiskLevel,
  shadowModeEligible: boolean,
  approvalRequired: boolean
): ToolDescriptor {
  return { name, description, workspace, connector, inputSchema, outputSchema, riskLevel, shadowModeEligible, approvalRequired };
}

function hook(
  id: string,
  name: string,
  event: HookDefinition["event"],
  workspace: AgentWorkspace,
  action: HookDefinition["action"],
  pattern: string | undefined,
  message: string
): HookDefinition {
  return { id, name, event, workspace, action, pattern, message, enabled: true };
}

function subagent(
  id: string,
  name: string,
  description: string,
  workspace: AgentWorkspace,
  toolNames: string[],
  allowedRiskLevels: ToolRiskLevel[],
  contextWindow: SubagentDefinition["contextWindow"]
): SubagentDefinition {
  return { id, name, description, workspace, toolNames, allowedRiskLevels, contextWindow };
}

function step(type: AgentRunStepType, title: string, detail: string, createdAt: number, toolName?: string): AgentRunStep {
  return { id: `step:${createdAt}:${Math.abs(hashText(`${type}:${title}:${detail}`))}`, type, title, detail, toolName, createdAt };
}

function buildPlanSummary(request: AgentRunRequest, tools: ToolDescriptor[]): string {
  const toolList = tools.length > 0 ? tools.map((candidate) => candidate.name).join(", ") : "no relevant tools";
  return `Infer the ask, use only relevant ${request.workspace} tools (${toolList}), record observations, then stop at proof and approval.`;
}

function buildFinalSummary(request: AgentRunRequest, runnableTools: ToolDescriptor[], blockedTools: PermissionDecision[]): string {
  const runnable = runnableTools.length > 0 ? runnableTools.map((candidate) => candidate.name).join(", ") : "none";
  const blocked = blockedTools.length > 0 ? ` Blocked pending approval: ${blockedTools.map((decision) => decision.toolName).join(", ")}.` : "";
  return `Prepared ${request.workspace} run with runnable tools: ${runnable}.${blocked}`;
}

function inferIntent(prompt: string): string {
  const normalized = prompt.toLowerCase();
  if (/\b(label|archive|inbox|email|gmail)\b/u.test(normalized)) {
    return "email triage and organization";
  }
  if (/\b(code|repo|test|bug|diff)\b/u.test(normalized)) {
    return "coding change";
  }
  if (/\b(page|tab|browser|form|click|fill)\b/u.test(normalized)) {
    return "browser computer use";
  }
  if (/\b(deck|doc|artifact|website|design)\b/u.test(normalized)) {
    return "artifact generation";
  }
  if (/\b(daily|weekly|whenever|monitor|automation)\b/u.test(normalized)) {
    return "automation";
  }
  return "general work";
}

function hashText(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return hash;
}

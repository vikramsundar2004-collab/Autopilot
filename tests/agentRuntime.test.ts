import { describe, expect, it } from "vitest";

import {
  buildAgentTrace,
  createCoreToolRegistry,
  createDefaultConnectors,
  createDefaultHooks,
  createDefaultSubagents,
  createInitialWorkspaceMemory,
  decideToolPermission,
  selectToolsForRun,
  updateWorkspaceMemory,
  type ToolDescriptor
} from "../src/shared/agentRuntime";

describe("shared agent runtime", () => {
  it("loads only relevant tools for the active workspace and task intent", () => {
    const tools = createCoreToolRegistry();
    const selected = selectToolsForRun(tools, {
      workspace: "design",
      prompt: "Turn this email into a website and send the HTML to coding."
    });

    expect(selected.map((tool) => tool.name)).toEqual(
      expect.arrayContaining(["design.createArtifact", "design.reviseArtifact", "coding.proposeEdit"])
    );
    expect(selected.some((tool) => tool.name === "gmail.applyOrganization")).toBe(false);
  });

  it("blocks destructive tools and shadow-mode external writes", () => {
    const tools = createCoreToolRegistry();
    const gmailApply = tools.find((tool) => tool.name === "gmail.applyOrganization");
    expect(gmailApply).toBeTruthy();

    expect(decideToolPermission(gmailApply!, { shadowMode: true })).toEqual(
      expect.objectContaining({
        allowed: false,
        requiresApproval: true,
        reason: expect.stringContaining("Shadow Mode")
      })
    );

    const destructiveTool: ToolDescriptor = {
      name: "coding.deleteEverything",
      description: "Unsafe destructive test tool.",
      workspace: "coding",
      connector: "local-shell",
      inputSchema: "none",
      outputSchema: "none",
      riskLevel: "destructive",
      shadowModeEligible: false,
      approvalRequired: true
    };

    expect(decideToolPermission(destructiveTool)).toEqual(
      expect.objectContaining({
        allowed: false,
        policy: "destructive_block",
        reason: expect.stringContaining("Destructive")
      })
    );
  });

  it("keeps local drafts available while approval-gating mailbox mutations", () => {
    const tools = createCoreToolRegistry();
    const localDraft = tools.find((tool) => tool.name === "gmail.prepareDraft");
    const gmailDraft = tools.find((tool) => tool.name === "gmail.createDraft");
    const sendDraft = tools.find((tool) => tool.name === "gmail.sendDraft");
    expect(localDraft).toBeTruthy();
    expect(gmailDraft).toBeTruthy();
    expect(sendDraft).toBeTruthy();

    expect(decideToolPermission(localDraft!, { shadowMode: true })).toEqual(
      expect.objectContaining({
        allowed: true,
        requiresApproval: false,
        policy: "safe_local_write"
      })
    );

    expect(decideToolPermission(gmailDraft!)).toEqual(
      expect.objectContaining({
        allowed: false,
        requiresApproval: true,
        policy: "approval_required"
      })
    );

    expect(decideToolPermission(sendDraft!, { approvedToolNames: ["gmail.sendDraft"] })).toEqual(
      expect.objectContaining({
        allowed: true,
        requiresApproval: true,
        policy: "approval_required"
      })
    );
  });

  it("treats git push and payment execution as high-impact tools", () => {
    const tools = createCoreToolRegistry();
    const gitPush = tools.find((tool) => tool.name === "coding.gitPush");
    const paymentExecute = tools.find((tool) => tool.name === "payments.execute");
    expect(gitPush).toEqual(expect.objectContaining({ riskLevel: "high_impact_external", approvalRequired: true }));
    expect(paymentExecute).toEqual(expect.objectContaining({ riskLevel: "high_impact_external", approvalRequired: true }));

    expect(decideToolPermission(paymentExecute!, { shadowMode: true })).toEqual(
      expect.objectContaining({
        allowed: false,
        policy: "shadow_block"
      })
    );
    expect(decideToolPermission(gitPush!, { approvedToolNames: ["coding.gitPush"] })).toEqual(
      expect.objectContaining({
        allowed: true,
        policy: "high_impact_approval_required"
      })
    );
  });

  it("builds reviewable traces with permission decisions", () => {
    const trace = buildAgentTrace({
      workspace: "browser",
      prompt: "Read this form, fill the safe fields, and stop before submit.",
      shadowMode: true
    });

    expect(trace.steps.map((step) => step.type)).toEqual(expect.arrayContaining(["context", "plan", "tool_selection", "permission", "quality", "final"]));
    expect(trace.quality).toEqual(expect.objectContaining({ kind: "agent_runtime", passed: true }));
    expect(trace.permissionDecisions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ toolName: "browser.readPageText", allowed: true }),
        expect.objectContaining({ toolName: "browser.fill", allowed: false, policy: "shadow_block" })
      ])
    );
    expect(trace.finalOutput).toContain("Blocked pending approval");
  });

  it("exposes MCP-like connectors, hooks, subagents, and scoped memory", () => {
    const tools = createCoreToolRegistry();
    const connectors = createDefaultConnectors(tools);
    const hooks = createDefaultHooks();
    const subagents = createDefaultSubagents();
    const memories = updateWorkspaceMemory(createInitialWorkspaceMemory(100), {
      scope: "workspace",
      workspace: "coding",
      key: "project_style",
      value: "Prefer reviewable diffs."
    }, 200);

    expect(connectors).toEqual(expect.arrayContaining([expect.objectContaining({ id: "gmail" }), expect.objectContaining({ id: "browser-tabs" }), expect.objectContaining({ id: "payments" })]));
    expect(hooks).toEqual(expect.arrayContaining([expect.objectContaining({ id: "hook:block-destructive-shell", action: "block" })]));
    const destructiveHook = hooks.find((hook) => hook.id === "hook:block-destructive-shell");
    expect(new RegExp(destructiveHook?.pattern ?? "", "iu").test("git push --force origin main")).toBe(true);
    expect(subagents).toEqual(expect.arrayContaining([expect.objectContaining({ id: "debugger" }), expect.objectContaining({ id: "security-reviewer" })]));
    expect(memories[0]).toEqual(
      expect.objectContaining({
        key: "project_style",
        value: "Prefer reviewable diffs.",
        workspace: "coding",
        updatedAt: 200
      })
    );
  });
});

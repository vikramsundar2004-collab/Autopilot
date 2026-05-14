import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  buildAgentTrace,
  createCoreToolRegistry,
  createDefaultConnectors,
  createDefaultHooks,
  createDefaultSubagents,
  createInitialWorkspaceMemory,
  updateWorkspaceMemory,
  type AgentRunRequest,
  type AgentRuntimeSnapshot,
  type AgentTrace,
  type ConnectorDescriptor,
  type HookDefinition,
  type SubagentDefinition,
  type ToolDescriptor,
  type WorkspaceMemory
} from "../shared/agentRuntime.js";
import { getPermissionPolicySummary } from "../shared/permissionPolicy.js";
import { buildProofModeReport, type ProofModeReport, type WorkGraphItem } from "../shared/workGraph.js";

type AgentRuntimeFile = {
  memories: WorkspaceMemory[];
  traces: AgentTrace[];
};

export class AgentRuntimeService {
  private readonly tools: ToolDescriptor[];
  private readonly connectors: ConnectorDescriptor[];
  private readonly hooks: HookDefinition[];
  private readonly subagents: SubagentDefinition[];

  constructor(private readonly getRootPath: () => string) {
    this.tools = createCoreToolRegistry();
    this.connectors = createDefaultConnectors(this.tools);
    this.hooks = createDefaultHooks();
    this.subagents = createDefaultSubagents();
  }

  getSnapshot(): AgentRuntimeSnapshot {
    return {
      tools: this.tools,
      connectors: this.connectors,
      memories: this.readFile().memories,
      hooks: this.hooks,
      subagents: this.subagents,
      permissionPolicy: getPermissionPolicySummary()
    };
  }

  listTools(workspace?: string): ToolDescriptor[] {
    return workspace ? this.tools.filter((tool) => tool.workspace === workspace) : this.tools;
  }

  listConnectors(): ConnectorDescriptor[] {
    return this.connectors;
  }

  getConnectorStatus(connectorId: string): ConnectorDescriptor | null {
    return this.connectors.find((connector) => connector.id === connectorId) ?? null;
  }

  setConnectorEnabled(connectorId: string, enabled: boolean): ConnectorDescriptor | null {
    const connector = this.getConnectorStatus(connectorId);
    if (!connector) {
      return null;
    }
    return {
      ...connector,
      auth: {
        ...connector.auth,
        state: enabled ? connector.auth.state : "disabled"
      },
      tools: connector.tools.map((tool) => ({ ...tool, enabled }))
    };
  }

  run(input: AgentRunRequest): AgentTrace {
    const trace = buildAgentTrace(input, this.tools);
    const file = this.readFile();
    this.writeFile({
      ...file,
      traces: [trace, ...file.traces.filter((item) => item.id !== trace.id)].slice(0, 100)
    });
    return trace;
  }

  getTrace(traceId: string): AgentTrace | null {
    return this.readFile().traces.find((trace) => trace.id === traceId) ?? null;
  }

  approveTool(traceId: string, toolName: string): AgentTrace | null {
    const file = this.readFile();
    const trace = file.traces.find((item) => item.id === traceId);
    if (!trace) {
      return null;
    }
    const nextTrace = buildAgentTrace(
      {
        workspace: trace.workspace,
        prompt: trace.prompt,
        intent: trace.intent,
        sourceId: trace.sourceId,
        approvedToolNames: [...trace.permissionDecisions.filter((decision) => decision.allowed).map((decision) => decision.toolName), toolName]
      },
      this.tools
    );
    const updated = { ...nextTrace, id: trace.id, createdAt: trace.createdAt };
    this.writeFile({
      ...file,
      traces: [updated, ...file.traces.filter((item) => item.id !== traceId)]
    });
    return updated;
  }

  getMemory(): WorkspaceMemory[] {
    return this.readFile().memories;
  }

  updateMemory(input: Omit<WorkspaceMemory, "id" | "updatedAt"> & { id?: string }): WorkspaceMemory[] {
    const file = this.readFile();
    const memories = updateWorkspaceMemory(file.memories, input);
    this.writeFile({ ...file, memories });
    return memories;
  }

  listHooks(): HookDefinition[] {
    return this.hooks;
  }

  testHook(input: { event: HookDefinition["event"]; workspace: string; value: string }): { blocked: boolean; requiresApproval: boolean; matchedHooks: HookDefinition[] } {
    const matchedHooks = this.hooks.filter((hook) => {
      if (!hook.enabled || hook.event !== input.event || (hook.workspace !== input.workspace && hook.workspace !== "home")) {
        return false;
      }
      return hook.pattern ? new RegExp(hook.pattern, "iu").test(input.value) : true;
    });
    return {
      blocked: matchedHooks.some((hook) => hook.action === "block"),
      requiresApproval: matchedHooks.some((hook) => hook.action === "require_approval"),
      matchedHooks
    };
  }

  listSubagents(): SubagentDefinition[] {
    return this.subagents;
  }

  runSubagent(subagentId: string, prompt: string): AgentTrace | null {
    const subagent = this.subagents.find((candidate) => candidate.id === subagentId);
    if (!subagent) {
      return null;
    }
    return this.run({
      workspace: subagent.workspace,
      prompt,
      intent: `${subagent.name}: ${subagent.description}`
    });
  }

  getProof(item: WorkGraphItem | null): ProofModeReport | null {
    return item ? buildProofModeReport(item) : null;
  }

  private readFile(): AgentRuntimeFile {
    const filePath = this.getFilePath();
    try {
      const parsed = JSON.parse(readFileSync(filePath, "utf8")) as Partial<AgentRuntimeFile>;
      return {
        memories: Array.isArray(parsed.memories) ? parsed.memories : createInitialWorkspaceMemory(),
        traces: Array.isArray(parsed.traces) ? parsed.traces : []
      };
    } catch {
      return {
        memories: createInitialWorkspaceMemory(),
        traces: []
      };
    }
  }

  private writeFile(file: AgentRuntimeFile): void {
    const filePath = this.getFilePath();
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, JSON.stringify(file, null, 2));
  }

  private getFilePath(): string {
    return path.join(this.getRootPath(), "agent-runtime.json");
  }
}

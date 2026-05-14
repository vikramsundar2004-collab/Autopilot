import type { Artifact, ArtifactKind } from "./artifacts.js";
import type { ArtifactGenerationTrace } from "./artifactPrompts.js";
import type { EmailMessageSummary } from "./email.js";

export type ActionTool = "reply" | "document" | "slide_deck" | "website_design" | "browser" | "coding" | "question";

export type ActionRisk = "local" | "external_approval" | "sensitive";

export type ActionStepState = "pending" | "running" | "completed" | "needs_user" | "blocked";

export type HumanInputRequest = {
  id: string;
  question: string;
  reason: string;
};

export type FinalApproval = {
  required: boolean;
  reason: string;
  approvedAt?: number;
};

export type ActionStep = {
  id: string;
  title: string;
  tool: ActionTool;
  state: ActionStepState;
  risk: ActionRisk;
  requiresFinalApproval: boolean;
  artifactId?: string;
  humanInput?: HumanInputRequest;
};

export type ActionPlan = {
  id: string;
  title: string;
  summary: string;
  source: {
    provider: "gmail" | "manual";
    label: string;
    messageId?: string;
    url?: string;
  };
  tool: ActionTool;
  artifactId?: string;
  steps: ActionStep[];
  finalApproval: FinalApproval;
  createdAt: number;
  updatedAt: number;
};

export type AgentRunEvent = {
  id: string;
  createdAt: number;
  level: "info" | "success" | "warning" | "error";
  message: string;
};

export type AgentRun = {
  id: string;
  planId: string;
  state: "running" | "waiting_for_user" | "completed" | "failed";
  events: AgentRunEvent[];
  artifactTrace?: ArtifactGenerationTrace;
  createdAt: number;
  updatedAt: number;
};

export type AgentPlanFromEmailRequest = {
  messageId: string;
  preferredKind?: ArtifactKind;
};

export type AgentStartRunRequest = {
  prompt: string;
  preferredKind?: ArtifactKind;
};

export type AgentPlanResult =
  | {
      success: true;
      plan: ActionPlan;
      artifact: Artifact;
      run: AgentRun;
      model?: string;
      usedFallback?: boolean;
      reason?: string;
      aiSource?: "openai" | "fallback";
      artifactTrace?: ArtifactGenerationTrace;
    }
  | {
      success: false;
      reason: string;
      model?: string;
    };

export function chooseArtifactKindFromText(text: string, preferredKind?: ArtifactKind): ArtifactKind {
  if (preferredKind) {
    return preferredKind;
  }

  const searchable = text.toLowerCase();
  if (/\b(slide|slides|deck|presentation|pitch)\b/u.test(searchable)) {
    return "slide_deck";
  }

  if (/\b(website|landing page|web page|figma|mockup|wireframe|design|homepage|portfolio|ui)\b/u.test(searchable)) {
    return "website_design";
  }

  return "document";
}

export function getActionToolForArtifactKind(kind: ArtifactKind): ActionTool {
  switch (kind) {
    case "slide_deck":
      return "slide_deck";
    case "website_design":
      return "website_design";
    case "document":
      return "document";
  }
}

export function buildManualEmailLikeMessage(prompt: string): EmailMessageSummary {
  const now = Date.now();
  return {
    id: `manual:${now}`,
    provider: "gmail",
    threadId: `manual:${now}`,
    from: "Manual prompt",
    fromEmail: "",
    subject: prompt.slice(0, 120) || "Manual artifact request",
    snippet: prompt,
    actionText: prompt,
    receivedAt: now,
    unread: false,
    url: ""
  };
}

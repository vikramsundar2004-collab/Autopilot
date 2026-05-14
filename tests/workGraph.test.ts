import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { WorkGraphStore } from "../src/main/workGraph";
import type { Artifact } from "../src/shared/artifacts";
import type { BrowserSnapshot } from "../src/shared/browserModel";
import type { CodingSnapshot } from "../src/shared/coding";
import type { EmailMessageSummary } from "../src/shared/email";
import type { ActionPlan } from "../src/shared/agent";
import type { WorkAssignment, WorkItem } from "../src/shared/workItems";
import { buildChatWorkTwinItems, buildWorkTwinReplay } from "../src/shared/workGraph";

const tempDirs: string[] = [];

async function makeStore(): Promise<WorkGraphStore> {
  const dir = await mkdtemp(path.join(tmpdir(), "autopilot-work-graph-"));
  tempDirs.push(dir);
  return new WorkGraphStore(() => dir);
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

function baseInput(overrides: Partial<Parameters<WorkGraphStore["buildSnapshot"]>[0]> = {}): Parameters<WorkGraphStore["buildSnapshot"]>[0] {
  return {
    browserSnapshot: { activeTabId: null, tabs: [] } satisfies BrowserSnapshot,
    emailMessages: [],
    workItems: [],
    workAssignments: [],
    artifacts: [],
    actionPlans: [],
    agentRuns: [],
    automationRuns: [],
    codingSnapshot: { projects: [], activeProject: null, tree: null, accessMode: "ask" } satisfies CodingSnapshot,
    ...overrides
  };
}

describe("WorkGraphStore", () => {
  it("creates a reviewable chain from routed work and keeps calendar events user-owned", async () => {
    const store = await makeStore();
    const now = Date.now();
    const gmailWorkItem: WorkItem = {
      id: "work:gmail-1",
      taskId: "task:gmail-1",
      title: "Build Q4 update deck",
      context: "Jordan asked for a customer update deck by Friday.",
      source: {
        provider: "gmail",
        label: "Jordan Lee - Q4 update",
        messageId: "gmail-1",
        subject: "Q4 customer update",
        actionSummary: "Deck requested by Friday.",
        requestedOutput: "slide deck",
        actionConfidence: 91,
        routeReason: "Mentions deck and deadline."
      },
      state: "open",
      priority: "high",
      assignedRoles: ["design", "productivity"],
      people: ["Jordan Lee"],
      requestedOutput: "slide deck",
      extractedRequirements: ["Create slides", "Include customer update", "Finish by Friday"],
      sourceRisk: "medium",
      routeConfidence: 91,
      routeReason: "Mentions deck and deadline.",
      permissionLevel: "approval",
      createdAt: now - 10,
      updatedAt: now
    };
    const assignment: WorkAssignment = {
      id: "assignment:gmail-1:design",
      workItemId: gmailWorkItem.id,
      role: "design",
      state: "waiting_for_user",
      title: "Design deck",
      reason: "Create a deck from the email.",
      outputRefs: [{ kind: "artifact", id: "artifact-1", label: "Q4 deck" }],
      approvalState: "needs_review",
      approvalRequiredReason: "Approve before sharing.",
      qualityScore: 88,
      lastRunSummary: "Generated a deck with quality 88/100.",
      createdAt: now,
      updatedAt: now
    };
    const calendarWorkItem: WorkItem = {
      ...gmailWorkItem,
      id: "work:calendar-1",
      taskId: "task:calendar-1",
      title: "Prepare for Eng prep",
      context: "Calendar event.",
      source: {
        provider: "google-calendar",
        label: "Eng prep",
        eventStartAt: now,
        eventRecurringId: "event-recurring-1"
      },
      assignedRoles: ["productivity"],
      requestedOutput: "calendar commitment",
      routeConfidence: 100,
      routeReason: "Calendar events stay user-owned.",
      permissionLevel: "read"
    };

    const snapshot = await store.buildSnapshot(baseInput({ workItems: [gmailWorkItem, calendarWorkItem], workAssignments: [assignment] }));

    const routed = snapshot.items.find((item) => item.id === `work-item:${gmailWorkItem.id}`);
    expect(routed).toEqual(
      expect.objectContaining({
        source: expect.objectContaining({ kind: "gmail" }),
        route: expect.objectContaining({ workspace: "design", confidence: 91 }),
        output: expect.objectContaining({ kind: "artifact", refId: "artifact-1" }),
        approval: expect.objectContaining({ state: "needs_approval" })
      })
    );

    const calendar = snapshot.items.find((item) => item.id === `work-item:${calendarWorkItem.id}`);
    expect(calendar?.run.state).toBe("user_must_handle");
    expect(calendar?.shadow.eligible).toBe(false);
  });

  it("keeps raw emails as source-review items until AI classifies them", async () => {
    const store = await makeStore();
    const message: EmailMessageSummary = {
      id: "gmail-raw-1",
      provider: "gmail",
      threadId: "thread-1",
      from: "Sarah Patel",
      fromEmail: "sarah@example.com",
      subject: "Client feedback",
      snippet: "Can we address the comments below?",
      actionText: "Client feedback needs review.",
      receivedAt: Date.now(),
      unread: true,
      url: "https://mail.google.com/mail/u/0/#inbox/thread-1"
    };

    const snapshot = await store.buildSnapshot(baseInput({ emailMessages: [message] }));

    expect(snapshot.items[0]).toEqual(
      expect.objectContaining({
        id: `email:${message.id}`,
        output: expect.objectContaining({ kind: "source_review" }),
        route: expect.objectContaining({ workspace: "productivity" }),
        run: expect.objectContaining({
          safeActions: expect.arrayContaining(["suggest Gmail labels"])
        }),
        externalAction: expect.objectContaining({ requiresApproval: false })
      })
    );
  });

  it("builds a Work Twin replay that exposes source, plan, output, quality, and approval proof", async () => {
    const store = await makeStore();
    const message: EmailMessageSummary = {
      id: "gmail-proof-1",
      provider: "gmail",
      threadId: "thread-proof-1",
      from: "Jordan Lee",
      fromEmail: "jordan@example.com",
      subject: "Launch packet",
      snippet: "Please turn this into a launch packet.",
      actionText: "Launch packet needs a client brief and follow-up draft.",
      receivedAt: Date.now(),
      unread: true,
      url: "https://mail.google.com/mail/u/0/#inbox/thread-proof-1"
    };

    const snapshot = await store.buildSnapshot(baseInput({ emailMessages: [message] }));
    const replay = buildWorkTwinReplay(snapshot.items[0]);

    expect(replay.map((step) => step.label)).toEqual(["Source", "Understood ask", "Route", "Plan", "Output", "Quality", "Approval", "External action"]);
    expect(replay.find((step) => step.label === "Plan")?.detail).toContain("Gmail organization");
    expect(replay.find((step) => step.label === "External action")?.detail).toContain("safe local work");
  });

  it("adds quality proof for browser and coding items before external impact", async () => {
    const store = await makeStore();
    const now = Date.now();
    const snapshot = await store.buildSnapshot(
      baseInput({
        browserSnapshot: {
          activeTabId: "tab-1",
          tabs: [
            {
              id: "tab-1",
              title: "Signup form",
              url: "https://example.com/signup",
              isLoading: false,
              canGoBack: false,
              canGoForward: false
            }
          ]
        },
        codingSnapshot: {
          projects: [{ name: "Autopilot", rootPath: "C:/repo/Autopilot", openedAt: now }],
          activeProject: { name: "Autopilot", rootPath: "C:/repo/Autopilot", openedAt: now },
          accessMode: "ask",
          tree: {
            kind: "folder",
            name: "Autopilot",
            path: "C:/repo/Autopilot",
            relativePath: "",
            size: 0,
            modifiedAt: now,
            children: [
              {
                kind: "file",
                name: "App.tsx",
                path: "C:/repo/Autopilot/src/renderer/App.tsx",
                relativePath: "src/renderer/App.tsx",
                size: 1200,
                modifiedAt: now
              }
            ]
          }
        }
      })
    );

    const browser = snapshot.items.find((item) => item.id === "browser:tab-1");
    const coding = snapshot.items.find((item) => item.id === "coding:C:/repo/Autopilot");

    expect(browser?.quality).toEqual(expect.objectContaining({ passed: true }));
    expect(buildWorkTwinReplay(browser!).find((step) => step.label === "Quality")?.detail).toContain("/100");
    expect(coding?.quality).toEqual(expect.objectContaining({ passed: true }));
  });

  it("records Shadow Mode runs and rules without approving external-impact actions", async () => {
    const store = await makeStore();
    const now = Date.now();
    const artifact: Artifact = {
      id: "artifact-1",
      kind: "document",
      title: "Client follow-up brief",
      summary: "A brief for Acme about the Tuesday follow-up.",
      source: { provider: "gmail", label: "Jordan Lee - Follow up", messageId: "gmail-1", from: "Jordan Lee" },
      visibility: "ai_generated",
      pinned: false,
      activeVersionId: "version-1",
      versions: [
        {
          id: "version-1",
          createdAt: now,
          prompt: "From: Jordan Lee\nDate: Tuesday\nDecision: follow up with Acme.",
          summary: "Prepared client follow-up.",
          content: {
            kind: "document",
            markdown: "## Context\nJordan Lee asked for an Acme follow-up on Tuesday.\n\n## Decision\nPrepare a client-ready brief.\n\n## Next steps\n- Jordan reviews the brief.\n- Send only after approval."
          }
        }
      ],
      createdAt: now,
      updatedAt: now
    };
    const plan: ActionPlan = {
      id: "plan-1",
      title: "Client follow-up brief",
      summary: "Prepare a brief.",
      source: { provider: "gmail", label: "Jordan Lee - Follow up", messageId: "gmail-1" },
      tool: "document",
      artifactId: artifact.id,
      steps: [
        {
          id: "step-1",
          title: "Draft brief",
          tool: "document",
          state: "completed",
          risk: "local",
          requiresFinalApproval: false,
          artifactId: artifact.id
        }
      ],
      finalApproval: { required: true, reason: "Approve before sending." },
      createdAt: now,
      updatedAt: now
    };

    const snapshot = await store.buildSnapshot(baseInput({ artifacts: [artifact], actionPlans: [plan] }));
    const item = snapshot.items.find((candidate) => candidate.id === `artifact:${artifact.id}`);
    expect(item?.externalAction.requiresApproval).toBe(true);

    const ruleResult = await store.makeRule(item!);
    expect(ruleResult.success).toBe(true);
    const run = await store.recordShadowRun(item!);

    expect(run.approvalRequired).toBe(true);
    expect(run.visibleRunLog.join("\n")).toContain("Stopped before external action");
  });

  it("turns enterprise chat suggestions into reviewable Work Twin items without mutating external systems", () => {
    const [item] = buildChatWorkTwinItems(
      [
        {
          id: "suggestion-1",
          title: "Fix onboarding auth glitch",
          summary: "Maya asked Vikram to debug the magic-link auth flow before the demo.",
          routeWorkspace: "coding",
          confidence: 87,
          organizationName: "Autopilot Team",
          channelLabel: "#engineering",
          sourceMessageId: "message-1",
          sourceMessageBody: "@Vikram can you fix the magic-link glitch before demo?",
          authorLabel: "Maya Chen",
          assigneeLabel: "Vikram",
          createdAt: 100,
          acceptedAt: null
        }
      ],
      200
    );

    expect(item).toEqual(
      expect.objectContaining({
        id: "chat-suggestion:suggestion-1",
        source: expect.objectContaining({
          kind: "chat",
          label: "Autopilot Team / #engineering",
          excerpt: "@Vikram can you fix the magic-link glitch before demo?"
        }),
        route: expect.objectContaining({ workspace: "coding", confidence: 87 }),
        approval: expect.objectContaining({ state: "needs_approval" }),
        externalAction: expect.objectContaining({
          label: "Create linked Productivity work item",
          requiresApproval: false
        }),
        shadow: expect.objectContaining({ eligible: true })
      })
    );
    expect(buildWorkTwinReplay(item).map((step) => step.label)).toEqual(["Source", "Understood ask", "Route", "Plan", "Output", "Quality", "Approval", "External action"]);
  });
});

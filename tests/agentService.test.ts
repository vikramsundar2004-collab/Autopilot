import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import type { Artifact, ArtifactCreateInput } from "../src/shared/artifacts";
import type { EmailMessageSummary } from "../src/shared/email";
import { AgentService } from "../src/main/agent";
import type { AiGateway, AiGatewayRequest } from "../src/main/aiGateway";

const tempRoots: string[] = [];

async function makeTempRoot(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "autopilot-agent-"));
  tempRoots.push(root);
  return root;
}

afterEach(async () => {
  vi.restoreAllMocks();
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (root) {
      await rm(root, { recursive: true, force: true });
    }
  }
});

describe("AgentService email-to-artifact orchestration", () => {
  it("runs plan/draft/critique/revise with stage-specific timeouts", async () => {
    const message: EmailMessageSummary = {
      id: "email-1",
      provider: "gmail",
      threadId: "thread-1",
      from: "Maya Chen",
      fromEmail: "maya@example.com",
      subject: "Q4 customer update deck",
      snippet: "Please make a Q4 update deck for Jordan Lee and Priya Patel before Dec 13.",
      actionText:
        "Hi team, can you make a Q4 customer update deck for Jordan Lee and Priya Patel before Dec 13? Include launch risks, customer proof, and the decision we need on budget. Maya",
      receivedAt: Date.now(),
      unread: true,
      url: "https://mail.google.com/thread-1"
    };
    const gatewayCalls: Array<{ kind: "artifact" | "text"; timeoutMs?: number; prompt: string }> = [];
    let textCallCount = 0;
    const gateway = {
      generateArtifact: vi.fn(async (input) => {
        gatewayCalls.push({ kind: "artifact", timeoutMs: input.timeoutMs, prompt: input.prompt });
        return {
          success: false,
          model: "gpt-5.5",
          provider: "proxy" as const,
          reason: "Artifact endpoint disabled for test."
        };
      }),
      generateText: vi.fn(async (input: AiGatewayRequest) => {
        textCallCount += 1;
        gatewayCalls.push({ kind: "text", timeoutMs: input.timeoutMs, prompt: input.prompt });
        const payloads = [
          {
            inferredAsk: "Build a Q4 customer update deck",
            audience: "Jordan Lee and Priya Patel",
            deliverableKind: "slide_deck",
            people: ["Maya Chen", "Jordan Lee", "Priya Patel"],
            dates: ["Dec 13", "Q4"],
            decisions: ["Budget approval"],
            planningNotes: ["Turn the request into an approval story, not an email recap."],
            visualPlan: {
              deckAccent: "forest",
              tonePair: "executive",
              perSlideLayout: [{ index: 0, layout: "cover", reason: "Open with the approval thesis." }]
            }
          },
          {
            title: "Q4 Customer Update",
            summary: "Initial deck draft.",
            artifactKind: "slide_deck",
            slides: [{ title: "Draft", bullets: ["Too short"], speakerNotes: "Needs revision." }]
          },
          {
            flaws: ["Too generic and too short for a leadership review."],
            revisionStrategy: "Create a decision-oriented deck with names, dates, owners, and approval language."
          },
          {
            title: "Q4 Customer Update Approval",
            summary: "Leadership-ready deck for Jordan Lee and Priya Patel.",
            artifactKind: "slide_deck",
            replyDraftMarkdown:
              "Hi Maya,\n\nThanks for sending this over. I prepared the Q4 customer update deck for Jordan Lee and Priya Patel ahead of Dec 13. It frames the customer proof, launch risks, and budget approval decision for review.\n\nNext step: I will review the final deck wording before anything is sent or shared externally.\n\nBest,",
            slides: [
              {
                title: "Jordan Lee and Priya Patel need a Dec 13 budget decision",
                bullets: [
                  "Maya Chen needs a Q4 customer update deck for leadership review.",
                  "The deliverable should turn customer proof into a clear budget approval path.",
                  "The Dec 13 deadline makes the next move time-sensitive."
                ],
                speakerNotes:
                  "Open by naming the decision owner, deadline, and reason this deck exists. The approval point is budget clarity before Q4 customer messaging moves forward."
              },
              {
                title: "Customer proof should anchor the update",
                bullets: [
                  "Lead with evidence from recent customer wins instead of broad status reporting.",
                  "Separate launch risks from proven traction so reviewers can scan quickly.",
                  "Assign Maya Chen as owner for proof cleanup and stakeholder follow-up."
                ],
                speakerNotes:
                  "This slide should help Jordan and Priya see what is validated, what is still risky, and what needs one owner before the meeting."
              },
              {
                title: "Recommended next step: approve the Q4 budget path",
                bullets: [
                  "Approve the budget direction or name the blocker before Dec 13.",
                  "Ask Priya Patel to confirm customer proof coverage.",
                  "Ask Jordan Lee to decide whether launch risk needs a separate appendix."
                ],
                speakerNotes:
                  "Close with a concrete approval request, named people, and actions that convert the email into usable work."
              }
            ]
          }
        ];
        return {
          success: true,
          outputText: JSON.stringify(payloads[textCallCount - 1]),
          model: "gpt-5.5",
          provider: "local" as const
        };
      })
    } as unknown as AiGateway;
    const createdArtifacts: Artifact[] = [];
    const artifactStore = {
      createArtifact: vi.fn(async (input: ArtifactCreateInput): Promise<Artifact> => {
        const artifact: Artifact = {
          id: "artifact-1",
          kind: input.kind,
          title: input.title,
          summary: input.summary ?? "",
          emailDraftMarkdown: input.emailDraftMarkdown,
          source: input.source?.provider
            ? ({
                provider: input.source.provider,
                label: input.source.label ?? "Test source",
                messageId: input.source.messageId,
                threadId: input.source.threadId,
                url: input.source.url,
                from: input.source.from,
                fromEmail: input.source.fromEmail,
                subject: input.source.subject
              } satisfies Artifact["source"])
            : { provider: "manual", label: "Manual prompt" },
          visibility: "ai_generated",
          pinned: false,
          activeVersionId: "version-1",
          versions: [
            {
              id: "version-1",
              createdAt: Date.now(),
              prompt: input.prompt ?? "",
              summary: input.summary ?? "",
              content: input.content
            }
          ],
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        createdArtifacts.push(artifact);
        return artifact;
      })
    };
    const emailService = {
      listCachedMessages: () => [message]
    };
    const service = new AgentService(artifactStore as never, emailService as never, await makeTempRoot(), gateway);

    const result = await service.planFromEmail({ messageId: message.id, preferredKind: "slide_deck" });

    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error(result.reason);
    }
    expect(result.usedFallback).toBe(false);
    expect(result.artifactTrace?.critique).toContain("Too generic and too short for a leadership review.");
    expect(result.artifactTrace?.attempts).toBe(1);
    expect(result.artifact.emailDraftMarkdown).toContain("Hi Maya");
    expect(result.artifact.emailDraftMarkdown).toContain("Draft quality");
    expect(gatewayCalls.map((call) => call.timeoutMs)).toEqual([90_000, 20_000, 45_000, 20_000, 45_000]);
    expect(createdArtifacts[0].versions[0].prompt).toContain("Email-to-artifact request metadata");
    expect(createdArtifacts[0].versions[0].prompt).not.toContain("Full email body:");
  });
});

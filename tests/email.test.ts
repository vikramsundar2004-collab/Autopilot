import { describe, expect, it } from "vitest";

import {
  DEFAULT_GMAIL_MAX_RESULTS,
  EMAIL_ORGANIZATION_MODE_OPTIONS,
  GOOGLE_CALENDAR_EVENTS_SCOPE,
  GOOGLE_CALENDAR_READONLY_SCOPE,
  GOOGLE_GMAIL_MODIFY_SCOPE,
  GOOGLE_GMAIL_READONLY_SCOPE,
  getEmailActionAnalysisCandidates,
  getGmailMaxResults,
  getGoogleConnectionCapabilities,
  getGrantedGoogleScopes,
  classifyEmailReplyWorthiness,
  normalizeEmailOrganizationMode,
  parseEmailSender,
  sanitizeEmailOrganizationActions,
  type EmailMessageSummary
} from "../src/shared/email";

describe("parseEmailSender", () => {
  it("parses display name and address", () => {
    expect(parseEmailSender("Vikram Sundar <vikram@example.com>")).toEqual({
      name: "Vikram Sundar",
      email: "vikram@example.com"
    });
  });

  it("handles bare sender strings", () => {
    expect(parseEmailSender("updates@example.com")).toEqual({
      name: "updates@example.com",
      email: ""
    });
  });
});

describe("Google connection capabilities", () => {
  it("normalizes granted scopes and detects Gmail plus Calendar", () => {
    const scopes = getGrantedGoogleScopes(`${GOOGLE_CALENDAR_READONLY_SCOPE} ${GOOGLE_GMAIL_READONLY_SCOPE} ${GOOGLE_GMAIL_READONLY_SCOPE}`);

    expect(scopes).toEqual([GOOGLE_CALENDAR_READONLY_SCOPE, GOOGLE_GMAIL_READONLY_SCOPE]);
    expect(getGoogleConnectionCapabilities(scopes)).toMatchObject({
      gmail: true,
      calendar: true,
      gmailRead: true,
      gmailModify: false,
      calendarRead: true,
      calendarWrite: false
    });
  });

  it("detects a Gmail-only token that needs Calendar reconnect", () => {
    expect(getGoogleConnectionCapabilities(GOOGLE_GMAIL_READONLY_SCOPE)).toMatchObject({
      gmail: true,
      calendar: false,
      gmailRead: true,
      calendarRead: false,
      calendarWrite: false
    });
  });

  it("detects explicit Gmail modification and Calendar writeback scopes", () => {
    expect(getGoogleConnectionCapabilities([GOOGLE_GMAIL_MODIFY_SCOPE, GOOGLE_CALENDAR_EVENTS_SCOPE])).toMatchObject({
      gmail: true,
      gmailRead: true,
      gmailModify: true,
      calendar: true,
      calendarRead: true,
      calendarWrite: true
    });
  });

  it("sanitizes Gmail organization actions so mail changes require explicit user command", () => {
    expect(
      sanitizeEmailOrganizationActions([
        { kind: "label", messageId: " msg-1 ", label: " Follow up ", requiresUserCommand: true },
        { kind: "snooze", messageId: "msg-snooze", label: " Autopilot/Snoozed ", snoozeUntil: 1770000000000, requiresUserCommand: true },
        { kind: "archive", messageId: "msg-2", requiresUserCommand: false },
        { kind: "delete", messageId: "msg-3", requiresUserCommand: true },
        { kind: "star", messageId: "", requiresUserCommand: true }
      ])
    ).toEqual([
      {
        kind: "label",
        messageId: "msg-1",
        label: "Follow up",
        requiresUserCommand: true
      },
      {
        kind: "snooze",
        messageId: "msg-snooze",
        label: "Autopilot/Snoozed",
        snoozeUntil: 1770000000000,
        requiresUserCommand: true
      }
    ]);
  });

  it("normalizes email organization modes and defaults to suggest-only safety", () => {
    expect(EMAIL_ORGANIZATION_MODE_OPTIONS.map((option) => option.id)).toEqual(["off", "suggest_only", "approve_batches", "trusted_rules"]);
    expect(normalizeEmailOrganizationMode("trusted_rules")).toBe("trusted_rules");
    expect(normalizeEmailOrganizationMode("unexpected")).toBe("suggest_only");
    expect(normalizeEmailOrganizationMode(undefined)).toBe("suggest_only");
  });
});

describe("Gmail sync sizing and action candidates", () => {
  it("defaults Gmail sync to 200 messages and clamps env overrides", () => {
    expect(getGmailMaxResults(undefined)).toBe(DEFAULT_GMAIL_MAX_RESULTS);
    expect(getGmailMaxResults("12")).toBe(25);
    expect(getGmailMaxResults("200")).toBe(200);
    expect(getGmailMaxResults("999")).toBe(500);
    expect(getGmailMaxResults("not-a-number")).toBe(DEFAULT_GMAIL_MAX_RESULTS);
  });

  it("ranks likely actionable messages before newsletters", () => {
    const now = Date.now();
    const messages: EmailMessageSummary[] = [
      makeMessage("newsletter", "Weekly product update", "Lots of links and an unsubscribe footer.", now, false),
      makeMessage("github", "[Admin-VSV/Autoplanner] Run failed", "Scheduled Sync failed. Please review the workflow.", now - 1000, true),
      makeMessage("teacher", "Can you send the resume slides today?", "Please prepare and send the deck before class.", now - 2000, false)
    ];

    expect(getEmailActionAnalysisCandidates(messages, 2).map((message) => message.id)).toEqual(["teacher", "github"]);
  });

  it("classifies reply-worthy mail without spending artifact credits on junk", () => {
    expect(classifyEmailReplyWorthiness(makeMessage("verification", "Your verification code", "Use 123456 to verify your login.", Date.now(), true))).toMatchObject({
      status: "skip"
    });
    expect(classifyEmailReplyWorthiness(makeMessage("reply", "Can you confirm Friday?", "Please reply with whether Friday at 2 works.", Date.now(), true))).toMatchObject({
      status: "reply_worthy",
      requestedOutput: "reply",
      recommendedAssistant: "productivity"
    });
    expect(classifyEmailReplyWorthiness(makeMessage("deck", "Need launch deck", "Can you build a short slide deck for the review?", Date.now(), true))).toMatchObject({
      status: "artifact_required",
      requestedOutput: "slide_deck",
      recommendedAssistant: "design"
    });
    expect(classifyEmailReplyWorthiness(makeMessage("repo", "GitHub workflow failed", "Please fix the failing CI build.", Date.now(), true))).toMatchObject({
      status: "artifact_required",
      requestedOutput: "code_change",
      recommendedAssistant: "coding"
    });
  });
});

function makeMessage(id: string, subject: string, snippet: string, receivedAt: number, unread: boolean): EmailMessageSummary {
  return {
    id,
    provider: "gmail",
    threadId: `thread-${id}`,
    from: id === "newsletter" ? "Newsletter" : "Vikram",
    fromEmail: id === "newsletter" ? "updates@example.com" : "vikram@example.com",
    subject,
    snippet,
    receivedAt,
    unread,
    url: `https://mail.google.com/mail/u/0/#inbox/${id}`
  };
}

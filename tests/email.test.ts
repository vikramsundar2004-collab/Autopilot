import { describe, expect, it } from "vitest";

import {
  DEFAULT_GMAIL_MAX_RESULTS,
  GOOGLE_CALENDAR_READONLY_SCOPE,
  GOOGLE_GMAIL_READONLY_SCOPE,
  getEmailActionAnalysisCandidates,
  getGmailMaxResults,
  getGoogleConnectionCapabilities,
  getGrantedGoogleScopes,
  parseEmailSender,
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
    expect(getGoogleConnectionCapabilities(scopes)).toEqual({
      gmail: true,
      calendar: true
    });
  });

  it("detects a Gmail-only token that needs Calendar reconnect", () => {
    expect(getGoogleConnectionCapabilities(GOOGLE_GMAIL_READONLY_SCOPE)).toEqual({
      gmail: true,
      calendar: false
    });
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

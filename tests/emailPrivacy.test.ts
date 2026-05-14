import { describe, expect, it } from "vitest";

import {
  filterBlockedEmailMessages,
  isEmailBlockedBySender,
  listEmailSenders,
  normalizeEmailSenderAddress,
  type EmailMessageSummary
} from "../src/shared/email";

function message(overrides: Partial<EmailMessageSummary>): EmailMessageSummary {
  return {
    id: overrides.id ?? "email-1",
    provider: "gmail",
    threadId: overrides.threadId ?? "thread-1",
    from: overrides.from ?? "Maya Chen <maya@example.com>",
    fromEmail: overrides.fromEmail ?? "maya@example.com",
    subject: overrides.subject ?? "Launch plan",
    snippet: overrides.snippet ?? "Please review this.",
    actionText: overrides.actionText,
    receivedAt: overrides.receivedAt ?? 1,
    unread: overrides.unread ?? true,
    url: overrides.url ?? "https://mail.google.com/mail/u/0/#inbox"
  };
}

describe("email sender privacy controls", () => {
  it("normalizes Gmail sender strings before comparing them", () => {
    expect(normalizeEmailSenderAddress("Maya Chen <Maya@Example.com>")).toBe("maya@example.com");
    expect(normalizeEmailSenderAddress("mailto:billing@acme.test")).toBe("billing@acme.test");
  });

  it("filters blocked senders before AI-readable Productivity work is built", () => {
    const blocked = ["billing@acme.test"];
    const messages = [
      message({ id: "keep", from: "Maya Chen <maya@example.com>", fromEmail: "maya@example.com" }),
      message({ id: "blocked", from: "Acme Billing <billing@acme.test>", fromEmail: "billing@acme.test" })
    ];

    expect(isEmailBlockedBySender(messages[1], blocked)).toBe(true);
    expect(filterBlockedEmailMessages(messages, blocked).map((item) => item.id)).toEqual(["keep"]);
  });

  it("lists unique Gmail senders so users can block them from Productivity", () => {
    const senders = listEmailSenders([
      message({ id: "newer", from: "Acme Billing <billing@acme.test>", fromEmail: "billing@acme.test", receivedAt: 20 }),
      message({ id: "older", from: "Acme Billing <billing@acme.test>", fromEmail: "billing@acme.test", receivedAt: 10 }),
      message({ id: "other", from: "Maya Chen <maya@example.com>", fromEmail: "maya@example.com", receivedAt: 15 })
    ]);

    expect(senders).toEqual([
      expect.objectContaining({ email: "billing@acme.test", count: 2, lastReceivedAt: 20 }),
      expect.objectContaining({ email: "maya@example.com", count: 1, lastReceivedAt: 15 })
    ]);
  });
});

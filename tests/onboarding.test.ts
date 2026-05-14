import { describe, expect, it } from "vitest";

import { GOOGLE_GMAIL_READONLY_SCOPE } from "../src/shared/email";
import { buildOnboardingSummary } from "../src/shared/onboarding";
import type { ProductivityDraft, ProductivitySourceSyncResult, ProductivityTask } from "../src/shared/productivity";

function makeTask(overrides: Partial<ProductivityTask> = {}): ProductivityTask {
  return {
    id: overrides.id ?? "task-1",
    title: overrides.title ?? "Reply to teacher",
    context: overrides.context ?? "Teacher asked for a response",
    state: overrides.state ?? "todo",
    priority: overrides.priority ?? "medium",
    source: overrides.source ?? {
      provider: "gmail",
      label: "Gmail",
      messageId: "email-1"
    },
    createdAt: overrides.createdAt ?? 1,
    updatedAt: overrides.updatedAt ?? 1,
    snoozedUntil: overrides.snoozedUntil,
    completedAt: overrides.completedAt
  };
}

function makeDraft(overrides: Partial<ProductivityDraft> = {}): ProductivityDraft {
  return {
    id: overrides.id ?? "draft-1",
    title: overrides.title ?? "Draft reply",
    body: overrides.body ?? "Here is a polished draft.",
    preview: overrides.preview ?? "Here is a polished draft.",
    status: overrides.status ?? "draft",
    artifactKind: overrides.artifactKind ?? "document",
    source: overrides.source ?? {
      provider: "gmail",
      label: "Gmail",
      messageId: "email-1"
    },
    createdAt: overrides.createdAt ?? 1,
    updatedAt: overrides.updatedAt ?? 1,
    artifactId: overrides.artifactId
  };
}

function makeSourceResult(overrides: Partial<ProductivitySourceSyncResult>): ProductivitySourceSyncResult {
  return {
    id: overrides.id ?? "gmail",
    label: overrides.label ?? "Gmail",
    success: overrides.success ?? true,
    connected: overrides.connected ?? true,
    configured: overrides.configured ?? true,
    addedCount: overrides.addedCount ?? 0,
    updatedCount: overrides.updatedCount ?? 0,
    itemCount: overrides.itemCount ?? 1,
    reason: overrides.reason,
    accountEmail: overrides.accountEmail,
    lastSyncedAt: overrides.lastSyncedAt
  };
}

describe("buildOnboardingSummary", () => {
  it("asks for Google credentials before connection", () => {
    const summary = buildOnboardingSummary({
      emailStatus: {
        provider: "gmail",
        configured: false,
        connected: false,
        accountEmail: null,
        capabilities: {
          gmail: false,
          calendar: false,
          gmailRead: false,
          gmailModify: false,
          gmailDrafts: false,
          gmailSend: false,
          calendarRead: false,
          calendarWrite: false,
          driveRead: false,
          docsRead: false,
          slidesRead: false,
          formsRead: false
        }
      },
      sourceResults: [],
      tasks: [],
      drafts: []
    });

    expect(summary.primaryAction).toBe("configure_google");
    expect(summary.google.configured).toBe(false);
  });

  it("detects connected Gmail with missing Calendar scope", () => {
    const summary = buildOnboardingSummary({
      emailStatus: {
        provider: "gmail",
        configured: true,
        connected: true,
        accountEmail: "vikram@example.com",
        grantedScopes: [GOOGLE_GMAIL_READONLY_SCOPE],
        capabilities: {
          gmail: true,
          calendar: false,
          gmailRead: true,
          gmailModify: false,
          gmailDrafts: false,
          gmailSend: false,
          calendarRead: false,
          calendarWrite: false,
          driveRead: false,
          docsRead: false,
          slidesRead: false,
          formsRead: false
        }
      },
      sourceResults: [makeSourceResult({ id: "gmail", label: "Gmail" })],
      tasks: [makeTask()],
      drafts: []
    });

    expect(summary.primaryAction).toBe("reconnect_google");
    expect(summary.google.needsReconnectForCalendar).toBe(true);
  });

  it("summarizes found work after a successful source sync", () => {
    const summary = buildOnboardingSummary({
      emailStatus: {
        provider: "gmail",
        configured: true,
        connected: true,
        accountEmail: "vikram@example.com",
        capabilities: {
          gmail: true,
          calendar: true,
          gmailRead: true,
          gmailModify: false,
          gmailDrafts: false,
          gmailSend: false,
          calendarRead: true,
          calendarWrite: false,
          driveRead: false,
          docsRead: false,
          slidesRead: false,
          formsRead: false
        }
      },
      sourceResults: [
        makeSourceResult({ id: "gmail", label: "Gmail", itemCount: 3 }),
        makeSourceResult({ id: "google-calendar", label: "Google Calendar", itemCount: 2 })
      ],
      tasks: [
        makeTask(),
        makeTask({
          id: "calendar-1",
          title: "Eng prep",
          source: {
            provider: "google-calendar",
            label: "Google Calendar",
            calendarId: "primary"
          }
        })
      ],
      drafts: [makeDraft()]
    });

    expect(summary.complete).toBe(true);
    expect(summary.primaryAction).toBe("review_work");
    expect(summary.stats).toMatchObject({
      actionItems: 1,
      calendarEvents: 1,
      drafts: 1,
      syncedSources: 2
    });
  });
});

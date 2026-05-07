import type { EmailConnectionStatus } from "./email.js";
import type { ProductivityDraft, ProductivitySourceSyncResult, ProductivityTask } from "./productivity.js";

export type OnboardingPrimaryAction = "configure_google" | "connect_google" | "reconnect_google" | "sync_sources" | "review_work";

export type OnboardingSummary = {
  complete: boolean;
  headline: string;
  detail: string;
  primaryAction: OnboardingPrimaryAction;
  primaryActionLabel: string;
  nextSteps: string[];
  stats: {
    actionItems: number;
    calendarEvents: number;
    drafts: number;
    syncedSources: number;
  };
  google: {
    configured: boolean;
    connected: boolean;
    gmailReady: boolean;
    calendarReady: boolean;
    needsReconnectForCalendar: boolean;
    accountEmail: string | null;
  };
};

export type BuildOnboardingSummaryInput = {
  emailStatus: EmailConnectionStatus | null;
  sourceResults: ProductivitySourceSyncResult[];
  tasks: ProductivityTask[];
  drafts: ProductivityDraft[];
};

export function buildOnboardingSummary(input: BuildOnboardingSummaryInput): OnboardingSummary {
  const emailStatus = input.emailStatus;
  const configured = emailStatus?.configured !== false;
  const connected = Boolean(emailStatus?.connected);
  const gmailResult = input.sourceResults.find((source) => source.id === "gmail");
  const calendarResult = input.sourceResults.find((source) => source.id === "google-calendar");
  const gmailReady = Boolean(connected && (emailStatus?.capabilities?.gmail ?? true));
  const calendarReady = Boolean(connected && ((emailStatus?.capabilities?.calendar ?? false) || calendarResult?.success));
  const needsReconnectForCalendar = Boolean(connected && emailStatus?.capabilities && !emailStatus.capabilities.calendar);
  const openTasks = input.tasks.filter((task) => task.state !== "done");
  const actionItems = openTasks.filter((task) => task.source.provider !== "google-calendar").length;
  const calendarEvents = input.tasks.filter((task) => task.source.provider === "google-calendar").length;
  const drafts = input.drafts.filter((draft) => draft.status !== "approved").length;
  const syncedSources = input.sourceResults.filter((source) => source.success).length;

  if (!configured) {
    return makeSummary({
      complete: false,
      headline: "Add Google credentials to unlock Gmail and Calendar.",
      detail: emailStatus?.reason ?? "Autopilot needs Google OAuth credentials before it can read Gmail or Calendar.",
      primaryAction: "configure_google",
      primaryActionLabel: "Open settings",
      nextSteps: [
        "Paste the Google client ID and secret into .env.local.",
        "Restart Autopilot so the desktop process can read the credentials.",
        "Connect Google once to grant Gmail and Calendar access."
      ],
      actionItems,
      calendarEvents,
      drafts,
      syncedSources,
      configured,
      connected,
      gmailReady,
      calendarReady,
      needsReconnectForCalendar,
      accountEmail: emailStatus?.accountEmail ?? null
    });
  }

  if (!connected) {
    return makeSummary({
      complete: false,
      headline: "Connect Google to find today’s real work.",
      detail: emailStatus?.reason ?? "One Google sign-in powers Gmail action items and Calendar events.",
      primaryAction: "connect_google",
      primaryActionLabel: "Connect Google",
      nextSteps: [
        "Connect Google from inside Autopilot.",
        "Run the first sync to pull Gmail and Calendar.",
        "Review Today’s Call before Autopilot starts safe local work."
      ],
      actionItems,
      calendarEvents,
      drafts,
      syncedSources,
      configured,
      connected,
      gmailReady,
      calendarReady,
      needsReconnectForCalendar,
      accountEmail: emailStatus?.accountEmail ?? null
    });
  }

  if (needsReconnectForCalendar) {
    return makeSummary({
      complete: false,
      headline: "Gmail is connected. Reconnect once to add Calendar.",
      detail: "The saved Google token can read Gmail, but it is missing Calendar permission.",
      primaryAction: "reconnect_google",
      primaryActionLabel: "Reconnect Google",
      nextSteps: [
        "Reconnect Google and accept Calendar access.",
        "Sync again so meetings and deadlines appear in the calendar view.",
        "Autopilot will keep calendar events user-owned and only prepare separate prep tasks."
      ],
      actionItems,
      calendarEvents,
      drafts,
      syncedSources,
      configured,
      connected,
      gmailReady,
      calendarReady,
      needsReconnectForCalendar,
      accountEmail: emailStatus?.accountEmail ?? null
    });
  }

  if (syncedSources === 0 && actionItems === 0 && calendarEvents === 0 && drafts === 0) {
    return makeSummary({
      complete: false,
      headline: "Google is connected. Run the first sync.",
      detail: "Autopilot is ready to scan Gmail and Calendar for action items, deadlines, and draftable work.",
      primaryAction: "sync_sources",
      primaryActionLabel: "Run first sync",
      nextSteps: [
        "Sync Google to populate Today’s Call.",
        "Check the source trail before approving any generated work.",
        "Keep Slack and Outlook disconnected until their credentials are configured."
      ],
      actionItems,
      calendarEvents,
      drafts,
      syncedSources,
      configured,
      connected,
      gmailReady,
      calendarReady,
      needsReconnectForCalendar,
      accountEmail: emailStatus?.accountEmail ?? null
    });
  }

  const actionCopy = `${actionItems} action ${actionItems === 1 ? "item" : "items"}`;
  const calendarCopy = `${calendarEvents} calendar ${calendarEvents === 1 ? "event" : "events"}`;
  const draftCopy = `${drafts} ${drafts === 1 ? "draft" : "drafts"}`;
  return makeSummary({
    complete: true,
    headline: `I found ${actionCopy}, ${calendarCopy}, and ${draftCopy}.`,
    detail:
      gmailResult?.success || calendarResult?.success
        ? "Today’s Call is connected to real sources. Review the routed work, then let Autopilot start safe local preparation."
        : "Autopilot has local work state, but the last source sync needs attention.",
    primaryAction: "review_work",
    primaryActionLabel: "Review work",
    nextSteps: [
      "Review Needs doing, AI working, Needs approval, and User must handle.",
      "Let Autopilot draft or prepare safe local work.",
      "Approve final send, share, publish, submit, delete, or payment steps yourself."
    ],
    actionItems,
    calendarEvents,
    drafts,
    syncedSources,
    configured,
    connected,
    gmailReady,
    calendarReady,
    needsReconnectForCalendar,
    accountEmail: emailStatus?.accountEmail ?? null
  });
}

function makeSummary(input: {
  complete: boolean;
  headline: string;
  detail: string;
  primaryAction: OnboardingPrimaryAction;
  primaryActionLabel: string;
  nextSteps: string[];
  actionItems: number;
  calendarEvents: number;
  drafts: number;
  syncedSources: number;
  configured: boolean;
  connected: boolean;
  gmailReady: boolean;
  calendarReady: boolean;
  needsReconnectForCalendar: boolean;
  accountEmail: string | null;
}): OnboardingSummary {
  return {
    complete: input.complete,
    headline: input.headline,
    detail: input.detail,
    primaryAction: input.primaryAction,
    primaryActionLabel: input.primaryActionLabel,
    nextSteps: input.nextSteps,
    stats: {
      actionItems: input.actionItems,
      calendarEvents: input.calendarEvents,
      drafts: input.drafts,
      syncedSources: input.syncedSources
    },
    google: {
      configured: input.configured,
      connected: input.connected,
      gmailReady: input.gmailReady,
      calendarReady: input.calendarReady,
      needsReconnectForCalendar: input.needsReconnectForCalendar,
      accountEmail: input.accountEmail
    }
  };
}

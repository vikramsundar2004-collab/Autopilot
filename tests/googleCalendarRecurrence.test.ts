import { describe, expect, it, vi } from "vitest";

vi.mock("electron", () => ({
  app: {
    getPath: () => ""
  }
}));

import { buildGoogleRecurrenceRule, inferExpandedGoogleRecurrences, inferRepeatedGoogleEventSeries, parseGoogleCalendarRecurrence } from "../src/main/calendar";
import type { GoogleCalendarEventSummary } from "../src/shared/calendar";

describe("Google Calendar recurrence metadata", () => {
  it("parses common Google RRULE values into Autopilot recurrence labels", () => {
    expect(parseGoogleCalendarRecurrence(["RRULE:FREQ=WEEKLY;BYDAY=SA"])).toEqual({
      recurrence: "weekly",
      recurrenceLabel: "Weekly on Sat",
      recurrenceInterval: 1,
      recurrenceWeekdays: [6]
    });
    expect(parseGoogleCalendarRecurrence(["RRULE:FREQ=MONTHLY;BYDAY=1SA"])).toEqual({
      recurrence: "monthly-day",
      recurrenceLabel: "Monthly by weekday",
      recurrenceInterval: 1
    });
    expect(parseGoogleCalendarRecurrence(["RRULE:FREQ=MONTHLY;BYMONTHDAY=2"])).toEqual({
      recurrence: "monthly",
      recurrenceLabel: "Monthly by date",
      recurrenceInterval: 1
    });
    expect(parseGoogleCalendarRecurrence(["RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR"])).toEqual({
      recurrence: "weekly",
      recurrenceLabel: "Weekly on Mon, Wed, Fri",
      recurrenceInterval: 1,
      recurrenceWeekdays: [1, 3, 5]
    });
  });

  it("infers recurrence labels from expanded recurring event instances when the master is unavailable", () => {
    const events: GoogleCalendarEventSummary[] = [
      makeEvent("instance-1", "2026-05-02T16:45:00Z", "recurring-mathstudying"),
      makeEvent("instance-2", "2026-05-09T16:45:00Z", "recurring-mathstudying"),
      makeEvent("instance-3", "2026-05-16T16:45:00Z", "recurring-mathstudying")
    ];

    const inferredEvents = inferExpandedGoogleRecurrences(events);

    expect(inferredEvents.every((event) => event.recurrence === "weekly")).toBe(true);
    expect(inferredEvents.every((event) => event.recurrenceLabel === "Weekly on Sat")).toBe(true);
    expect(inferredEvents.every((event) => event.recurrenceWeekdays?.[0] === 6)).toBe(true);
  });

  it("backfills repeated Google event series even when cached events have no recurring id", () => {
    const events = [
      makeEvent("standalone-1", "2026-05-04T16:45:00Z", undefined),
      makeEvent("standalone-2", "2026-05-11T16:45:00Z", undefined),
      makeEvent("standalone-3", "2026-05-18T16:45:00Z", undefined)
    ];

    const inferredEvents = inferRepeatedGoogleEventSeries(events);

    expect(inferredEvents.every((event) => event.recurringEventId?.startsWith("inferred:"))).toBe(true);
    expect(inferredEvents.every((event) => event.recurrence === "weekly")).toBe(true);
    expect(inferredEvents.every((event) => event.recurrenceLabel === "Weekly on Mon")).toBe(true);
  });

  it("builds Google writeback recurrence rules from Autopilot recurrence settings", () => {
    expect(buildGoogleRecurrenceRule({ recurrence: "weekly", recurrenceWeekdays: [2, 4] })).toBe("RRULE:FREQ=WEEKLY;BYDAY=TU,TH");
    expect(buildGoogleRecurrenceRule({ recurrence: "daily", recurrenceInterval: 2 })).toBe("RRULE:FREQ=DAILY;INTERVAL=2");
    expect(buildGoogleRecurrenceRule({ recurrence: "none" })).toBeUndefined();
  });
});

function makeEvent(id: string, startIso: string, recurringEventId?: string): GoogleCalendarEventSummary {
  const startAt = Date.parse(startIso);
  return {
    id,
    calendarId: "primary",
    calendarName: "Classes",
    title: "Mathstudying",
    startAt,
    endAt: startAt + 2 * 60 * 60 * 1000,
    allDay: false,
    attendees: [],
    recurringEventId
  };
}

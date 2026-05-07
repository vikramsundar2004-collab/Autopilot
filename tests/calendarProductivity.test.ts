import { describe, expect, it, vi } from "vitest";

vi.mock("electron", () => ({
  app: {
    getPath: () => ""
  }
}));

import { createTaskFromCalendarEvent } from "../src/main/productivityTasks";
import type { GoogleCalendarEventSummary } from "../src/shared/calendar";

describe("createTaskFromCalendarEvent", () => {
  it("turns upcoming Google Calendar events into calendar-backed tasks", () => {
    const now = Date.parse("2026-05-01T10:00:00Z");
    const event: GoogleCalendarEventSummary = {
      id: "event-1",
      calendarId: "primary",
      calendarName: "School",
      title: "Project check-in",
      location: "Room 204",
      htmlLink: "https://calendar.google.com/calendar/event?eid=event-1",
      startAt: Date.parse("2026-05-01T18:00:00Z"),
      endAt: Date.parse("2026-05-01T18:30:00Z"),
      allDay: false,
      organizer: "teacher@example.com",
      attendees: []
    };

    const task = createTaskFromCalendarEvent(event, now);

    expect(task.id).toMatch(/^calendar:/);
    expect(task.title).toBe("Prepare for: Project check-in");
    expect(task.priority).toBe("high");
    expect(task.source).toMatchObject({
      provider: "google-calendar",
      label: "School - Project check-in",
      messageId: "event-1",
      url: event.htmlLink,
      subject: "Project check-in",
      calendarId: "primary",
      calendarName: "School",
      eventStartAt: event.startAt,
      eventEndAt: event.endAt
    });
    expect(task.context).toContain("Location: Room 204");
  });

  it("preserves Google Calendar recurrence metadata on the task source", () => {
    const now = Date.parse("2026-05-01T10:00:00Z");
    const event: GoogleCalendarEventSummary = {
      id: "event-3_20260502T164500Z",
      calendarId: "primary",
      calendarName: "Classes",
      title: "Mathstudying",
      recurringEventId: "event-3",
      recurrence: "weekly",
      recurrenceLabel: "Weekly",
      recurrenceInterval: 1,
      recurrenceWeekdays: [6],
      startAt: Date.parse("2026-05-02T16:45:00Z"),
      endAt: Date.parse("2026-05-02T18:45:00Z"),
      allDay: false,
      attendees: []
    };

    const task = createTaskFromCalendarEvent(event, now);

    expect(task.source).toMatchObject({
      eventRecurringId: "event-3",
      eventRecurrence: "weekly",
      eventRecurrenceLabel: "Weekly",
      eventRecurrenceInterval: 1,
      eventRecurrenceWeekdays: [6]
    });
  });

  it("keeps past calendar events visible without treating them as open urgent work", () => {
    const now = Date.parse("2026-05-02T20:00:00Z");
    const event: GoogleCalendarEventSummary = {
      id: "event-2",
      calendarId: "primary",
      calendarName: "Classes",
      title: "Math club",
      startAt: Date.parse("2026-05-01T22:00:00Z"),
      endAt: Date.parse("2026-05-01T23:00:00Z"),
      allDay: false,
      attendees: []
    };

    const task = createTaskFromCalendarEvent(event, now);

    expect(task.state).toBe("done");
    expect(task.priority).toBe("low");
    expect(task.source.eventStartAt).toBe(event.startAt);
  });
});

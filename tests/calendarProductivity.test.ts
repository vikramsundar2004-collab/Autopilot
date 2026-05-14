import { describe, expect, it, vi } from "vitest";

vi.mock("electron", () => ({
  app: {
    getPath: () => ""
  }
}));

import { createTaskFromCalendarEvent } from "../src/main/productivityTasks";
import type { GoogleCalendarEventSummary } from "../src/shared/calendar";
import type { ProductivityTask } from "../src/shared/productivity";
import { getCalendarWeekDays, getCalendarWeekEventLayout, getCalendarWeekEvents } from "../src/renderer/calendarUtils";

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

describe("getCalendarWeekEvents", () => {
  it("keeps overlapping calendar events on separate lanes for readable rendering", () => {
    const startAt = new Date(2026, 4, 4, 9, 0).getTime();
    const tasks: ProductivityTask[] = Array.from({ length: 3 }, (_unused, index) => ({
      id: `calendar:event-${index}`,
      title: `Prepare for: Overlap ${index + 1}`,
      context: "Same time",
      state: "todo",
      priority: "medium",
      source: {
        provider: "google-calendar",
        label: `Calendar - Overlap ${index + 1}`,
        messageId: `event-${index}`,
        subject: `Overlap ${index + 1}`,
        calendarId: "primary",
        calendarName: "Calendar",
        eventStartAt: startAt,
        eventEndAt: startAt + 60 * 60 * 1000
      },
      createdAt: 1,
      updatedAt: 1
    }));

    const weekEvents = getCalendarWeekEvents(tasks, [], getCalendarWeekDays(new Date(2026, 4, 4)));

    expect(weekEvents).toHaveLength(3);
    expect(weekEvents.map((event) => event.dayIndex)).toEqual([0, 0, 0]);
    expect(weekEvents.map((event) => event.laneCount)).toEqual([3, 3, 3]);
    expect(new Set(weekEvents.map((event) => event.laneIndex))).toEqual(new Set([0, 1, 2]));
    expect(new Set(weekEvents.map((event) => event.startOffset))).toHaveLength(1);
    expect(weekEvents.map((event) => getCalendarWeekEventLayout(event).leftPercent)).toEqual([0, 100 / 21, 200 / 21]);
    expect(new Set(weekEvents.map((event) => getCalendarWeekEventLayout(event).widthPercent))).toEqual(new Set([100 / 21]));
  });

  it("does not move overlapping events down from their real start time", () => {
    const startAt = new Date(2026, 4, 4, 15, 0).getTime();
    const tasks: ProductivityTask[] = [
      {
        id: "calendar:long",
        title: "Prepare for: Study block",
        context: "Long event",
        state: "todo",
        priority: "medium",
        source: {
          provider: "google-calendar",
          label: "Calendar - Study block",
          messageId: "long",
          subject: "Study block",
          calendarId: "primary",
          calendarName: "Calendar",
          eventStartAt: startAt,
          eventEndAt: startAt + 3 * 60 * 60 * 1000
        },
        createdAt: 1,
        updatedAt: 1
      },
      {
        id: "calendar:short",
        title: "Prepare for: Club",
        context: "Short event",
        state: "todo",
        priority: "medium",
        source: {
          provider: "google-calendar",
          label: "Calendar - Club",
          messageId: "short",
          subject: "Club",
          calendarId: "primary",
          calendarName: "Calendar",
          eventStartAt: startAt,
          eventEndAt: startAt + 60 * 60 * 1000
        },
        createdAt: 1,
        updatedAt: 1
      }
    ];

    const weekEvents = getCalendarWeekEvents(tasks, [], getCalendarWeekDays(new Date(2026, 4, 4)));
    const layouts = weekEvents.map((event) => getCalendarWeekEventLayout(event));

    expect(weekEvents).toHaveLength(2);
    expect(weekEvents.map((event) => event.laneCount)).toEqual([3, 3]);
    expect(new Set(weekEvents.map((event) => event.startOffset))).toHaveLength(1);
    expect(layouts[0].leftPercent).not.toBe(layouts[1].leftPercent);
    expect(layouts[0].widthPercent).toBe(layouts[1].widthPercent);
    expect(layouts[0].widthPercent).toBe(100 / 21);
    expect(weekEvents.every((event) => !event.compact)).toBe(true);
  });

  it("uses three readable lanes before stacking overflow overlaps", () => {
    const startAt = new Date(2026, 4, 4, 20, 0).getTime();
    const tasks: ProductivityTask[] = Array.from({ length: 4 }, (_unused, index) => ({
      id: `calendar:dense-${index}`,
      title: `Prepare for: Dense ${index + 1}`,
      context: "Same dense time",
      state: "todo",
      priority: "medium",
      source: {
        provider: "google-calendar",
        label: `Calendar - Dense ${index + 1}`,
        messageId: `dense-${index}`,
        subject: `Dense ${index + 1}`,
        calendarId: "primary",
        calendarName: "Calendar",
        eventStartAt: startAt,
        eventEndAt: startAt + 45 * 60 * 1000
      },
      createdAt: 1,
      updatedAt: 1
    }));

    const weekEvents = getCalendarWeekEvents(tasks, [], getCalendarWeekDays(new Date(2026, 4, 4)));

    expect(weekEvents).toHaveLength(4);
    expect(new Set(weekEvents.map((event) => event.laneCount))).toEqual(new Set([3]));
    expect(weekEvents.map((event) => event.laneIndex)).toEqual([0, 1, 2, 0]);
    expect(weekEvents[3].stackOffsetHours).toBeGreaterThan(0);
  });
});

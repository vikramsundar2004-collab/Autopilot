import { describe, expect, it } from "vitest";
import { getLocalCalendarOccurrenceStartForDay, type LocalCalendarEvent } from "../src/shared/localCalendar";

describe("local calendar recurrence", () => {
  it("keeps weekly events visible years in the future", () => {
    const event = makeEvent("2026-05-04T09:00:00", "weekly");

    const occurrence = getLocalCalendarOccurrenceStartForDay(event, new Date(2031, 4, 5));

    expect(occurrence).toBe(new Date(2031, 4, 5, 9, 0, 0, 0).getTime());
  });

  it("repeats daily events on every following day", () => {
    const event = makeEvent("2026-05-02T16:45:00", "daily");

    expect(getLocalCalendarOccurrenceStartForDay(event, new Date(2026, 4, 3))).toBe(new Date(2026, 4, 3, 16, 45, 0, 0).getTime());
    expect(getLocalCalendarOccurrenceStartForDay(event, new Date(2026, 4, 4))).toBe(new Date(2026, 4, 4, 16, 45, 0, 0).getTime());
  });

  it("falls monthly date repeats back to the last valid day of short months", () => {
    const event = makeEvent("2026-01-31T15:30:00", "monthly");

    const februaryOccurrence = getLocalCalendarOccurrenceStartForDay(event, new Date(2027, 1, 28));
    const wrongDay = getLocalCalendarOccurrenceStartForDay(event, new Date(2027, 1, 27));

    expect(februaryOccurrence).toBe(new Date(2027, 1, 28, 15, 30, 0, 0).getTime());
    expect(wrongDay).toBeNull();
  });

  it("falls fifth-weekday monthly repeats back to the last matching weekday", () => {
    const event = makeEvent("2026-03-30T10:00:00", "monthly-day");

    const aprilOccurrence = getLocalCalendarOccurrenceStartForDay(event, new Date(2027, 3, 26));
    const wrongMonday = getLocalCalendarOccurrenceStartForDay(event, new Date(2027, 3, 19));

    expect(aprilOccurrence).toBe(new Date(2027, 3, 26, 10, 0, 0, 0).getTime());
    expect(wrongMonday).toBeNull();
  });
});

function makeEvent(isoDate: string, recurrence: LocalCalendarEvent["recurrence"]): LocalCalendarEvent {
  const startAt = new Date(isoDate).getTime();
  return {
    id: `event-${recurrence}`,
    title: "Recurring event",
    notes: "",
    startAt,
    endAt: startAt + 60 * 60 * 1000,
    allDay: false,
    recurrence,
    color: "#0f5132",
    createdAt: startAt,
    updatedAt: startAt
  };
}

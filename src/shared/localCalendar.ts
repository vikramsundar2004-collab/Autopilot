export type CalendarRecurrence = "none" | "daily" | "weekly" | "monthly" | "monthly-day";

export type LocalCalendarEvent = {
  id: string;
  title: string;
  notes: string;
  startAt: number;
  endAt: number;
  allDay: boolean;
  recurrence: CalendarRecurrence;
  color: string;
  sourceTaskId?: string;
  createdAt: number;
  updatedAt: number;
};

function getStartOfDay(date: Date): Date {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

function isSameCalendarDay(leftDate: Date, rightDate: Date): boolean {
  return (
    leftDate.getFullYear() === rightDate.getFullYear() &&
    leftDate.getMonth() === rightDate.getMonth() &&
    leftDate.getDate() === rightDate.getDate()
  );
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getWeekdayOrdinal(date: Date): number {
  return Math.floor((date.getDate() - 1) / 7) + 1;
}

function getNthWeekdayDate(year: number, month: number, weekday: number, ordinal: number): number | null {
  const firstDay = new Date(year, month, 1);
  const offset = (weekday - firstDay.getDay() + 7) % 7;
  const date = 1 + offset + (ordinal - 1) * 7;
  return date <= getDaysInMonth(year, month) ? date : null;
}

function getLastWeekdayDate(year: number, month: number, weekday: number): number {
  const lastDate = getDaysInMonth(year, month);
  const lastDay = new Date(year, month, lastDate);
  return lastDate - ((lastDay.getDay() - weekday + 7) % 7);
}

export function isLocalCalendarEvent(value: unknown): value is LocalCalendarEvent {
  if (!value || typeof value !== "object") {
    return false;
  }

  const event = value as LocalCalendarEvent;
  return (
    typeof event.id === "string" &&
    typeof event.title === "string" &&
    typeof event.notes === "string" &&
    typeof event.startAt === "number" &&
    typeof event.endAt === "number" &&
    typeof event.allDay === "boolean" &&
    ["none", "daily", "weekly", "monthly", "monthly-day"].includes(event.recurrence) &&
    typeof event.color === "string" &&
    typeof event.createdAt === "number" &&
    typeof event.updatedAt === "number"
  );
}

export function getLocalCalendarOccurrenceStartForDay(event: LocalCalendarEvent, day: Date): number | null {
  const baseDate = new Date(event.startAt);
  const baseDay = getStartOfDay(baseDate);
  const currentDay = getStartOfDay(day);
  if (currentDay.getTime() < baseDay.getTime()) {
    return null;
  }

  if (event.recurrence === "none" && !isSameCalendarDay(currentDay, baseDay)) {
    return null;
  }

  if (event.recurrence === "daily") {
    return new Date(currentDay.getFullYear(), currentDay.getMonth(), currentDay.getDate(), baseDate.getHours(), baseDate.getMinutes(), 0, 0).getTime();
  }

  if (event.recurrence === "weekly" && currentDay.getDay() !== baseDay.getDay()) {
    return null;
  }

  if (event.recurrence === "monthly") {
    const targetDate = Math.min(baseDay.getDate(), getDaysInMonth(currentDay.getFullYear(), currentDay.getMonth()));
    if (currentDay.getDate() !== targetDate) {
      return null;
    }
  }

  if (event.recurrence === "monthly-day") {
    const ordinal = getWeekdayOrdinal(baseDay);
    const targetDate =
      getNthWeekdayDate(currentDay.getFullYear(), currentDay.getMonth(), baseDay.getDay(), ordinal) ??
      getLastWeekdayDate(currentDay.getFullYear(), currentDay.getMonth(), baseDay.getDay());
    if (currentDay.getDate() !== targetDate) {
      return null;
    }
  }

  return new Date(currentDay.getFullYear(), currentDay.getMonth(), currentDay.getDate(), baseDate.getHours(), baseDate.getMinutes(), 0, 0).getTime();
}

export function getCalendarRecurrenceLabel(recurrence: CalendarRecurrence | undefined): string | undefined {
  switch (recurrence) {
    case "daily":
      return "Daily";
    case "weekly":
      return "Weekly";
    case "monthly":
      return "Monthly by date";
    case "monthly-day":
      return "Monthly by weekday";
    case "none":
    case undefined:
      return undefined;
  }
}

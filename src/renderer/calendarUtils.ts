import {
  getCalendarRecurrenceLabel,
  getLocalCalendarOccurrenceStartForDay,
  isLocalCalendarEvent,
  type CalendarRecurrence,
  type LocalCalendarEvent
} from "../shared/localCalendar";
import type { ProductivityTask } from "../shared/productivity";

export type CalendarEventForm = {
  title: string;
  notes: string;
  date: string;
  startTime: string;
  endTime: string;
  recurrence: CalendarRecurrence;
};

export type CalendarEditorState = {
  mode: "create" | "edit";
  eventId?: string;
  sourceEvent?: CalendarWeekEvent;
};

export type CalendarWeekEvent = {
  id: string;
  task?: ProductivityTask;
  localEvent?: LocalCalendarEvent;
  sourceKind: "google" | "local";
  title: string;
  calendarName: string;
  startAt: number;
  endAt: number;
  allDay: boolean;
  color: string;
  dayIndex: number;
  startOffset: number;
  durationHours: number;
  timeLabel: string;
  recurrence?: CalendarRecurrence;
  recurrenceLabel?: string;
  recurrenceInterval?: number;
  recurrenceWeekdays?: number[];
  compact: boolean;
  laneIndex: number;
  laneCount: number;
  stackIndex: number;
  stackCount: number;
  stackOffsetHours: number;
};

export type CalendarWeekEventLayout = {
  leftPercent: number;
  widthPercent: number;
};

const LOCAL_CALENDAR_EVENTS_STORAGE_KEY = "autopilot:local-calendar-events";
const DAY_MS = 24 * 60 * 60 * 1000;
export const CALENDAR_WEEK_START_HOUR = 1;
export const CALENDAR_WEEK_END_HOUR = 23;
export const CALENDAR_HOUR_HEIGHT = 76;
const MIN_OVERLAP_LANES = 3;
const MAX_VISIBLE_OVERLAP_LANES = 3;
const OVERFLOW_LANE_STACK_OFFSET_HOURS = 0.42;
const calendarEventColors = ["#3f7ee8", "#0b57d0", "#dc4b35", "#e2bf37", "#2f8f63", "#bd4f86", "#c96f2d"];

export function getStartOfDay(date: Date): Date {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

export function addCalendarDays(date: Date, days: number): Date {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

export function getCalendarWeekStart(date: Date): Date {
  const start = getStartOfDay(date);
  const day = start.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  return addCalendarDays(start, mondayOffset);
}

export function getCalendarWeekDays(referenceDate: Date): Date[] {
  const weekStart = getCalendarWeekStart(referenceDate);
  return Array.from({ length: 7 }, (_unused, index) => addCalendarDays(weekStart, index));
}

export function getMiniCalendarDays(referenceDate: Date): Date[] {
  const monthStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  const gridStart = getCalendarWeekStart(monthStart);
  return Array.from({ length: 42 }, (_unused, index) => addCalendarDays(gridStart, index));
}

export function isSameCalendarDay(leftDate: Date, rightDate: Date): boolean {
  return (
    leftDate.getFullYear() === rightDate.getFullYear() &&
    leftDate.getMonth() === rightDate.getMonth() &&
    leftDate.getDate() === rightDate.getDate()
  );
}

export function formatCalendarWeekRange(days: Date[]): string {
  const firstDay = days[0] ?? new Date();
  const lastDay = days[days.length - 1] ?? firstDay;
  const sameMonth = firstDay.getMonth() === lastDay.getMonth() && firstDay.getFullYear() === lastDay.getFullYear();
  const monthFormatter = new Intl.DateTimeFormat(undefined, { month: "short" });
  const fullFormatter = new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric" });
  if (sameMonth) {
    return `${fullFormatter.format(firstDay)} ${firstDay.getDate()}-${lastDay.getDate()}`;
  }

  return `${monthFormatter.format(firstDay)} ${firstDay.getDate()} - ${fullFormatter.format(lastDay)}`;
}

export function formatCalendarMonthLabel(date: Date): string {
  return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(date);
}

export function formatCalendarTime(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(timestamp));
}

function formatCalendarEventTime(startAt: number, endAt: number, allDay: boolean): string {
  return allDay ? "All day" : `${formatCalendarTime(startAt)} - ${formatCalendarTime(endAt)}`;
}

function getCalendarEventGeometry(startAt: number, endAt: number, allDay: boolean): { startOffset: number; durationHours: number; compact: boolean } {
  const startDate = new Date(startAt);
  const rawStartOffset = startDate.getHours() + startDate.getMinutes() / 60 - CALENDAR_WEEK_START_HOUR;
  const rawDuration = Math.max(0.5, (endAt - startAt) / (60 * 60 * 1000));
  const startOffset = allDay ? 0 : Math.max(0, Math.min(CALENDAR_WEEK_END_HOUR - CALENDAR_WEEK_START_HOUR - 0.5, rawStartOffset));
  const durationHours = allDay ? 0.64 : Math.max(0.48, Math.min(rawDuration, CALENDAR_WEEK_END_HOUR - CALENDAR_WEEK_START_HOUR - startOffset));
  return {
    startOffset,
    durationHours,
    compact: !allDay && durationHours < 0.72
  };
}

export function formatCalendarDateInput(timestamp: number): string {
  const date = new Date(timestamp);
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function formatCalendarTimeInput(timestamp: number): string {
  const date = new Date(timestamp);
  return `${`${date.getHours()}`.padStart(2, "0")}:${`${date.getMinutes()}`.padStart(2, "0")}`;
}

export function parseCalendarDateTime(dateValue: string, timeValue: string): number {
  const [year = "0", month = "1", day = "1"] = dateValue.split("-");
  const [hour = "9", minute = "0"] = timeValue.split(":");
  return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), 0, 0).getTime();
}

export function getCalendarEventColor(seed: string): string {
  let hash = 0;
  for (const character of seed) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return calendarEventColors[hash % calendarEventColors.length];
}

function stripCalendarTaskTitle(title: string): string {
  return title.replace(/^(Prepare for|Track deadline):\s*/iu, "").trim() || title;
}

export function loadLocalCalendarEvents(): LocalCalendarEvent[] {
  try {
    const raw = localStorage.getItem(LOCAL_CALENDAR_EVENTS_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isLocalCalendarEvent).sort((leftEvent, rightEvent) => leftEvent.startAt - rightEvent.startAt);
  } catch {
    return [];
  }
}

export function saveLocalCalendarEvents(events: LocalCalendarEvent[]): void {
  try {
    localStorage.setItem(LOCAL_CALENDAR_EVENTS_STORAGE_KEY, JSON.stringify(events));
  } catch {
    // Local calendar editing still works for this session if persistence is unavailable.
  }
}

function inferCachedGoogleTaskRecurrences(tasks: ProductivityTask[]): ProductivityTask[] {
  const groups = new Map<string, ProductivityTask[]>();
  for (const task of tasks) {
    if (task.source.eventRecurrence || typeof task.source.eventStartAt !== "number") {
      continue;
    }

    const key = getCachedGoogleSeriesKey(task);
    groups.set(key, [...(groups.get(key) ?? []), task]);
  }

  const inferredByKey = new Map<string, { recurrence: CalendarRecurrence; label: string; interval: number; weekdays?: number[]; recurringId: string }>();
  for (const [key, groupedTasks] of groups.entries()) {
    if (groupedTasks.length < 2) {
      continue;
    }

    const inferred = inferCalendarRecurrenceFromTaskInstances(groupedTasks);
    if (inferred) {
      inferredByKey.set(key, {
        ...inferred,
        recurringId: `cached:${hashString(key).slice(0, 18)}`
      });
    }
  }

  return tasks.map((task) => {
    if (task.source.eventRecurrence || typeof task.source.eventStartAt !== "number") {
      return task;
    }

    const inferred = inferredByKey.get(getCachedGoogleSeriesKey(task));
    if (!inferred) {
      return task;
    }

    return {
      ...task,
      source: {
        ...task.source,
        eventRecurringId: task.source.eventRecurringId ?? inferred.recurringId,
        eventRecurrence: inferred.recurrence,
        eventRecurrenceLabel: inferred.label,
        eventRecurrenceInterval: inferred.interval,
        eventRecurrenceWeekdays: inferred.weekdays
      }
    };
  });
}

function getCachedGoogleSeriesKey(task: ProductivityTask): string {
  const startAt = task.source.eventStartAt ?? 0;
  const endAt = task.source.eventEndAt ?? startAt;
  const startDate = new Date(startAt);
  const startMinuteOfDay = task.source.eventAllDay ? 0 : startDate.getHours() * 60 + startDate.getMinutes();
  const durationMinutes = Math.max(0, Math.round((endAt - startAt) / (60 * 1000)));
  return [
    task.source.calendarId ?? task.source.calendarName ?? "google-calendar",
    normalizeCalendarSeriesText(task.source.subject || stripCalendarTaskTitle(task.title)),
    normalizeCalendarSeriesText(task.source.from),
    task.source.eventAllDay ? "all-day" : "timed",
    startMinuteOfDay,
    durationMinutes
  ].join(":");
}

function inferCalendarRecurrenceFromTaskInstances(tasks: ProductivityTask[]): { recurrence: CalendarRecurrence; label: string; interval: number; weekdays?: number[] } | null {
  const dates = tasks
    .map((task) => (typeof task.source.eventStartAt === "number" ? new Date(task.source.eventStartAt) : null))
    .filter((date): date is Date => Boolean(date))
    .sort((leftDate, rightDate) => leftDate.getTime() - rightDate.getTime());
  if (dates.length < 2) {
    return null;
  }

  if (dates.every((date, index) => index === 0 || getMonthDistanceForCalendarDates(dates[index - 1], date) >= 1)) {
    if (dates.every((date) => date.getDate() === dates[0].getDate())) {
      return { recurrence: "monthly", label: "Monthly by date", interval: 1 };
    }
    if (dates.every((date) => date.getDay() === dates[0].getDay() && getWeekdayOrdinalForCalendarDate(date) === getWeekdayOrdinalForCalendarDate(dates[0]))) {
      return { recurrence: "monthly-day", label: "Monthly by weekday", interval: 1 };
    }
  }

  const dayGaps = dates.slice(1).map((date, index) => Math.max(1, Math.round((getStartOfDay(date).getTime() - getStartOfDay(dates[index]).getTime()) / DAY_MS)));
  if (dayGaps.every((gap) => gap === 1)) {
    return { recurrence: "daily", label: "Daily", interval: 1 };
  }
  if (dayGaps.every((gap) => gap % 7 === 0)) {
    const interval = Math.max(1, dayGaps[0] / 7);
    const weekday = dates[0].getDay();
    return {
      recurrence: "weekly",
      label: interval > 1 ? `Every ${interval} weeks` : `Weekly on ${formatShortWeekday(weekday)}`,
      interval,
      weekdays: [weekday]
    };
  }

  return null;
}

function getGoogleTaskOccurrenceStartForDay(task: ProductivityTask, day: Date): number | null {
  const recurrence = task.source.eventRecurrence;
  const seedStartAt = task.source.eventStartAt;
  if (!recurrence || typeof seedStartAt !== "number") {
    return null;
  }

  const baseDate = new Date(seedStartAt);
  const baseDay = getStartOfDay(baseDate);
  const currentDay = getStartOfDay(day);
  if (currentDay.getTime() < baseDay.getTime()) {
    return null;
  }

  const interval = Math.max(1, Math.floor(task.source.eventRecurrenceInterval ?? 1));
  if (recurrence === "daily") {
    const dayDistance = Math.round((currentDay.getTime() - baseDay.getTime()) / DAY_MS);
    if (dayDistance % interval !== 0) {
      return null;
    }
  } else if (recurrence === "weekly") {
    const weekdays = task.source.eventRecurrenceWeekdays?.length ? task.source.eventRecurrenceWeekdays : [baseDay.getDay()];
    if (!weekdays.includes(currentDay.getDay())) {
      return null;
    }
    const weekDistance = Math.floor((getCalendarWeekStart(currentDay).getTime() - getCalendarWeekStart(baseDay).getTime()) / (7 * DAY_MS));
    if (weekDistance % interval !== 0) {
      return null;
    }
  } else if (recurrence === "monthly") {
    const monthDistance = getMonthDistanceForCalendarDates(baseDay, currentDay);
    if (monthDistance % interval !== 0) {
      return null;
    }
    const targetDate = Math.min(baseDay.getDate(), new Date(currentDay.getFullYear(), currentDay.getMonth() + 1, 0).getDate());
    if (currentDay.getDate() !== targetDate) {
      return null;
    }
  } else if (recurrence === "monthly-day") {
    const monthDistance = getMonthDistanceForCalendarDates(baseDay, currentDay);
    if (monthDistance % interval !== 0) {
      return null;
    }
    const targetDate = getNthWeekdayDateForCalendar(currentDay.getFullYear(), currentDay.getMonth(), baseDay.getDay(), getWeekdayOrdinalForCalendarDate(baseDay));
    if (currentDay.getDate() !== targetDate) {
      return null;
    }
  }

  return new Date(currentDay.getFullYear(), currentDay.getMonth(), currentDay.getDate(), baseDate.getHours(), baseDate.getMinutes(), 0, 0).getTime();
}

function getMonthDistanceForCalendarDates(leftDate: Date, rightDate: Date): number {
  return (rightDate.getFullYear() - leftDate.getFullYear()) * 12 + rightDate.getMonth() - leftDate.getMonth();
}

function getWeekdayOrdinalForCalendarDate(date: Date): number {
  return Math.floor((date.getDate() - 1) / 7) + 1;
}

function getNthWeekdayDateForCalendar(year: number, month: number, weekday: number, ordinal: number): number {
  const firstDay = new Date(year, month, 1);
  const offset = (weekday - firstDay.getDay() + 7) % 7;
  const date = 1 + offset + (ordinal - 1) * 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  if (date <= daysInMonth) {
    return date;
  }
  const lastDay = new Date(year, month, daysInMonth);
  return daysInMonth - ((lastDay.getDay() - weekday + 7) % 7);
}

function formatShortWeekday(weekday: number): string {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][weekday] ?? "day";
}

function normalizeCalendarSeriesText(value: string | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim().toLowerCase().slice(0, 120);
}

function hashString(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash.toString(16);
}

export function getCalendarWeekEvents(tasks: ProductivityTask[], localEvents: LocalCalendarEvent[], weekDays: Date[]): CalendarWeekEvent[] {
  const weekStartTime = weekDays[0]?.getTime() ?? getCalendarWeekStart(new Date()).getTime();
  const weekEndTime = weekStartTime + 7 * DAY_MS;
  const localOverrideTaskIds = new Set(localEvents.map((event) => event.sourceTaskId).filter((taskId): taskId is string => Boolean(taskId)));

  const googleTasks = inferCachedGoogleTaskRecurrences(
    tasks.filter((task) => task.source.provider === "google-calendar" && typeof task.source.eventStartAt === "number" && !localOverrideTaskIds.has(task.id))
  );
  const googleEvents = googleTasks.flatMap((task) => {
    const startAt = task.source.eventStartAt;
    if (typeof startAt !== "number" || startAt < weekStartTime || startAt >= weekEndTime) {
      return [];
    }

    const eventDayIndex = Math.floor((getStartOfDay(new Date(startAt)).getTime() - weekStartTime) / DAY_MS);
    const allDay = Boolean(task.source.eventAllDay);
    const fallbackEndAt = allDay ? startAt + DAY_MS : startAt + 60 * 60 * 1000;
    const endAt =
      typeof task.source.eventEndAt === "number" && task.source.eventEndAt > startAt ? task.source.eventEndAt : fallbackEndAt;
    const geometry = getCalendarEventGeometry(startAt, endAt, allDay);
    const calendarName = task.source.calendarName || task.source.label.split(" - ")[0] || "Google Calendar";
    const recurrence = task.source.eventRecurrence;
    const recurrenceLabel = task.source.eventRecurrenceLabel || getCalendarRecurrenceLabel(recurrence);

    return [
      {
        id: task.id,
        task,
        sourceKind: "google" as const,
        title: stripCalendarTaskTitle(task.title),
        calendarName,
        startAt,
        endAt,
        allDay,
        color: getCalendarEventColor(`${calendarName}:${task.source.subject ?? task.title}`),
        dayIndex: eventDayIndex,
        startOffset: geometry.startOffset,
        durationHours: geometry.durationHours,
        timeLabel: formatCalendarEventTime(startAt, endAt, allDay),
        recurrence,
        recurrenceLabel,
        recurrenceInterval: task.source.eventRecurrenceInterval,
        recurrenceWeekdays: task.source.eventRecurrenceWeekdays,
        compact: geometry.compact,
        laneIndex: 0,
        laneCount: 1,
        stackIndex: 0,
        stackCount: 1,
        stackOffsetHours: 0
      }
    ];
  });
  const actualGoogleRecurrenceDays = new Set(
    googleEvents
      .map((event) => {
        const recurringId = event.task?.source.eventRecurringId;
        const calendarId = event.task?.source.calendarId;
        return recurringId && calendarId ? `${calendarId}:${recurringId}:${getStartOfDay(new Date(event.startAt)).getTime()}` : "";
      })
      .filter(Boolean)
  );
  const actualGoogleRecurringWeekKeys = new Set(
    googleEvents
      .map((event) => {
        const recurringId = event.task?.source.eventRecurringId;
        const calendarId = event.task?.source.calendarId;
        return recurringId && calendarId ? `${calendarId}:${recurringId}` : "";
      })
      .filter(Boolean)
  );
  const recurringSeedTasks = new Map<string, ProductivityTask>();
  for (const task of googleTasks) {
    const recurringId = task.source.eventRecurringId;
    const recurrence = task.source.eventRecurrence;
    const calendarId = task.source.calendarId;
    const startAt = task.source.eventStartAt;
    if (!recurringId || !recurrence || !calendarId || typeof startAt !== "number") {
      continue;
    }

    const key = `${calendarId}:${recurringId}`;
    const existingSeed = recurringSeedTasks.get(key);
    if (!existingSeed || (existingSeed.source.eventStartAt ?? Number.POSITIVE_INFINITY) > startAt) {
      recurringSeedTasks.set(key, task);
    }
  }
  const generatedGoogleEvents = [...recurringSeedTasks.entries()].flatMap(([recurringKey, task]) =>
    actualGoogleRecurringWeekKeys.has(recurringKey)
      ? []
      : weekDays.flatMap((day) => {
          const recurrence = task.source.eventRecurrence;
          const seedStartAt = task.source.eventStartAt;
          if (!recurrence || typeof seedStartAt !== "number") {
            return [];
          }

          const seedEndAt =
            typeof task.source.eventEndAt === "number" && task.source.eventEndAt > seedStartAt
              ? task.source.eventEndAt
              : seedStartAt + (task.source.eventAllDay ? DAY_MS : 60 * 60 * 1000);
          const occurrenceStartAt = getGoogleTaskOccurrenceStartForDay(task, day);
          if (typeof occurrenceStartAt !== "number" || occurrenceStartAt < weekStartTime || occurrenceStartAt >= weekEndTime) {
            return [];
          }

          const dayKey = `${recurringKey}:${getStartOfDay(new Date(occurrenceStartAt)).getTime()}`;
          if (actualGoogleRecurrenceDays.has(dayKey)) {
            return [];
          }

          const allDay = Boolean(task.source.eventAllDay);
          const duration = Math.max(allDay ? DAY_MS : 30 * 60 * 1000, seedEndAt - seedStartAt);
          const endAt = occurrenceStartAt + duration;
          const eventDayIndex = Math.floor((getStartOfDay(new Date(occurrenceStartAt)).getTime() - weekStartTime) / DAY_MS);
          const geometry = getCalendarEventGeometry(occurrenceStartAt, endAt, allDay);
          const calendarName = task.source.calendarName || task.source.label.split(" - ")[0] || "Google Calendar";
          return [
            {
              id: `${task.id}:recurring:${occurrenceStartAt}`,
              task,
              sourceKind: "google" as const,
              title: stripCalendarTaskTitle(task.title),
              calendarName,
              startAt: occurrenceStartAt,
              endAt,
              allDay,
              color: getCalendarEventColor(`${calendarName}:${task.source.subject ?? task.title}`),
              dayIndex: eventDayIndex,
              startOffset: geometry.startOffset,
              durationHours: geometry.durationHours,
              timeLabel: formatCalendarEventTime(occurrenceStartAt, endAt, allDay),
              recurrence,
              recurrenceLabel: task.source.eventRecurrenceLabel || getCalendarRecurrenceLabel(recurrence),
              recurrenceInterval: task.source.eventRecurrenceInterval,
              recurrenceWeekdays: task.source.eventRecurrenceWeekdays,
              compact: geometry.compact,
              laneIndex: 0,
              laneCount: 1,
              stackIndex: 0,
              stackCount: 1,
              stackOffsetHours: 0
            }
          ];
        })
  );

  const autopilotEvents = localEvents.flatMap((event) =>
    weekDays.flatMap((day) => {
      const startAt = getLocalCalendarOccurrenceStartForDay(event, day);
      if (typeof startAt !== "number" || startAt < weekStartTime || startAt >= weekEndTime) {
        return [];
      }

      const duration = Math.max(30 * 60 * 1000, event.endAt - event.startAt);
      const endAt = event.allDay ? startAt + DAY_MS : startAt + duration;
      const eventDayIndex = Math.floor((getStartOfDay(new Date(startAt)).getTime() - weekStartTime) / DAY_MS);
      const geometry = getCalendarEventGeometry(startAt, endAt, event.allDay);

      return [
        {
          id: `${event.id}:${startAt}`,
          localEvent: event,
          sourceKind: "local" as const,
          title: event.title,
          calendarName: "Autopilot Calendar",
          startAt,
          endAt,
          allDay: event.allDay,
          color: event.color || getCalendarEventColor(event.title),
          dayIndex: eventDayIndex,
          startOffset: geometry.startOffset,
          durationHours: geometry.durationHours,
          timeLabel: formatCalendarEventTime(startAt, endAt, event.allDay),
          recurrence: event.recurrence,
          recurrenceLabel: getCalendarRecurrenceLabel(event.recurrence),
          recurrenceInterval: 1,
          compact: geometry.compact,
          laneIndex: 0,
          laneCount: 1,
          stackIndex: 0,
          stackCount: 1,
          stackOffsetHours: 0
        }
      ];
    })
  );

  const events = [...googleEvents, ...generatedGoogleEvents, ...autopilotEvents].sort((leftEvent, rightEvent) => leftEvent.startAt - rightEvent.startAt);
  const eventsByDay = new Map<number, CalendarWeekEvent[]>();
  for (const event of events) {
    const dayEvents = eventsByDay.get(event.dayIndex) ?? [];
    dayEvents.push(event);
    eventsByDay.set(event.dayIndex, dayEvents);
  }

  for (const dayEvents of eventsByDay.values()) {
    assignCalendarDayLanes(dayEvents);
  }

  return events;
}

export function getCalendarWeekEventLayout(event: Pick<CalendarWeekEvent, "dayIndex" | "laneIndex" | "laneCount">): CalendarWeekEventLayout {
  const dayWidthPercent = 100 / 7;
  const safeLaneCount = Math.max(1, event.laneCount);
  const safeLaneIndex = Math.max(0, Math.min(event.laneIndex, safeLaneCount - 1));
  const laneWidthPercent = dayWidthPercent / safeLaneCount;

  return {
    leftPercent: event.dayIndex * dayWidthPercent + safeLaneIndex * laneWidthPercent,
    widthPercent: laneWidthPercent
  };
}

function assignCalendarDayLanes(dayEvents: CalendarWeekEvent[]): void {
  const timedEvents = dayEvents
    .filter((event) => !event.allDay)
    .sort((leftEvent, rightEvent) => leftEvent.startAt - rightEvent.startAt || rightEvent.endAt - leftEvent.endAt);
  let cluster: CalendarWeekEvent[] = [];
  let clusterEndAt = 0;

  for (const event of timedEvents) {
    if (cluster.length > 0 && event.startAt >= clusterEndAt) {
      assignClusterLanes(cluster);
      cluster = [];
    }

    cluster.push(event);
    clusterEndAt = Math.max(clusterEndAt, event.endAt);
  }

  if (cluster.length > 0) {
    assignClusterLanes(cluster);
  }
}

function assignClusterLanes(clusterEvents: CalendarWeekEvent[]): void {
  const sortedCluster = [...clusterEvents].sort(
    (leftEvent, rightEvent) => leftEvent.startAt - rightEvent.startAt || leftEvent.endAt - rightEvent.endAt || leftEvent.title.localeCompare(rightEvent.title)
  );
  const activeLanes: Array<{ laneIndex: number; endAt: number }> = [];
  let actualLaneCount = 1;

  for (const event of sortedCluster) {
    for (let index = activeLanes.length - 1; index >= 0; index -= 1) {
      if (activeLanes[index].endAt <= event.startAt) {
        activeLanes.splice(index, 1);
      }
    }

    const usedLanes = new Set(activeLanes.map((lane) => lane.laneIndex));
    let laneIndex = 0;
    while (usedLanes.has(laneIndex)) {
      laneIndex += 1;
    }

    event.laneIndex = laneIndex;
    event.stackIndex = laneIndex;
    event.stackOffsetHours = 0;
    activeLanes.push({ laneIndex, endAt: event.endAt });
    actualLaneCount = Math.max(actualLaneCount, laneIndex + 1);
  }

  const visibleLaneCount = clusterEvents.length > 1 ? Math.min(MAX_VISIBLE_OVERLAP_LANES, Math.max(MIN_OVERLAP_LANES, actualLaneCount)) : actualLaneCount;

  for (const event of sortedCluster) {
    const rawLaneIndex = event.laneIndex;
    const overflowStackIndex = Math.floor(rawLaneIndex / visibleLaneCount);
    event.laneIndex = rawLaneIndex % visibleLaneCount;
    event.laneCount = visibleLaneCount;
    event.stackCount = visibleLaneCount;
    event.stackIndex = overflowStackIndex;
    event.stackOffsetHours = overflowStackIndex * OVERFLOW_LANE_STACK_OFFSET_HOURS;
    event.compact = event.durationHours < 0.42 || actualLaneCount > MIN_OVERLAP_LANES;
  }
}

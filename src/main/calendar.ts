import { createHash } from "node:crypto";

import { mapWithConcurrency } from "../shared/async.js";
import type { GoogleCalendarEventSummary, GoogleCalendarSyncResult } from "../shared/calendar.js";
import { GOOGLE_CALENDAR_READONLY_SCOPE } from "../shared/email.js";
import type { CalendarRecurrence } from "../shared/localCalendar.js";
import type { EmailService } from "./email.js";

type GoogleCalendarListResponse = {
  items?: GoogleCalendarListEntry[];
  error?: {
    message?: string;
  };
};

type GoogleCalendarListEntry = {
  id?: string;
  summary?: string;
  primary?: boolean;
  selected?: boolean;
  hidden?: boolean;
  accessRole?: string;
};

type GoogleCalendarEventsResponse = {
  items?: GoogleCalendarEventResponse[];
  nextPageToken?: string;
  error?: {
    message?: string;
  };
};

type GoogleCalendarEventResponse = {
  id?: string;
  summary?: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  hangoutLink?: string;
  status?: string;
  updated?: string;
  recurringEventId?: string;
  recurrence?: string[];
  start?: {
    date?: string;
    dateTime?: string;
  };
  end?: {
    date?: string;
    dateTime?: string;
  };
  organizer?: {
    email?: string;
    displayName?: string;
  };
  attendees?: Array<{
    email?: string;
    displayName?: string;
    responseStatus?: string;
  }>;
};

const GOOGLE_CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3";
const DEFAULT_CALENDAR_LOOKAHEAD_DAYS = 90;
const DEFAULT_CALENDAR_LOOKBACK_DAYS = 45;
const DEFAULT_CALENDAR_REQUEST_TIMEOUT_MS = 15_000;
const DEFAULT_CALENDAR_FETCH_CONCURRENCY = 3;
const MAX_CALENDARS_TO_SCAN = 20;
const CALENDAR_EVENTS_PAGE_SIZE = 250;
const MAX_EVENTS_PER_CALENDAR = 1000;
const MAX_EVENT_PAGES_PER_CALENDAR = 8;
const GOOGLE_WEEKDAY_TO_INDEX = new Map([
  ["SU", 0],
  ["MO", 1],
  ["TU", 2],
  ["WE", 3],
  ["TH", 4],
  ["FR", 5],
  ["SA", 6]
]);
const WEEKDAY_SHORT_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export class GoogleCalendarService {
  constructor(private readonly emailService: EmailService) {}

  async syncUpcomingEvents(
    lookaheadDays = DEFAULT_CALENDAR_LOOKAHEAD_DAYS,
    lookbackDays = getCalendarLookbackDays()
  ): Promise<GoogleCalendarSyncResult> {
    const token = await this.emailService.getGoogleAccessToken([GOOGLE_CALENDAR_READONLY_SCOPE]);
    if (!token.success) {
      return {
        success: false,
        events: [],
        reason: token.reason
      };
    }

    try {
      const calendarList = await calendarGetJson<GoogleCalendarListResponse>(
        `${GOOGLE_CALENDAR_API_BASE}/users/me/calendarList?minAccessRole=reader`,
        token.accessToken
      );
      const calendars = (calendarList.items ?? [])
        .filter((calendar) => calendar.id && calendar.hidden !== true && calendar.accessRole !== "freeBusyReader")
        .slice(0, MAX_CALENDARS_TO_SCAN);
      const calendarsToRead =
        calendars.length > 0
          ? calendars
          : [
              {
                id: "primary",
                summary: "Primary",
                primary: true
              }
            ];
      const now = new Date();
      const minDate = new Date(now.getTime() - lookbackDays * 24 * 60 * 60 * 1000);
      const maxDate = new Date(now.getTime() + lookaheadDays * 24 * 60 * 60 * 1000);

      const eventGroups = await mapWithConcurrency(calendarsToRead, DEFAULT_CALENDAR_FETCH_CONCURRENCY, async (calendar) => {
        const calendarId = calendar.id ?? "primary";
        const url = new URL(`${GOOGLE_CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events`);
        url.searchParams.set("timeMin", minDate.toISOString());
        url.searchParams.set("timeMax", maxDate.toISOString());
        url.searchParams.set("singleEvents", "true");
        url.searchParams.set("orderBy", "startTime");
        url.searchParams.set("showDeleted", "false");
        url.searchParams.set("maxResults", String(CALENDAR_EVENTS_PAGE_SIZE));

        const events = await listCalendarEvents(url, token.accessToken);
        return events
          .map((event) => toCalendarEventSummary(event, calendarId, calendar.summary || "Google Calendar"))
          .filter((event): event is GoogleCalendarEventSummary => Boolean(event));
      });
      const events = eventGroups.flat().sort((leftEvent, rightEvent) => leftEvent.startAt - rightEvent.startAt);
      const eventsWithRecurrence = await enrichGoogleRecurringEvents(events, token.accessToken);

      return {
        success: true,
        events: eventsWithRecurrence.sort((leftEvent, rightEvent) => leftEvent.startAt - rightEvent.startAt),
        accountEmail: token.accountEmail,
        calendarsScanned: calendarsToRead.length
      };
    } catch (error) {
      return {
        success: false,
        events: [],
        reason: error instanceof Error ? error.message : "Google Calendar sync failed."
      };
    }
  }
}

async function calendarGetJson<T>(url: string, accessToken: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getCalendarRequestTimeoutMs());

  try {
    const response = await fetch(url, {
      headers: {
        authorization: `Bearer ${accessToken}`,
        accept: "application/json"
      },
      signal: controller.signal
    });
    const json = (await response.json()) as T & { error?: { message?: string } };
    if (!response.ok) {
      throw new Error(json.error?.message || `Google Calendar returned HTTP ${response.status}.`);
    }
    return json;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Google Calendar did not respond before the request timed out.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function listCalendarEvents(url: URL, accessToken: string): Promise<GoogleCalendarEventResponse[]> {
  const events: GoogleCalendarEventResponse[] = [];
  let pageToken: string | undefined;
  let pageCount = 0;

  do {
    if (pageToken) {
      url.searchParams.set("pageToken", pageToken);
    } else {
      url.searchParams.delete("pageToken");
    }

    const response = await calendarGetJson<GoogleCalendarEventsResponse>(url.toString(), accessToken);
    events.push(...(response.items ?? []));
    pageToken = response.nextPageToken;
    pageCount += 1;
  } while (pageToken && events.length < MAX_EVENTS_PER_CALENDAR && pageCount < MAX_EVENT_PAGES_PER_CALENDAR);

  return events.slice(0, MAX_EVENTS_PER_CALENDAR);
}

function toCalendarEventSummary(
  event: GoogleCalendarEventResponse,
  calendarId: string,
  calendarName: string
): GoogleCalendarEventSummary | null {
  const title = event.summary?.replace(/\s+/g, " ").trim() || "Untitled event";
  const startAt = parseCalendarTime(event.start);
  if (!event.id || !startAt || event.status === "cancelled") {
    return null;
  }

  const organizer = event.organizer?.displayName || event.organizer?.email;
  const recurrenceInfo = parseGoogleCalendarRecurrence(event.recurrence);

  return {
    id: event.id,
    calendarId,
    calendarName,
    title,
    description: cleanCalendarText(event.description, 280),
    location: cleanCalendarText(event.location, 160),
    htmlLink: event.htmlLink,
    hangoutLink: event.hangoutLink,
    startAt,
    endAt: parseCalendarTime(event.end) ?? undefined,
    allDay: Boolean(event.start?.date && !event.start.dateTime),
    status: event.status,
    organizer,
    attendees: (event.attendees ?? [])
      .filter((attendee) => attendee.email)
      .map((attendee) => ({
        email: attendee.email ?? "",
        displayName: attendee.displayName,
        responseStatus: attendee.responseStatus
      }))
      .slice(0, 12),
    updatedAt: event.updated ? Date.parse(event.updated) : undefined,
    recurringEventId: event.recurringEventId,
    recurrence: recurrenceInfo.recurrence,
    recurrenceLabel: recurrenceInfo.recurrenceLabel,
    recurrenceInterval: recurrenceInfo.recurrenceInterval,
    recurrenceWeekdays: recurrenceInfo.recurrenceWeekdays
  };
}

type CalendarRecurrenceInfo = {
  recurrence?: CalendarRecurrence;
  recurrenceLabel?: string;
  recurrenceInterval?: number;
  recurrenceWeekdays?: number[];
};

export function parseGoogleCalendarRecurrence(recurrenceLines: string[] | undefined): CalendarRecurrenceInfo {
  const rruleLine = recurrenceLines?.find((line) => /^RRULE:/iu.test(line));
  if (!rruleLine) {
    return recurrenceLines?.length ? { recurrenceLabel: "Repeating dates" } : {};
  }

  const values = parseRruleValues(rruleLine);
  const frequency = values.get("FREQ")?.toUpperCase();
  const interval = Number.parseInt(values.get("INTERVAL") || "1", 10);
  const safeInterval = Number.isInteger(interval) && interval > 1 ? interval : 1;
  const byDay = values.get("BYDAY")?.toUpperCase();
  const weekdays = parseRruleWeekdays(byDay);

  if (frequency === "DAILY") {
    return {
      recurrence: "daily",
      recurrenceLabel: safeInterval > 1 ? `Every ${safeInterval} days` : "Daily",
      recurrenceInterval: safeInterval
    };
  }

  if (frequency === "WEEKLY") {
    const isWeekdayOnly = areSameWeekdays(weekdays, [1, 2, 3, 4, 5]);
    return {
      recurrence: "weekly",
      recurrenceLabel: isWeekdayOnly ? "Weekdays" : formatWeeklyRecurrenceLabel(weekdays, safeInterval),
      recurrenceInterval: safeInterval,
      recurrenceWeekdays: weekdays.length > 0 ? weekdays : undefined
    };
  }

  if (frequency === "MONTHLY") {
    return {
      recurrence: byDay ? "monthly-day" : "monthly",
      recurrenceLabel: byDay ? "Monthly by weekday" : safeInterval > 1 ? `Every ${safeInterval} months` : "Monthly by date",
      recurrenceInterval: safeInterval
    };
  }

  if (frequency === "YEARLY") {
    return {
      recurrenceLabel: safeInterval > 1 ? `Every ${safeInterval} years` : "Yearly",
      recurrenceInterval: safeInterval
    };
  }

  return {
    recurrenceLabel: "Repeating event"
  };
}

async function enrichGoogleRecurringEvents(events: GoogleCalendarEventSummary[], accessToken: string): Promise<GoogleCalendarEventSummary[]> {
  const recurringMasters = new Map<string, { calendarId: string; eventId: string }>();
  for (const event of events) {
    if (event.recurringEventId && !event.recurrenceLabel) {
      recurringMasters.set(getRecurringEventKey(event.calendarId, event.recurringEventId), {
        calendarId: event.calendarId,
        eventId: event.recurringEventId
      });
    }
  }

  const masterEntries = await mapWithConcurrency([...recurringMasters.entries()], DEFAULT_CALENDAR_FETCH_CONCURRENCY, async ([key, master]) => {
    try {
      const masterUrl = `${GOOGLE_CALENDAR_API_BASE}/calendars/${encodeURIComponent(master.calendarId)}/events/${encodeURIComponent(master.eventId)}`;
      const masterEvent = await calendarGetJson<GoogleCalendarEventResponse>(masterUrl, accessToken);
      return [key, parseGoogleCalendarRecurrence(masterEvent.recurrence)] as const;
    } catch {
      return [key, {}] as const;
    }
  });
  const masterRecurrenceByKey = new Map(masterEntries);

  const enrichedEvents = events.map((event) => {
    if (!event.recurringEventId || event.recurrenceLabel) {
      return event;
    }

    const recurrenceInfo = masterRecurrenceByKey.get(getRecurringEventKey(event.calendarId, event.recurringEventId));
    if (!recurrenceInfo?.recurrenceLabel) {
      return event;
    }

    return {
      ...event,
      recurrence: recurrenceInfo.recurrence,
      recurrenceLabel: recurrenceInfo.recurrenceLabel,
      recurrenceInterval: recurrenceInfo.recurrenceInterval,
      recurrenceWeekdays: recurrenceInfo.recurrenceWeekdays
    };
  });

  return inferRepeatedGoogleEventSeries(inferExpandedGoogleRecurrences(enrichedEvents));
}

export function inferExpandedGoogleRecurrences(events: GoogleCalendarEventSummary[]): GoogleCalendarEventSummary[] {
  const eventsByRecurringKey = new Map<string, GoogleCalendarEventSummary[]>();
  for (const event of events) {
    if (!event.recurringEventId || event.recurrenceLabel) {
      continue;
    }
    const key = getRecurringEventKey(event.calendarId, event.recurringEventId);
    eventsByRecurringKey.set(key, [...(eventsByRecurringKey.get(key) ?? []), event]);
  }

  const inferredByKey = new Map<string, CalendarRecurrenceInfo>();
  for (const [key, groupedEvents] of eventsByRecurringKey.entries()) {
    inferredByKey.set(key, inferRecurrenceFromExpandedInstances(groupedEvents));
  }

  return events.map((event) => {
    if (!event.recurringEventId || event.recurrenceLabel) {
      return event;
    }

    const inferred = inferredByKey.get(getRecurringEventKey(event.calendarId, event.recurringEventId));
    return {
      ...event,
      recurrence: inferred?.recurrence,
      recurrenceLabel: inferred?.recurrenceLabel ?? "Repeating event",
      recurrenceInterval: inferred?.recurrenceInterval,
      recurrenceWeekdays: inferred?.recurrenceWeekdays
    };
  });
}

export function inferRepeatedGoogleEventSeries(events: GoogleCalendarEventSummary[]): GoogleCalendarEventSummary[] {
  const groupEntries = new Map<string, GoogleCalendarEventSummary[]>();
  for (const event of events) {
    if (event.recurrenceLabel || event.recurringEventId) {
      continue;
    }

    const key = getInferredSeriesKey(event);
    groupEntries.set(key, [...(groupEntries.get(key) ?? []), event]);
  }

  const recurrenceByGroupKey = new Map<string, CalendarRecurrenceInfo & { recurringEventId: string }>();
  for (const [key, groupedEvents] of groupEntries.entries()) {
    if (groupedEvents.length < 2) {
      continue;
    }

    const inferred = inferRecurrenceFromExpandedInstances(groupedEvents);
    if (!inferred.recurrence) {
      continue;
    }

    recurrenceByGroupKey.set(key, {
      ...inferred,
      recurringEventId: `inferred:${createHash("sha256").update(key).digest("hex").slice(0, 18)}`
    });
  }

  return events.map((event) => {
    if (event.recurrenceLabel || event.recurringEventId) {
      return event;
    }

    const inferred = recurrenceByGroupKey.get(getInferredSeriesKey(event));
    if (!inferred) {
      return event;
    }

    return {
      ...event,
      recurringEventId: inferred.recurringEventId,
      recurrence: inferred.recurrence,
      recurrenceLabel: inferred.recurrenceLabel,
      recurrenceInterval: inferred.recurrenceInterval,
      recurrenceWeekdays: inferred.recurrenceWeekdays
    };
  });
}

function parseRruleValues(line: string): Map<string, string> {
  const values = new Map<string, string>();
  const rawRule = line.replace(/^RRULE:/iu, "");
  for (const part of rawRule.split(";")) {
    const [key, value] = part.split("=");
    if (key && value) {
      values.set(key.toUpperCase(), value);
    }
  }
  return values;
}

function inferRecurrenceFromExpandedInstances(events: GoogleCalendarEventSummary[]): CalendarRecurrenceInfo {
  const sortedEvents = [...events].sort((leftEvent, rightEvent) => leftEvent.startAt - rightEvent.startAt);
  if (sortedEvents.length < 2) {
    return { recurrenceLabel: "Repeating event" };
  }

  const dates = sortedEvents.map((event) => new Date(event.startAt));
  if (dates.every((date, index) => index === 0 || getMonthDistance(dates[index - 1], date) >= 1)) {
    if (dates.every((date) => date.getDate() === dates[0].getDate())) {
      return { recurrence: "monthly", recurrenceLabel: "Monthly by date", recurrenceInterval: 1 };
    }
    if (dates.every((date) => date.getDay() === dates[0].getDay() && getWeekdayOrdinal(date) === getWeekdayOrdinal(dates[0]))) {
      return { recurrence: "monthly-day", recurrenceLabel: "Monthly by weekday", recurrenceInterval: 1 };
    }
  }

  const dayGaps = dates.slice(1).map((date, index) => Math.max(1, Math.round((date.getTime() - dates[index].getTime()) / (24 * 60 * 60 * 1000))));
  if (dayGaps.every((gap) => gap === 1)) {
    return { recurrence: "daily", recurrenceLabel: "Daily", recurrenceInterval: 1 };
  }

  if (dayGaps.every((gap) => gap % 7 === 0)) {
    const weekInterval = dayGaps[0] / 7;
    return {
      recurrence: "weekly",
      recurrenceLabel: weekInterval > 1 ? `Every ${weekInterval} weeks` : `Weekly on ${WEEKDAY_SHORT_NAMES[dates[0].getDay()]}`,
      recurrenceInterval: weekInterval,
      recurrenceWeekdays: [dates[0].getDay()]
    };
  }

  return { recurrenceLabel: "Repeating event" };
}

function getRecurringEventKey(calendarId: string, recurringEventId: string): string {
  return `${calendarId}:${recurringEventId}`;
}

function parseRruleWeekdays(byDay: string | undefined): number[] {
  if (!byDay) {
    return [];
  }

  return [
    ...new Set(
      byDay
        .split(",")
        .map((entry) => entry.match(/[A-Z]{2}$/u)?.[0])
        .map((weekday) => (weekday ? GOOGLE_WEEKDAY_TO_INDEX.get(weekday) : undefined))
        .filter((weekday): weekday is number => typeof weekday === "number")
    )
  ].sort((leftDay, rightDay) => leftDay - rightDay);
}

function formatWeeklyRecurrenceLabel(weekdays: number[], interval: number): string {
  const intervalPrefix = interval > 1 ? `Every ${interval} weeks` : "Weekly";
  if (weekdays.length === 0) {
    return intervalPrefix;
  }
  return `${intervalPrefix} on ${weekdays.map((weekday) => WEEKDAY_SHORT_NAMES[weekday]).join(", ")}`;
}

function areSameWeekdays(leftWeekdays: number[], rightWeekdays: number[]): boolean {
  return leftWeekdays.length === rightWeekdays.length && leftWeekdays.every((weekday, index) => weekday === rightWeekdays[index]);
}

function getInferredSeriesKey(event: GoogleCalendarEventSummary): string {
  const startDate = new Date(event.startAt);
  const endAt = event.endAt ?? event.startAt;
  const durationMinutes = Math.max(0, Math.round((endAt - event.startAt) / (60 * 1000)));
  const startMinuteOfDay = event.allDay ? 0 : startDate.getHours() * 60 + startDate.getMinutes();
  return [
    event.calendarId,
    normalizeSeriesText(event.title),
    normalizeSeriesText(event.organizer),
    event.allDay ? "all-day" : "timed",
    startMinuteOfDay,
    durationMinutes
  ].join(":");
}

function normalizeSeriesText(value: string | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim().toLowerCase().slice(0, 120);
}

function getMonthDistance(leftDate: Date, rightDate: Date): number {
  return (rightDate.getFullYear() - leftDate.getFullYear()) * 12 + rightDate.getMonth() - leftDate.getMonth();
}

function getWeekdayOrdinal(date: Date): number {
  return Math.floor((date.getDate() - 1) / 7) + 1;
}

function parseCalendarTime(value: GoogleCalendarEventResponse["start"]): number | null {
  const rawTime = value?.dateTime || (value?.date ? `${value.date}T00:00:00` : "");
  if (!rawTime) {
    return null;
  }

  const parsed = Date.parse(rawTime);
  return Number.isFinite(parsed) ? parsed : null;
}

function cleanCalendarText(value: string | undefined, maxLength: number): string | undefined {
  const cleaned = value?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return cleaned ? cleaned.slice(0, maxLength) : undefined;
}

function getCalendarRequestTimeoutMs(): number {
  const value = Number.parseInt(process.env.AUTOPILOT_GOOGLE_CALENDAR_REQUEST_TIMEOUT_MS || "", 10);
  return Number.isInteger(value) && value >= 3000 && value <= 60000 ? value : DEFAULT_CALENDAR_REQUEST_TIMEOUT_MS;
}

function getCalendarLookbackDays(): number {
  const value = Number.parseInt(process.env.AUTOPILOT_GOOGLE_CALENDAR_LOOKBACK_DAYS || "", 10);
  return Number.isInteger(value) && value >= 0 && value <= 60 ? value : DEFAULT_CALENDAR_LOOKBACK_DAYS;
}

import type { CalendarRecurrence } from "./localCalendar.js";

export type GoogleCalendarAttendee = {
  email: string;
  displayName?: string;
  responseStatus?: string;
};

export type GoogleCalendarEventSummary = {
  id: string;
  calendarId: string;
  calendarName: string;
  title: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  hangoutLink?: string;
  startAt: number;
  endAt?: number;
  allDay: boolean;
  status?: string;
  organizer?: string;
  attendees: GoogleCalendarAttendee[];
  updatedAt?: number;
  recurringEventId?: string;
  recurrence?: CalendarRecurrence;
  recurrenceLabel?: string;
  recurrenceInterval?: number;
  recurrenceWeekdays?: number[];
};

export type GoogleCalendarSyncState = {
  googleEventId?: string;
  googleCalendarId?: string;
  status: "local_only" | "synced" | "pending_sync" | "sync_failed";
  recurrenceRule?: string;
  lastSyncedAt?: number;
  reason?: string;
};

export type CalendarWriteRequest = {
  action: "create" | "update" | "delete";
  calendarId?: string;
  eventId?: string;
  title: string;
  description?: string;
  location?: string;
  startAt: number;
  endAt?: number;
  allDay?: boolean;
  recurrence?: CalendarRecurrence;
  recurrenceInterval?: number;
  recurrenceWeekdays?: number[];
};

export type CalendarWriteResult =
  | {
      success: true;
      action: CalendarWriteRequest["action"];
      event: GoogleCalendarEventSummary;
      syncState: GoogleCalendarSyncState;
    }
  | {
      success: false;
      action: CalendarWriteRequest["action"];
      reason: string;
      syncState: GoogleCalendarSyncState;
    };

export type GoogleCalendarSyncResult =
  | {
      success: true;
      events: GoogleCalendarEventSummary[];
      accountEmail: string;
      calendarsScanned: number;
    }
  | {
      success: false;
      events: GoogleCalendarEventSummary[];
      reason: string;
    };

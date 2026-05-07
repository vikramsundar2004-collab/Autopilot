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

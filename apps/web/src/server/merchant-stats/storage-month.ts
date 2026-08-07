import {
  calendarDateParts,
  calendarMonthFromDate,
  parseCalendarDate,
  type CalendarMonth,
  type CalendarDate,
} from "~/domain/time/calendar-date";

export function dateFromStorage(value: string): CalendarDate {
  const date = parseCalendarDate(value);
  if (!date) {
    throw new Error(`Invalid stored merchant date: ${value}`);
  }
  return date;
}

export function monthFromStorageDate(value: string): CalendarMonth {
  const date = parseCalendarDate(value);
  if (!date || calendarDateParts(date).day !== 1) {
    throw new Error(`Invalid stored merchant month: ${value}`);
  }

  return calendarMonthFromDate(date);
}

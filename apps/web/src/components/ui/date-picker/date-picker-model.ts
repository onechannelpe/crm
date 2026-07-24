import { APP_MONTH_NAMES } from "~/lib/time/app-time";
import {
  addCalendarDays,
  calendarDateFromParts,
  calendarDateParts,
  type CalendarDate,
} from "~/lib/time/calendar-date";

export const DAY_NAMES = ["L", "M", "X", "J", "V", "S", "D"] as const;
const CALENDAR_START_DAY = 1;

export interface CalendarCell {
  date: CalendarDate;
  label: number;
  isCurrentMonth: boolean;
  isSelected: boolean;
  isDisabled: boolean;
}

export interface VisibleMonth {
  year: number;
  month: number;
}

export function buildCalendarCells(
  visibleMonth: VisibleMonth,
  selectedDate: CalendarDate | null,
  minDate: CalendarDate | null,
): CalendarCell[] {
  const monthStart = calendarDateFromParts({ ...visibleMonth, day: 1 });
  const firstVisibleDate = addCalendarDays(
    monthStart,
    -weekdayOffset(monthStart),
  );

  return Array.from({ length: 42 }, (_, index) => {
    const date = addCalendarDays(firstVisibleDate, index);
    const parts = calendarDateParts(date);

    return {
      date,
      label: parts.day,
      isCurrentMonth:
        parts.year === visibleMonth.year && parts.month === visibleMonth.month,
      isSelected: date === selectedDate,
      isDisabled: minDate ? date < minDate : false,
    };
  });
}

export function getVisibleMonth(date: CalendarDate): VisibleMonth {
  const { year, month } = calendarDateParts(date);
  return { year, month };
}

export function shiftVisibleMonth(
  visibleMonth: VisibleMonth,
  amount: number,
): VisibleMonth {
  const date = new Date(0);
  date.setUTCFullYear(visibleMonth.year, visibleMonth.month - 1 + amount, 1);

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
  };
}

// Month names are year-independent, so the option list is a constant. Values
// are 1-based month numbers; labels capitalize the locale-natural name.
export const MONTH_OPTIONS: ReadonlyArray<{ label: string; value: number }> =
  APP_MONTH_NAMES.map((name, index) => ({
    label: name.charAt(0).toUpperCase() + name.slice(1),
    value: index + 1,
  }));

export function getYearOptions(
  visibleMonth: VisibleMonth,
  minDate: CalendarDate | null,
): number[] {
  const minYear = minDate ? calendarDateParts(minDate).year : visibleMonth.year;
  return Array.from({ length: 51 }, (_, index) => minYear + 50 - index);
}

export function isPreviousMonthDisabled(
  visibleMonth: VisibleMonth,
  minDate: CalendarDate | null,
): boolean {
  if (!minDate) return false;
  const minMonth = getVisibleMonth(minDate);
  return compareVisibleMonth(visibleMonth, minMonth) <= 0;
}

function weekdayOffset(date: CalendarDate): number {
  const parts = calendarDateParts(date);
  const instant = new Date(0);
  instant.setUTCFullYear(parts.year, parts.month - 1, parts.day);
  const weekday = instant.getUTCDay();
  return (weekday - CALENDAR_START_DAY + 7) % 7;
}

function compareVisibleMonth(left: VisibleMonth, right: VisibleMonth): number {
  if (left.year !== right.year) return left.year - right.year;
  return left.month - right.month;
}

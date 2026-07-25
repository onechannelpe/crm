import { appCalendarDateAt } from "~/domain/time/app-time";
import {
  calendarDateParts,
  type CalendarDate,
} from "~/domain/time/calendar-date";
import { APP_LOCALE } from "~/shared/locale";

const DAY_MS = 1000 * 60 * 60 * 24;
const RELATIVE_DATE_FORMAT = new Intl.RelativeTimeFormat(APP_LOCALE, {
  numeric: "auto",
});

function getDayIndex(date: CalendarDate): number {
  const parts = calendarDateParts(date);
  return Math.floor(Date.UTC(parts.year, parts.month - 1, parts.day) / DAY_MS);
}

function getPastDayDistance(earlier: number, now: number): number {
  return (
    getDayIndex(appCalendarDateAt(earlier)) -
    getDayIndex(appCalendarDateAt(now))
  );
}

function getElapsedMonths(earlier: number, now: number): number {
  const earlierDate = calendarDateParts(appCalendarDateAt(earlier));
  const nowDate = calendarDateParts(appCalendarDateAt(now));
  const monthDiff =
    (nowDate.year - earlierDate.year) * 12 + nowDate.month - earlierDate.month;

  if (nowDate.day < earlierDate.day) {
    return Math.max(0, monthDiff - 1);
  }

  return Math.max(0, monthDiff);
}

function toPastRelativeUnit(
  earlier: number,
  now: number,
): {
  value: number;
  unit: Intl.RelativeTimeFormatUnit;
} {
  const months = getElapsedMonths(earlier, now);
  if (months >= 12) {
    return { value: -Math.trunc(months / 12), unit: "year" };
  }
  if (months >= 1) {
    return { value: -months, unit: "month" };
  }

  return { value: getPastDayDistance(earlier, now), unit: "day" };
}

// Records only ever display dates in the past (created/updated timestamps), so a
// future timestamp clamps to "today" rather than rendering "in N days".
export function formatPastRelativeDate(timestamp: number, now: number): string {
  const relative = toPastRelativeUnit(Math.min(timestamp, now), now);
  return RELATIVE_DATE_FORMAT.format(relative.value, relative.unit);
}

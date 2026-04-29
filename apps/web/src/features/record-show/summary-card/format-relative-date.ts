import { APP_LOCALE } from "~/lib/locale";

const DAY_MS = 1000 * 60 * 60 * 24;
const RELATIVE_DATE_FORMAT = new Intl.RelativeTimeFormat(APP_LOCALE, {
  numeric: "auto",
});

function getLocalDayIndex(timestamp: number): number {
  const date = new Date(timestamp);
  return Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS,
  );
}

function getDayDistance(timestamp: number, now: number): number {
  return getLocalDayIndex(timestamp) - getLocalDayIndex(now);
}

function getElapsedMonths(earlier: number, later: number): number {
  const earlierDate = new Date(earlier);
  const laterDate = new Date(later);
  const monthDiff =
    (laterDate.getFullYear() - earlierDate.getFullYear()) * 12 +
    laterDate.getMonth() -
    earlierDate.getMonth();

  if (laterDate.getDate() < earlierDate.getDate()) {
    return Math.max(0, monthDiff - 1);
  }

  return Math.max(0, monthDiff);
}

function getMonthDistance(timestamp: number, now: number): number {
  if (timestamp >= now) {
    return getElapsedMonths(now, timestamp);
  }

  return -getElapsedMonths(timestamp, now);
}

function toRelativeDateUnit(
  timestamp: number,
  now: number,
): {
  value: number;
  unit: Intl.RelativeTimeFormatUnit;
} {
  const months = getMonthDistance(timestamp, now);
  const absoluteMonths = Math.abs(months);
  if (absoluteMonths >= 12) {
    return { value: Math.trunc(months / 12), unit: "year" };
  }
  if (absoluteMonths >= 1) {
    return { value: months, unit: "month" };
  }

  return { value: getDayDistance(timestamp, now), unit: "day" };
}

export function formatRelativeDate(
  timestamp: number,
  now = Date.now(),
): string {
  const relative = toRelativeDateUnit(timestamp, now);
  return RELATIVE_DATE_FORMAT.format(relative.value, relative.unit);
}

export function formatPastRelativeDate(
  timestamp: number,
  now = Date.now(),
): string {
  return formatRelativeDate(Math.min(timestamp, now), now);
}

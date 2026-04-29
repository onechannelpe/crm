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

function getElapsedDays(timestamp: number, now: number): number {
  return Math.max(0, getLocalDayIndex(now) - getLocalDayIndex(timestamp));
}

function getElapsedMonths(timestamp: number, now: number): number {
  const date = new Date(timestamp);
  const currentDate = new Date(now);
  const monthDiff =
    (currentDate.getFullYear() - date.getFullYear()) * 12 +
    currentDate.getMonth() -
    date.getMonth();

  if (currentDate.getDate() < date.getDate()) {
    return Math.max(0, monthDiff - 1);
  }

  return Math.max(0, monthDiff);
}

function getRelativeDateUnit(
  timestamp: number,
  now: number,
): {
  value: number;
  unit: Intl.RelativeTimeFormatUnit;
} {
  const months = getElapsedMonths(timestamp, now);
  if (months >= 12) {
    return { value: -Math.floor(months / 12), unit: "year" };
  }
  if (months >= 1) {
    return { value: -months, unit: "month" };
  }

  return { value: -getElapsedDays(timestamp, now), unit: "day" };
}

export function formatRelativeDate(
  timestamp: number,
  now = Date.now(),
): string {
  const relative = getRelativeDateUnit(timestamp, now);
  return RELATIVE_DATE_FORMAT.format(relative.value, relative.unit);
}

const DAY_MS = 1000 * 60 * 60 * 24;
const RELATIVE_DATE_FORMAT = new Intl.RelativeTimeFormat("es-PE", {
  numeric: "auto",
});

function localDayIndex(timestamp: number): number {
  const date = new Date(timestamp);
  return Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS,
  );
}

function elapsedMonths(timestamp: number, now: number): number {
  const date = new Date(timestamp);
  const currentDate = new Date(now);
  const monthDiff =
    (currentDate.getFullYear() - date.getFullYear()) * 12 +
    currentDate.getMonth() -
    date.getMonth();

  if (currentDate.getDate() < date.getDate()) {
    return monthDiff - 1;
  }

  return monthDiff;
}

export function formatRelativeDate(
  timestamp: number,
  now = Date.now(),
): string {
  const days = Math.max(0, localDayIndex(now) - localDayIndex(timestamp));
  if (days < 30) {
    return RELATIVE_DATE_FORMAT.format(-days, "day");
  }

  const months = Math.max(0, elapsedMonths(timestamp, now));
  if (months < 12) {
    return RELATIVE_DATE_FORMAT.format(-months, "month");
  }

  return RELATIVE_DATE_FORMAT.format(-Math.floor(months / 12), "year");
}

import { describe, expect, it } from "vitest";

import { appInstantAt } from "~/domain/time/app-time";
import { calendarDateFromParts } from "~/domain/time/calendar-date";
import { formatPastRelativeDate } from "~/features/record-show/summary-card/format-relative-date";

function at(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
): number {
  return appInstantAt(
    calendarDateFromParts({ year, month, day }),
    hour,
    minute,
  ).getTime();
}

describe("formatPastRelativeDate", () => {
  it("shows today for same-day timestamps", () => {
    const now = at(2026, 4, 28, 23);
    const sameDay = at(2026, 4, 28, 1);

    expect(formatPastRelativeDate(sameDay, now)).toBe("hoy");
  });

  it("clamps future timestamps to today", () => {
    const now = at(2026, 4, 28, 12);

    expect(formatPastRelativeDate(now + 60 * 60 * 1000, now)).toBe("hoy");
  });

  it("uses calendar days for yesterday", () => {
    const now = at(2026, 4, 28, 0, 30);
    const yesterday = at(2026, 4, 27, 23, 30);

    expect(formatPastRelativeDate(yesterday, now)).toBe("ayer");
  });

  it("rolls the day over at the business offset", () => {
    // These share a UTC date but fall on different business dates.
    const now = Date.UTC(2026, 3, 29, 6);
    const beforeRollover = Date.UTC(2026, 3, 29, 4);

    expect(formatPastRelativeDate(beforeRollover, now)).toBe("ayer");
  });

  it("formats differences within the current month in days", () => {
    const now = at(2026, 4, 28, 12);

    expect(formatPastRelativeDate(at(2026, 4, 21, 12), now)).toBe(
      "hace 7 días",
    );
  });

  it("formats differences below one calendar month in days", () => {
    const now = at(2026, 4, 28, 12);

    expect(formatPastRelativeDate(at(2026, 3, 29, 12), now)).toBe(
      "hace 30 días",
    );
  });

  it("shows last month for a one-month calendar difference", () => {
    const now = at(2026, 4, 28, 12);

    expect(formatPastRelativeDate(at(2026, 3, 28, 12), now)).toBe(
      "el mes pasado",
    );
  });

  it("shows last year for a one-year calendar difference", () => {
    const now = at(2026, 4, 28, 12);

    expect(formatPastRelativeDate(at(2025, 4, 28, 12), now)).toBe(
      "el año pasado",
    );
  });
});

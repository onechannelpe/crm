import { describe, expect, it } from "vitest";

import { formatPastRelativeDate } from "~/features/record-show/summary-card/format-relative-date";

describe("formatPastRelativeDate", () => {
  it("shows today for same-day timestamps", () => {
    const now = new Date(2026, 3, 28, 23).getTime();
    const sameDay = new Date(2026, 3, 28, 1).getTime();

    expect(formatPastRelativeDate(sameDay, now)).toBe("hoy");
  });

  it("clamps future timestamps to today", () => {
    const now = new Date(2026, 3, 28, 12).getTime();

    expect(formatPastRelativeDate(now + 60 * 60 * 1000, now)).toBe("hoy");
  });

  it("uses calendar days for yesterday", () => {
    const now = new Date(2026, 3, 28, 0, 30).getTime();
    const yesterday = new Date(2026, 3, 27, 23, 30).getTime();

    expect(formatPastRelativeDate(yesterday, now)).toBe("ayer");
  });

  it("formats past timestamps by day, month, and year", () => {
    const now = new Date(2026, 3, 28, 12).getTime();

    expect(
      formatPastRelativeDate(new Date(2026, 3, 21, 12).getTime(), now),
    ).toBe("hace 7 días");
    expect(
      formatPastRelativeDate(new Date(2026, 2, 29, 12).getTime(), now),
    ).toBe("hace 30 días");
    expect(
      formatPastRelativeDate(new Date(2026, 2, 28, 12).getTime(), now),
    ).toBe("el mes pasado");
    expect(
      formatPastRelativeDate(new Date(2025, 3, 28, 12).getTime(), now),
    ).toBe("el año pasado");
  });
});

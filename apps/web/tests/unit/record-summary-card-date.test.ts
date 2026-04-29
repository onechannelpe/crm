import { describe, expect, it } from "vitest";

import {
  formatPastRelativeDate,
  formatRelativeDate,
} from "~/features/record-show/summary-card/format-relative-date";

describe("formatRelativeDate", () => {
  it("shows today for same-day timestamps", () => {
    const now = new Date(2026, 3, 28, 23).getTime();
    const sameDay = new Date(2026, 3, 28, 1).getTime();

    expect(formatRelativeDate(sameDay, now)).toBe("hoy");
  });

  it("formats future timestamps for reminder-style use cases", () => {
    const now = new Date(2026, 3, 28, 12).getTime();

    expect(formatRelativeDate(new Date(2026, 3, 29, 12).getTime(), now)).toBe(
      "mañana",
    );
    expect(formatRelativeDate(new Date(2026, 4, 28, 12).getTime(), now)).toBe(
      "el próximo mes",
    );
  });

  it("shows today for future timestamps in past-only contexts", () => {
    const now = new Date(2026, 3, 28, 12).getTime();

    expect(formatPastRelativeDate(now + 60 * 60 * 1000, now)).toBe("hoy");
  });

  it("uses calendar days for yesterday", () => {
    const now = new Date(2026, 3, 28, 0, 30).getTime();
    const yesterday = new Date(2026, 3, 27, 23, 30).getTime();

    expect(formatRelativeDate(yesterday, now)).toBe("ayer");
  });

  it("formats past timestamps by day, month, and year", () => {
    const now = new Date(2026, 3, 28, 12).getTime();

    expect(formatRelativeDate(new Date(2026, 3, 21, 12).getTime(), now)).toBe(
      "hace 7 días",
    );
    expect(formatRelativeDate(new Date(2026, 2, 29, 12).getTime(), now)).toBe(
      "hace 30 días",
    );
    expect(formatRelativeDate(new Date(2026, 2, 28, 12).getTime(), now)).toBe(
      "el mes pasado",
    );
    expect(formatRelativeDate(new Date(2025, 3, 28, 12).getTime(), now)).toBe(
      "el año pasado",
    );
  });
});

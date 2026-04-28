import { describe, expect, it } from "vitest";

import { formatRelativeDate } from "~/features/record-show/summary-card/format-relative-date";

describe("formatRelativeDate", () => {
  const now = Date.UTC(2026, 3, 28);

  it("shows today for same-day timestamps", () => {
    expect(formatRelativeDate(now - 6 * 60 * 60 * 1000, now)).toBe("hoy");
  });

  it("shows today for future timestamps caused by clock skew", () => {
    expect(formatRelativeDate(now + 60 * 60 * 1000, now)).toBe("hoy");
  });

  it("formats past timestamps by day, month, and year", () => {
    expect(formatRelativeDate(now - 1 * 24 * 60 * 60 * 1000, now)).toBe("ayer");
    expect(formatRelativeDate(now - 7 * 24 * 60 * 60 * 1000, now)).toBe(
      "hace 7 días",
    );
    expect(formatRelativeDate(now - 30 * 24 * 60 * 60 * 1000, now)).toBe(
      "hace 1 mes",
    );
    expect(formatRelativeDate(now - 365 * 24 * 60 * 60 * 1000, now)).toBe(
      "hace 1 año",
    );
  });
});

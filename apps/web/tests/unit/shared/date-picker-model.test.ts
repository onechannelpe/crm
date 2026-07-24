import { describe, expect, it } from "vitest";

import {
  buildCalendarCells,
  getVisibleMonth,
  getYearOptions,
  isPreviousMonthDisabled,
} from "~/components/ui/date-picker/date-picker-model";
import { parseCalendarDate } from "~/lib/time/calendar-date";

function date(value: string) {
  const parsed = parseCalendarDate(value);
  if (!parsed) throw new Error(`Invalid test date: ${value}`);
  return parsed;
}

describe("date picker model", () => {
  it("disables previous-month navigation at the minimum month", () => {
    const minDate = date("2026-03-31");

    expect(isPreviousMonthDisabled({ year: 2026, month: 3 }, minDate)).toBe(
      true,
    );
    expect(isPreviousMonthDisabled({ year: 2026, month: 4 }, minDate)).toBe(
      false,
    );
  });

  it("builds disabled days before the minimum date while keeping current-month flags", () => {
    const minDate = date("2026-03-31");
    const cells = buildCalendarCells(
      { year: 2026, month: 3 },
      minDate,
      minDate,
    );

    const march30 = cells.find((cell) => cell.date === "2026-03-30");
    const march31 = cells.find((cell) => cell.date === "2026-03-31");
    const april1 = cells.find((cell) => cell.date === "2026-04-01");

    expect(march30?.isDisabled).toBe(true);
    expect(march31?.isDisabled).toBe(false);
    expect(march31?.isCurrentMonth).toBe(true);
    expect(april1?.isCurrentMonth).toBe(false);
  });

  it("returns the expected visible month boundaries", () => {
    const visibleMonth = getVisibleMonth(date("2026-03-31"));

    expect(visibleMonth).toEqual({ year: 2026, month: 3 });
  });

  it("limits year options to the minimum year and later", () => {
    const yearOptions = getYearOptions(
      { year: 2026, month: 3 },
      date("2026-03-31"),
    );

    expect(yearOptions.at(-1)).toBe(2026);
    expect(yearOptions[0]).toBe(2076);
  });
});

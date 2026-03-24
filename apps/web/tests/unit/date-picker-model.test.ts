import { describe, expect, it } from "vitest";

import {
  buildCalendarCells,
  clampVisibleMonth,
  endOfMonth,
  getVisibleMonth,
  shiftVisibleMonth,
  startOfMonth,
} from "../../src/components/ui/date-picker/date-picker-model";

describe("date picker model", () => {
  it("clamps visible month to the minimum allowed month", () => {
    const minDate = new Date(2026, 2, 31);

    expect(clampVisibleMonth({ year: 2026, month: 0 }, minDate)).toEqual({
      year: 2026,
      month: 2,
    });
    expect(clampVisibleMonth({ year: 2026, month: 3 }, minDate)).toEqual({
      year: 2026,
      month: 3,
    });
  });

  it("shifts visible month across year boundaries", () => {
    expect(shiftVisibleMonth({ year: 2026, month: 0 }, -1)).toEqual({
      year: 2025,
      month: 11,
    });
    expect(shiftVisibleMonth({ year: 2025, month: 11 }, 1)).toEqual({
      year: 2026,
      month: 0,
    });
  });

  it("builds disabled days before the minimum date while keeping current-month flags", () => {
    const minDate = new Date(2026, 2, 31);
    const cells = buildCalendarCells(
      { year: 2026, month: 2 },
      minDate,
      minDate,
    );

    const march30 = cells.find((cell) => cell.iso === "2026-03-30");
    const march31 = cells.find((cell) => cell.iso === "2026-03-31");
    const april1 = cells.find((cell) => cell.iso === "2026-04-01");

    expect(march30?.isDisabled).toBe(true);
    expect(march31?.isDisabled).toBe(false);
    expect(march31?.isCurrentMonth).toBe(true);
    expect(april1?.isCurrentMonth).toBe(false);
  });

  it("returns the expected visible month boundaries", () => {
    const visibleMonth = getVisibleMonth(new Date(2026, 2, 31));

    expect(startOfMonth(visibleMonth)).toEqual(new Date(2026, 2, 1));
    expect(endOfMonth(visibleMonth)).toEqual(new Date(2026, 2, 31));
  });
});

import type {
  PenalidadActivacionMesaRow,
  PenalidadActivacionResult,
} from "~/contracts/merchant-stats/commission-views";
import type { PenalidadActivacionRules } from "~/domain/merchant-stats/commission";
import {
  calendarMonthStart,
  type CalendarMonth,
} from "~/domain/time/calendar-date";
import type { DatabaseExecutor } from "~/server/platform/database/executor";

import { ALL_MESAS, type Mesa } from "./mesa";

// All mesas, but the "active" floor differs per mesa (mesa 1: 2K, mesa 2/3:
// 1K on the M0+M1+M2 sum) while the inactive-rate cap itself is evaluated
// company-wide, not per mesa.

export async function evaluatePenalidadActivacion(
  db: DatabaseExecutor,
  rules: PenalidadActivacionRules | null,
  cohortMonth: CalendarMonth,
): Promise<PenalidadActivacionResult> {
  if (!rules) {
    return { status: "pending_configuration" };
  }

  const rows = await db
    .selectFrom("merchant_sales as s")
    .innerJoin("merchant_sale_gpv as g", "g.sale_id", "s.id")
    .where("s.mesa", "in", ALL_MESAS)
    .where("s.sale_month", "=", calendarMonthStart(cohortMonth))
    .where("g.month_offset", "in", [0, 1, 2])
    .groupBy(["s.mesa", "s.id"])
    .select((eb) => ["s.mesa", eb.fn.sum<number>("g.gpv").as("total_gpv")])
    .execute();

  const floorByMesa: Record<Mesa, number> = {
    "MESA 1": rules.minCumulativeGpvByMesa.mesa1,
    "MESA 2": rules.minCumulativeGpvByMesa.mesa2,
    "MESA 3": rules.minCumulativeGpvByMesa.mesa3,
  };

  const byMesa = ALL_MESAS.map((mesa): PenalidadActivacionMesaRow => {
    const mesaRows = rows.filter((row) => row.mesa === mesa);
    const active = mesaRows.filter(
      (row) => row.total_gpv >= floorByMesa[mesa],
    ).length;

    return {
      mesa,
      total: mesaRows.length,
      active,
      inactive: mesaRows.length - active,
    };
  });

  const totalSales = byMesa.reduce((sum, row) => sum + row.total, 0);
  const totalActive = byMesa.reduce((sum, row) => sum + row.active, 0);
  const totalInactive = totalSales - totalActive;
  const inactiveRate = totalSales === 0 ? 0 : totalInactive / totalSales;

  return {
    status: "evaluated",
    byMesa,
    totalSales,
    totalActive,
    totalInactive,
    inactiveRate,
    maxInactiveRate: rules.maxInactiveRate,
    // Strictly below the cap is safe; at or above it is penalized -- the
    // cap is an exclusive upper bound, not "at most".
    penalized: inactiveRate >= rules.maxInactiveRate,
  };
}

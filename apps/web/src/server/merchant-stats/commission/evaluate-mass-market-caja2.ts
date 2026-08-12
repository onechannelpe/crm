import { sql } from "kysely";

import type {
  BandCount,
  MassMarketCaja2MesaRow,
  MassMarketCaja2Result,
} from "~/contracts/merchant-stats/commission-views";
import type {
  MassMarketCaja2Rules,
  PayoutBand,
} from "~/domain/merchant-stats/commission";
import {
  calendarMonthStart,
  type CalendarMonth,
} from "~/domain/time/calendar-date";
import type { DatabaseExecutor } from "~/server/platform/database/executor";

import { MASS_MARKET_MESAS } from "./mesa";

// Grain is per-POS (one row per sale/serial), not per-RUC. Scored per mesa:
// it's not explicit whether the payout bands apply per-mesa or combined
// across mesa 2 and 3, but Caja 1 is explicitly per-mesa with its own
// target per desk, so this evaluator makes the same assumption until told
// otherwise.

export async function evaluateMassMarketCaja2(
  db: DatabaseExecutor,
  rules: MassMarketCaja2Rules | null,
  cohortMonth: CalendarMonth,
): Promise<MassMarketCaja2Result> {
  if (!rules) {
    return { status: "pending_configuration" };
  }

  const rows = await db
    .selectFrom("merchant_sales as s")
    .innerJoin("merchant_sale_gpv as g", "g.sale_id", "s.id")
    .where("s.product", "=", "CULQIFULL")
    .where("s.mesa", "in", MASS_MARKET_MESAS)
    .where("s.sale_month", "=", calendarMonthStart(cohortMonth))
    .where("g.month_offset", "in", [0, 1, 2])
    .groupBy(["s.mesa", "s.id"])
    .select((eb) => [
      "s.mesa",
      sql<number>`sum(case when ${eb.ref("g.month_offset")} in (0, 1) then ${eb.ref("g.gpv")} else 0 end)`.as(
        "gpv_m0_plus_m1",
      ),
      sql<number>`sum(case when ${eb.ref("g.month_offset")} = 2 then ${eb.ref("g.gpv")} else 0 end)`.as(
        "gpv_m2",
      ),
    ])
    .execute();

  const mesas = MASS_MARKET_MESAS.map((mesa): MassMarketCaja2MesaRow => {
    const mesaRows = rows.filter((row) => row.mesa === mesa);
    const activeM0PlusM1 = mesaRows
      .map((row) => row.gpv_m0_plus_m1)
      .filter((gpv) => gpv > rules.activePosMinGpv);
    const activeM2 = mesaRows
      .map((row) => row.gpv_m2)
      .filter((gpv) => gpv > rules.activePosMinGpv);

    return {
      mesa,
      bandsM0PlusM1: countByBand(rules.bandsM0PlusM1, activeM0PlusM1),
      bandsM2: countByBand(rules.bandsM2, activeM2),
    };
  });

  return { status: "evaluated", mesas };
}

function countByBand(
  bands: readonly PayoutBand[],
  values: number[],
): BandCount[] {
  return bands.map((band) => ({
    band,
    activeCount: values.filter(
      (value) => value >= band.min && (band.max === null || value <= band.max),
    ).length,
  }));
}

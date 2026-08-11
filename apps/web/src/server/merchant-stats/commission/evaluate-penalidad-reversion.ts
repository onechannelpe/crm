import { sql } from "kysely";

import type { PenalidadReversionResult } from "~/contracts/merchant-stats/commission-views";
import type {
  MassMarketCaja2Rules,
  PenalidadReversionRules,
} from "~/domain/merchant-stats/commission";
import {
  calendarMonthStart,
  type CalendarMonth,
} from "~/domain/time/calendar-date";
import type { DatabaseExecutor } from "~/server/platform/database/executor";

import { findBand } from "./band-lookup";
import { MASS_MARKET_MESAS } from "./mesa";

// Mesa 2 & 3 only. "Commissioned in M0+M1" is defined by Caja 2's own
// activation threshold, and the reversal amount is a percentage
// (reversalPct) of Caja 2's M0+M1 payout for that POS -- so this evaluator
// needs both rule groups, not just its own. The reversal total only sums
// POS where the underlying Caja 2 payout is known; unknownReversalCount
// tracks penalized POS whose band payout is still unset.

export async function evaluatePenalidadReversion(
  db: DatabaseExecutor,
  penalidadRules: PenalidadReversionRules | null,
  caja2Rules: MassMarketCaja2Rules | null,
  cohortMonth: CalendarMonth,
): Promise<PenalidadReversionResult> {
  if (!penalidadRules || !caja2Rules) {
    return { status: "pending_configuration" };
  }

  const rows = await db
    .selectFrom("merchant_sales as s")
    .innerJoin("merchant_sale_gpv as g", "g.sale_id", "s.id")
    .where("s.product", "=", "CULQIFULL")
    .where("s.mesa", "in", MASS_MARKET_MESAS)
    .where("s.sale_month", "=", calendarMonthStart(cohortMonth))
    .where("g.month_offset", "in", [0, 1, 2])
    .groupBy("s.id")
    .select((eb) => [
      sql<number>`sum(case when ${eb.ref("g.month_offset")} in (0, 1) then ${eb.ref("g.gpv")} else 0 end)`.as(
        "gpv_m0_plus_m1",
      ),
      sql<number>`sum(case when ${eb.ref("g.month_offset")} = 2 then ${eb.ref("g.gpv")} else 0 end)`.as(
        "gpv_m2",
      ),
    ])
    .execute();

  let commissionedCount = 0;
  let penalizedCount = 0;
  let knownReversalTotal = 0;
  let unknownReversalCount = 0;

  for (const row of rows) {
    const commissioned = row.gpv_m0_plus_m1 > caja2Rules.activePosMinGpv;
    if (!commissioned) {
      continue;
    }
    commissionedCount += 1;

    const safe = row.gpv_m2 >= penalidadRules.minM2Gpv;
    if (safe) {
      continue;
    }
    penalizedCount += 1;

    const band = findBand(caja2Rules.bandsM0PlusM1, row.gpv_m0_plus_m1);
    if (band?.payout != null) {
      knownReversalTotal += band.payout * penalidadRules.reversalPct;
    } else {
      unknownReversalCount += 1;
    }
  }

  return {
    status: "evaluated",
    commissionedCount,
    penalizedCount,
    knownReversalTotal,
    unknownReversalCount,
  };
}

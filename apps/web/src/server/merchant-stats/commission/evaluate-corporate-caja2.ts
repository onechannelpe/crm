import { sql } from "kysely";

import type {
  CorporateCaja2Result,
  CorporateCaja2UserRow,
} from "~/contracts/merchant-stats/commission-views";
import type { CorporateCaja2Rules } from "~/domain/merchant-stats/commission";
import {
  calendarMonthStart,
  type CalendarMonth,
} from "~/domain/time/calendar-date";
import type { DatabaseExecutor } from "~/server/platform/database/executor";

// Grain is per user (culqi_user_code, "usuario"), aggregated across that
// user's RUCs -- not per-POS. A RUC qualifies once its own total clears
// activeRucMinGpv; POS count per RUC never matters.

type WindowResult = CorporateCaja2UserRow["m0PlusM1"];

export async function evaluateCorporateCaja2(
  db: DatabaseExecutor,
  rules: CorporateCaja2Rules | null,
  cohortMonth: CalendarMonth,
): Promise<CorporateCaja2Result> {
  if (!rules) {
    return { status: "pending_configuration" };
  }

  const rucRows = await db
    .selectFrom("merchant_sales as s")
    .innerJoin("merchant_sale_gpv as g", "g.sale_id", "s.id")
    .where("s.mesa", "=", "MESA 1")
    .where("s.sale_month", "=", calendarMonthStart(cohortMonth))
    .where("g.month_offset", "in", [0, 1, 2])
    .groupBy(["s.culqi_user_code", "s.culqi_user_name", "s.ruc"])
    .select((eb) => [
      "s.culqi_user_code",
      "s.culqi_user_name",
      "s.ruc",
      sql<number>`sum(case when ${eb.ref("g.month_offset")} in (0, 1) then ${eb.ref("g.gpv")} else 0 end)`.as(
        "gpv_m0_plus_m1",
      ),
      sql<number>`sum(case when ${eb.ref("g.month_offset")} = 2 then ${eb.ref("g.gpv")} else 0 end)`.as(
        "gpv_m2",
      ),
    ])
    .execute();

  const byUser = new Map<
    string,
    { userName: string | null; rucs: (typeof rucRows)[number][] }
  >();
  for (const row of rucRows) {
    if (row.culqi_user_code === null) {
      continue;
    }
    const entry = byUser.get(row.culqi_user_code) ?? {
      userName: row.culqi_user_name,
      rucs: [],
    };
    entry.rucs.push(row);
    byUser.set(row.culqi_user_code, entry);
  }

  const users = Array.from(byUser.entries()).map(
    ([userCode, { userName, rucs }]): CorporateCaja2UserRow => ({
      userCode,
      userName,
      m0PlusM1: evaluateWindow(rucs, "gpv_m0_plus_m1", rules),
      m2: evaluateWindow(rucs, "gpv_m2", rules),
    }),
  );

  return { status: "evaluated", users };
}

function evaluateWindow(
  rucs: readonly { gpv_m0_plus_m1: number; gpv_m2: number }[],
  column: "gpv_m0_plus_m1" | "gpv_m2",
  rules: CorporateCaja2Rules,
): WindowResult {
  const qualifying = rucs
    .map((ruc) => ruc[column])
    .filter((gpv) => gpv > rules.activeRucMinGpv);
  const qualifyingSum = qualifying.reduce((sum, gpv) => sum + gpv, 0);
  const qualifyingRucCount = qualifying.length;

  return {
    qualifyingSum,
    qualifyingRucCount,
    active:
      qualifyingSum > rules.minAggregateGpv &&
      qualifyingRucCount >= rules.minQualifyingRucs,
  };
}

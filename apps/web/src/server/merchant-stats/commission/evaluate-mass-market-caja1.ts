import type {
  MassMarketCaja1MesaRow,
  MassMarketCaja1Result,
} from "~/contracts/merchant-stats/commission-views";
import type { MassMarketCaja1Rules } from "~/domain/merchant-stats/commission";
import {
  calendarMonthStart,
  type CalendarMonth,
} from "~/domain/time/calendar-date";
import type { DatabaseExecutor } from "~/server/platform/database/executor";

import { findBand } from "./band-lookup";
import { MASS_MARKET_MESAS } from "./mesa";

// Caja 1 counts active POS straight off merchant_sales/merchant_sale_gpv,
// not through the CRM's merchant_month_credit/seller_user_id attribution --
// that's a separate identity system with no bearing on how Culqi scores
// this caja.

export async function evaluateMassMarketCaja1(
  db: DatabaseExecutor,
  rules: MassMarketCaja1Rules | null,
  cohortMonth: CalendarMonth,
): Promise<MassMarketCaja1Result> {
  if (!rules) {
    return { status: "pending_configuration" };
  }

  const rows = await db
    .selectFrom("merchant_sales as s")
    .innerJoin("merchant_sale_gpv as g", (join) =>
      join.onRef("g.sale_id", "=", "s.id").on("g.month_offset", "=", 0),
    )
    .select([
      "s.mesa",
      "g.gpv",
      "g.trx",
      "s.m0_plus_15d_gpv",
      "s.m0_plus_15d_trx",
    ])
    .where("s.product", "=", "CULQIFULL")
    .where("s.mesa", "in", MASS_MARKET_MESAS)
    .where("s.sale_month", "=", calendarMonthStart(cohortMonth))
    .execute();

  const mesas = MASS_MARKET_MESAS.map((mesa): MassMarketCaja1MesaRow => {
    const mesaRows = rows.filter((row) => row.mesa === mesa);
    const activeCountM0 = mesaRows.filter(
      (row) =>
        row.gpv > rules.activation.minGpv && row.trx >= rules.activation.minTrx,
    ).length;
    const activeCountM0Plus15 = mesaRows.filter(
      (row) =>
        (row.m0_plus_15d_gpv ?? 0) > rules.activation.minGpv &&
        (row.m0_plus_15d_trx ?? 0) >= rules.activation.minTrx,
    ).length;

    return {
      mesa,
      activeCountM0,
      target: rules.m0Target,
      activeCountM0Plus15,
      band: findBand(rules.m0Plus15Bands, activeCountM0Plus15),
    };
  });

  return { status: "evaluated", mesas };
}

import type { ExpressionBuilder } from "kysely";

import type { Database } from "~/lib/db/types";

// Read each target as of the observed month so later revisions do not change history.

type MonthlyContext = ExpressionBuilder<
  Database & { m: Database["merchant_monthly_gpv"] },
  "m"
>;

type SaleContext = ExpressionBuilder<
  Database & { s: Database["merchant_sales"] },
  "s"
>;

export function targetAsOfMonth(eb: MonthlyContext) {
  return eb
    .selectFrom("merchant_targets as mt")
    .select("mt.projected_gpv")
    .whereRef("mt.ruc", "=", "m.ruc")
    .whereRef("mt.effective_from", "<=", "m.month")
    .orderBy("mt.effective_from", "desc")
    .limit(1)
    .as("t");
}

export function targetAsOfSaleMonth(eb: SaleContext) {
  return eb
    .selectFrom("merchant_targets as mt")
    .select("mt.projected_gpv")
    .whereRef("mt.ruc", "=", "s.ruc")
    .whereRef("mt.effective_from", "<=", "s.sale_month")
    .orderBy("mt.effective_from", "desc")
    .limit(1)
    .as("t");
}

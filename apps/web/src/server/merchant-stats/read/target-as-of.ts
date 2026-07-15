import type { ExpressionBuilder } from "kysely";

import type { Database } from "~/lib/db/types";

// The projection in force for a month: the newest version dated at or before it.
//
// This lookup is the whole point of effective-dating. The business sets one
// number per RUC ("debería rondar los 60k"), and reading it as-of the month
// means raising it in July leaves May measured against May's number, without
// storing twelve rows a year per merchant to say so.
//
// Two spellings because the two grains name their month differently, and each is
// six lines. A single helper that took the columns as strings would give up the
// type checking that makes them worth having.

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

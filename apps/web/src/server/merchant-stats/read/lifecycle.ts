import { sql } from "kysely";

import type {
  BookFilter,
  LifecycleSummary,
} from "~/contracts/merchant-stats/views";
import { DORMANT_AFTER_DAYS } from "~/contracts/merchant-stats/vocabulary";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

import { creditFilter } from "./filter";

export async function getLifecycle(
  db: DatabaseExecutor,
  filter: BookFilter,
  now: Date,
): Promise<LifecycleSummary> {
  const dormantCutoff = new Date(now);
  dormantCutoff.setDate(dormantCutoff.getDate() - DORMANT_AFTER_DAYS);

  const cutoff = dormantCutoff.toISOString().slice(0, 10);

  const row = await db
    .selectFrom("merchant_sales as s")
    .innerJoin("merchant_month_credit as a", (join) =>
      join.onRef("a.ruc", "=", "s.ruc").onRef("a.month", "=", "s.sale_month"),
    )
    .where((eb) => creditFilter(eb, filter))
    .$if(filter.month != null, (qb) =>
      qb.where("s.sale_month", "=", filter.month ?? ""),
    )
    .$if(filter.product != null, (qb) =>
      qb.where("s.product", "=", filter.product ?? ""),
    )
    .select((eb) => [
      eb.fn.countAll<number>().as("sales_total"),
      eb.fn.count<number>("s.activated_at").as("activated_count"),

      // Late activations skew a mean; the median better represents a typical merchant.
      sql<number | null>`percentile_cont(0.5) within group (
        order by (s.activated_at - s.sold_at)
      ) filter (where s.activated_at is not null)`.as("median_days"),

      // A sale that never transacted is unactivated, not dormant.
      eb.fn
        .count<number>("s.last_transaction_at")
        .filterWhere("s.last_transaction_at", "<", cutoff)
        .as("dormant_count"),
    ])
    .executeTakeFirst();

  return {
    salesTotal: row?.sales_total ?? 0,
    activatedCount: row?.activated_count ?? 0,
    medianDaysToActivate:
      row?.median_days == null ? null : Math.round(row.median_days),
    dormantCount: row?.dormant_count ?? 0,
    dormantThresholdDays: DORMANT_AFTER_DAYS,
  };
}

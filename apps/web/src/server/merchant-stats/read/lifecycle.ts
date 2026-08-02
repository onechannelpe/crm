import type {
  BookFilter,
  LifecycleSummary,
} from "~/contracts/merchant-stats/views";
import { DORMANT_AFTER_DAYS } from "~/contracts/merchant-stats/vocabulary";
import { appCalendarDateAt } from "~/domain/time/app-time";
import {
  addCalendarDays,
  calendarMonthStart,
} from "~/domain/time/calendar-date";
import type { DatabaseExecutor } from "~/server/platform/database/executor";
import type { OperationContext } from "~/server/platform/operation/context";

import { creditFilter } from "./filter";

export async function getLifecycle(
  db: DatabaseExecutor,
  filter: BookFilter,
  operation: OperationContext,
): Promise<LifecycleSummary> {
  const selectedMonth = filter.month ? calendarMonthStart(filter.month) : null;
  const cutoff = addCalendarDays(
    appCalendarDateAt(operation.operationAt),
    -DORMANT_AFTER_DAYS,
  );

  const row = await db
    .selectFrom("merchant_sales as s")
    .innerJoin("merchant_month_credit as a", (join) =>
      join.onRef("a.ruc", "=", "s.ruc").onRef("a.month", "=", "s.sale_month"),
    )
    .where((eb) => creditFilter(eb, filter))
    .$if(selectedMonth !== null, (qb) =>
      qb.where("s.sale_month", "=", selectedMonth ?? ""),
    )
    .$if(filter.product != null, (qb) =>
      qb.where("s.product", "=", filter.product ?? ""),
    )
    .select((eb) => [
      eb.fn.countAll<number>().as("sales_total"),
      eb.fn.count<number>("s.activated_at").as("activated_count"),

      // Late activations skew a mean; the median better represents a typical merchant.
      eb.fn
        .agg<number | null>("percentile_cont", [eb.val(0.5)])
        .withinGroupOrderBy(eb("s.activated_at", "-", eb.ref("s.sold_at")))
        .filterWhere("s.activated_at", "is not", null)
        .as("median_days"),

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

import type { CompanyCaja3Result } from "~/contracts/merchant-stats/commission-views";
import type { CompanyCaja3Rules } from "~/domain/merchant-stats/commission";
import {
  calendarMonthStart,
  type CalendarMonth,
} from "~/domain/time/calendar-date";
import type { DatabaseExecutor } from "~/server/platform/database/executor";

// Company-wide: all mesas, all products (POS + links + online), summed
// across M0+M1+M2 -- the only caja where links/online count.

export async function evaluateCompanyCaja3(
  db: DatabaseExecutor,
  rules: CompanyCaja3Rules | null,
  cohortMonth: CalendarMonth,
): Promise<CompanyCaja3Result> {
  if (!rules) {
    return { status: "pending_configuration" };
  }

  const row = await db
    .selectFrom("merchant_sales as s")
    .innerJoin("merchant_sale_gpv as g", "g.sale_id", "s.id")
    .where("s.sale_month", "=", calendarMonthStart(cohortMonth))
    .where("g.month_offset", "in", [0, 1, 2])
    .select((eb) => eb.fn.sum<number>("g.gpv").as("total_gpv"))
    .executeTakeFirst();

  return {
    status: "evaluated",
    totalGpv: row?.total_gpv ?? 0,
    target: rules.targetGpv,
  };
}

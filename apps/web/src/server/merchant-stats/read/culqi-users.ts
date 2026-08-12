import type {
  BookFilter,
  CulqiUserGpvRow,
} from "~/contracts/merchant-stats/views";
import {
  calendarMonthStart,
  type CalendarMonth,
} from "~/domain/time/calendar-date";
import type { DatabaseExecutor } from "~/server/platform/database/executor";

// Culqi's `vendedor` is the registered usuario, not the crm seller. This is a
// reconciliation view at sale grain because a RUC can have multiple usuarios.
export async function getCulqiUserGpv(
  db: DatabaseExecutor,
  filter: BookFilter,
  month: CalendarMonth,
): Promise<CulqiUserGpvRow[]> {
  const rows = await db
    .selectFrom("merchant_sale_gpv as g")
    .innerJoin("merchant_sales as s", "s.id", "g.sale_id")
    .where("g.realized_month", "=", calendarMonthStart(month))
    .$if(filter.product != null, (qb) =>
      qb.where("s.product", "=", filter.product ?? ""),
    )
    .select((eb) => [
      "s.culqi_user_name",
      eb.fn.sum<number>("g.gpv").as("gpv"),
      eb.fn.sum<number>("g.trx").as("trx"),
      eb.fn.count<number>("s.id").distinct().as("device_count"),
    ])
    .groupBy("s.culqi_user_name")
    .execute();

  return rows
    .map((row) => ({
      culqiUserName: row.culqi_user_name,
      gpv: row.gpv ?? 0,
      trx: row.trx ?? 0,
      deviceCount: row.device_count ?? 0,
    }))
    .toSorted((a, b) => b.gpv - a.gpv);
}

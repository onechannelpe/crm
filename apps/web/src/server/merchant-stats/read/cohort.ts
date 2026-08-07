import type {
  BookFilter,
  CohortRampSeries,
  CohortSaleRow,
  GpvPoint,
  Page,
} from "~/contracts/merchant-stats/views";
import type { GpvSnapshotPlacementId } from "~/domain/ids";
import { calendarMonthStart } from "~/domain/time/calendar-date";
import type { DatabaseExecutor } from "~/server/platform/database/executor";

import { dateFromStorage, monthFromStorageDate } from "../storage-month";
import { creditFilter } from "./filter";
import { displayName } from "./names";
import { targetAsOfSaleMonth } from "./target-as-of";

export async function getCohortRamp(
  db: DatabaseExecutor,
  filter: BookFilter,
): Promise<CohortRampSeries[]> {
  const rows = await db
    .selectFrom("merchant_sale_gpv as g")
    .innerJoin("merchant_sales as s", "s.id", "g.sale_id")
    .innerJoin("merchant_month_credit as a", (join) =>
      join.onRef("a.ruc", "=", "s.ruc").onRef("a.month", "=", "s.sale_month"),
    )
    .where((eb) => creditFilter(eb, filter))
    .$if(filter.product != null, (qb) =>
      qb.where("s.product", "=", filter.product ?? ""),
    )
    .select((eb) => [
      "s.sale_month",
      "g.month_offset",
      eb.fn.sum<number>("g.gpv").as("gpv"),
      eb.fn.sum<number>("g.trx").as("trx"),
      eb.fn.count<number>("s.id").distinct().as("device_count"),
    ])
    .groupBy(["s.sale_month", "g.month_offset"])
    .orderBy("s.sale_month")
    .orderBy("g.month_offset")
    .execute();

  const targets = await cohortTargets(db, filter);

  const byCohort = new Map<string, CohortRampSeries>();
  for (const row of rows) {
    const series = byCohort.get(row.sale_month) ?? {
      saleMonth: monthFromStorageDate(row.sale_month),
      deviceCount: 0,
      projectedGpv: targets.get(row.sale_month) ?? 0,
      points: [],
    };
    series.deviceCount = Math.max(series.deviceCount, row.device_count ?? 0);
    series.points.push({
      offset: row.month_offset,
      gpv: row.gpv ?? 0,
      trx: row.trx ?? 0,
    });
    byCohort.set(row.sale_month, series);
  }

  return [...byCohort.values()];
}

// Targets are per RUC, so a cohort counts each RUC once regardless of device count.
async function cohortTargets(
  db: DatabaseExecutor,
  filter: BookFilter,
): Promise<Map<string, number>> {
  const rows = await db
    .selectFrom("merchant_sales as s")
    .innerJoin("merchant_month_credit as a", (join) =>
      join.onRef("a.ruc", "=", "s.ruc").onRef("a.month", "=", "s.sale_month"),
    )
    .leftJoinLateral(targetAsOfSaleMonth, (join) => join.onTrue())
    .where((eb) => creditFilter(eb, filter))
    .$if(filter.product != null, (qb) =>
      qb.where("s.product", "=", filter.product ?? ""),
    )
    .select(["s.sale_month", "s.ruc", "t.monthly_target_gpv"])
    .distinct()
    .execute();

  const byMonth = new Map<string, number>();
  for (const row of rows) {
    if (row.monthly_target_gpv == null) {
      continue;
    }
    byMonth.set(
      row.sale_month,
      (byMonth.get(row.sale_month) ?? 0) + row.monthly_target_gpv,
    );
  }
  return byMonth;
}

export async function getCohortRows(
  db: DatabaseExecutor,
  filter: BookFilter,
  page?: Page,
): Promise<CohortSaleRow[]> {
  const selectedMonth = filter.month ? calendarMonthStart(filter.month) : null;
  const salesQuery = db
    .selectFrom("merchant_sales as s")
    .innerJoin("merchant_month_credit as a", (join) =>
      join.onRef("a.ruc", "=", "s.ruc").onRef("a.month", "=", "s.sale_month"),
    )
    .leftJoinLateral(targetAsOfSaleMonth, (join) => join.onTrue())
    .leftJoin("organizations as o", "o.ruc", "s.ruc")
    .leftJoin("users as u", "u.id", "a.seller_user_id")
    .leftJoin("branches as b", "b.id", "a.branch_id")
    .where((eb) => creditFilter(eb, filter))
    .$if(selectedMonth !== null, (qb) =>
      qb.where("s.sale_month", "=", selectedMonth ?? ""),
    )
    .$if(filter.product != null, (qb) =>
      qb.where("s.product", "=", filter.product ?? ""),
    )
    .select([
      "s.id as sale_id",
      "s.merchant_id",
      "s.ruc",
      "s.trade_name",
      "s.serial_number",
      "s.product",
      "s.sale_month",
      "s.sold_at",
      "s.activated_at",
      "s.last_transaction_at",
      "s.client_type",
      "s.culqi_user_name",
      "s.subchannel",
      "s.m0_plus_15d_gpv",
      "s.m0_plus_15d_trx",
      "o.id as organization_id",
      "t.monthly_target_gpv",
      "u.names",
      "u.first_surname",
      "b.name as branch_name",
    ])
    .orderBy("s.sale_month", "desc")
    .orderBy("s.ruc")
    .orderBy("s.id");
  const sales = page
    ? await salesQuery.limit(page.limit).offset(page.offset).execute()
    : await salesQuery.execute();

  if (sales.length === 0) {
    return [];
  }

  const points = await pointsBySale(
    db,
    sales.map((sale) => sale.sale_id),
  );

  return sales.map((sale) => {
    const bySaleOffset =
      points.get(sale.sale_id) ?? new Map<number, GpvPoint>();
    return {
      saleId: sale.sale_id,
      merchantId: sale.merchant_id,
      ruc: sale.ruc,
      tradeName: sale.trade_name,
      serialNumber: sale.serial_number,
      product: sale.product,
      saleMonth: monthFromStorageDate(sale.sale_month),
      soldAt: dateFromStorage(sale.sold_at),
      activatedAt: sale.activated_at
        ? dateFromStorage(sale.activated_at)
        : null,
      lastTransactionAt: sale.last_transaction_at
        ? dateFromStorage(sale.last_transaction_at)
        : null,
      clientType: sale.client_type,
      organizationId: sale.organization_id,
      sellerName: displayName(sale),
      culqiUserName: sale.culqi_user_name,
      branchName: sale.branch_name,
      subchannel: sale.subchannel,
      projectedGpv: sale.monthly_target_gpv,
      months: Array.from(bySaleOffset, ([offset, point]) => ({
        offset,
        gpv: point.gpv,
        trx: point.trx,
      })).toSorted((a, b) => a.offset - b.offset),
      m0Plus15d:
        sale.m0_plus_15d_gpv == null
          ? null
          : { gpv: sale.m0_plus_15d_gpv, trx: sale.m0_plus_15d_trx ?? 0 },
    };
  });
}

async function pointsBySale(
  db: DatabaseExecutor,
  saleIds: readonly GpvSnapshotPlacementId[],
): Promise<Map<string, Map<number, GpvPoint>>> {
  const rows = await db
    .selectFrom("merchant_sale_gpv")
    .select(["sale_id", "month_offset", "gpv", "trx"])
    .where("sale_id", "in", saleIds)
    .execute();

  const bySale = new Map<string, Map<number, GpvPoint>>();
  for (const row of rows) {
    const byOffset = bySale.get(row.sale_id) ?? new Map<number, GpvPoint>();
    byOffset.set(row.month_offset, { gpv: row.gpv, trx: row.trx });
    bySale.set(row.sale_id, byOffset);
  }
  return bySale;
}

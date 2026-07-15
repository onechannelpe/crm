import type {
  BookFilter,
  CohortRampSeries,
  CohortSaleRow,
  GpvPoint,
  Page,
} from "~/contracts/merchant-stats/views";
import { COHORT_OFFSETS } from "~/contracts/merchant-stats/vocabulary";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { MerchantSaleId } from "~/server/shared/ids";

import { creditFilter } from "./filter";
import { displayName } from "./names";
import { targetAsOfSaleMonth } from "./target-as-of";

// The ramp curve: one line per sale-month cohort, tracking that cohort across
// its own months (m0 = the sale month, m1 the next). This is the one surface
// where the cohort axis is the point, so it reads gpv rows by offset rather than
// the calendar view.
export async function getCohortRamp(
  db: DatabaseExecutor,
  filter: BookFilter,
): Promise<CohortRampSeries[]> {
  const rows = await db
    .selectFrom("merchant_sale_gpv as g")
    .innerJoin("merchant_sales as s", "s.id", "g.sale_id")
    // Credit is a property of the RUC's sale month, so the cohort's own month is
    // the one that decides whose line this is.
    .innerJoin("merchant_monthly_attribution as a", (join) =>
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
      saleMonth: row.sale_month,
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

// A cohort's projection is the sum of its RUCs' projections, counted once per
// RUC however many devices it bought. Read at sale grain and de-duplicated by
// RUC, since the projection is per merchant and not per device.
async function cohortTargets(
  db: DatabaseExecutor,
  filter: BookFilter,
): Promise<Map<string, number>> {
  const rows = await db
    .selectFrom("merchant_sales as s")
    .innerJoin("merchant_monthly_attribution as a", (join) =>
      join.onRef("a.ruc", "=", "s.ruc").onRef("a.month", "=", "s.sale_month"),
    )
    .leftJoinLateral(targetAsOfSaleMonth, (join) => join.onTrue())
    .where((eb) => creditFilter(eb, filter))
    .$if(filter.product != null, (qb) =>
      qb.where("s.product", "=", filter.product ?? ""),
    )
    .select(["s.sale_month", "s.ruc", "t.projected_gpv"])
    .distinct()
    .execute();

  const byMonth = new Map<string, number>();
  for (const row of rows) {
    if (row.projected_gpv == null) continue;
    byMonth.set(
      row.sale_month,
      (byMonth.get(row.sale_month) ?? 0) + row.projected_gpv,
    );
  }
  return byMonth;
}

// One row per sale, with its cohort measures pivoted back onto it. The intake
// un-pivots gpv_m0..m3 into per-offset facts so the months are addressable; this
// puts them back into the M0/M1/M2/M3 shape a reader scans across.
//
// The pivot is done here rather than in SQL: eight conditional aggregates and a
// dynamic row key were how the old version needed an unsafe cast to read its own
// output. Mapping COHORT_OFFSETS over long rows cannot drift from the schema.
export async function getCohortRows(
  db: DatabaseExecutor,
  filter: BookFilter,
  page: Page,
): Promise<CohortSaleRow[]> {
  const sales = await db
    .selectFrom("merchant_sales as s")
    .innerJoin("merchant_monthly_attribution as a", (join) =>
      join.onRef("a.ruc", "=", "s.ruc").onRef("a.month", "=", "s.sale_month"),
    )
    .leftJoinLateral(targetAsOfSaleMonth, (join) => join.onTrue())
    .leftJoin("organizations as o", "o.ruc", "s.ruc")
    .leftJoin("users as u", "u.id", "a.seller_user_id")
    .leftJoin("branches as b", "b.id", "a.branch_id")
    .where((eb) => creditFilter(eb, filter))
    .$if(filter.month != null, (qb) =>
      qb.where("s.sale_month", "=", filter.month ?? ""),
    )
    .$if(filter.product != null, (qb) =>
      qb.where("s.product", "=", filter.product ?? ""),
    )
    .select([
      "s.id as sale_id",
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
      "s.m0_plus_15d_gpv",
      "s.m0_plus_15d_trx",
      "o.id as organization_id",
      "t.projected_gpv",
      "u.names",
      "u.first_surname",
      "b.name as branch_name",
    ])
    .orderBy("s.sale_month", "desc")
    .orderBy("s.ruc")
    .limit(page.limit)
    .offset(page.offset)
    .execute();

  if (sales.length === 0) return [];

  const points = await pointsBySale(
    db,
    sales.map((sale) => sale.sale_id),
  );

  return sales.map((sale) => {
    const bySaleOffset =
      points.get(sale.sale_id) ?? new Map<number, GpvPoint>();
    return {
      saleId: sale.sale_id,
      ruc: sale.ruc,
      tradeName: sale.trade_name,
      serialNumber: sale.serial_number,
      product: sale.product,
      saleMonth: sale.sale_month,
      soldAt: sale.sold_at,
      activatedAt: sale.activated_at,
      lastTransactionAt: sale.last_transaction_at,
      clientType: sale.client_type,
      organizationId: sale.organization_id,
      sellerName: displayName(sale),
      culqiUserName: sale.culqi_user_name,
      branchName: sale.branch_name,
      projectedGpv: sale.projected_gpv,
      months: COHORT_OFFSETS.map((offset) => ({
        offset,
        gpv: bySaleOffset.get(offset)?.gpv ?? 0,
        trx: bySaleOffset.get(offset)?.trx ?? 0,
      })),
      m0Plus15d:
        sale.m0_plus_15d_gpv == null
          ? null
          : { gpv: sale.m0_plus_15d_gpv, trx: sale.m0_plus_15d_trx ?? 0 },
    };
  });
}

async function pointsBySale(
  db: DatabaseExecutor,
  saleIds: readonly MerchantSaleId[],
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

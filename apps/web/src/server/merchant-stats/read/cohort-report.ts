import type { DatabaseExecutor } from "~/server/shared/db-executor";

import type { CohortSaleRow, RecordFilters } from "./contracts";
import { cohortFilter } from "./filters";
import { withLatestMetric } from "./latest-metric";

// One row per sale, with its cohort measures pivoted back onto it. The intake
// un-pivots gpv_m0..m3 into (month, offset) facts so the months are addressable;
// this puts them back into the M0/M1/M2/M3 shape a reader scans across.
//
// m0Plus15d stays off the months array on purpose: it is cumulative (the sale
// month plus the first 15 days of m1) and overlaps m0, so it belongs beside the
// series as a checkpoint, never inside it. See business-stats-plan.txt §2.1.
export async function getCohortReport(
  db: DatabaseExecutor,
  filters: RecordFilters,
  page: { limit: number; offset: number },
): Promise<CohortSaleRow[]> {
  const rows = await withLatestMetric(db)
    .selectFrom("latest_metric as lm")
    .innerJoin("merchant_sales as s", "s.id", "lm.sale_id")
    .leftJoin("merchant_accounts as a", "a.ruc", "s.ruc")
    .leftJoin("users as u", "u.id", "a.real_seller_user_id")
    .leftJoin("branches as b", "b.id", "a.branch_id")
    .where((eb) => cohortFilter(eb, filters))
    .$if(!!filters.saleMonth, (qb) =>
      qb.where("s.sale_month", "=", filters.saleMonth!),
    )
    .$if(!!filters.product, (qb) =>
      qb.where("s.product", "=", filters.product!),
    )
    .select((eb) => [
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
      "s.organization_id",
      "s.m0_plus_15d_gpv",
      "s.m0_plus_15d_trx",
      "a.projected_gpv",
      "a.real_seller_label",
      "u.names",
      "u.first_surname",
      "b.name as branch_name",
      eb.fn.sum("lm.gpv").filterWhere("lm.month_offset", "=", 0).as("m0_gpv"),
      eb.fn.sum("lm.trx").filterWhere("lm.month_offset", "=", 0).as("m0_trx"),
      eb.fn.sum("lm.gpv").filterWhere("lm.month_offset", "=", 1).as("m1_gpv"),
      eb.fn.sum("lm.trx").filterWhere("lm.month_offset", "=", 1).as("m1_trx"),
      eb.fn.sum("lm.gpv").filterWhere("lm.month_offset", "=", 2).as("m2_gpv"),
      eb.fn.sum("lm.trx").filterWhere("lm.month_offset", "=", 2).as("m2_trx"),
      eb.fn.sum("lm.gpv").filterWhere("lm.month_offset", "=", 3).as("m3_gpv"),
      eb.fn.sum("lm.trx").filterWhere("lm.month_offset", "=", 3).as("m3_trx"),
    ])
    .groupBy([
      "s.id",
      "s.ruc",
      "s.trade_name",
      "s.serial_number",
      "s.product",
      "s.sale_month",
      "s.sold_at",
      "s.activated_at",
      "s.last_transaction_at",
      "s.client_type",
      "s.organization_id",
      "s.m0_plus_15d_gpv",
      "s.m0_plus_15d_trx",
      "a.projected_gpv",
      "a.real_seller_label",
      "u.names",
      "u.first_surname",
      "b.name",
    ])
    .orderBy("s.sale_month", "desc")
    .orderBy("s.ruc")
    .limit(page.limit)
    .offset(page.offset)
    .execute();

  return rows.map((row) => ({
    saleId: row.sale_id,
    ruc: row.ruc,
    tradeName: row.trade_name,
    serialNumber: row.serial_number,
    product: row.product,
    saleMonth: row.sale_month,
    soldAt: row.sold_at,
    activatedAt: row.activated_at,
    lastTransactionAt: row.last_transaction_at,
    clientType: row.client_type,
    organizationId: row.organization_id,
    realSellerName: displayName(row) ?? row.real_seller_label,
    branchName: row.branch_name,
    projectedGpv: numberOrNull(row.projected_gpv),
    m0Plus15d:
      row.m0_plus_15d_gpv == null
        ? null
        : { gpv: Number(row.m0_plus_15d_gpv), trx: row.m0_plus_15d_trx ?? 0 },
    months: [0, 1, 2, 3].map((offset) => ({
      offset,
      gpv: Number(row[`m${offset}_gpv` as keyof typeof row] ?? 0),
      trx: Number(row[`m${offset}_trx` as keyof typeof row] ?? 0),
    })),
  }));
}

function displayName(row: {
  names: string | null;
  first_surname: string | null;
}): string | null {
  const full = [row.names, row.first_surname].filter(Boolean).join(" ").trim();
  return full.length > 0 ? full : null;
}

function numberOrNull(value: unknown): number | null {
  return value == null ? null : Number(value);
}

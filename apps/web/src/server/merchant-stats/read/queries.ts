import type { DatabaseExecutor } from "~/server/shared/db-executor";

import type {
  BusinessStatsFilterOptions,
  BusinessStatsFilters,
  CohortGridRow,
  DataQualitySummary,
  MerchantAccountRow,
  MonthlyGpvPoint,
  OrgMerchantStats,
  SellerPerformanceRow,
} from "./contracts";

// The single source of "current truth": the value for each (sale, month) from
// the freshest snapshot that carries it. Ordered by cut_date then import time so
// a re-imported dirty-dated file never shadows the newest real snapshot. Every
// dashboard reads through this.
function withLatestMetric(db: DatabaseExecutor) {
  return db.with("latest_metric", (qc) =>
    qc
      .selectFrom("merchant_sale_metrics as m")
      .innerJoin("merchant_sales_reports as r", "r.id", "m.report_id")
      .distinctOn(["m.merchant_sale_id", "m.month"])
      .select([
        "m.merchant_sale_id as sale_id",
        "m.month",
        "m.month_offset",
        "m.gpv",
        "m.trx",
      ])
      .orderBy("m.merchant_sale_id")
      .orderBy("m.month")
      .orderBy("r.cut_date", "desc")
      .orderBy("r.created_at", "desc"),
  );
}

// Actual GPV per calendar month, honoring seller / branch / product filters.
export async function getMonthlyGpv(
  db: DatabaseExecutor,
  filters: BusinessStatsFilters,
): Promise<MonthlyGpvPoint[]> {
  const rows = await withLatestMetric(db)
    .selectFrom("latest_metric as lm")
    .innerJoin("merchant_sales as s", "s.id", "lm.sale_id")
    .leftJoin("merchant_accounts as a", "a.ruc", "s.ruc")
    .$if(!!filters.branchId, (qb) =>
      qb.where("a.branch_id", "=", filters.branchId!),
    )
    .$if(!!filters.sellerUserId, (qb) =>
      qb.where("a.real_seller_user_id", "=", filters.sellerUserId!),
    )
    .$if(!!filters.product, (qb) =>
      qb.where("s.product", "=", filters.product!),
    )
    .select((eb) => [
      "lm.month",
      eb.fn.sum("lm.gpv").as("gpv"),
      eb.fn.sum("lm.trx").as("trx"),
    ])
    .groupBy("lm.month")
    .orderBy("lm.month")
    .execute();

  return rows.map((row) => ({
    month: monthIso(row.month),
    gpv: Number(row.gpv ?? 0),
    trx: Number(row.trx ?? 0),
  }));
}

// Per real seller: realized GPV in the selected month vs the projected target
// (sum of their RUCs' monthly targets). Projected comes from accounts, not the
// metric join, so it is never multiplied by the number of months.
export async function getSellerPerformance(
  db: DatabaseExecutor,
  filters: BusinessStatsFilters,
): Promise<SellerPerformanceRow[]> {
  const month = filters.month ?? (await latestMonth(db));
  if (!month) return [];

  const actuals = await withLatestMetric(db)
    .selectFrom("latest_metric as lm")
    .innerJoin("merchant_sales as s", "s.id", "lm.sale_id")
    .leftJoin("merchant_accounts as a", "a.ruc", "s.ruc")
    .leftJoin("users as u", "u.id", "a.real_seller_user_id")
    .leftJoin("branches as b", "b.id", "a.branch_id")
    .where("lm.month", "=", month)
    .$if(!!filters.branchId, (qb) =>
      qb.where("a.branch_id", "=", filters.branchId!),
    )
    .$if(!!filters.product, (qb) =>
      qb.where("s.product", "=", filters.product!),
    )
    .select((eb) => [
      "a.real_seller_user_id as seller_user_id",
      "a.real_seller_label",
      "u.names",
      "u.first_surname",
      "b.name as branch_name",
      eb.fn.sum("lm.gpv").as("gpv"),
    ])
    .groupBy([
      "a.real_seller_user_id",
      "a.real_seller_label",
      "u.names",
      "u.first_surname",
      "b.name",
    ])
    .execute();

  const projected = await db
    .selectFrom("merchant_accounts as a")
    .leftJoin("users as u", "u.id", "a.real_seller_user_id")
    .$if(!!filters.branchId, (qb) =>
      qb.where("a.branch_id", "=", filters.branchId!),
    )
    .select((eb) => [
      "a.real_seller_user_id as seller_user_id",
      "a.real_seller_label",
      "u.names",
      "u.first_surname",
      eb.fn.sum("a.projected_gpv").as("projected"),
      eb.fn.count<number>("a.ruc").as("ruc_count"),
    ])
    .groupBy([
      "a.real_seller_user_id",
      "a.real_seller_label",
      "u.names",
      "u.first_surname",
    ])
    .execute();

  const keyOf = (userId: string | null, label: string | null) =>
    userId ?? `label:${label ?? "—"}`;
  const byKey = new Map<string, SellerPerformanceRow>();

  for (const row of projected) {
    const key = keyOf(row.seller_user_id, row.real_seller_label);
    byKey.set(key, {
      sellerKey: key,
      sellerUserId: row.seller_user_id,
      sellerName: displayName(row) ?? row.real_seller_label ?? "Sin asignar",
      branchName: null,
      gpv: 0,
      projectedGpv: Number(row.projected ?? 0),
      rucCount: Number(row.ruc_count ?? 0),
    });
  }
  for (const row of actuals) {
    const key = keyOf(row.seller_user_id, row.real_seller_label);
    const existing = byKey.get(key);
    if (existing) {
      existing.gpv = Number(row.gpv ?? 0);
      existing.branchName = row.branch_name;
      continue;
    }
    byKey.set(key, {
      sellerKey: key,
      sellerUserId: row.seller_user_id,
      sellerName: displayName(row) ?? row.real_seller_label ?? "Sin asignar",
      branchName: row.branch_name,
      gpv: Number(row.gpv ?? 0),
      projectedGpv: 0,
      rucCount: 0,
    });
  }

  return [...byKey.values()].sort((a, b) => b.gpv - a.gpv);
}

// The Hoja4 pivot: one row per sale, GPV/TRX pivoted across cohort offsets
// m0..m3. Optional month filter targets the sale's own month.
export async function getCohortGrid(
  db: DatabaseExecutor,
  filters: BusinessStatsFilters,
  page: { limit: number; offset: number },
): Promise<CohortGridRow[]> {
  const rows = await withLatestMetric(db)
    .selectFrom("latest_metric as lm")
    .innerJoin("merchant_sales as s", "s.id", "lm.sale_id")
    .leftJoin("merchant_accounts as a", "a.ruc", "s.ruc")
    .leftJoin("users as u", "u.id", "a.real_seller_user_id")
    .leftJoin("branches as b", "b.id", "a.branch_id")
    .$if(!!filters.branchId, (qb) =>
      qb.where("a.branch_id", "=", filters.branchId!),
    )
    .$if(!!filters.sellerUserId, (qb) =>
      qb.where("a.real_seller_user_id", "=", filters.sellerUserId!),
    )
    .$if(!!filters.product, (qb) =>
      qb.where("s.product", "=", filters.product!),
    )
    .$if(!!filters.month, (qb) => qb.where("s.sale_month", "=", filters.month!))
    .select((eb) => [
      "s.id as sale_id",
      "s.ruc",
      "s.trade_name",
      "s.serial_number",
      "s.product",
      "s.sale_month",
      "s.last_15d_gpv",
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
      "s.last_15d_gpv",
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
    saleMonth: monthIso(row.sale_month),
    sellerName: displayName(row) ?? row.real_seller_label,
    branchName: row.branch_name,
    projectedGpv: numberOrNull(row.projected_gpv),
    last15dGpv: numberOrNull(row.last_15d_gpv),
    months: [0, 1, 2, 3].map((offset) => ({
      offset,
      gpv: Number(row[`m${offset}_gpv` as keyof typeof row] ?? 0),
      trx: Number(row[`m${offset}_trx` as keyof typeof row] ?? 0),
    })),
  }));
}

// The attach-info grid: one row per RUC account with its enrichment plus a
// realized-GPV signal for the latest month.
export async function getMerchantAccounts(
  db: DatabaseExecutor,
  filters: BusinessStatsFilters & { missingEnrichment?: boolean },
  page: { limit: number; offset: number },
): Promise<MerchantAccountRow[]> {
  const accounts = await db
    .selectFrom("merchant_accounts as a")
    .leftJoin("organizations as o", "o.id", "a.organization_id")
    .leftJoin("users as u", "u.id", "a.real_seller_user_id")
    .leftJoin("branches as b", "b.id", "a.branch_id")
    .leftJoin("merchant_sales as s", "s.ruc", "a.ruc")
    .$if(!!filters.branchId, (qb) =>
      qb.where("a.branch_id", "=", filters.branchId!),
    )
    .$if(!!filters.sellerUserId, (qb) =>
      qb.where("a.real_seller_user_id", "=", filters.sellerUserId!),
    )
    .$if(!!filters.missingEnrichment, (qb) =>
      qb.where((eb) =>
        eb.or([
          eb("a.real_seller_user_id", "is", null),
          eb("a.projected_gpv", "is", null),
          eb("a.branch_id", "is", null),
        ]),
      ),
    )
    .select((eb) => [
      "a.ruc",
      "a.organization_id",
      "o.legal_name as organization_name",
      "a.real_seller_user_id",
      "a.real_seller_label",
      "u.names",
      "u.first_surname",
      "a.branch_id",
      "b.name as branch_name",
      "a.projected_gpv",
      eb.fn.count<number>("s.id").distinct().as("sales_count"),
    ])
    .groupBy([
      "a.ruc",
      "a.organization_id",
      "o.legal_name",
      "a.real_seller_user_id",
      "a.real_seller_label",
      "u.names",
      "u.first_surname",
      "a.branch_id",
      "b.name",
      "a.projected_gpv",
    ])
    .orderBy("a.ruc")
    .limit(page.limit)
    .offset(page.offset)
    .execute();

  const rucs = accounts.map((row) => row.ruc);
  const latestGpvByRuc = await latestMonthGpvByRuc(db, rucs);

  return accounts.map((row) => ({
    ruc: row.ruc,
    organizationId: row.organization_id,
    organizationName: row.organization_name,
    realSellerUserId: row.real_seller_user_id,
    realSellerName: displayName(row) ?? row.real_seller_label,
    branchId: row.branch_id,
    branchName: row.branch_name,
    projectedGpv: numberOrNull(row.projected_gpv),
    salesCount: Number(row.sales_count ?? 0),
    latestMonthGpv: latestGpvByRuc.get(row.ruc) ?? 0,
  }));
}

export async function getDataQuality(
  db: DatabaseExecutor,
): Promise<DataQualitySummary> {
  const unmatched = await db
    .selectFrom("merchant_sales")
    .where("organization_id", "is", null)
    .select((eb) => eb.fn.count<number>("ruc").distinct().as("count"))
    .executeTakeFirst();

  const missingSeller = await db
    .selectFrom("merchant_accounts")
    .where("real_seller_user_id", "is", null)
    .where("real_seller_label", "is", null)
    .select((eb) => eb.fn.countAll<number>().as("count"))
    .executeTakeFirst();

  const missingProjected = await db
    .selectFrom("merchant_accounts")
    .where("projected_gpv", "is", null)
    .select((eb) => eb.fn.countAll<number>().as("count"))
    .executeTakeFirst();

  const serialMismatches = await db
    .selectFrom("merchant_sales as s")
    .where("s.lead_id", "is not", null)
    .where("s.serial_number", "is not", null)
    .where((eb) =>
      eb.not(
        eb.exists(
          eb
            .selectFrom("lead_fulfillment_units as f")
            .innerJoin("lead_fulfillment_orders as fo", "fo.id", "f.order_id")
            .whereRef("fo.lead_id", "=", "s.lead_id")
            .whereRef("f.serial_number", "=", "s.serial_number")
            .select("f.id"),
        ),
      ),
    )
    .select((eb) => eb.fn.countAll<number>().as("count"))
    .executeTakeFirst();

  return {
    unmatchedRucs: Number(unmatched?.count ?? 0),
    accountsMissingSeller: Number(missingSeller?.count ?? 0),
    accountsMissingProjected: Number(missingProjected?.count ?? 0),
    serialMismatches: Number(serialMismatches?.count ?? 0),
  };
}

export async function getFilterOptions(
  db: DatabaseExecutor,
): Promise<BusinessStatsFilterOptions> {
  const months = await db
    .selectFrom("merchant_sale_metrics")
    .select("month")
    .distinct()
    .orderBy("month", "desc")
    .execute();

  const branches = await db
    .selectFrom("merchant_accounts as a")
    .innerJoin("branches as b", "b.id", "a.branch_id")
    .select(["b.id", "b.name"])
    .distinct()
    .orderBy("b.name")
    .execute();

  const sellers = await db
    .selectFrom("merchant_accounts as a")
    .innerJoin("users as u", "u.id", "a.real_seller_user_id")
    .select(["u.id", "u.names", "u.first_surname"])
    .distinct()
    .execute();

  const products = await db
    .selectFrom("merchant_sales")
    .select("product")
    .distinct()
    .orderBy("product")
    .execute();

  return {
    months: months.map((row) => monthIso(row.month)),
    branches: branches.map((row) => ({ id: row.id, name: row.name })),
    sellers: sellers
      .map((row) => ({
        id: row.id,
        name: displayName(row) ?? row.id,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    products: products.map((row) => row.product),
  };
}

// Record-show widget: a merchant's GPV picture, keyed by RUC (always present on
// the record, and the grain merchant data is stored at).
export async function getMerchantStatsByRuc(
  db: DatabaseExecutor,
  ruc: string,
): Promise<OrgMerchantStats> {
  const account = await db
    .selectFrom("merchant_accounts")
    .select("projected_gpv")
    .where("ruc", "=", ruc)
    .executeTakeFirst();

  const devices = await db
    .selectFrom("merchant_sales")
    .select(["id", "product", "serial_number", "sold_at", "last_15d_gpv"])
    .where("ruc", "=", ruc)
    .orderBy("sold_at", "desc")
    .execute();

  const monthly = await withLatestMetric(db)
    .selectFrom("latest_metric as lm")
    .innerJoin("merchant_sales as s", "s.id", "lm.sale_id")
    .where("s.ruc", "=", ruc)
    .select((eb) => [
      "lm.month",
      eb.fn.sum("lm.gpv").as("gpv"),
      eb.fn.sum("lm.trx").as("trx"),
    ])
    .groupBy("lm.month")
    .orderBy("lm.month")
    .execute();

  return {
    projectedGpv: numberOrNull(account?.projected_gpv),
    devices: devices.map((row) => ({
      saleId: row.id,
      product: row.product,
      serialNumber: row.serial_number,
      soldAt: monthIso(row.sold_at),
      last15dGpv: numberOrNull(row.last_15d_gpv),
    })),
    monthly: monthly.map((row) => ({
      month: monthIso(row.month),
      gpv: Number(row.gpv ?? 0),
      trx: Number(row.trx ?? 0),
    })),
  };
}

async function latestMonthGpvByRuc(
  db: DatabaseExecutor,
  rucs: string[],
): Promise<Map<string, number>> {
  if (rucs.length === 0) return new Map();
  const month = await latestMonth(db);
  if (!month) return new Map();

  const rows = await withLatestMetric(db)
    .selectFrom("latest_metric as lm")
    .innerJoin("merchant_sales as s", "s.id", "lm.sale_id")
    .where("s.ruc", "in", rucs)
    .where("lm.month", "=", month)
    .select((eb) => ["s.ruc", eb.fn.sum("lm.gpv").as("gpv")])
    .groupBy("s.ruc")
    .execute();

  return new Map(rows.map((row) => [row.ruc, Number(row.gpv ?? 0)]));
}

async function latestMonth(db: DatabaseExecutor): Promise<string | null> {
  const row = await db
    .selectFrom("merchant_sale_metrics")
    .select((eb) => eb.fn.max("month").as("month"))
    .executeTakeFirst();
  return row?.month ? monthIso(row.month) : null;
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

function monthIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

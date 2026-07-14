import type { DatabaseExecutor } from "~/server/shared/db-executor";

import type { OrgMerchantStats } from "./contracts";
import { withLatestMetric } from "./latest-metric";

// The GPV picture on a merchant's own record, keyed by RUC (always present on
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
    .select(["id", "product", "serial_number", "sold_at", "m0_plus_15d_gpv"])
    .where("ruc", "=", ruc)
    .orderBy("sold_at", "desc")
    .execute();

  // Summed across offsets, so a RUC with devices sold in different months reads
  // as one line per calendar month rather than one per (month, cohort). See the
  // note on OrgMerchantStats.monthlyGpv for why this grain is sound here.
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
      soldAt: row.sold_at,
      m0Plus15dGpv: numberOrNull(row.m0_plus_15d_gpv),
    })),
    monthlyGpv: monthly.map((row) => ({
      month: row.month,
      gpv: Number(row.gpv ?? 0),
      trx: Number(row.trx ?? 0),
    })),
  };
}

function numberOrNull(value: unknown): number | null {
  return value == null ? null : Number(value);
}

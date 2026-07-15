import type { DatabaseExecutor } from "~/server/shared/db-executor";

import { saleIdentityKey } from "../intake/sale-identity";
import type { Rejection, SourceRow } from "../intake/types";

export interface SaleMonthPartition {
  accepted: SourceRow[];
  rejected: Rejection[];
}

// A sale's month is its cohort anchor: every gpv row it owns is filed under
// sale_month + offset. Restating it would move a device's whole history into
// different calendar months, and therefore move volume in and out of months
// someone has already been paid on.
//
// That is the same class of silent rewrite this pipeline exists to prevent, so
// it is not absorbed. The row is rejected and a human sees it. The composite
// foreign key on merchant_sale_gpv is the backstop: if this check is ever
// skipped, the database refuses the write rather than letting it through.
export async function partitionBySaleMonth(
  db: DatabaseExecutor,
  rows: readonly SourceRow[],
): Promise<SaleMonthPartition> {
  const known = await loadKnownSaleMonths(db, rows);

  const accepted: SourceRow[] = [];
  const rejected: Rejection[] = [];

  for (const row of rows) {
    const key = saleIdentityKey(row.merchantId, row.product, row.serialNumber);
    const knownMonth = known.get(key);

    if (knownMonth === undefined || knownMonth === row.saleMonth) {
      accepted.push(row);
      continue;
    }

    rejected.push({
      rowNumber: row.rowNumber,
      ruc: row.ruc,
      merchantId: row.merchantId,
      serialNumber: row.serialNumber,
      reason: `La venta ya está registrada con mes ${knownMonth}; el archivo dice ${row.saleMonth}. Mover el mes de una venta reasigna su GPV entre meses ya cerrados.`,
      raw: row.raw,
    });
  }

  return { accepted, rejected };
}

// Keyed by merchant, then narrowed in memory: the sale identity is an
// expression index (coalesce over serial_number), which an IN list cannot use.
async function loadKnownSaleMonths(
  db: DatabaseExecutor,
  rows: readonly SourceRow[],
): Promise<Map<string, string>> {
  const byIdentity = new Map<string, string>();
  const merchantIds = [...new Set(rows.map((row) => row.merchantId))];
  if (merchantIds.length === 0) return byIdentity;

  const existing = await db
    .selectFrom("merchant_sales")
    .select(["merchant_id", "product", "serial_number", "sale_month"])
    .where("merchant_id", "in", merchantIds)
    .execute();

  for (const sale of existing) {
    byIdentity.set(
      saleIdentityKey(sale.merchant_id, sale.product, sale.serial_number),
      sale.sale_month,
    );
  }
  return byIdentity;
}

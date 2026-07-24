import type { CalendarMonth } from "~/lib/time/calendar-date";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

import { saleIdentityKey } from "../intake/sale-identity";
import type { Rejection, SourceRow } from "../intake/types";
import { monthFromStorageDate } from "../storage-month";

export interface SaleMonthPartition {
  accepted: SourceRow[];
  rejected: Rejection[];
}

export async function partitionBySaleMonth(
  db: DatabaseExecutor,
  rows: readonly SourceRow[],
): Promise<SaleMonthPartition> {
  const knownSaleMonths = await loadKnownSaleMonths(db, rows);

  const accepted: SourceRow[] = [];
  const rejected: Rejection[] = [];

  for (const row of rows) {
    const key = saleIdentityKey(row.merchantId, row.product, row.serialNumber);
    const knownMonth = knownSaleMonths.get(key);

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

async function loadKnownSaleMonths(
  db: DatabaseExecutor,
  rows: readonly SourceRow[],
): Promise<Map<string, CalendarMonth>> {
  const byIdentity = new Map<string, CalendarMonth>();
  const merchantIds = [...new Set(rows.map((row) => row.merchantId))];

  if (merchantIds.length === 0) {
    return byIdentity;
  }

  const existing = await db
    .selectFrom("merchant_sales")
    .select(["merchant_id", "product", "serial_number", "sale_month"])
    .where("merchant_id", "in", merchantIds)
    .execute();

  for (const sale of existing) {
    const key = saleIdentityKey(
      sale.merchant_id,
      sale.product,
      sale.serial_number,
    );

    byIdentity.set(key, monthFromStorageDate(sale.sale_month));
  }

  return byIdentity;
}

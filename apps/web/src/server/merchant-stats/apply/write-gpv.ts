import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { MerchantReportId } from "~/server/shared/ids";

import { saleIdentityKey } from "../intake/sale-identity";
import type { SourceRow } from "../intake/types";
import { chunks } from "./chunks";
import type { SaleIdByIdentity } from "./write-sales";

const GPV_CHUNK = 4000;

export interface WriteGpvInput {
  reportId: MerchantReportId;
  cutAt: Date;
  rows: readonly SourceRow[];
  saleIds: SaleIdByIdentity;
}

// Writes the current GPV for every (sale, cohort offset) the report carries.
//
// The whole "latest snapshot wins" rule is the where clause below. Because a
// stale file is rejected at write time, reads are a plain select: no CTE, no
// DISTINCT ON, no per-request resolution of which snapshot is freshest.
//
// Ties on cut_at resolve to the incoming row (>=), so re-cutting at the same
// instant with corrected numbers lands rather than being silently ignored.
export async function upsertGpv(
  db: DatabaseExecutor,
  input: WriteGpvInput,
): Promise<void> {
  const values = input.rows.flatMap((row) => {
    const saleId = input.saleIds.get(
      saleIdentityKey(row.merchantId, row.product, row.serialNumber),
    );
    if (!saleId) return [];
    return row.gpv.map((observation) => ({
      sale_id: saleId,
      month_offset: observation.offset,
      // Copied from the sale so realized_month can be generated in the schema.
      // The composite foreign key pins it to the sale's own month, so the two
      // cannot disagree.
      sale_month: row.saleMonth,
      gpv: observation.gpv,
      trx: observation.trx,
      cut_at: input.cutAt,
      report_id: input.reportId,
    }));
  });

  for (const chunk of chunks(dedupe(values), GPV_CHUNK)) {
    // One transaction, one connection: awaiting here is not a cost, it is the
    // only option.
    // eslint-disable-next-line no-await-in-loop
    await db
      .insertInto("merchant_sale_gpv")
      .values(chunk)
      .onConflict((oc) =>
        oc
          .columns(["sale_id", "month_offset"])
          .doUpdateSet((eb) => ({
            gpv: eb.ref("excluded.gpv"),
            trx: eb.ref("excluded.trx"),
            cut_at: eb.ref("excluded.cut_at"),
            report_id: eb.ref("excluded.report_id"),
          }))
          // A late upload of an older snapshot must not shadow a newer one.
          .whereRef("excluded.cut_at", ">=", "merchant_sale_gpv.cut_at"),
      )
      .execute();
  }
}

// The same conflict target cannot appear twice in one statement. A file should
// not repeat a (sale, offset), but a repeated identity row would produce one.
function dedupe<T extends { sale_id: string; month_offset: number }>(
  values: readonly T[],
): T[] {
  const byKey = new Map<string, T>();
  for (const value of values) {
    byKey.set(`${value.sale_id}:${value.month_offset}`, value);
  }
  return [...byKey.values()];
}

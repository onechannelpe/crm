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

// Keeps the newest cut for each sale and cohort offset. Equal cuts replace the
// stored values so a corrected re-export is applied.
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
      sale_month: row.saleMonth,
      gpv: observation.gpv,
      trx: observation.trx,
      cut_at: input.cutAt,
      report_id: input.reportId,
    }));
  });

  for (const chunk of chunks(dedupe(values), GPV_CHUNK)) {
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
          // An older cut must not replace a newer snapshot.
          .whereRef("excluded.cut_at", ">=", "merchant_sale_gpv.cut_at"),
      )
      .execute();
  }
}

// Postgres cannot upsert the same conflict target twice in one statement.
function dedupe<T extends { sale_id: string; month_offset: number }>(
  values: readonly T[],
): T[] {
  const byKey = new Map<string, T>();
  for (const value of values) {
    byKey.set(`${value.sale_id}:${value.month_offset}`, value);
  }
  return [...byKey.values()];
}

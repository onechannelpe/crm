import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { MerchantReportId } from "~/server/shared/ids";

import { chunks } from "../chunks";
import { saleIdentityKey } from "../intake/sale-identity";
import type { SourceRow } from "../intake/types";
import type { SaleIdByIdentity } from "./write-sales";

const GPV_CHUNK_SIZE = 4000;

export interface WriteGpvInput {
  reportId: MerchantReportId;
  cutAt: Date;
  rows: readonly SourceRow[];
  saleIds: SaleIdByIdentity;
}

// Newer cuts win. Equal cuts overwrite so corrected re-exports are applied.
export async function upsertGpv(
  db: DatabaseExecutor,
  input: WriteGpvInput,
): Promise<void> {
  const values = input.rows.flatMap((row) => {
    const saleId = input.saleIds.get(
      saleIdentityKey(row.merchantId, row.product, row.serialNumber),
    );

    if (!saleId) {
      return [];
    }

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

  for (const chunk of chunks(dedupe(values), GPV_CHUNK_SIZE)) {
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

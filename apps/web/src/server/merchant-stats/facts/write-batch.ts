import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { MerchantReportId } from "~/server/shared/ids";

import type { RucMonth } from "../attribution/recompute";
import { chunks } from "../chunks";
import { addMonths } from "../intake/cells";
import type { Rejection, SourceRow } from "../intake/types";
import { partitionBySaleMonth } from "./sale-month-guard";
import { upsertGpv } from "./write-gpv";
import { upsertSales } from "./write-sales";

const REJECTION_CHUNK = 1000;

export interface WriteFactsInput {
  reportId: MerchantReportId;
  cutAt: Date;
  rows: readonly SourceRow[];
  now: Date;
}

export interface WrittenFacts {
  rowsApplied: number;
  rowsRejected: number;
  touched: RucMonth[];
}

export async function writeFactsBatch(
  db: DatabaseExecutor,
  input: WriteFactsInput,
): Promise<WrittenFacts> {
  const { accepted, rejected } = await partitionBySaleMonth(db, input.rows);

  await insertRejections(db, input.reportId, rejected);

  const saleIds = await upsertSales(db, input.reportId, accepted, input.now);

  await upsertGpv(db, {
    reportId: input.reportId,
    cutAt: input.cutAt,
    rows: accepted,
    saleIds,
  });

  return {
    rowsApplied: accepted.length,
    rowsRejected: rejected.length,
    touched: rucMonthsOf(accepted),
  };
}

export async function insertRejections(
  db: DatabaseExecutor,
  reportId: MerchantReportId,
  rejections: readonly Rejection[],
): Promise<void> {
  if (rejections.length === 0) return;

  const values = rejections.map((row) => ({
    report_id: reportId,
    row_number: row.rowNumber,
    ruc: row.ruc,
    merchant_id: row.merchantId,
    serial_number: row.serialNumber,
    reason: row.reason,
    raw: JSON.stringify(row.raw),
  }));

  for (const chunk of chunks(values, REJECTION_CHUNK)) {
    // eslint-disable-next-line no-await-in-loop
    await db
      .insertInto("merchant_report_rejections")
      .values(chunk)
      .onConflict((oc) => oc.columns(["report_id", "row_number"]).doNothing())
      .execute();
  }
}

// A sale contributes to every realized month in its GPV schedule.
function rucMonthsOf(rows: readonly SourceRow[]): RucMonth[] {
  const byKey = new Map<string, RucMonth>();

  for (const row of rows) {
    for (const observation of row.gpv) {
      const month = addMonths(row.saleMonth, observation.offset);
      byKey.set(`${row.ruc}:${month}`, { ruc: row.ruc, month });
    }
  }

  return [...byKey.values()];
}

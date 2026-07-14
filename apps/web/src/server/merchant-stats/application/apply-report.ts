import type { Transaction } from "kysely";

import type { Database } from "~/lib/db/types";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type {
  IntegrationJobId,
  MerchantSalesReportId,
  UserId,
} from "~/server/shared/ids";

import {
  saleIdentityKey,
  type InvalidGpvRow,
  type MappedGpvRow,
} from "../intake/contracts";
import { applyAccountEnrichment, backfillAccounts } from "./account-writer";
import { loadMatchContext, resolveRowMatch } from "./matching";
import {
  insertMetrics,
  upsertSales,
  type SaleIdByIdentity,
} from "./sales-writer";

export interface ApplyMerchantReportInput {
  jobId: IntegrationJobId;
  uploadedBy: UserId;
  cutDate: string;
  sourceFilename: string;
  hasEnrichment: boolean;
  validRows: MappedGpvRow[];
  invalidRows: InvalidGpvRow[];
  onProgress?: (progress: {
    rowsTotal: number;
    rowsApplied: number;
    rowsFailed: number;
  }) => void;
}

export interface ApplyMerchantReportResult {
  reportId: MerchantSalesReportId;
  rowsTotal: number;
  rowsApplied: number;
  rowsFailed: number;
  rowsMatched: number;
  rowsUnmatched: number;
}

const STAGING_CHUNK = 1000;

// Applies one uploaded snapshot in a single transaction: create the report,
// resolve matches in batch, upsert the durable sales, attach per-RUC
// enrichment (defaults for a raw file, file values for an enriched one), write
// the monthly metric facts, then stage every row for audit.
export async function applyMerchantReport(
  input: ApplyMerchantReportInput,
  ports: { executor: DatabaseExecutor; now: Date },
): Promise<ApplyMerchantReportResult> {
  const { executor, now } = ports;
  const rowsTotal = input.validRows.length + input.invalidRows.length;

  input.onProgress?.({ rowsTotal, rowsApplied: 0, rowsFailed: 0 });

  return executor.transaction().execute(async (trx) => {
    const reportId = await insertReport(trx, input, rowsTotal, now);

    const ctx = await loadMatchContext(trx, input.validRows);
    const saleIdByIdentity = await upsertSales(
      trx,
      reportId,
      input.validRows,
      ctx,
      now,
    );

    if (input.hasEnrichment) {
      await applyAccountEnrichment(trx, input.validRows, ctx, now);
    } else {
      await backfillAccounts(trx, input.validRows, ctx, now);
    }

    await insertMetrics(trx, reportId, input.validRows, saleIdByIdentity);

    const matched = countMatched(ctx, input.validRows);
    await stageRows(trx, reportId, input, ctx, saleIdByIdentity, now);
    await trx
      .updateTable("merchant_sales_reports")
      .set({
        rows_matched: matched,
        rows_unmatched: input.validRows.length - matched,
      })
      .where("id", "=", reportId)
      .execute();

    input.onProgress?.({
      rowsTotal,
      rowsApplied: input.validRows.length,
      rowsFailed: input.invalidRows.length,
    });

    return {
      reportId,
      rowsTotal,
      rowsApplied: input.validRows.length,
      rowsFailed: input.invalidRows.length,
      rowsMatched: matched,
      rowsUnmatched: input.validRows.length - matched,
    };
  });
}

async function insertReport(
  trx: Transaction<Database>,
  input: ApplyMerchantReportInput,
  rowsTotal: number,
  now: Date,
): Promise<MerchantSalesReportId> {
  const report = await trx
    .insertInto("merchant_sales_reports")
    .values({
      job_id: input.jobId,
      cut_date: input.cutDate,
      source_filename: input.sourceFilename,
      uploaded_by: input.uploadedBy,
      rows_total: rowsTotal,
      rows_matched: 0,
      rows_unmatched: 0,
      created_at: now,
    })
    .returning("id")
    .executeTakeFirstOrThrow();
  return report.id;
}

async function stageRows(
  trx: Transaction<Database>,
  reportId: MerchantSalesReportId,
  input: ApplyMerchantReportInput,
  ctx: Awaited<ReturnType<typeof loadMatchContext>>,
  saleIdByIdentity: SaleIdByIdentity,
  now: Date,
): Promise<void> {
  const values = [
    ...input.validRows.map((row) => {
      const matched = resolveRowMatch(ctx, row).organizationId !== null;
      return {
        report_id: reportId,
        row_number: row.rowNumber,
        ruc: row.ruc,
        merchant_id: row.merchantId,
        serial_number: row.serialNumber,
        state: matched ? ("applied" as const) : ("applied_unmatched" as const),
        merchant_sale_id:
          saleIdByIdentity.get(
            saleIdentityKey(row.merchantId, row.product, row.serialNumber),
          ) ?? null,
        failure_reason: null,
        raw_row: JSON.stringify(row.raw),
        created_at: now,
      };
    }),
    ...input.invalidRows.map((row) => ({
      report_id: reportId,
      row_number: row.rowNumber,
      ruc: row.ruc,
      merchant_id: row.merchantId,
      serial_number: row.serialNumber,
      state: "invalid" as const,
      merchant_sale_id: null,
      failure_reason: row.reason,
      raw_row: JSON.stringify(row.raw),
      created_at: now,
    })),
  ];

  for (let index = 0; index < values.length; index += STAGING_CHUNK) {
    // eslint-disable-next-line no-await-in-loop
    await trx
      .insertInto("merchant_sales_import_rows")
      .values(values.slice(index, index + STAGING_CHUNK))
      .execute();
  }
}

function countMatched(
  ctx: Awaited<ReturnType<typeof loadMatchContext>>,
  rows: readonly MappedGpvRow[],
): number {
  let matched = 0;
  for (const row of rows) {
    if (resolveRowMatch(ctx, row).organizationId !== null) matched++;
  }
  return matched;
}

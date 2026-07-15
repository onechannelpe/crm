import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { IntegrationJobId, MerchantReportId } from "~/server/shared/ids";

import { loadAttributionContext } from "../attribution/context";
import type { ParsedReport, Rejection } from "../intake/types";
import { chunks } from "./chunks";
import { partitionBySaleMonth } from "./sale-month-guard";
import { stampAttribution } from "./write-attribution";
import { upsertGpv } from "./write-gpv";
import { upsertSales } from "./write-sales";

export interface ReportForJob {
  id: MerchantReportId;
  storageKey: string;
  cutAt: Date;
}

// The provenance a job needs to replay its own file: where the bytes are and
// which cut they were taken at. Both were settled when the upload was accepted.
export async function findReportForJob(
  db: DatabaseExecutor,
  jobId: IntegrationJobId,
): Promise<ReportForJob | null> {
  const report = await db
    .selectFrom("merchant_reports")
    .select(["id", "storage_key", "cut_at"])
    .where("job_id", "=", jobId)
    .executeTakeFirst();

  if (!report) return null;
  return {
    id: report.id,
    storageKey: report.storage_key,
    cutAt: report.cut_at,
  };
}

export interface ApplyReportInput {
  // The report row was created when the file was accepted, so it already holds
  // the provenance. Only what the writes actually need is passed down.
  reportId: MerchantReportId;
  cutAt: Date;
  parsed: ParsedReport;
}

export interface ApplyReportResult {
  rowsTotal: number;
  rowsValid: number;
  rowsRejected: number;
  conflicts: number;
  needsReview: number;
}

export interface ApplyReportPorts {
  db: DatabaseExecutor;
  now: Date;
}

// Applies one snapshot in a single transaction: rejections, sales, gpv, credit.
//
// No rollup step (the monthly view derives it) and no target step (the dealer
// file carries no projection). No duplicate check either: the same bytes cannot
// reach here twice, because merchant_reports.content_sha256 is UNIQUE and the
// row is inserted when the upload is accepted. Re-running a job is harmless --
// every write below is an upsert keyed on the same identity.
export async function applyReport(
  input: ApplyReportInput,
  ports: ApplyReportPorts,
): Promise<ApplyReportResult> {
  if (ports.db.isTransaction) return applyInTransaction(input, ports);

  return ports.db
    .transaction()
    .execute((trx) => applyInTransaction(input, { db: trx, now: ports.now }));
}

async function applyInTransaction(
  input: ApplyReportInput,
  ports: ApplyReportPorts,
): Promise<ApplyReportResult> {
  const { db, now } = ports;
  const { parsed, reportId } = input;
  const rowsTotal = parsed.rows.length + parsed.rejections.length;

  const { accepted, rejected } = await partitionBySaleMonth(db, parsed.rows);
  const rejections = [...parsed.rejections, ...rejected];

  await insertRejections(db, reportId, rejections);

  const saleIds = await upsertSales(db, reportId, accepted, now);
  await upsertGpv(db, {
    reportId,
    cutAt: input.cutAt,
    rows: accepted,
    saleIds,
  });

  const ctx = await loadAttributionContext(db, accepted);
  const stamped = await stampAttribution(db, ctx, accepted, now);

  await db
    .updateTable("merchant_reports")
    .set({
      rows_total: rowsTotal,
      rows_valid: accepted.length,
      rows_rejected: rejections.length,
    })
    .where("id", "=", reportId)
    .execute();

  return {
    rowsTotal,
    rowsValid: accepted.length,
    rowsRejected: rejections.length,
    conflicts: stamped.conflicts,
    needsReview: stamped.needsReview,
  };
}

const REJECTION_CHUNK = 1000;

// Only the rows that did not land. The valid ones are already in merchant_sales,
// and the stored .xlsx is the archival copy of the whole file.
async function insertRejections(
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
    // One transaction, one connection: awaiting here is not a cost, it is the
    // only option.
    // eslint-disable-next-line no-await-in-loop
    await db
      .insertInto("merchant_report_rejections")
      .values(chunk)
      .onConflict((oc) => oc.columns(["report_id", "row_number"]).doNothing())
      .execute();
  }
}

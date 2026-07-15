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

// Applies one accepted snapshot atomically. Device facts are upserted, GPV keeps
// the newest cut, and unresolved attribution can gain newly available evidence.
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
    // eslint-disable-next-line no-await-in-loop
    await db
      .insertInto("merchant_report_rejections")
      .values(chunk)
      .onConflict((oc) => oc.columns(["report_id", "row_number"]).doNothing())
      .execute();
  }
}

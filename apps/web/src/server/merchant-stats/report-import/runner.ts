import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { MerchantReportImportId } from "~/server/shared/ids";
import { isErr } from "~/server/shared/result";

import { recomputeAttribution } from "../attribution/recompute";
import { batchByRuc } from "../facts/batch-by-ruc";
import { insertRejections, writeFactsBatch } from "../facts/write-batch";
import { parseReport } from "../intake/parse-report";
import type { MerchantReportImportRow } from "./repo";

// Keep each RUC in one transaction while limiting batch size.
const FACTS_BATCH_TARGET_ROWS = 2000;

export interface MerchantReportProgress {
  rowsTotal: number;
  rowsApplied: number;
  rowsFailed: number;
}

interface MerchantReportProcessResult extends MerchantReportProgress {
  resultsJson: string;
}

export function createMerchantReportRunner(deps: {
  db: DatabaseExecutor;
  now: () => Date;
  readFile: (filePath: string) => Promise<Uint8Array>;
  reportProgress: (
    id: MerchantReportImportId,
    progress: MerchantReportProgress,
  ) => Promise<unknown>;
}) {
  const { db, now, readFile, reportProgress } = deps;

  return {
    async process(
      job: MerchantReportImportRow,
      signal: AbortSignal,
    ): Promise<MerchantReportProcessResult> {
      const report = await db
        .selectFrom("merchant_reports")
        .select(["id", "storage_key", "cut_at"])
        .where("id", "=", job.report_id)
        .executeTakeFirstOrThrow();

      const bytes = await readFile(report.storage_key);
      const parsed = parseReport(bytes, { cutAt: report.cut_at });

      if (isErr(parsed)) {
        throw new Error(`Unreadable GPV workbook: ${parsed.error.code}`);
      }

      const { rows, rejections } = parsed.value;

      // Rejections have no RUC, so they are written outside the batch loop.
      await insertRejections(db, report.id, rejections);

      const progress: MerchantReportProgress = {
        rowsTotal: rows.length + rejections.length,
        rowsApplied: 0,
        rowsFailed: rejections.length,
      };

      await reportProgress(job.id, progress);

      let conflicts = 0;
      let needsReview = 0;

      for (const batch of batchByRuc(rows, FACTS_BATCH_TARGET_ROWS)) {
        if (signal.aborted) {
          throw new Error("Job aborted");
        }

        // eslint-disable-next-line no-await-in-loop
        const applied = await db.transaction().execute(async (trx) => {
          const written = await writeFactsBatch(trx, {
            reportId: report.id,
            cutAt: report.cut_at,
            rows: batch,
            now: now(),
          });

          const derived = await recomputeAttribution(
            trx,
            written.touched,
            now(),
          );

          return { written, derived };
        });

        progress.rowsApplied += applied.written.rowsApplied;
        progress.rowsFailed += applied.written.rowsRejected;
        conflicts += applied.derived.conflicts;
        needsReview += applied.derived.needsReview;

        // eslint-disable-next-line no-await-in-loop
        await reportProgress(job.id, progress);
      }

      return {
        ...progress,
        resultsJson: JSON.stringify({
          reportId: report.id,
          conflicts,
          needsReview,
        }),
      };
    },
  };
}

export type MerchantReportRunner = ReturnType<
  typeof createMerchantReportRunner
>;

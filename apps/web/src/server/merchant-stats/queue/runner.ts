import type { IntegrationJobRow } from "~/server/integrations/types";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { IntegrationJobId } from "~/server/shared/ids";
import { isErr } from "~/server/shared/result";

import { applyReport, findReportForJob } from "../apply/apply-report";
import { parseReport } from "../intake/parse-report";

export interface MerchantReportProcessResult {
  rowsTotal: number;
  rowsApplied: number;
  rowsFailed: number;
  resultsJson: string;
}

export function createMerchantReportRunner(deps: {
  db: DatabaseExecutor;
  now: () => Date;
  readFile: (filePath: string) => Promise<Uint8Array>;
  updateProgress: (input: {
    jobId: IntegrationJobId;
    rowsTotal?: number;
    rowsApplied?: number;
    rowsFailed?: number;
  }) => Promise<unknown>;
}) {
  const { db, now, readFile, updateProgress } = deps;

  return {
    // Parse the original workbook in the queue so decoder fixes can replay its bytes.
    async process(
      job: IntegrationJobRow,
      signal: AbortSignal,
    ): Promise<MerchantReportProcessResult> {
      if (job.type !== "import_gpv") {
        throw new Error(`Unsupported import type: ${job.type}`);
      }

      const report = await findReportForJob(db, job.id);
      if (!report) throw new Error(`No merchant report for job ${job.id}`);

      const bytes = await readFile(report.storageKey);
      const parsed = parseReport(toArrayBuffer(bytes), { cutAt: report.cutAt });
      if (isErr(parsed)) {
        throw new Error(`Unreadable GPV workbook: ${parsed.error.code}`);
      }

      const rowsTotal =
        parsed.value.rows.length + parsed.value.rejections.length;
      await updateProgress({
        jobId: job.id,
        rowsTotal,
        rowsApplied: 0,
        rowsFailed: 0,
      });

      if (signal.aborted) throw new Error("Job aborted");

      const result = await applyReport(
        { reportId: report.id, cutAt: report.cutAt, parsed: parsed.value },
        { db, now: now() },
      );

      if (signal.aborted) throw new Error("Job aborted after processing");

      await updateProgress({
        jobId: job.id,
        rowsTotal: result.rowsTotal,
        rowsApplied: result.rowsValid,
        rowsFailed: result.rowsRejected,
      });

      return {
        rowsTotal: result.rowsTotal,
        rowsApplied: result.rowsValid,
        rowsFailed: result.rowsRejected,
        resultsJson: JSON.stringify({
          reportId: report.id,
          conflicts: result.conflicts,
          needsReview: result.needsReview,
        }),
      };
    },
  };
}

// A Node Buffer's backing store can exceed the view. Keep only this view's bytes.
function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const { buffer, byteOffset, byteLength } = bytes;
  if (buffer instanceof ArrayBuffer) {
    return buffer.slice(byteOffset, byteOffset + byteLength);
  }
  // SharedArrayBuffer-backed view: fall back to an explicit copy.
  const copy = new Uint8Array(byteLength);
  copy.set(bytes);
  return copy.buffer;
}

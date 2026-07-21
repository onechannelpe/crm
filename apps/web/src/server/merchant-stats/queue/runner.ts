import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { MerchantReportImportId } from "~/server/shared/ids";
import { isErr } from "~/server/shared/result";

import { applyReport } from "../apply/apply-report";
import { parseReport } from "../intake/parse-report";
import type { MerchantReportImportRow } from "./import-repo";

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
  updateProgress: (
    id: MerchantReportImportId,
    progress: {
      rowsTotal: number;
      rowsApplied: number;
      rowsFailed: number;
    },
  ) => Promise<unknown>;
}) {
  const { db, now, readFile, updateProgress } = deps;

  return {
    // Parse the original workbook so decoder fixes can replay the stored bytes.
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
      const parsed = parseReport(toArrayBuffer(bytes), {
        cutAt: report.cut_at,
      });

      if (isErr(parsed)) {
        throw new Error(`Unreadable GPV workbook: ${parsed.error.code}`);
      }

      await updateProgress(job.id, {
        rowsTotal: parsed.value.rows.length + parsed.value.rejections.length,
        rowsApplied: 0,
        rowsFailed: 0,
      });

      if (signal.aborted) {
        throw new Error("Job aborted");
      }

      const result = await applyReport(
        {
          reportId: report.id,
          cutAt: report.cut_at,
          parsed: parsed.value,
        },
        {
          db,
          now: now(),
        },
      );

      if (signal.aborted) {
        throw new Error("Job aborted after processing");
      }

      await updateProgress(job.id, {
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

export type MerchantReportRunner = ReturnType<
  typeof createMerchantReportRunner
>;

// A Buffer's backing store can contain bytes outside this view.
function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const { buffer, byteOffset, byteLength } = bytes;

  if (buffer instanceof ArrayBuffer) {
    return buffer.slice(byteOffset, byteOffset + byteLength);
  }

  const copy = new Uint8Array(byteLength);
  copy.set(bytes);

  return copy.buffer;
}

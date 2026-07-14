import type { IntegrationJobRow } from "~/server/integrations/types";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { IntegrationJobId } from "~/server/shared/ids";

import { applyMerchantReport } from "../application/apply-report";
import type { InvalidGpvRow, MappedGpvRow } from "../intake/contracts";

// The upload action parses the workbook and stores this payload as JSON; the
// runner only applies it, so a heavy parse never blocks the request.
export interface StoredGpvReport {
  cutDate: string;
  sourceFilename: string;
  hasEnrichment: boolean;
  validRows: MappedGpvRow[];
  invalidRows: InvalidGpvRow[];
}

export interface MerchantReportProcessResult {
  rowsTotal: number;
  rowsApplied: number;
  rowsFailed: number;
  resultsJson: string;
}

export function createMerchantReportRunner(deps: {
  executor: DatabaseExecutor;
  now: () => Date;
  readFile: (filePath: string) => Promise<Uint8Array>;
  updateProgress: (input: {
    jobId: IntegrationJobId;
    rowsTotal?: number;
    rowsApplied?: number;
    rowsFailed?: number;
  }) => Promise<unknown>;
}) {
  const { executor, now, readFile, updateProgress } = deps;

  return {
    async process(
      job: IntegrationJobRow,
      signal: AbortSignal,
    ): Promise<MerchantReportProcessResult> {
      if (!job.file_path) {
        throw new Error("Missing file path for GPV import job");
      }
      if (job.type !== "import_gpv") {
        throw new Error(`Unsupported import type: ${job.type}`);
      }

      const bytes = await readFile(job.file_path);
      const stored: StoredGpvReport = JSON.parse(
        new TextDecoder().decode(bytes),
      );
      const rowsTotal = stored.validRows.length + stored.invalidRows.length;

      await updateProgress({
        jobId: job.id,
        rowsTotal,
        rowsApplied: 0,
        rowsFailed: 0,
      });

      if (signal.aborted) throw new Error("Job aborted");

      const result = await applyMerchantReport(
        {
          jobId: job.id,
          uploadedBy: job.requested_by_user_id,
          cutDate: stored.cutDate,
          sourceFilename: stored.sourceFilename,
          hasEnrichment: stored.hasEnrichment,
          validRows: stored.validRows,
          invalidRows: stored.invalidRows,
          onProgress: (progress) => {
            void updateProgress({ jobId: job.id, ...progress });
          },
        },
        { executor, now: now() },
      );

      if (signal.aborted) throw new Error("Job aborted after processing");

      return {
        rowsTotal: result.rowsTotal,
        rowsApplied: result.rowsApplied,
        rowsFailed: result.rowsFailed,
        resultsJson: JSON.stringify({
          reportId: result.reportId,
          rowsMatched: result.rowsMatched,
          rowsUnmatched: result.rowsUnmatched,
        }),
      };
    },
  };
}

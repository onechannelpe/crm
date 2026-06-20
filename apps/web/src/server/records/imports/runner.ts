import { applyImportRows } from "~/server/integrations/application/import/apply-service";
import type { ImportRowInput } from "~/server/integrations/application/import/types";
import type { IntegrationJobRow } from "~/server/integrations/types";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

import type { RecordImportInvalidRow } from "./intake/row-mapper";
import {
  buildRecordImportProgressEvent,
  publishRecordImportProgress,
} from "./progress-events";

interface StoredRows {
  validRows: ImportRowInput[];
  invalidRows: RecordImportInvalidRow[];
}

export function createRecordImportRunner(deps: {
  executor: DatabaseExecutor;
  readFile: (filePath: string) => Promise<Uint8Array>;
  updateProgress: (input: {
    jobId: string;
    rowsTotal?: number;
    rowsApplied?: number;
    rowsFailed?: number;
  }) => Promise<unknown>;
}) {
  const { executor, readFile, updateProgress } = deps;

  return {
    async process(
      job: IntegrationJobRow,
      signal: AbortSignal,
    ): Promise<{
      rowsTotal: number;
      rowsApplied: number;
      rowsFailed: number;
      resultsJson: string;
    }> {
      if (!job.file_path) {
        throw new Error("Missing file path for import job");
      }

      if (job.type !== "import_status" && job.type !== "import_prioridad") {
        throw new Error(`Unsupported import type: ${job.type}`);
      }

      const bytes = await readFile(job.file_path);
      const { validRows, invalidRows }: StoredRows = JSON.parse(
        new TextDecoder().decode(bytes),
      );
      const rowsTotal = validRows.length + invalidRows.length;

      await updateProgress({
        jobId: job.id,
        rowsTotal,
        rowsApplied: 0,
        rowsFailed: 0,
      });
      publishRecordImportProgress(
        buildRecordImportProgressEvent({
          job,
          status: "PROCESSING",
          rowsTotal,
          rowsApplied: 0,
          rowsFailed: 0,
          errorMessage: null,
        }),
      );

      if (signal.aborted) throw new Error("Job aborted");

      const applied = await applyImportRows(
        {
          jobId: job.id,
          actorId: job.requested_by_user_id,
          validRows,
          invalidRows,
          onProgress: (progress) => {
            publishRecordImportProgress(
              buildRecordImportProgressEvent({
                job,
                status: "PROCESSING",
                rowsTotal: progress.rowsTotal,
                rowsApplied: progress.rowsApplied,
                rowsFailed: progress.rowsFailed,
                errorMessage: null,
              }),
            );
          },
        },
        executor,
      );

      await updateProgress({
        jobId: job.id,
        rowsTotal,
        rowsApplied: applied.applied,
        rowsFailed: applied.failed,
      });

      if (signal.aborted) throw new Error("Job aborted after processing");

      return {
        rowsTotal,
        rowsApplied: applied.applied,
        rowsFailed: applied.failed,
        resultsJson: JSON.stringify(applied.results),
      };
    },
  };
}

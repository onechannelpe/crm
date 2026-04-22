import { TextDecoder } from "node:util";

import type { FileStorage } from "~/server/files/storage";
import { applyImportRows } from "~/server/integrations/application/import/apply-service";
import type { IntegrationJobRow } from "~/server/integrations/types";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

import { parseLeadImportRows } from "./intake";
import {
  buildLeadImportProgressEvent,
  publishLeadImportProgress,
} from "./progress-events";

export function createLeadImportRunner(deps: {
  executor: DatabaseExecutor;
  blobStore: Pick<FileStorage, "getBytes">;
  updateProgress: (input: {
    jobId: number;
    rowsTotal?: number;
    rowsApplied?: number;
    rowsFailed?: number;
  }) => Promise<unknown>;
}) {
  const { executor, blobStore, updateProgress } = deps;

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

      const fileText = new TextDecoder("utf-8").decode(
        await blobStore.getBytes(job.file_path),
      );
      if (signal.aborted) {
        throw new Error("Job aborted");
      }

      if (job.type !== "import_status" && job.type !== "import_prioridad") {
        throw new Error(`Unsupported import type: ${job.type}`);
      }

      const { validRows, invalidRows } = parseLeadImportRows({
        csvText: fileText,
        importType: job.type,
      });

      const rowsTotal = validRows.length + invalidRows.length;
      await updateProgress({
        jobId: job.id,
        rowsTotal,
        rowsApplied: 0,
        rowsFailed: 0,
      });
      await publishLeadImportProgress(
        buildLeadImportProgressEvent({
          job,
          status: "PROCESSING",
          rowsTotal,
          rowsApplied: 0,
          rowsFailed: 0,
          errorMessage: null,
        }),
      );

      const applied = await applyImportRows(
        {
          jobId: job.id,
          actorId: job.requested_by_user_id,
          validRows,
          invalidRows,
          onProgress: (progress) => {
            void publishLeadImportProgress(
              buildLeadImportProgressEvent({
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

      if (signal.aborted) {
        throw new Error("Job aborted after processing");
      }

      return {
        rowsTotal,
        rowsApplied: applied.applied,
        rowsFailed: applied.failed,
        resultsJson: JSON.stringify(applied.results),
      };
    },
  };
}

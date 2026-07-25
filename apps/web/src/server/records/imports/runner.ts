import type { IntegrationJobId } from "~/domain/ids";
import { applyImportRows } from "~/server/integrations/application/import/apply-service";
import type { ImportRowInput } from "~/server/integrations/application/import/types";
import type { IntegrationJobRow } from "~/server/integrations/types";
import type { DatabaseExecutor } from "~/server/platform/database/executor";

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
  now: () => Date;
  readFile: (filePath: string) => Promise<Uint8Array>;
  reportProgress: (
    jobId: IntegrationJobId,
    progress: {
      rowsTotal: number;
      rowsApplied: number;
      rowsFailed: number;
    },
  ) => Promise<unknown>;
}) {
  const { executor, now, readFile, reportProgress } = deps;

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

      const bytes = await readFile(job.file_path);
      const { validRows, invalidRows }: StoredRows = JSON.parse(
        new TextDecoder().decode(bytes),
      );
      const rowsTotal = validRows.length + invalidRows.length;

      await reportProgress(job.id, {
        rowsTotal,
        rowsApplied: 0,
        rowsFailed: 0,
      });

      if (signal.aborted) {
        throw new Error("Job aborted");
      }

      const startedAt = now();
      const applied = await applyImportRows(
        {
          jobId: job.id,
          actorId: job.requested_by_user_id,
          validRows,
          invalidRows,

          // Stream in-flight counts; only the initial and final counts are persisted.
          onProgress: (progress) => {
            publishRecordImportProgress({
              ...buildRecordImportProgressEvent(job),
              ...progress,
            });
          },
        },
        { executor, now: startedAt },
      );

      await reportProgress(job.id, {
        rowsTotal,
        rowsApplied: applied.applied,
        rowsFailed: applied.failed,
      });

      return {
        rowsTotal,
        rowsApplied: applied.applied,
        rowsFailed: applied.failed,
        resultsJson: JSON.stringify(applied.results),
      };
    },
  };
}

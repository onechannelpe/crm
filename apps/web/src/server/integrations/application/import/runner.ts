import { TextDecoder } from "node:util";

import { JOB_CHANNELS } from "~/lib/job-queue/channels";
import { publishJob } from "~/lib/redis/publisher";
import type { FileStorage } from "~/server/files/storage";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

import type {
  ImportBatchRunner,
  ImportJobProcessResult,
  IntegrationJobRow,
} from "../../types";
import { applyImportRows } from "./apply-service";
import { parseImportRows } from "./parse";

export function createImportBatchRunner(deps: {
  executor: DatabaseExecutor;
  blobStore: Pick<FileStorage, "getBytes">;
}): ImportBatchRunner {
  const { executor, blobStore } = deps;
  return {
    async processJob(
      job: IntegrationJobRow,
      signal: AbortSignal,
    ): Promise<ImportJobProcessResult> {
      if (!job.file_path) {
        throw new Error("Missing file path for import job");
      }

      const text = new TextDecoder("utf-8").decode(
        await blobStore.getBytes(job.file_path),
      );
      if (signal.aborted) {
        throw new Error("Job aborted");
      }

      const { validRows, invalidRows } = parseImportRows(job, text);
      const applied = await applyImportRows(
        {
          jobId: job.id,
          actorId: job.requested_by_user_id,
          validRows,
          invalidRows,
        },
        executor,
      );
      await publishJob(
        JOB_CHANNELS.INTEGRATION_OUTBOX_NEEDS_EXECUTIVE_INPUT,
        job.id,
      );
      await publishJob(
        JOB_CHANNELS.INTEGRATION_OUTBOX_READY_FOR_QUOTATION,
        job.id,
      );

      if (signal.aborted) {
        throw new Error("Job aborted after processing");
      }

      return {
        rowsTotal: validRows.length + invalidRows.length,
        rowsApplied: applied.applied,
        rowsFailed: applied.failed,
        resultsJson: JSON.stringify(applied.results),
      };
    },
  };
}

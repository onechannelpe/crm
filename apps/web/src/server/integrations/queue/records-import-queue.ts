import { createJobQueue } from "~/server/platform/jobs/job-queue";
import {
  buildRecordImportProgressEvent,
  publishRecordImportProgress,
} from "~/server/records/imports/progress-events";
import { createRecordImportRunner } from "~/server/records/imports/runner";

import type {
  ImportJobProcessResult,
  IntegrationJobRow,
  IntegrationRuntime,
} from "../types";

interface RecordImportRunner {
  process(
    job: IntegrationJobRow,
    signal: AbortSignal,
  ): Promise<ImportJobProcessResult>;
}

interface RecordsImportQueueDeps {
  runtime: IntegrationRuntime;
  readFile: (filePath: string) => Promise<Uint8Array>;
  runner?: RecordImportRunner;
}

export function createRecordsImportQueue(
  workerId: string,
  deps: RecordsImportQueueDeps,
) {
  const leaseMs = 30_000;
  const { runtime } = deps;

  const runner =
    deps.runner ??
    createRecordImportRunner({
      executor: runtime.executor,
      readFile: deps.readFile,
      reportProgress: async (jobId, progress) => {
        const persisted = await runtime.jobs.updateProgress(jobId, progress);

        publishRecordImportProgress(
          runtime.executor,
          buildRecordImportProgressEvent(persisted),
        );
      },
    });

  return createJobQueue<IntegrationJobRow>({
    name: "records-import",
    leaseMs,
    workerId,
    store: runtime.jobs.store,

    handle: async (job, signal, claimedAt) => {
      const result = await runner.process(job, signal, claimedAt);

      // The queue store writes queue_state and completed_at.
      return {
        kind: "done",
        patch: {
          rows_total: result.rowsTotal,
          rows_applied: result.rowsApplied,
          rows_failed: result.rowsFailed,
          results_json: result.resultsJson,
        },
      };
    },

    onSettled: async (job) => {
      const settled = await runtime.jobs.findById(job.id);

      if (!settled) {
        return;
      }

      publishRecordImportProgress(
        runtime.executor,
        buildRecordImportProgressEvent(settled),
      );
    },
  });
}

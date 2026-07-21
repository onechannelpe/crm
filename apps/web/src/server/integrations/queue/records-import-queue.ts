import { createJobQueue } from "~/lib/job-queue/job-queue";
import type { QueueState } from "~/lib/job-queue/job-store";
import {
  buildRecordImportProgressEvent,
  publishRecordImportProgress,
} from "~/server/records/imports/progress-events";
import { createRecordImportRunner } from "~/server/records/imports/runner";
import type { IntegrationJobId } from "~/server/shared/ids";

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
      executor: deps.runtime.executor,
      now: deps.runtime.now,
      readFile: deps.readFile,
      updateProgress: (progress) =>
        runtime.jobs.updateProgress(progress.jobId, progress),
    });

  async function publishImportProgress(
    id: IntegrationJobId,
    queueState: QueueState,
    errorMessage: string | null,
  ): Promise<void> {
    const job = await runtime.jobs.findById(id);

    if (!job) return;

    publishRecordImportProgress(
      buildRecordImportProgressEvent({
        job,
        queueState,
        rowsApplied: job.rows_applied ?? undefined,
        rowsFailed: job.rows_failed ?? undefined,
        rowsTotal: job.rows_total ?? undefined,
        errorMessage,
      }),
    );
  }

  return createJobQueue<IntegrationJobRow>({
    name: "records-import",
    leaseMs,
    now: runtime.now,
    workerId,
    store: runtime.jobs.store,
    handle: async (job, signal: AbortSignal) => {
      const result = await runner.process(job, signal);

      // The queue store owns queue_state and completed_at. Only persist the import results here.
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
    onSettled: async (job, outcome) => {
      if (outcome.kind === "done") {
        await publishImportProgress(job.id, "done", null);
      } else if (outcome.kind === "retry") {
        await publishImportProgress(job.id, "pending", null);
      } else {
        await publishImportProgress(job.id, "failed", outcome.reason);
      }
    },
  });
}

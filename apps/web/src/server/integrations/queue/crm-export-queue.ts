import { createJobQueue } from "~/lib/job-queue/job-queue";

import { createExportBatchRunner } from "../application/run-export-job";
import type { JobBlobStore } from "../job-blob-store";
import type {
  ExportBatchRunner,
  ExportJobProcessResult,
  IntegrationRuntime,
} from "../types";

interface CrmExportQueueDeps {
  runtime: IntegrationRuntime;
  blobStore: JobBlobStore;
  runner?: ExportBatchRunner;
}

export function createCrmExportQueue(
  workerId: string,
  deps: CrmExportQueueDeps,
) {
  const leaseMs = 30_000;
  const batchSize = 10;
  const { runtime } = deps;
  const runner =
    deps.runner ??
    createExportBatchRunner({
      runtime: deps.runtime,
      blobStore: deps.blobStore,
    });

  return createJobQueue({
    name: "crm-export",
    leaseMs,
    batchSize,
    poll: (limit: number) =>
      runtime.jobs.claimPending(leaseMs, workerId, limit, ["export"]),
    handle: (job, signal: AbortSignal) => runner.processJob(job, signal),
    extendLease: (id: number) =>
      runtime.jobs.extendLease(id, workerId, leaseMs),
    onComplete: async (id: number, result: ExportJobProcessResult) => {
      await runtime.jobs.markCompleted(id, {
        rowsTotal: result.rowsTotal,
        rowsApplied: result.rowsApplied,
        rowsFailed: result.rowsFailed,
        resultsJson: result.resultsJson,
      });
    },
    onRetry: async (id: number, availableAt: number) => {
      await runtime.jobs.scheduleRetry(id, availableAt);
    },
    onFail: async (id: number, reason: string) => {
      await runtime.jobs.markFailed(id, reason);
    },
  });
}

import { createJobQueue } from "~/lib/job-queue/job-queue";
import type { FileStorage } from "~/server/files/storage";

import { createImportBatchRunner } from "../application/import/runner";
import type {
  ImportBatchRunner,
  ImportJobProcessResult,
  IntegrationRuntime,
} from "../types";

interface CrmImportQueueDeps {
  runtime: IntegrationRuntime;
  blobStore: Pick<FileStorage, "get">;
  runner?: ImportBatchRunner;
}

export function createCrmImportQueue(
  workerId: string,
  deps: CrmImportQueueDeps,
) {
  const leaseMs = 30_000;
  const batchSize = 10;
  const { runtime } = deps;
  const runner =
    deps.runner ??
    createImportBatchRunner({
      executor: deps.runtime.executor,
      blobStore: deps.blobStore,
    });

  return createJobQueue({
    name: "crm-import",
    leaseMs,
    batchSize,
    poll: (limit: number) =>
      runtime.jobs.claimPending(leaseMs, workerId, limit, [
        "import_status",
        "import_prioridad",
      ]),
    handle: (job, signal: AbortSignal) => runner.processJob(job, signal),
    extendLease: (id: number) =>
      runtime.jobs.extendLease(id, workerId, leaseMs),
    onComplete: async (id: number, result: ImportJobProcessResult) => {
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

import { createJobQueue } from "~/lib/job-queue/job-queue";

import { createImportBatchRunner } from "../application/import/runner";
import type {
  ImportBatchRunner,
  ImportJobProcessResult,
  IntegrationRuntime,
} from "../types";

interface CrmImportQueueDeps {
  runtime: IntegrationRuntime;
  runner?: ImportBatchRunner;
}

export function createCrmImportQueue(
  workerId: string,
  deps: CrmImportQueueDeps,
) {
  const leaseMs = 30_000;
  const batchSize = 10;
  const runtime = deps.runtime;
  const runner = deps.runner ?? createImportBatchRunner();

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

import { createJobQueue } from "~/lib/job-queue/job-queue";
import type {
  IntegrationJobRow,
  IntegrationRuntime,
} from "~/server/integrations/types";

import { createMerchantReportRunner } from "./runner";

interface MerchantReportRunner {
  process(
    job: IntegrationJobRow,
    signal: AbortSignal,
  ): Promise<{
    rowsTotal: number;
    rowsApplied: number;
    rowsFailed: number;
    resultsJson: string;
  }>;
}

interface MerchantReportsQueueDeps {
  runtime: IntegrationRuntime;
  readFile: (filePath: string) => Promise<Uint8Array>;
  runner?: MerchantReportRunner;
}

// Shares workflow_integration_jobs with the records-import queue but claims only
// import_gpv rows, so the two runners never contend for each other's jobs.
export function createMerchantReportsQueue(
  workerId: string,
  deps: MerchantReportsQueueDeps,
) {
  const { runtime } = deps;
  const runner =
    deps.runner ??
    createMerchantReportRunner({
      executor: runtime.executor,
      now: runtime.now,
      readFile: deps.readFile,
      updateProgress: (progress) =>
        runtime.jobs.updateProgress(progress.jobId, progress),
    });

  return createJobQueue<IntegrationJobRow>({
    name: "merchant-reports-import",
    leaseMs: 60_000,
    now: runtime.now,
    workerId,
    store: runtime.jobs.store,
    claimFilter: { column: "type", values: ["import_gpv"] },
    handle: async (job, signal: AbortSignal) => {
      const result = await runner.process(job, signal);
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
  });
}

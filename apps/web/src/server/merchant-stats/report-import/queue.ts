import { createJobQueue } from "~/lib/job-queue/job-queue";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

import {
  buildMerchantReportProgressEvent,
  publishMerchantReportProgress,
} from "./progress";
import {
  createMerchantReportImportRepo,
  type MerchantReportImportRow,
} from "./repo";
import {
  createMerchantReportRunner,
  type MerchantReportRunner,
} from "./runner";

interface MerchantReportsQueueDeps {
  db: DatabaseExecutor;
  now: () => Date;
  readFile: (filePath: string) => Promise<Uint8Array>;
  runner?: MerchantReportRunner;
}

export function createMerchantReportsQueue(
  workerId: string,
  deps: MerchantReportsQueueDeps,
) {
  const repo = createMerchantReportImportRepo(deps.db);

  const runner =
    deps.runner ??
    createMerchantReportRunner({
      db: deps.db,
      now: deps.now,
      readFile: deps.readFile,
      reportProgress: async (id, progress) => {
        const persisted = await repo.updateProgress(id, progress);

        publishMerchantReportProgress(
          buildMerchantReportProgressEvent(persisted),
        );
      },
    });

  return createJobQueue<MerchantReportImportRow>({
    name: "merchant-reports-import",
    leaseMs: 60_000,
    now: deps.now,
    workerId,
    store: repo.store,
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
    onSettled: async (job) => {
      const settled = await repo.findById(job.id);

      if (!settled) return;

      publishMerchantReportProgress(buildMerchantReportProgressEvent(settled));
    },
  });
}

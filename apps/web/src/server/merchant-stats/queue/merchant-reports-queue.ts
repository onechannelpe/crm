import { createJobQueue } from "~/lib/job-queue/job-queue";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

import {
  createMerchantReportImportRepo,
  type MerchantReportImportRow,
} from "./import-repo";
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
      updateProgress: (id, progress) => repo.updateProgress(id, progress),
    });

  return createJobQueue<MerchantReportImportRow>({
    name: "merchant-reports-import",
    leaseMs: 60_000,
    now: deps.now,
    workerId,
    store: repo.store,
    handle: async (job, signal) => {
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

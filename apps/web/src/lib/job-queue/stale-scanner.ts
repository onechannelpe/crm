import { createLogger } from "~/lib/observability/logger";
import { getServerRuntime } from "~/server/platform/container";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

import { JOB_TABLES } from "./registry";

const logger = createLogger("stale-scanner");

// Every job table shares the canonical queue_state lifecycle, so reclaiming a
// crashed worker's lease is one uniform reset: a row stuck in `processing` past
// its lease deadline goes back to `pending`. No per-table status vocabulary.
// The table list comes from the single queue registry.

async function resetStalledJobs(
  executor: DatabaseExecutor = getServerRuntime().infra.db,
) {
  const now = new Date();
  await Promise.all(
    JOB_TABLES.map(async (table) => {
      try {
        const result = await executor
          .updateTable(table)
          .set({
            queue_state: "pending",
            lease_owner: null,
            lease_until: null,
          })
          .where("queue_state", "=", "processing")
          .where("lease_until", "<", now)
          .executeTakeFirst();

        if (Number(result.numUpdatedRows ?? 0) > 0) {
          logger.info("stalled_jobs_reset", {
            table,
            count: Number(result.numUpdatedRows),
          });
        }
      } catch (error: unknown) {
        logger.error("stale_scan_failed", {
          table,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }),
  );
}

export function startStaleScanner(intervalMs = 30_000) {
  logger.info("stale_scanner_started", { intervalMs });
  setInterval(() => {
    void resetStalledJobs();
  }, intervalMs);
}

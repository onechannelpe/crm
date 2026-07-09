import { createLogger } from "~/lib/observability/logger";
import { getServerRuntime } from "~/server/platform/container";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

import { resetStaleLeases } from "./job-store";
import { jobTables } from "./registry";

const logger = createLogger("stale-scanner");

// Every job table shares the canonical queue_state lifecycle, so reclaiming a
// crashed worker's lease is one uniform reset: a row stuck in `processing` past
// its lease deadline goes back to `pending`. The reset itself is delegated to
// `resetStaleLeases`, which also corrects a table's status mirror (if it has
// one) through the same mapping `settle` uses -- this scanner only owns the
// per-table loop and logging. The table list comes from the single queue
// registry.

async function resetStalledJobs(
  executor: DatabaseExecutor = getServerRuntime().infra.db,
) {
  const now = new Date();
  await Promise.all(
    jobTables().map(async (table) => {
      try {
        const count = await resetStaleLeases(executor, table, now);
        if (count > 0) {
          logger.info("stalled_jobs_reset", { table, count });
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

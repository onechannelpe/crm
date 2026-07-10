import { createLogger } from "~/lib/observability/logger";
import { getServerRuntime } from "~/server/platform/container";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

import { resetStaleLeases } from "./job-store";
import { jobTables } from "./registry";

const logger = createLogger("stale-scanner");

// One reset for every job table: a row stuck in `processing` past its lease
// deadline goes back to `pending`. `resetStaleLeases` owns the per-table
// correction; this loop only runs it and logs. The table list comes from the
// single queue registry.

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

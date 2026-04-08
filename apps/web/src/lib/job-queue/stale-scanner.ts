import { sql } from "kysely";

import { db } from "~/lib/db/db";
import { createLogger } from "~/lib/observability/logger";

const logger = createLogger("stale-scanner");

const JOB_TABLES = [
  "pipeline_integration_jobs",
  "report_export_jobs",
  "search_enrichment_jobs",
] as const;

export async function resetStalledJobs() {
  const now = Date.now();

  for (const table of JOB_TABLES) {
    try {
      const result = await db
        .updateTable(table)
        .set({
          status:
            table === "search_enrichment_jobs" || table === "report_export_jobs"
              ? "queued"
              : "PENDING",
          lease_owner: null,
          lease_until: null,
        })
        .where("status", "in", ["PROCESSING", "running"])
        .where("lease_until", "<", now)
        .executeTakeFirst();

      if (Number(result.numUpdatedRows ?? 0) > 0) {
        logger.info("stalled_jobs_reset", {
          table,
          count: Number(result.numUpdatedRows),
        });
      }
    } catch (err: any) {
      logger.error("stale_scan_failed", { table, error: err.message });
    }
  }
}

/**
 * Starts the global stale job scanner.
 */
export function startStaleScanner(intervalMs = 30_000) {
  logger.info("stale_scanner_started", { intervalMs });
  setInterval(resetStalledJobs, intervalMs);
}

import { createLogger } from "~/lib/observability/logger";
import { getServerRuntime } from "~/server/platform/container";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

const logger = createLogger("stale-scanner");

const JOB_TABLES = [
  {
    name: "workflow_integration_jobs",
    staleStatuses: ["PROCESSING"],
    resetStatus: "PENDING",
  },
  {
    name: "report_export_jobs",
    staleStatuses: ["running"],
    resetStatus: "queued",
  },
  {
    name: "search_enrichment_jobs",
    staleStatuses: ["running"],
    resetStatus: "queued",
  },
  {
    name: "search_enrichment_completion_outbox",
    staleStatuses: ["running"],
    resetStatus: "queued",
  },
  {
    name: "notification_outbox",
    staleStatuses: ["processing"],
    resetStatus: "pending",
  },
] as const;

async function resetStalledJobs(
  executor: DatabaseExecutor = getServerRuntime().infra.db,
) {
  const now = Date.now();
  await Promise.all(
    JOB_TABLES.map(async (jobTable) => {
      try {
        const result = await executor
          .updateTable(jobTable.name)
          .set({
            status: jobTable.resetStatus,
            lease_owner: null,
            lease_until: null,
          })
          .where("status", "in", jobTable.staleStatuses)
          .where("lease_until", "<", now)
          .executeTakeFirst();

        if (Number(result.numUpdatedRows ?? 0) > 0) {
          logger.info("stalled_jobs_reset", {
            table: jobTable.name,
            count: Number(result.numUpdatedRows),
          });
        }
      } catch (error: unknown) {
        logger.error("stale_scan_failed", {
          table: jobTable.name,
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

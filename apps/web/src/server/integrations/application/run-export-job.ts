import { TextEncoder } from "node:util";

import { db } from "~/lib/db/db";
import { createLogger } from "~/lib/observability/logger";

import type { IntegrationJobRow } from "../infrastructure/integration-job-repo";
import { buildLeadExportCsv } from "../infrastructure/lead-export-builder";
import {
  createIntegrationRuntime,
  integrationJobBlobStore,
} from "../infrastructure/runtime";

const logger = createLogger("integration-export-worker");

export function createExportBatchRunner() {
  return {
    async processJob(
      job: IntegrationJobRow,
      signal: AbortSignal,
    ): Promise<void> {
      const runtime = createIntegrationRuntime(db);
      if (job.type !== "export") {
        throw new Error(`Invalid job type ${job.type} for export runner`);
      }

      const leads = await runtime.leadExportQuery.list({});

      if (signal.aborted) throw new Error("Job aborted");

      const csv = buildLeadExportCsv(
        leads.map((lead) => ({
          ruc: lead.ruc,
          razon_social: lead.razonSocial ?? "",
          executive_id: lead.executiveId,
          executive_name: lead.executiveName ?? "",
          created_at: new Date(lead.createdAt).toISOString().slice(0, 10),
          stage: lead.stage,
          address: lead.address ?? "",
          status: lead.status ?? "",
          prioridad: lead.prioridad ?? "",
        })),
      );

      const key = `export-${job.id}.csv`;
      const bytes = new TextEncoder().encode(csv);

      await integrationJobBlobStore.put(key, bytes);

      if (signal.aborted) throw new Error("Job aborted after store put");

      await runtime.jobs.setFilePath(job.id, key);
      await runtime.jobs.markCompleted(job.id, {
        rowsTotal: leads.length,
        rowsApplied: leads.length,
        rowsFailed: 0,
        resultsJson: null,
      });

      logger.info("integration_export_job_completed", {
        jobId: job.id,
        rowsTotal: leads.length,
      });
    },

    async runBatch(
      batchSize: number,
      leaseMs: number,
      workerId: string,
    ): Promise<number> {
      const runtime = createIntegrationRuntime(db);
      const jobs = await runtime.jobs.claimPending(
        leaseMs,
        workerId,
        batchSize,
        ["export"],
      );

      if (jobs.length === 0) {
        return 0;
      }

      logger.info("integration_export_batch_claimed", {
        workerId,
        claimedCount: jobs.length,
        claimedJobIds: jobs.map((job) => job.id),
      });

      const results = await Promise.all(
        jobs.map(async (job) => {
          try {
            const controller = new AbortController();
            await this.processJob(job, controller.signal);
            return true;
          } catch (error) {
            const message =
              error instanceof Error ? error.message : "Unknown error";
            await runtime.jobs.markFailed(job.id, message);
            logger.error("integration_export_job_failed", {
              workerId,
              jobId: job.id,
              error: message,
            });
            return false;
          }
        }),
      );

      const processed = results.filter(Boolean).length;
      return processed;
    },
  };
}

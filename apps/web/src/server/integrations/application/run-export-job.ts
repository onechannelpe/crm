import { TextEncoder } from "node:util";

import { db } from "~/lib/db/db";
import { createLogger } from "~/lib/observability/logger";

import { buildLeadExportCsv } from "../infrastructure/lead-export-builder";
import {
  createIntegrationRuntime,
  integrationJobBlobStore,
} from "../infrastructure/runtime";
import type {
  ExportBatchRunner,
  ExportJobProcessResult,
  IntegrationJobRow,
} from "../types";

const logger = createLogger("integration-export-worker");

export function createExportBatchRunner() {
  const runner: ExportBatchRunner = {
    async processJob(
      job: IntegrationJobRow,
      signal: AbortSignal,
    ): Promise<ExportJobProcessResult> {
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
      const result: ExportJobProcessResult = {
        rowsTotal: leads.length,
        rowsApplied: leads.length,
        rowsFailed: 0,
        resultsJson: null,
      };

      logger.info("integration_export_job_completed", {
        jobId: job.id,
        rowsTotal: leads.length,
      });
      return result;
    },
  };
  return runner;
}

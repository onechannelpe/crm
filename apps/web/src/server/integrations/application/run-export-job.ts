import { TextEncoder } from "node:util";

import { createLogger } from "~/lib/observability/logger";

import { buildLeadExportCsv } from "../infrastructure/lead-export-builder";
import type { JobBlobStore } from "../job-blob-store";
import type {
  ExportBatchRunner,
  ExportJobProcessResult,
  IntegrationJobRow,
  IntegrationRuntime,
} from "../types";

const logger = createLogger("integration-export-worker");

export function createExportBatchRunner(deps: {
  runtime: IntegrationRuntime;
  blobStore: JobBlobStore;
}): ExportBatchRunner {
  const { runtime, blobStore } = deps;
  return {
    async processJob(
      job: IntegrationJobRow,
      signal: AbortSignal,
    ): Promise<ExportJobProcessResult> {
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

      await blobStore.put(key, bytes);

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
}

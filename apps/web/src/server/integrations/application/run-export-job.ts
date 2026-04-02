import { TextEncoder } from "node:util";

import { db } from "~/lib/db/db";

import { buildLeadExportCsv } from "../infrastructure/lead-export-builder";
import {
  createIntegrationRuntime,
  integrationJobBlobStore,
} from "../infrastructure/runtime";

export function createExportBatchRunner() {
  return {
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
      );
      const results = await Promise.all(
        jobs.map(async (job) => {
          if (job.type !== "export") return false;

          try {
            const leads = await runtime.pipelineLeads.listForExport({});
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
            await integrationJobBlobStore.put(
              key,
              new TextEncoder().encode(csv),
            );
            await runtime.jobs.setFilePath(job.id, key);
            await runtime.jobs.markCompleted(job.id, {
              rowsTotal: leads.length,
              rowsApplied: leads.length,
              rowsFailed: 0,
              resultsJson: null,
            });
            return true;
          } catch (error) {
            const message =
              error instanceof Error ? error.message : "Unknown error";
            await runtime.jobs.markFailed(job.id, message);
            return false;
          }
        }),
      );

      return results.filter(Boolean).length;
    },
  };
}

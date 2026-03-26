import { TextEncoder } from "node:util";

import { db } from "~/lib/db/db";
import {
  createPipelineRepos,
  jobBlobStore,
} from "~/server/shared/pipeline-runtime";

import { buildLeadExportCsv } from "../infrastructure/lead-export-builder";

export function createExportBatchRunner() {
  return {
    async runBatch(
      batchSize: number,
      leaseMs: number,
      workerId: string,
    ): Promise<number> {
      const repos = createPipelineRepos(db);
      const jobs = await repos.integrationJobs.claimPending(
        leaseMs,
        workerId,
        batchSize,
      );
      const results = await Promise.all(
        jobs.map(async (job) => {
          if (job.type !== "export") return false;

          try {
            const leads = await repos.leads.listForExport({});
            const csv = buildLeadExportCsv(
              leads.map((lead) => ({
                ruc: lead.ruc,
                razon_social: lead.razon_social ?? "",
                executive_id: lead.executive_id,
                executive_name: lead.executive_name ?? "",
                created_at: new Date(lead.created_at)
                  .toISOString()
                  .slice(0, 10),
                stage: lead.stage,
                address: lead.address ?? "",
                status: lead.status ?? "",
                prioridad: lead.prioridad ?? "",
              })),
            );
            const key = `export-${job.id}.csv`;
            await jobBlobStore.put(key, new TextEncoder().encode(csv));
            await repos.integrationJobs.setFilePath(job.id, key);
            await repos.integrationJobs.markCompleted(job.id, {
              rowsTotal: leads.length,
              rowsApplied: leads.length,
              rowsFailed: 0,
              resultsJson: null,
            });
            return true;
          } catch (error) {
            const message =
              error instanceof Error ? error.message : "Unknown error";
            await repos.integrationJobs.markFailed(job.id, message);
            return false;
          }
        }),
      );

      return results.filter(Boolean).length;
    },
  };
}

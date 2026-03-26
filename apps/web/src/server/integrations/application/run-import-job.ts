import { TextDecoder } from "node:util";

import { db } from "~/lib/db/db";
import { reviewLeadPrioridadUseCase } from "~/server/leads/application/review-lead-prioridad";
import { reviewLeadStatusUseCase } from "~/server/leads/application/review-lead-status";
import { createAuditService } from "~/server/shared/audit";
import {
  createPipelineRepos,
  jobBlobStore,
} from "~/server/shared/pipeline-runtime";

import {
  parsePrioridadImport,
  type ImportRowFailure as PrioridadImportFailure,
} from "../infrastructure/prioridad-import-parser";
import {
  parseStatusImport,
  type ImportRowFailure as StatusImportFailure,
} from "../infrastructure/status-import-parser";

type RowResult =
  | StatusImportFailure
  | PrioridadImportFailure
  | { row: number; ok: true };

export function createImportBatchRunner() {
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
          if (!job.file_path) return false;

          try {
            const text = new TextDecoder("utf-8").decode(
              await jobBlobStore.get(job.file_path),
            );

            const result =
              job.type === "import_status"
                ? await runStatusImportJob(job.id, text, job.user_id)
                : await runPrioridadImportJob(job.id, text, job.user_id);

            await repos.integrationJobs.markCompleted(job.id, {
              rowsTotal: result.total,
              rowsApplied: result.applied,
              rowsFailed: result.failed,
              resultsJson: JSON.stringify(result.results),
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

async function runStatusImportJob(
  jobId: number,
  text: string,
  actorId: number,
): Promise<{
  total: number;
  applied: number;
  failed: number;
  results: RowResult[];
}> {
  const parsed = parseStatusImport(text);
  const repos = createPipelineRepos(db);
  const leads = await repos.leads.findByRucMany(
    parsed.valid.map((row) => row.ruc),
  );
  const leadMap = new Map(leads.map((lead) => [lead.ruc, lead]));
  const results: RowResult[] = [...parsed.invalid];
  const reviewedRows = await Promise.all(
    parsed.valid.map(async (row): Promise<RowResult> => {
      const lead = leadMap.get(row.ruc);
      if (!lead) {
        return { row: row.row, ok: false, reason: "RUC not found" };
      }

      const executive =
        lead.executive_id > 0
          ? await repos.users.findById(lead.executive_id)
          : null;

      const reviewed = await reviewLeadStatusUseCase({
        leadId: lead.id,
        status: row.status,
        reason: "Imported from CSV",
        actorId,
        branchId: executive?.branch_id ?? 0,
      });

      if (!reviewed.ok) {
        return { row: row.row, ok: false, reason: reviewed.error.message };
      }

      return { row: row.row, ok: true };
    }),
  );
  results.push(...reviewedRows);
  const applied = reviewedRows.filter((row) => row.ok).length;

  const audit = createAuditService({ auditLogs: repos.auditLogs });
  if (applied > 0) {
    await audit.log(actorId, "bulk_status_update", "integration_job", jobId, {
      applied,
      rucs: parsed.valid.map((row) => row.ruc),
    });
  }

  return {
    total: parsed.valid.length + parsed.invalid.length,
    applied,
    failed: results.filter((row) => !row.ok).length,
    results,
  };
}

async function runPrioridadImportJob(
  jobId: number,
  text: string,
  actorId: number,
): Promise<{
  total: number;
  applied: number;
  failed: number;
  results: RowResult[];
}> {
  const parsed = parsePrioridadImport(text);
  const repos = createPipelineRepos(db);
  const leads = await repos.leads.findByRucMany(
    parsed.valid.map((row) => row.ruc),
  );
  const leadMap = new Map(leads.map((lead) => [lead.ruc, lead]));
  const results: RowResult[] = [...parsed.invalid];
  const reviewedRows = await Promise.all(
    parsed.valid.map(async (row): Promise<RowResult> => {
      const lead = leadMap.get(row.ruc);
      if (!lead) {
        return { row: row.row, ok: false, reason: "RUC not found" };
      }

      const executive =
        lead.executive_id > 0
          ? await repos.users.findById(lead.executive_id)
          : null;

      const reviewed = await reviewLeadPrioridadUseCase({
        leadId: lead.id,
        prioridad: row.prioridad,
        reason: "Imported from CSV",
        actorId,
        branchId: executive?.branch_id ?? 0,
      });

      if (!reviewed.ok) {
        return { row: row.row, ok: false, reason: reviewed.error.message };
      }

      return { row: row.row, ok: true };
    }),
  );
  results.push(...reviewedRows);
  const applied = reviewedRows.filter((row) => row.ok).length;

  const audit = createAuditService({ auditLogs: repos.auditLogs });
  if (applied > 0) {
    await audit.log(
      actorId,
      "bulk_prioridad_update",
      "integration_job",
      jobId,
      {
        applied,
        rucs: parsed.valid.map((row) => row.ruc),
      },
    );
  }

  return {
    total: parsed.valid.length + parsed.invalid.length,
    applied,
    failed: results.filter((row) => !row.ok).length,
    results,
  };
}

import { TextDecoder } from "node:util";

import { db } from "~/lib/db/db";
import type {
  LeadPriority,
  LeadStatus,
} from "~/pipeline/contracts/lead-schema";
import { runPipelineCommand } from "~/server/pipeline/infrastructure/command-runtime";
import { createAuditService } from "~/server/shared/audit";

import {
  parsePrioridadImport,
  type ImportRowFailure as PrioridadImportFailure,
} from "../infrastructure/prioridad-import-parser";
import {
  createIntegrationRuntime,
  integrationJobBlobStore,
} from "../infrastructure/runtime";
import {
  parseStatusImport,
  type ImportRowFailure as StatusImportFailure,
} from "../infrastructure/status-import-parser";
import { applyPrioridadImport } from "./apply-prioridad-import";
import { applyStatusImport } from "./apply-status-import";

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
      const runtime = createIntegrationRuntime(db);
      const jobs = await runtime.jobs.claimPending(
        leaseMs,
        workerId,
        batchSize,
      );
      const results = await Promise.all(
        jobs.map(async (job) => {
          if (!job.file_path) return false;

          try {
            const text = new TextDecoder("utf-8").decode(
              await integrationJobBlobStore.get(job.file_path),
            );

            const result =
              job.type === "import_status"
                ? await runStatusImportJob(job.id, text, job.user_id)
                : await runPrioridadImportJob(job.id, text, job.user_id);

            await runtime.jobs.markCompleted(job.id, {
              rowsTotal: result.total,
              rowsApplied: result.applied,
              rowsFailed: result.failed,
              resultsJson: JSON.stringify(result.results),
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
  const runtime = createIntegrationRuntime(db);
  const leads = await runtime.leads.findByRucMany(
    parsed.valid.map((row) => row.ruc),
  );
  const leadByRuc = new Map(leads.map((lead) => [lead.ruc, lead]));
  const results: RowResult[] = [...parsed.invalid];
  const reviewedRows = await Promise.all(
    parsed.valid.map(async (row): Promise<RowResult> => {
      const lead = leadByRuc.get(row.ruc);
      if (!lead) {
        return { row: row.row, ok: false, reason: "RUC not found" };
      }

      const executive =
        lead.executiveId > 0
          ? await runtime.users.findById(lead.executiveId)
          : null;

      const reviewed = await reviewImportedLead({
        leadId: lead.id,
        status: row.status,
        actorId,
        branchId: executive?.branch_id ?? 0,
        kind: "status",
      });

      if (!reviewed.ok) {
        return { row: row.row, ok: false, reason: reviewed.error.message };
      }

      return { row: row.row, ok: true };
    }),
  );
  results.push(...reviewedRows);
  const applied = reviewedRows.filter((row) => row.ok).length;

  const audit = createAuditService({ auditLogs: runtime.auditLogs });
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
  const runtime = createIntegrationRuntime(db);
  const leads = await runtime.leads.findByRucMany(
    parsed.valid.map((row) => row.ruc),
  );
  const leadByRuc = new Map(leads.map((lead) => [lead.ruc, lead]));
  const results: RowResult[] = [...parsed.invalid];
  const reviewedRows = await Promise.all(
    parsed.valid.map(async (row): Promise<RowResult> => {
      const lead = leadByRuc.get(row.ruc);
      if (!lead) {
        return { row: row.row, ok: false, reason: "RUC not found" };
      }

      const executive =
        lead.executiveId > 0
          ? await runtime.users.findById(lead.executiveId)
          : null;

      const reviewed = await reviewImportedLead({
        leadId: lead.id,
        prioridad: row.prioridad,
        actorId,
        branchId: executive?.branch_id ?? 0,
        kind: "prioridad",
      });

      if (!reviewed.ok) {
        return { row: row.row, ok: false, reason: reviewed.error.message };
      }

      return { row: row.row, ok: true };
    }),
  );
  results.push(...reviewedRows);
  const applied = reviewedRows.filter((row) => row.ok).length;

  const audit = createAuditService({ auditLogs: runtime.auditLogs });
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

function reviewImportedLead(
  input:
    | {
        leadId: number;
        status: LeadStatus;
        actorId: number;
        branchId: number;
        kind: "status";
      }
    | {
        leadId: number;
        prioridad: LeadPriority;
        actorId: number;
        branchId: number;
        kind: "prioridad";
      },
) {
  return runPipelineCommand(({ deps, auditService, notificationCenter }) =>
    input.kind === "status"
      ? applyStatusImport({
          deps: deps.reviewLead,
          auditService,
          notificationCenter,
          leadId: input.leadId,
          status: input.status,
          reason: "Imported from CSV",
          actorUserId: input.actorId,
          branchId: input.branchId,
        })
      : applyPrioridadImport({
          deps: deps.reviewLead,
          auditService,
          notificationCenter,
          leadId: input.leadId,
          prioridad: input.prioridad,
          reason: "Imported from CSV",
          actorUserId: input.actorId,
          branchId: input.branchId,
        }),
  );
}

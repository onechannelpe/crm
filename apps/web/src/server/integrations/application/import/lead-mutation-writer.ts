import type {
  LeadPriority,
  LeadStage,
  LeadStatus,
} from "~/pipeline/contracts/lead-schema";
import { resolveReviewTransition } from "~/server/pipeline/domain/workflow";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

import type { ImportRowInput, LeadMutationResult, LoadedLead } from "./types";

function nextStageFor(
  current: LoadedLead,
  nextStatus: LeadStatus | null,
  nextPrioridad: LeadPriority | null,
): LeadStage {
  if (nextStatus === null || nextPrioridad === null) {
    return current.stage;
  }

  return resolveReviewTransition({
    lead: {
      id: current.id,
      ruc: current.ruc,
      razonSocial: null,
      address: null,
      district: null,
      department: null,
      executiveId: current.executive_id,
      createdBy: current.created_by,
      updatedBy: current.updated_by ?? null,
      stage: "PENDING_EXTERNAL_REVIEW",
      status: current.status,
      prioridad: current.prioridad,
      createdAt: 0,
      updatedAt: 0,
    },
    status: nextStatus,
    prioridad: nextPrioridad,
  });
}

async function markImportRowFailed(input: {
  executor: DatabaseExecutor;
  jobId: number;
  rowNumber: number;
  reason: string;
  leadId: number | null;
  changedAt: number;
}) {
  await input.executor
    .updateTable("pipeline_integration_import_rows")
    .set({
      state: "failed",
      failure_reason: input.reason,
      lead_id: input.leadId,
      applied_at: input.changedAt,
    })
    .where("integration_job_id", "=", input.jobId)
    .where("row_number", "=", input.rowNumber)
    .execute();
}

async function markImportRowApplied(input: {
  executor: DatabaseExecutor;
  jobId: number;
  rowNumber: number;
  leadId: number;
  changedAt: number;
}) {
  await input.executor
    .updateTable("pipeline_integration_import_rows")
    .set({
      state: "applied",
      failure_reason: null,
      lead_id: input.leadId,
      applied_at: input.changedAt,
    })
    .where("integration_job_id", "=", input.jobId)
    .where("row_number", "=", input.rowNumber)
    .execute();
}

export async function applyLeadMutation(input: {
  executor: DatabaseExecutor;
  jobId: number;
  actorId: number;
  row: ImportRowInput;
}): Promise<LeadMutationResult> {
  const lead = (await input.executor
    .selectFrom("pipeline_leads")
    .select([
      "id",
      "ruc",
      "executive_id",
      "created_by",
      "updated_by",
      "updated_at",
      "status",
      "prioridad",
      "stage",
    ])
    .where("ruc", "=", input.row.ruc)
    .executeTakeFirst()) as LoadedLead | undefined;
  if (!lead) {
    const changedAt = Date.now();
    await markImportRowFailed({
      executor: input.executor,
      jobId: input.jobId,
      rowNumber: input.row.row,
      reason: "RUC not found",
      leadId: null,
      changedAt,
    });
    return {
      ok: false,
      rowResult: { row: input.row.row, ok: false, reason: "RUC not found" },
    };
  }

  if (lead.stage !== "PENDING_EXTERNAL_REVIEW") {
    const changedAt = Date.now();
    const reason = "Lead is not in pending external review stage";
    await markImportRowFailed({
      executor: input.executor,
      jobId: input.jobId,
      rowNumber: input.row.row,
      reason,
      leadId: lead.id,
      changedAt,
    });
    return {
      ok: false,
      rowResult: { row: input.row.row, ok: false, reason },
    };
  }

  const nextStatus =
    input.row.type === "import_status" ? input.row.status : lead.status;
  const nextPrioridad =
    input.row.type === "import_prioridad"
      ? input.row.prioridad
      : lead.prioridad;
  const nextStage = nextStageFor(lead, nextStatus, nextPrioridad);
  const changedAt = Date.now();
  const stageChanged = nextStage !== lead.stage;

  const updateResult = await input.executor
    .updateTable("pipeline_leads")
    .set({
      status: nextStatus,
      prioridad: nextPrioridad,
      stage: nextStage,
      updated_by: input.actorId,
      updated_at: changedAt,
    })
    .where("id", "=", lead.id)
    .where("updated_at", "=", lead.updated_at)
    .executeTakeFirst();

  if (Number(updateResult.numUpdatedRows ?? 0) < 1) {
    await markImportRowFailed({
      executor: input.executor,
      jobId: input.jobId,
      rowNumber: input.row.row,
      reason: "Lead changed concurrently",
      leadId: lead.id,
      changedAt,
    });
    return {
      ok: false,
      rowResult: {
        row: input.row.row,
        ok: false,
        reason: "Lead changed concurrently",
      },
    };
  }

  await markImportRowApplied({
    executor: input.executor,
    jobId: input.jobId,
    rowNumber: input.row.row,
    leadId: lead.id,
    changedAt,
  });

  return {
    ok: true,
    rowResult: { row: input.row.row, ok: true },
    mutation: {
      row: input.row,
      leadId: lead.id,
      ruc: lead.ruc,
      executiveId: lead.executive_id,
      previousStatus: lead.status,
      previousPrioridad: lead.prioridad,
      previousStage: lead.stage,
      nextStatus,
      nextPrioridad,
      nextStage,
      changedAt,
      stageChanged,
    },
  };
}

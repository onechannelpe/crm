import type { Role } from "~/lib/auth/access/rbac";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { reviewLead } from "~/server/workflow/lead/domain/decide";
import { commitTransition } from "~/server/workflow/lead/write/commit";
import { createWorkflowRepos } from "~/server/workflow/repos";

import type { ImportRowInput, LeadMutationResult } from "./types";

const IMPORT_REASON = "Imported from CSV";

async function markImportRowFailed(input: {
  executor: DatabaseExecutor;
  jobId: string;
  rowNumber: number;
  reason: string;
  leadId: string | null;
  changedAt: number;
}) {
  await input.executor
    .updateTable("workflow_integration_import_rows")
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
  jobId: string;
  rowNumber: number;
  leadId: string;
  changedAt: number;
}) {
  await input.executor
    .updateTable("workflow_integration_import_rows")
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
  jobId: string;
  actor: { userId: number; role: Role };
  row: ImportRowInput;
  now: number;
}): Promise<LeadMutationResult> {
  const repos = createWorkflowRepos(input.executor);
  const lead = await repos.leads.findByRuc(input.row.ruc);

  if (!lead) {
    await markImportRowFailed({
      executor: input.executor,
      jobId: input.jobId,
      rowNumber: input.row.row,
      reason: "RUC not found",
      leadId: null,
      changedAt: input.now,
    });
    return {
      ok: false,
      rowResult: { row: input.row.row, ok: false, reason: "RUC not found" },
    };
  }

  if (lead.stage !== "QUALIFYING") {
    const reason = "Lead is not in pending external review stage";
    await markImportRowFailed({
      executor: input.executor,
      jobId: input.jobId,
      rowNumber: input.row.row,
      reason,
      leadId: lead.id,
      changedAt: input.now,
    });
    return {
      ok: false,
      rowResult: { row: input.row.row, ok: false, reason },
    };
  }

  const nextStatus =
    input.row.type === "import_status" ? input.row.status : lead.status;
  const nextPrioridad =
    input.row.type === "import_prioridad" ? input.row.priority : lead.priority;

  const transition = reviewLead(lead, {
    actor: input.actor,
    rowType: input.row.type === "import_status" ? "status" : "priority",
    status: nextStatus,
    priority: nextPrioridad,
    reason: IMPORT_REASON,
    now: input.now,
  });

  if (!transition.ok) {
    const reason =
      transition.error.code === "invalid_stage"
        ? "Lead is not in pending external review stage"
        : (transition.error.code ?? "Could not apply row");
    await markImportRowFailed({
      executor: input.executor,
      jobId: input.jobId,
      rowNumber: input.row.row,
      reason,
      leadId: lead.id,
      changedAt: input.now,
    });
    return {
      ok: false,
      rowResult: { row: input.row.row, ok: false, reason },
    };
  }

  const committed = await commitTransition(input.executor, transition.value);

  if (!committed.ok) {
    const reason =
      committed.error.code === "concurrency_conflict"
        ? "Lead changed concurrently"
        : (committed.error.code ?? "Could not apply row");
    await markImportRowFailed({
      executor: input.executor,
      jobId: input.jobId,
      rowNumber: input.row.row,
      reason,
      leadId: lead.id,
      changedAt: input.now,
    });
    return {
      ok: false,
      rowResult: {
        row: input.row.row,
        ok: false,
        reason,
      },
    };
  }

  await markImportRowApplied({
    executor: input.executor,
    jobId: input.jobId,
    rowNumber: input.row.row,
    leadId: lead.id,
    changedAt: input.now,
  });

  return {
    ok: true,
    rowResult: { row: input.row.row, ok: true },
    committed: transition.value.events.map((event, index) => ({
      event,
      id: committed.value.eventIds[index],
    })),
  };
}

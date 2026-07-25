import type { Role } from "~/domain/auth/access/rbac";
import type { IntegrationJobId, UserId, WorkflowLeadId } from "~/domain/ids";
import type { DatabaseExecutor } from "~/server/platform/database/executor";
import { createInquiryRepo } from "~/server/workflow/inquiry/repo";
import { reviewLead } from "~/server/workflow/lead/domain/decide";
import { commitTransition } from "~/server/workflow/lead/write/commit";
import { createWorkflowRepos } from "~/server/workflow/repos";

import type { ImportRowInput, LeadMutationResult } from "./types";

const IMPORT_REASON = "Imported from CSV";

async function markImportRowFailed(input: {
  executor: DatabaseExecutor;
  jobId: IntegrationJobId;
  rowNumber: number;
  reason: string;
  leadId: WorkflowLeadId | null;
  changedAt: Date;
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
  jobId: IntegrationJobId;
  rowNumber: number;
  leadId: WorkflowLeadId | null;
  changedAt: Date;
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
  jobId: IntegrationJobId;
  actor: { userId: UserId; role: Role };
  row: ImportRowInput;
  now: Date;
}): Promise<LeadMutationResult> {
  const repos = createWorkflowRepos(input.executor);

  // The same answer stamps every live inquiry for the RUC, whether or not a
  // lead exists: probing executives asked exactly this question. A later lead
  // failure does not undo the stamp; the answer is valid either way.
  const { stamped, newlyAnswered } = await createInquiryRepo(
    input.executor,
  ).stampAnswer({
    ruc: input.row.ruc,
    status: input.row.type === "import_status" ? input.row.status : undefined,
    priority:
      input.row.type === "import_prioridad" ? input.row.priority : undefined,
    answeredBy: input.actor.userId,
    answeredByJobId: input.jobId,
    now: input.now,
  });

  async function inquiryOnlyOrFailed(
    reason: string,
    leadId: WorkflowLeadId | null,
  ): Promise<LeadMutationResult> {
    if (stamped > 0) {
      await markImportRowApplied({
        executor: input.executor,
        jobId: input.jobId,
        rowNumber: input.row.row,
        leadId,
        changedAt: input.now,
      });
      return {
        ok: true,
        rowResult: { row: input.row.row, ok: true },
        committed: [],
        newlyAnsweredInquiries: newlyAnswered,
      };
    }

    await markImportRowFailed({
      executor: input.executor,
      jobId: input.jobId,
      rowNumber: input.row.row,
      reason,
      leadId,
      changedAt: input.now,
    });
    return {
      ok: false,
      rowResult: { row: input.row.row, ok: false, reason },
      newlyAnsweredInquiries: newlyAnswered,
    };
  }

  const lead = await repos.leads.findActiveByRuc(input.row.ruc);

  if (!lead) {
    return inquiryOnlyOrFailed("RUC not found", null);
  }

  if (lead.stage !== "QUALIFYING") {
    return inquiryOnlyOrFailed(
      "Lead is not in pending external review stage",
      lead.id,
    );
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
    return inquiryOnlyOrFailed(reason, lead.id);
  }

  const committed = await commitTransition(input.executor, transition.value);

  if (!committed.ok) {
    const reason =
      committed.error.code === "concurrency_conflict"
        ? "Lead changed concurrently"
        : (committed.error.code ?? "Could not apply row");
    return inquiryOnlyOrFailed(reason, lead.id);
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
    newlyAnsweredInquiries: newlyAnswered,
  };
}

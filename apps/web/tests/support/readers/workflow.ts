import { expectOk } from "@tests/support/_core/assertions";
import type { TestActor } from "@tests/support/database/workflow-fixtures";
import { workflowRepos } from "@tests/support/integration/workflow-ports";
import type { TestRuntime } from "@tests/support/runtime/app";

import type { LeadStatus } from "~/contracts/workflow/vocabulary";
import type { UserId, WorkflowLeadId } from "~/domain/ids";
import { getLeadDetail } from "~/server/workflow/lead/read/queries/get-lead-detail";

// Lead invariants are asserted through getLeadDetail, the same read model production
// consumers use, rather than by reading raw workflow_leads columns. Every field these
// helpers check (updatedBy, updatedAt, executiveId, status) is exposed on LeadDetailLeadView.
// The caller passes the actor that can see the lead (after a reassign, only the new
// executive or a review role can).

async function loadLead(
  runtime: TestRuntime,
  actor: TestActor,
  leadId: WorkflowLeadId,
) {
  const detail = await getLeadDetail(workflowRepos(runtime), {
    actorUserId: actor.userId,
    actorRole: actor.role,
    leadId,
  });
  return expectOk(detail).lead;
}

export async function expectLeadMetadata(
  runtime: TestRuntime,
  input: {
    actor: TestActor;
    leadId: WorkflowLeadId;
    updatedBy: UserId;
    minUpdatedAt?: number;
  },
): Promise<void> {
  const lead = await loadLead(runtime, input.actor, input.leadId);

  if (lead.updatedBy !== input.updatedBy) {
    throw new Error(
      `expected updatedBy=${input.updatedBy} got ${String(lead.updatedBy)}`,
    );
  }
  if (
    input.minUpdatedAt !== undefined &&
    lead.updatedAt <= input.minUpdatedAt
  ) {
    throw new Error(
      `expected updatedAt > ${input.minUpdatedAt} got ${String(lead.updatedAt)}`,
    );
  }
}

export async function expectLeadAssignment(
  runtime: TestRuntime,
  input: {
    actor: TestActor;
    leadId: WorkflowLeadId;
    executiveId: UserId;
    updatedBy: UserId;
  },
): Promise<void> {
  const lead = await loadLead(runtime, input.actor, input.leadId);

  if (lead.executiveId !== input.executiveId) {
    throw new Error(
      `expected executiveId=${input.executiveId} got ${lead.executiveId}`,
    );
  }
  if (lead.updatedBy !== input.updatedBy) {
    throw new Error(
      `expected updatedBy=${input.updatedBy} got ${String(lead.updatedBy)}`,
    );
  }
}

export async function expectLeadStatus(
  runtime: TestRuntime,
  input: {
    actor: TestActor;
    leadId: WorkflowLeadId;
    updatedBy: UserId;
    status: LeadStatus;
  },
): Promise<void> {
  const lead = await loadLead(runtime, input.actor, input.leadId);

  if (lead.updatedBy !== input.updatedBy) {
    throw new Error(
      `expected updatedBy=${input.updatedBy} got ${String(lead.updatedBy)}`,
    );
  }
  if (lead.status !== input.status) {
    throw new Error(
      `expected status=${input.status} got ${String(lead.status)}`,
    );
  }
}

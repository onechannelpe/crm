import { fail, type DomainError } from "~/domain/errors";
import type { WorkflowLeadId } from "~/domain/ids";
import type { WorkflowActor } from "~/server/workflow/actor";
import type { WorkflowWriteContext } from "~/server/workflow/types";
import { Err, Ok, type Result } from "~/shared/result";

import { deleteLead } from "../../lead/domain/decide";
import { runLeadTransaction } from "../write/transition";

export async function deleteLeadCommand(
  input: { actor: WorkflowActor; leadId: WorkflowLeadId },
  scope: WorkflowWriteContext,
): Promise<Result<{ leadId: string }, DomainError>> {
  return runLeadTransaction(scope, async (ctx) => {
    const state = await ctx.repos.leads.findByIdIncludingDeleted(input.leadId);
    if (!state) {
      return Err(fail("lead_not_found"));
    }

    // Idempotent: deleting an already-deleted lead is a no-op, not an error.
    if (state.deletedAt !== null) {
      return Ok({ leadId: input.leadId });
    }

    const transition = deleteLead(state, {
      actor: input.actor,
      occurredAt: ctx.operationAt,
    });
    if (!transition.ok) {
      return transition;
    }

    const committed = await ctx.commitTransition(transition.value);
    if (!committed.ok) {
      return committed;
    }

    return Ok({ leadId: input.leadId });
  });
}

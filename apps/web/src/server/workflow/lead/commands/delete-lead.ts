import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { fail, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { WorkflowActor } from "~/server/workflow/actor";

import { deleteLead } from "../../lead/domain/decide";
import { runLeadTransaction } from "../write/transition";

export async function deleteLeadCommand(
  input: { actor: WorkflowActor; leadId: string },
  ports: { executor: DatabaseExecutor; now: number },
): Promise<Result<{ leadId: string }, DomainError>> {
  return runLeadTransaction(ports, async (ctx) => {
    const state = await ctx.repos.leads.findByIdIncludingDeleted(input.leadId);
    if (!state) return Err(fail("lead_not_found"));

    // Idempotent: deleting an already-deleted lead is a no-op, not an error.
    if (state.deletedAt !== null) return Ok({ leadId: input.leadId });

    const transition = deleteLead(state, { actor: input.actor, now: ctx.now });
    if (!transition.ok) return transition;

    const committed = await ctx.commitTransition(transition.value);
    if (!committed.ok) return committed;

    return Ok({ leadId: input.leadId });
  });
}

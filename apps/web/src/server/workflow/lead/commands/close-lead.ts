import type { CloseLeadInput } from "~/contracts/workflow/inputs";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { fail, type DomainError } from "~/server/shared/domain-error";
import type { WorkflowLeadId } from "~/server/shared/ids";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { WorkflowActor } from "~/server/workflow/actor";

import { closeLead } from "../../lead/domain/decide";
import { runLeadTransaction } from "../write/transition";

// A pending proposal is left untouched: the lead moves to CLOSED_LOST
// (terminal) and every consumer of a pending proposal is gated on PRICING, so
// the inert proposal is never surfaced again.
export async function closeLeadCommand(
  input: Omit<CloseLeadInput, "leadId"> & {
    actor: WorkflowActor;
    leadId: WorkflowLeadId;
  },
  ports: {
    executor: DatabaseExecutor;
    now: Date;
  },
): Promise<Result<{ leadId: string }, DomainError>> {
  return runLeadTransaction(ports, async (ctx) => {
    const state = await ctx.repos.leads.findById(input.leadId);

    if (!state) {
      return Err(fail("lead_not_found"));
    }

    const transition = closeLead(state, {
      actor: input.actor,
      reason: input.reason,
      note: input.note,
      now: ctx.now,
    });

    if (!transition.ok) {
      return transition;
    }

    const committed = await ctx.commitTransition(transition.value);

    if (!committed.ok) {
      return committed;
    }

    return Ok({ leadId: state.id });
  });
}

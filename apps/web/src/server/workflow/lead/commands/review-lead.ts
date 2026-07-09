import type { ReviewLeadInput } from "~/contracts/workflow/inputs";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { fail, type DomainError } from "~/server/shared/domain-error";
import type { WorkflowLeadId } from "~/server/shared/ids";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { WorkflowActor } from "~/server/workflow/actor";

import { qualifyLead } from "../../lead/domain/decide";
import { runLeadTransaction } from "../write/transition";

export async function reviewLeadCommand(
  input: Omit<ReviewLeadInput, "leadId"> & {
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

    const transition = qualifyLead(state, {
      actor: input.actor,
      status: input.status,
      priority: input.priority,
      reason: input.reason,
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

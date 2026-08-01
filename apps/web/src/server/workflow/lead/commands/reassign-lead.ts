import type { ReassignLeadInput } from "~/contracts/workflow/inputs";
import { fail, type DomainError } from "~/domain/errors";
import type { UserId, WorkflowLeadId } from "~/domain/ids";
import type { WorkflowActor } from "~/server/workflow/actor";
import type { WorkflowWriteContext } from "~/server/workflow/types";
import { Err, Ok, type Result } from "~/shared/result";

import { reassignLead } from "../../lead/domain/decide";
import { resolveAssignableExecutivesScope } from "../../lead/domain/policy";
import { runLeadTransaction } from "../write/transition";

export async function reassignLeadCommand(
  input: Omit<ReassignLeadInput, "leadId" | "newExecutiveId"> & {
    actor: WorkflowActor;
    leadId: WorkflowLeadId;
    toExecutiveId: UserId;
  },
  scope: WorkflowWriteContext,
): Promise<Result<{ leadId: string }, DomainError>> {
  return runLeadTransaction(scope, async (ctx) => {
    const assignable = resolveAssignableExecutivesScope({
      actorRole: input.actor.role,
      actorBranchId: input.actor.branchId,
    });

    if (!assignable.ok) {
      return assignable;
    }

    const isAssignable = await ctx.repos.users.isExecutiveAssignable(
      assignable.value,
      input.toExecutiveId,
    );

    if (!isAssignable) {
      return Err(fail("invalid_executive"));
    }

    const state = await ctx.repos.leads.findById(input.leadId);

    if (!state) {
      return Err(fail("lead_not_found"));
    }

    const transition = reassignLead(state, {
      actor: input.actor,
      toExecutiveId: input.toExecutiveId,
      now: ctx.operationAt,
    });

    if (!transition.ok) {
      return transition;
    }

    const committed = await ctx.commitTransition(transition.value, {
      toExecutiveId: input.toExecutiveId,
      assignedBy: input.actor.userId,
      at: ctx.operationAt,
    });

    if (!committed.ok) {
      return committed;
    }

    return Ok({ leadId: state.id });
  });
}

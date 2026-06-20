import type { ReassignLeadInput } from "~/contracts/workflow/inputs";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { fail, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { WorkflowActor } from "~/server/workflow/actor";

import { reassignLead } from "../../lead/domain/decide";
import { resolveAssignableExecutivesScope } from "../../lead/domain/policy";
import { runLeadTransaction } from "./transition";

export async function reassignLeadCommand(
  input: Omit<ReassignLeadInput, "newExecutiveId"> & {
    actor: WorkflowActor;
    toExecutiveId: number;
  },
  ports: {
    executor: DatabaseExecutor;
    now: number;
  },
): Promise<Result<{ leadId: string }, DomainError>> {
  return runLeadTransaction(ports, async (ctx) => {
    const scope = resolveAssignableExecutivesScope({
      actorRole: input.actor.role,
      actorBranchId: input.actor.branchId,
    });

    if (!scope.ok) {
      return scope;
    }

    const isAssignable = await ctx.repos.users.isExecutiveAssignable(
      scope.value,
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
      now: ctx.now,
    });

    if (!transition.ok) {
      return transition;
    }

    const committed = await ctx.commitTransition(transition.value, {
      toExecutiveId: input.toExecutiveId,
      assignedBy: input.actor.userId,
      at: ctx.now,
    });

    if (!committed.ok) {
      return committed;
    }

    return Ok({ leadId: state.id });
  });
}

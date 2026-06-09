import { randomUUIDv7 } from "bun";

import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { fail, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { ReassignLeadCommandInput } from "~/server/workflow/types";

import { reassignLead } from "../../domain/lead/commands";
import { resolveAssignableExecutivesScope } from "../../domain/lead/policy";
import { createLeadStateRepo } from "../../infrastructure/lead-state-repo";
import { createLeadUow } from "../../infrastructure/uow";
import { createWorkflowRepos } from "../../infrastructure/workflow-repos";

export async function reassignLeadCommand(
  input: ReassignLeadCommandInput,
  ports: { executor: DatabaseExecutor },
): Promise<Result<{ leadId: string }, DomainError>> {
  return ports.executor.transaction().execute(async (tx) => {
    const repos = createWorkflowRepos(tx);
    const leads = createLeadStateRepo(tx);
    const uow = createLeadUow(tx);
    const scope = resolveAssignableExecutivesScope({
      actorRole: input.actor.role,
      actorBranchId: input.actor.branchId,
    });
    if (!scope.ok) return scope;

    const isAssignable = await repos.users.isExecutiveAssignable(
      scope.value,
      input.toExecutiveId,
    );
    if (!isAssignable) {
      return Err(fail("invalid_executive"));
    }

    const state = await leads.findById(input.leadId);
    if (!state) return Err(fail("lead_not_found"));

    const now = Date.now();
    const transition = reassignLead(state, {
      actor: input.actor,
      toExecutiveId: input.toExecutiveId,
      now,
    });
    if (!transition.ok) return transition;

    const committed = await uow.commit({
      next: transition.value.next,
      events: transition.value.events,
      idempotencyKey: randomUUIDv7(),
      assignment: {
        toExecutiveId: input.toExecutiveId,
        assignedBy: input.actor.userId,
        at: now,
      },
    });
    if (!committed.ok) return committed;

    return Ok({ leadId: state.id });
  });
}

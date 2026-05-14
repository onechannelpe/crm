import { randomUUIDv7 } from "bun";

import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";
import type { WorkflowActor } from "~/server/workflow/types";

import { invalidLeadInput, leadNotFound } from "../../domain/lead/lead-errors";
import { resolveAssignableExecutivesScope } from "../../domain/lead/policy";
import { reassignLead } from "../../domain/lead/transitions";
import type { LeadStateRepository } from "../../infrastructure/lead-state-repo";
import type { WorkflowUserRepository } from "../ports/entities";
import type { LeadUnitOfWork } from "../ports/uow";

type Ports = {
  leads: LeadStateRepository;
  uow: LeadUnitOfWork;
  users: WorkflowUserRepository;
};

export async function reassignLeadCommand(
  input: {
    actor: WorkflowActor;
    leadId: string;
    toExecutiveId: number;
    idempotencyKey?: string;
  },
  ports: Ports,
): Promise<Result<{ leadId: string }, DomainError>> {
  const scope = resolveAssignableExecutivesScope({
    actorRole: input.actor.role,
    actorBranchId: input.actor.branchId,
  });
  if (!scope.ok) return scope;

  const isAssignable = await ports.users.isExecutiveAssignable(
    scope.value,
    input.toExecutiveId,
  );
  if (!isAssignable) {
    return invalidLeadInput(
      "invalid_executive",
      "Target executive is not assignable for this actor scope",
    );
  }

  const state = await ports.leads.findById(input.leadId);
  if (!state) return leadNotFound();

  const now = Date.now();
  const transition = reassignLead(state, {
    actor: input.actor,
    toExecutiveId: input.toExecutiveId,
    now,
  });
  if (!transition.ok) return transition;

  const committed = await ports.uow.commit({
    next: transition.value.next,
    events: transition.value.events,
    idempotencyKey: input.idempotencyKey ?? randomUUIDv7(),
    assignment: {
      toExecutiveId: input.toExecutiveId,
      assignedBy: input.actor.userId,
      at: now,
    },
  });
  if (!committed.ok) return committed;

  return Ok({ leadId: state.id });
}

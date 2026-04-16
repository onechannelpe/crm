import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";

import { invalidLeadInput } from "../../domain/lead/lead-errors";
import type { LeadReadRepository } from "../../ports/lead-read-repository";
import type { LeadUserScopeRepository } from "../../ports/lead-user-scope-repository";
import { prepareLeadCommand } from "../command-kernel/prepare-lead-command";
import type { ReassignLeadInput } from "../contracts/command-inputs";
import type { LeadCommandResult } from "../contracts/command-results";
import { resolveAssignableExecutivesScope } from "../policies/access";
import type { LeadMutationUow } from "../ports/lead-mutation-uow";
import type { LeadClock } from "../services/lead-clock";

type ReassignLeadCommandDeps = {
  leadReader: LeadReadRepository;
  mutationUow: LeadMutationUow;
  users: LeadUserScopeRepository;
  clock: LeadClock;
};

export async function reassignLeadCommand(
  deps: ReassignLeadCommandDeps,
  input: ReassignLeadInput,
): Promise<Result<LeadCommandResult, DomainError>> {
  const prepared = await prepareLeadCommand({
    leadReader: deps.leadReader,
    clock: deps.clock,
    actor: input.actor,
    leadId: input.leadId,
    operation: "reassign",
  });
  if (!prepared.ok) {
    return prepared;
  }

  if (prepared.value.lead.executiveId === input.toExecutiveId) {
    return invalidLeadInput(
      "same_executive",
      "Lead is already assigned to the selected executive",
    );
  }

  const scope = resolveAssignableExecutivesScope({
    actorRole: input.actor.role,
    actorBranchId: input.actor.branchId,
  });
  if (!scope.ok) {
    return scope;
  }

  const isAssignable = await deps.users.isExecutiveAssignable(
    scope.value,
    input.toExecutiveId,
  );
  if (!isAssignable) {
    return invalidLeadInput(
      "invalid_executive",
      "Target executive is not assignable for this actor scope",
    );
  }

  const outcome = await deps.mutationUow.commit({
    lead: prepared.value.lead,
    actorUserId: input.actor.userId,
    now: prepared.value.now,
    intent: {
      kind: "reassign",
      toExecutiveId: input.toExecutiveId,
    },
    assignment: {
      leadId: prepared.value.lead.id,
      toExecutiveId: input.toExecutiveId,
      assignedBy: input.actor.userId,
      assignedAt: prepared.value.now,
    },
  });
  if (!outcome.ok) {
    return outcome;
  }

  return Ok({ leadId: prepared.value.lead.id });
}

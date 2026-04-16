import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";

import { invalidLeadInput, leadNotFound } from "../../domain/lead/lead-errors";
import { authorizeLeadOperation } from "../../domain/lead/lead-policies";
import type { LeadAssignmentRepositoryPort } from "../../ports/lead-assignment-repository";
import type { LeadAuditRepository } from "../../ports/lead-audit-repository";
import type { LeadEventRepository } from "../../ports/lead-event-repository";
import type { LeadReadRepository } from "../../ports/lead-read-repository";
import type { LeadUserScopeRepository } from "../../ports/lead-user-scope-repository";
import type { LeadWriteRepository } from "../../ports/lead-write-repository";
import type { ReassignLeadInput } from "../contracts/command-inputs";
import type { LeadCommandResult } from "../contracts/command-results";
import { resolveAssignableExecutivesScope } from "../policies/access";
import type { LeadClock } from "../services/lead-clock";
import { executeLeadMutation } from "../services/lead-mutation-orchestrator";

type ReassignLeadCommandDeps = {
  leadReader: LeadReadRepository;
  leadWriter: LeadWriteRepository;
  eventRepository: LeadEventRepository;
  auditRepository: LeadAuditRepository;
  leadAssignments: LeadAssignmentRepositoryPort;
  users: LeadUserScopeRepository;
  clock: LeadClock;
};

export async function reassignLeadCommand(
  deps: ReassignLeadCommandDeps,
  input: ReassignLeadInput,
): Promise<Result<LeadCommandResult, DomainError>> {
  if (input.actor.branchId == null) {
    return invalidLeadInput("missing_branch", "Branch is required");
  }

  const lead = await deps.leadReader.findById(input.leadId);
  if (!lead) {
    return leadNotFound();
  }

  const canOperate = authorizeLeadOperation({
    actorUserId: input.actor.userId,
    actorRole: input.actor.role,
    leadExecutiveId: lead.executiveId,
    operation: "reassign",
  });
  if (!canOperate.ok) {
    return canOperate;
  }

  if (lead.executiveId === input.toExecutiveId) {
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

  const now = deps.clock.now();
  await deps.leadAssignments.replaceActiveAssignment({
    leadId: lead.id,
    toExecutiveId: input.toExecutiveId,
    assignedBy: input.actor.userId,
    assignedAt: now,
  });

  const outcome = await executeLeadMutation({
    deps,
    lead,
    actorUserId: input.actor.userId,
    now,
    intent: {
      kind: "reassign",
      toExecutiveId: input.toExecutiveId,
    },
  });
  if (!outcome.ok) {
    return outcome;
  }

  return Ok({ leadId: lead.id });
}

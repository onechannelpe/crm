import type { Role } from "~/lib/auth/access/rbac";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import {
  canReassignLead,
  requireLeadAccess,
  requirePipelineActionAccess,
  resolveAssignableExecutivesScope,
} from "../policies/access";
import type { LeadRepository } from "../ports/lead-repository";
import type { WorkflowUserRepository } from "../ports/user-repository";
import type { AssignableExecutiveView } from "~/contracts/workflow";

type AssignableExecutivesQueryDeps = {
  leads: LeadRepository;
  users: WorkflowUserRepository;
};

export async function listAssignableExecutives(
  deps: AssignableExecutivesQueryDeps,
  input: {
    actorUserId: number;
    actorRole: Role;
    actorBranchId: number;
    leadId: string;
    search?: string;
    limit?: number;
  },
): Promise<Result<AssignableExecutiveView[], DomainError>> {
  const canReassign = requirePipelineActionAccess(
    input.actorRole,
    canReassignLead,
  );
  if (!canReassign.ok) {
    return canReassign;
  }

  const lead = await deps.leads.findById(input.leadId);
  if (!lead) {
    return Err(domainError("not_found", "lead_not_found", "Lead not found"));
  }

  const canAccessLead = requireLeadAccess({
    actorUserId: input.actorUserId,
    actorRole: input.actorRole,
    executiveId: lead.executiveId,
  });
  if (!canAccessLead.ok) {
    return canAccessLead;
  }

  const scope = resolveAssignableExecutivesScope({
    actorRole: input.actorRole,
    actorBranchId: input.actorBranchId,
  });
  if (!scope.ok) {
    return scope;
  }

  const users = await deps.users.listAssignableExecutives(scope.value, {
    search: input.search,
    limit: input.limit,
  });

  return Ok(users);
}

import type { Role } from "~/lib/auth/access/rbac";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { AssignableExecutiveView } from "~/server/workflow/types";

import {
  authorizeLeadAction,
  requireCapability,
  resolveAssignableExecutivesScope,
} from "../../domain/lead/policy";
import type { WorkflowUserRepository } from "../ports/entities";
import type { LeadRepository } from "../ports/lead";

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
  const canReassign = requireCapability("reassign", { role: input.actorRole });
  if (!canReassign.ok) return canReassign;

  const lead = await deps.leads.findById(input.leadId);
  if (!lead) {
    return Err(domainError("not_found", "lead_not_found", "Lead not found"));
  }

  const canAccess = authorizeLeadAction(
    "view",
    { userId: input.actorUserId, role: input.actorRole },
    lead,
  );
  if (!canAccess.ok) return canAccess;

  const scope = resolveAssignableExecutivesScope({
    actorRole: input.actorRole,
    actorBranchId: input.actorBranchId,
  });
  if (!scope.ok) return scope;

  const users = await deps.users.listAssignableExecutives(scope.value, {
    search: input.search,
    limit: input.limit,
  });

  return Ok(users);
}

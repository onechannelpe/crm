import type { AssignableExecutiveView } from "~/contracts/workflow/views";
import type { Role } from "~/domain/auth/access/rbac";
import { fail, type DomainError } from "~/domain/errors";
import type { BranchId, UserId, WorkflowLeadId } from "~/domain/ids";
import {
  authorizeLeadAction,
  requireCapability,
  resolveAssignableExecutivesScope,
} from "~/server/workflow/lead/domain/policy";
import type { LeadReader } from "~/server/workflow/lead/read/ports";
import type { WorkflowUserRepository } from "~/server/workflow/lead/read/users-repo";
import { Err, Ok, type Result } from "~/shared/result";

type AssignableExecutivesQueryDeps = {
  leads: LeadReader;
  users: WorkflowUserRepository;
};

export async function listAssignableExecutives(
  deps: AssignableExecutivesQueryDeps,
  input: {
    actorUserId: UserId;
    actorRole: Role;
    actorBranchId: BranchId;
    leadId: WorkflowLeadId;
    search?: string;
    limit?: number;
  },
): Promise<Result<AssignableExecutiveView[], DomainError>> {
  const canReassign = requireCapability("reassign", { role: input.actorRole });
  if (!canReassign.ok) return canReassign;

  const lead = await deps.leads.findById(input.leadId);
  if (!lead) {
    return Err(fail("lead_not_found"));
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

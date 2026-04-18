import type { Role } from "~/lib/auth/access/rbac";
import { hasPermission } from "~/lib/auth/access/rbac";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import type { UserId, LeadId, BranchId } from "~/server/shared/ids";
import { Err, Ok, type Result } from "~/server/shared/result";

import type { SourcingPolicyDeps } from "../deps/sourcing-policy";

export async function updateSourcingPolicy(
  deps: SourcingPolicyDeps,
  input: {
    actorUserId: UserId;
    actorRole: Role;
    branchId: BranchId;
    engineAssignmentEnabled: boolean;
  },
): Promise<
  Result<
    {
      branchId: BranchId;
      engineAssignmentEnabled: boolean;
    },
    DomainError
  >
> {
  if (!hasPermission(input.actorRole, "capacity:policy:manage")) {
    return Err(domainError("forbidden", "forbidden", "Access denied"));
  }

  await deps.sourcingPolicies.upsert({
    branchId: input.branchId,
    engineAssignmentEnabled: input.engineAssignmentEnabled,
    updatedAt: Date.now(),
    updatedByUserId: input.actorUserId,
  });

  return Ok({
    branchId: input.branchId,
    engineAssignmentEnabled: input.engineAssignmentEnabled,
  });
}

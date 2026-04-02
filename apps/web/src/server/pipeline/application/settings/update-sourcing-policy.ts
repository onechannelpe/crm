import type { Role } from "~/lib/auth/access/rbac";
import { hasPermission } from "~/lib/auth/access/rbac";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import type { LeadSourcingPolicyRepository } from "../ports";

type UpdateSourcingPolicyDeps = {
  sourcingPolicies: LeadSourcingPolicyRepository;
};

export async function updateSourcingPolicy(
  deps: UpdateSourcingPolicyDeps,
  input: {
    actorUserId: number;
    actorRole: Role;
    branchId: number;
    engineAssignmentEnabled: boolean;
  },
): Promise<
  Result<
    {
      branchId: number;
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

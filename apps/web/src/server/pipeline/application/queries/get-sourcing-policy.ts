import type { Role } from "~/lib/auth/access/rbac";
import { hasPermission } from "~/lib/auth/access/rbac";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import type { LeadSourcingPolicyRepository } from "../ports/sourcing-policy-repository";

type GetSourcingPolicyDeps = {
  sourcingPolicies: LeadSourcingPolicyRepository;
};

export async function getSourcingPolicy(
  deps: GetSourcingPolicyDeps,
  input: {
    actorRole: Role;
    branchId: number;
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

  const current = await deps.sourcingPolicies.findByBranchId(input.branchId);

  return Ok({
    branchId: input.branchId,
    engineAssignmentEnabled: current?.engineAssignmentEnabled === true,
  });
}

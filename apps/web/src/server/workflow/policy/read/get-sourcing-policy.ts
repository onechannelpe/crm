import { hasPermission, type Role } from "~/domain/auth/access/rbac";
import { forbidden, type DomainError } from "~/domain/errors";
import type { BranchId } from "~/domain/ids";
import { Err, Ok, type Result } from "~/shared/result";

import type { LeadSourcingPolicyRepository } from "../sourcing-policy-repo";

export async function getSourcingPolicy(
  deps: {
    sourcingPolicies: LeadSourcingPolicyRepository;
  },
  input: {
    actorRole: Role;
    branchId: BranchId;
  },
): Promise<
  Result<
    {
      branchId: string;
      engineAssignmentEnabled: boolean;
    },
    DomainError
  >
> {
  if (!hasPermission(input.actorRole, "capacity:policy:manage")) {
    return Err(forbidden());
  }

  const current = await deps.sourcingPolicies.findByBranchId(input.branchId);

  return Ok({
    branchId: input.branchId,
    engineAssignmentEnabled: current?.engineAssignmentEnabled === true,
  });
}

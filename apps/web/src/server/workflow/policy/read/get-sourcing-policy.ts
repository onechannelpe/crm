import { hasPermission, type Role } from "~/lib/auth/access/rbac";
import { forbidden, type DomainError } from "~/server/shared/domain-error";
import type { BranchId } from "~/server/shared/ids";
import { Err, Ok, type Result } from "~/server/shared/result";

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

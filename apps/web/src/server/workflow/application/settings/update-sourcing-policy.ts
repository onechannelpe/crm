import { hasPermission } from "~/lib/auth/access/rbac";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import type { UpdateSourcingPolicyInput } from "../contracts/command-inputs";
import type { SourcingPolicyDeps } from "../deps/sourcing-policy";

export async function updateSourcingPolicy(
  deps: SourcingPolicyDeps,
  input: UpdateSourcingPolicyInput,
): Promise<
  Result<
    {
      branchId: number;
      engineAssignmentEnabled: boolean;
    },
    DomainError
  >
> {
  if (!hasPermission(input.actor.role, "capacity:policy:manage")) {
    return Err(domainError("forbidden", "forbidden", "Access denied"));
  }

  await deps.sourcingPolicies.upsert({
    branchId: input.branchId,
    engineAssignmentEnabled: input.engineAssignmentEnabled,
    updatedAt: Date.now(),
    updatedByUserId: input.actor.userId,
  });

  return Ok({
    branchId: input.branchId,
    engineAssignmentEnabled: input.engineAssignmentEnabled,
  });
}

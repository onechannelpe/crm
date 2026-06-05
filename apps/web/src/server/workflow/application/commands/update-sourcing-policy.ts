import { hasPermission } from "~/lib/auth/access/rbac";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { UpdateSourcingPolicyCommandInput } from "~/server/workflow/types";

import type { LeadSourcingPolicyRepository } from "../ports/entities";

type Ports = {
  sourcingPolicies: LeadSourcingPolicyRepository;
};

export async function updateSourcingPolicy(
  input: UpdateSourcingPolicyCommandInput,
  ports: Ports,
): Promise<
  Result<{ branchId: number; engineAssignmentEnabled: boolean }, DomainError>
> {
  if (!hasPermission(input.actor.role, "capacity:policy:manage")) {
    return Err(domainError("forbidden", "forbidden", "Access denied"));
  }

  await ports.sourcingPolicies.upsert({
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

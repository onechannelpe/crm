import { hasPermission } from "~/lib/auth/access/rbac";
import { forbidden, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { UpdateSourcingPolicyCommandInput } from "~/server/workflow/types";

import type { LeadSourcingPolicyRepository } from "../ports/entities";

export async function updateSourcingPolicy(
  input: UpdateSourcingPolicyCommandInput,
  ports: { sourcingPolicies: LeadSourcingPolicyRepository },
): Promise<
  Result<{ branchId: number; engineAssignmentEnabled: boolean }, DomainError>
> {
  if (!hasPermission(input.actor.role, "capacity:policy:manage")) {
    return Err(forbidden());
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

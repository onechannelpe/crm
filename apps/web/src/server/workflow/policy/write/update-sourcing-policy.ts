import { hasPermission } from "~/domain/auth/access/rbac";
import { forbidden, type DomainError } from "~/domain/errors";
import type { BranchId } from "~/domain/ids";
import type { WorkflowActor } from "~/server/workflow/actor";
import { Err, Ok, type Result } from "~/shared/result";

import type { LeadSourcingPolicyRepository } from "../sourcing-policy-repo";

export async function updateSourcingPolicy(
  input: {
    actor: WorkflowActor;
    branchId: BranchId;
    engineAssignmentEnabled: boolean;
  },
  sourcingPolicies: LeadSourcingPolicyRepository,
  updatedAt: Date,
): Promise<
  Result<{ branchId: string; engineAssignmentEnabled: boolean }, DomainError>
> {
  if (!hasPermission(input.actor.role, "capacity:policy:manage")) {
    return Err(forbidden());
  }

  await sourcingPolicies.upsert({
    branchId: input.branchId,
    engineAssignmentEnabled: input.engineAssignmentEnabled,
    updatedAt,
    updatedByUserId: input.actor.userId,
  });

  return Ok({
    branchId: input.branchId,
    engineAssignmentEnabled: input.engineAssignmentEnabled,
  });
}

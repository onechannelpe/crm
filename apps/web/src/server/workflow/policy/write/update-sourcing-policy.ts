import { hasPermission } from "~/domain/auth/access/rbac";
import { forbidden, type DomainError } from "~/domain/errors";
import type { BranchId } from "~/domain/ids";
import type { OperationContext } from "~/server/platform/operation/context";
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
  operation: OperationContext,
): Promise<
  Result<{ branchId: string; engineAssignmentEnabled: boolean }, DomainError>
> {
  if (!hasPermission(input.actor.role, "capacity:policy:manage")) {
    return Err(forbidden());
  }

  await sourcingPolicies.upsert({
    branchId: input.branchId,
    engineAssignmentEnabled: input.engineAssignmentEnabled,
    updatedAt: operation.operationAt,
    updatedByUserId: input.actor.userId,
  });

  return Ok({
    branchId: input.branchId,
    engineAssignmentEnabled: input.engineAssignmentEnabled,
  });
}

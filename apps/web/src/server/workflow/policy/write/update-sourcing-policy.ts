import { hasPermission } from "~/lib/auth/access/rbac";
import { forbidden, type DomainError } from "~/server/shared/domain-error";
import type { BranchId } from "~/server/shared/ids";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { WorkflowActor } from "~/server/workflow/actor";

import type { LeadSourcingPolicyRepository } from "../sourcing-policy-repo";

export async function updateSourcingPolicy(
  input: {
    actor: WorkflowActor;
    branchId: BranchId;
    engineAssignmentEnabled: boolean;
  },
  ports: {
    sourcingPolicies: LeadSourcingPolicyRepository;
    now: Date;
  },
): Promise<
  Result<{ branchId: string; engineAssignmentEnabled: boolean }, DomainError>
> {
  if (!hasPermission(input.actor.role, "capacity:policy:manage")) {
    return Err(forbidden());
  }

  await ports.sourcingPolicies.upsert({
    branchId: input.branchId,
    engineAssignmentEnabled: input.engineAssignmentEnabled,
    updatedAt: ports.now,
    updatedByUserId: input.actor.userId,
  });

  return Ok({
    branchId: input.branchId,
    engineAssignmentEnabled: input.engineAssignmentEnabled,
  });
}

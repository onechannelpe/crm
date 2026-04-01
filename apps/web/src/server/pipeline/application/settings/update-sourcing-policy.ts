import type { Role } from "~/lib/auth/access/rbac";
import { hasPermission } from "~/lib/auth/access/rbac";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { runInPipelineTransaction } from "~/server/shared/pipeline-transaction";
import { Err, Ok, type Result } from "~/server/shared/result";

import { toPolicyFlag } from "../../domain/sourcing-policy";
import { createPipelineDeps } from "../../infrastructure/deps";

export async function updateSourcingPolicy(input: {
  actorUserId: number;
  actorRole: Role;
  branchId: number;
  engineAssignmentEnabled: boolean;
}): Promise<
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

  return runInPipelineTransaction(async ({ executor }) => {
    const deps = createPipelineDeps(executor);
    await deps.sourcingPolicies.upsert({
      branch_id: input.branchId,
      engine_assignment_enabled: toPolicyFlag(input.engineAssignmentEnabled),
      updated_at: Date.now(),
      updated_by_user_id: input.actorUserId,
    });

    return Ok({
      branchId: input.branchId,
      engineAssignmentEnabled: input.engineAssignmentEnabled,
    });
  });
}

import type { Role } from "~/lib/auth/access/rbac";
import { hasPermission } from "~/lib/auth/access/rbac";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import { createPipelineQueryDeps } from "../../infrastructure/deps";

export async function getSourcingPolicy(input: {
  actorRole: Role;
  branchId: number;
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

  const deps = createPipelineQueryDeps();
  const current = await deps.sourcingPolicies.findByBranchId(input.branchId);

  return Ok({
    branchId: input.branchId,
    engineAssignmentEnabled: current?.engine_assignment_enabled === 1,
  });
}

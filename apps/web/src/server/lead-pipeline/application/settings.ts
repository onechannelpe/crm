import { hasPermission, type Role } from "~/lib/auth/access/rbac";
import { db } from "~/lib/db/db";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { runInPipelineTransaction } from "~/server/shared/pipeline-transaction";
import { Err, Ok, type Result } from "~/server/shared/result";

import { createLeadPipelineRepos } from "../infrastructure/repos";

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

  const repos = createLeadPipelineRepos(db);
  const current = await repos.sourcingPolicies.findByBranchId(input.branchId);

  return Ok({
    branchId: input.branchId,
    engineAssignmentEnabled: current?.engine_assignment_enabled === 1,
  });
}

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
    const repos = createLeadPipelineRepos(executor);
    await repos.sourcingPolicies.upsert({
      branch_id: input.branchId,
      engine_assignment_enabled: input.engineAssignmentEnabled ? 1 : 0,
      updated_at: Date.now(),
      updated_by_user_id: input.actorUserId,
    });

    return Ok({
      branchId: input.branchId,
      engineAssignmentEnabled: input.engineAssignmentEnabled,
    });
  });
}

import type { DomainError } from "~/domain/errors";
import type { UserId } from "~/domain/ids";
import type { ActorScope } from "~/server/capacity/application/actor-scope";
import { getLeadCapacitySnapshot } from "~/server/capacity/application/queries/get-lead-capacity-snapshot";
import type {
  LeadPolicyDefaultsRepo,
  LeadPolicyOverridesRepo,
} from "~/server/capacity/infrastructure/policy-repos";
import type {
  LeadCapacityGrantsRepo,
  LeadUsageCommitsRepo,
  LeadUsageReservationsRepo,
} from "~/server/capacity/infrastructure/usage-repo";
import { isErr, Ok, type Result } from "~/shared/result";

import { computeNeededAssignments } from "../domain/assignment-demand";

export type AssignmentPlanRepos = {
  users: {
    findById(id: UserId): Promise<ActorScope | undefined>;
  };
  leadPolicyDefaults: LeadPolicyDefaultsRepo;
  leadPolicyOverrides: LeadPolicyOverridesRepo;
  leadCapacityGrants: LeadCapacityGrantsRepo;
  leadUsageReservations: LeadUsageReservationsRepo;
  leadUsageCommits: LeadUsageCommitsRepo;
  contactAssignments: { countActiveByUser(userId: UserId): Promise<number> };
};

export type ContactAssignmentPlan = {
  requested: number;
};

export async function planContactAssignments(
  actorUserId: UserId,
  repos: AssignmentPlanRepos,
): Promise<Result<ContactAssignmentPlan, DomainError>> {
  const snapshotResult = await getLeadCapacitySnapshot(
    actorUserId,
    repos,
    new Date(),
  );
  if (isErr(snapshotResult)) {
    return snapshotResult;
  }

  return Ok({
    requested: computeNeededAssignments(
      snapshotResult.value.activeAssignments,
      snapshotResult.value.policy.bufferTarget,
    ),
  });
}

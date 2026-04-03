import type {
  LeadCapacityGrantsRepo,
  LeadUsageCommitsRepo,
  LeadUsageReservationsRepo,
} from "~/server/capacity-usage/repos";
import { getLeadCapacitySnapshot } from "~/server/capacity/application/get-lead-capacity-snapshot";
import type {
  LeadPolicyDefaultsRepo,
  LeadPolicyOverridesRepo,
} from "~/server/capacity/infrastructure/policy-repos";
import type { DomainError } from "~/server/shared/domain-error";
import type { UserId } from "~/server/shared/ids";
import { isErr, Ok, type Result } from "~/server/shared/result";

import { computeNeededAssignments } from "../domain/refill";

export type AssignmentPlanRepos = {
  users: {
    findById(
      id: UserId,
    ): Promise<{ team_id: number | null; branch_id: number } | undefined>;
  };
  leadPolicyDefaults: LeadPolicyDefaultsRepo;
  leadPolicyOverrides: LeadPolicyOverridesRepo;
  leadCapacityGrants: LeadCapacityGrantsRepo;
  leadUsageReservations: LeadUsageReservationsRepo;
  leadUsageCommits: LeadUsageCommitsRepo;
  contactAssignments: { countActiveByUser(userId: number): Promise<number> };
};

export type ContactAssignmentPlan = {
  requested: number;
  remainingCapacity: number;
};

export async function planContactAssignments(
  actorUserId: UserId,
  repos: AssignmentPlanRepos,
): Promise<Result<ContactAssignmentPlan, DomainError>> {
  const snapshotResult = await getLeadCapacitySnapshot(actorUserId, repos);
  if (isErr(snapshotResult)) {
    return snapshotResult;
  }

  return Ok({
    requested: computeNeededAssignments(
      snapshotResult.value.activeAssignments,
      snapshotResult.value.policy.bufferTarget,
    ),
    remainingCapacity: snapshotResult.value.remaining,
  });
}

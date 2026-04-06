import type {
  LeadCapacityGrantsRepo,
  LeadUsageCommitsRepo,
  LeadUsageReservationsRepo,
} from "~/server/capacity-usage/repos";
import {
  buildLeadCapacitySnapshot,
  type LeadCapacitySnapshot,
} from "~/server/capacity/domain/snapshot";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import type { UserId } from "~/server/shared/ids";
import { Err, Ok, type Result } from "~/server/shared/result";
import { currentDailyPeriod } from "~/server/shared/time";

import type { ActorScope } from "./actor-scope";
import { getEffectiveLeadPolicy } from "./lead-policy";

interface SnapshotRepos {
  users: {
    findById(id: UserId): Promise<ActorScope | undefined>;
  };
  leadPolicyDefaults: Parameters<
    typeof getEffectiveLeadPolicy
  >[1]["leadPolicyDefaults"];
  leadPolicyOverrides: Parameters<
    typeof getEffectiveLeadPolicy
  >[1]["leadPolicyOverrides"];
  leadCapacityGrants: LeadCapacityGrantsRepo;
  leadUsageReservations: LeadUsageReservationsRepo;
  leadUsageCommits: LeadUsageCommitsRepo;
  contactAssignments: { countActiveByUser(userId: number): Promise<number> };
}

export async function getLeadCapacitySnapshot(
  userId: UserId,
  repos: SnapshotRepos,
): Promise<Result<LeadCapacitySnapshot, DomainError>> {
  try {
    const policyResult = await getEffectiveLeadPolicy(userId, repos);
    if (!policyResult.ok) return policyResult;

    const { date } = currentDailyPeriod(new Date());
    const [grants, reservations, commits, activeAssignments] =
      await Promise.all([
        repos.leadCapacityGrants.findByUserAndDate(userId, date),
        repos.leadUsageReservations.findByUserAndDate(userId, date),
        repos.leadUsageCommits.findByUserAndDate(userId, date),
        repos.contactAssignments.countActiveByUser(userId),
      ]);

    return Ok(
      buildLeadCapacitySnapshot({
        policy: policyResult.value,
        grants,
        reservations,
        commits,
        activeAssignments,
      }),
    );
  } catch (error) {
    return Err(
      domainError(
        "unexpected",
        "unexpected",
        error instanceof Error
          ? error.message
          : "Failed to get lead capacity snapshot",
      ),
    );
  }
}

export type { LeadCapacitySnapshot };

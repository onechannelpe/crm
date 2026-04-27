import type {
  SearchCapacityGrantsRepo,
  SearchUsageCommitsRepo,
  SearchUsageReservationsRepo,
} from "~/server/capacity-usage/repos";
import {
  buildSearchCapacitySnapshot,
  type SearchCapacitySnapshot,
} from "~/server/capacity/domain/snapshot";
import type { DomainError } from "~/server/shared/domain-error";
import type { UserId } from "~/server/shared/ids";
import { Ok, type Result } from "~/server/shared/result";
import { currentMonthlyPeriod } from "~/server/shared/time";

import type { ActorScope } from "./actor-scope";
import { getEffectiveSearchPolicy } from "./search-policy";

interface SnapshotRepos {
  users: {
    findById(id: UserId): Promise<ActorScope | undefined>;
  };
  searchPolicyDefaults: Parameters<
    typeof getEffectiveSearchPolicy
  >[1]["searchPolicyDefaults"];
  searchPolicyOverrides: Parameters<
    typeof getEffectiveSearchPolicy
  >[1]["searchPolicyOverrides"];
  searchCapacityGrants: SearchCapacityGrantsRepo;
  searchUsageReservations: SearchUsageReservationsRepo;
  searchUsageCommits: SearchUsageCommitsRepo;
}

export async function getSearchCapacitySnapshot(
  userId: UserId,
  repos: SnapshotRepos,
): Promise<Result<SearchCapacitySnapshot, DomainError>> {
  try {
    const policyResult = await getEffectiveSearchPolicy(userId, repos);
    if (!policyResult.ok) return policyResult;

    const { periodStart, periodEnd } = currentMonthlyPeriod(new Date());
    const [grants, reservations, commits] = await Promise.all([
      repos.searchCapacityGrants.findByUserAndPeriod(
        userId,
        periodStart,
        periodEnd,
      ),
      repos.searchUsageReservations.findByUserAndPeriod(
        userId,
        periodStart,
        periodEnd,
      ),
      repos.searchUsageCommits.findByUserAndPeriod(
        userId,
        periodStart,
        periodEnd,
      ),
    ]);

    return Ok(
      buildSearchCapacitySnapshot({
        policy: policyResult.value,
        grants,
        reservations,
        commits,
        periodStart,
        periodEnd,
      }),
    );
  } catch (error) {
    throw error;
  }
}

export type { SearchCapacitySnapshot };

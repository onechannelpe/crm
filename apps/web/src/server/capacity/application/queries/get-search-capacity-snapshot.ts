import type { DomainError } from "~/domain/errors";
import type { UserId } from "~/domain/ids";
import { appMonthRange } from "~/domain/time/app-time";
import {
  buildSearchCapacitySnapshot,
  type SearchCapacitySnapshot,
} from "~/server/capacity/domain/snapshot";
import type {
  SearchCapacityGrantsRepo,
  SearchUsageCommitsRepo,
  SearchUsageReservationsRepo,
} from "~/server/capacity/infrastructure/usage-repo";
import type { OperationContext } from "~/server/platform/operation/context";
import { Ok, type Result } from "~/shared/result";

import type { ActorScope } from "../actor-scope";
import { getEffectiveSearchPolicy } from "../resolve-search-policy";

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
  operation: OperationContext,
): Promise<Result<SearchCapacitySnapshot, DomainError>> {
  const policyResult = await getEffectiveSearchPolicy(userId, repos, operation);
  if (!policyResult.ok) {
    return policyResult;
  }

  const range = appMonthRange(operation.operationAt);
  const [grants, reservations, commits] = await Promise.all([
    repos.searchCapacityGrants.findByUserAndRange(userId, range),
    repos.searchUsageReservations.findByUserAndRange(userId, range),
    repos.searchUsageCommits.findByUserAndRange(userId, range),
  ]);

  return Ok(
    buildSearchCapacitySnapshot({
      policy: policyResult.value,
      grants,
      reservations,
      commits,
    }),
  );
}

export type { SearchCapacitySnapshot };

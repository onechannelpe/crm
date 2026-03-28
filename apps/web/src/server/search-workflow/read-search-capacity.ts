import type {
  SearchCapacityGrantsRepo,
  SearchUsageCommitsRepo,
  SearchUsageReservationsRepo,
} from "~/server/capacity-usage/repos";
import { getSearchCapacitySnapshot } from "~/server/capacity-usage/search-usage";
import type { SearchCapacitySnapshot } from "~/server/capacity-usage/snapshot";
import type {
  SearchPolicyDefaultsRepo,
  SearchPolicyOverridesRepo,
} from "~/server/capacity/infrastructure/policy-repos";
import type { DomainError } from "~/server/shared/domain-error";
import type { UserId } from "~/server/shared/ids";
import type { Result } from "~/server/shared/result";

export type { SearchCapacitySnapshot };

interface ReadRepos {
  users: {
    findById(
      id: UserId,
    ): Promise<{ team_id: number | null; branch_id: number } | undefined>;
  };
  searchPolicyDefaults: SearchPolicyDefaultsRepo;
  searchPolicyOverrides: SearchPolicyOverridesRepo;
  searchCapacityGrants: SearchCapacityGrantsRepo;
  searchUsageReservations: SearchUsageReservationsRepo;
  searchUsageCommits: SearchUsageCommitsRepo;
}

export function getSearchCapacityForUser(
  userId: UserId,
  repos: ReadRepos,
): Promise<Result<SearchCapacitySnapshot, DomainError>> {
  return getSearchCapacitySnapshot(userId, repos);
}

import type {
  SearchPolicyDefaultsRepo,
  SearchPolicyOverridesRepo,
} from "~/server/capacity-policy/repos";
import type {
  SearchCapacityGrantsRepo,
  SearchUsageCommitsRepo,
  SearchUsageReservationsRepo,
} from "~/server/capacity-usage/repos";
import {
  cancelSearchUsage,
  commitSearchUsage,
  getSearchCapacitySnapshot,
  reserveSearchUsage,
} from "~/server/capacity-usage/search-usage";
import { engineClient } from "~/server/shared/composition-root";
import { type DomainError } from "~/server/shared/domain-error";
import type { UserId } from "~/server/shared/ids";
import type { SearchType } from "~/server/shared/pipeline-types";
import { isErr, Ok, type Result } from "~/server/shared/result";

import { mapToSearchResult, type SearchResult_ } from "./domain";

export interface RunDirectSearchCommand {
  actorUserId: UserId;
  type: SearchType;
  value: string;
  limit: number;
}

interface SearchRepos {
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

export async function runDirectSearch(
  command: RunDirectSearchCommand,
  repos: SearchRepos,
  engine: { search: typeof engineClient.search } = engineClient,
): Promise<Result<SearchResult_, DomainError>> {
  const snapshotResult = await getSearchCapacitySnapshot(
    command.actorUserId,
    repos,
  );
  if (isErr(snapshotResult)) return snapshotResult;

  const reservationResult = await reserveSearchUsage(
    {
      actorUserId: command.actorUserId,
      amount: 1,
      remainingCapacity: snapshotResult.value.remaining,
      reason: "direct_search",
    },
    repos,
  );
  if (isErr(reservationResult)) return reservationResult;

  const reservationId = reservationResult.value;

  const searchResult = await engine.search(
    command.type,
    command.value,
    command.limit,
  );

  if (isErr(searchResult)) {
    await cancelSearchUsage(
      { reservationId, reason: "external_failure" },
      repos,
    );
    return searchResult;
  }

  const commitResult = await commitSearchUsage(
    { reservationId, amount: 1 },
    repos,
  );
  if (isErr(commitResult)) return commitResult;

  return Ok(mapToSearchResult(searchResult.value));
}

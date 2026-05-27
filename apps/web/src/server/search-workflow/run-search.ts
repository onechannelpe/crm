import type { SearchDirectResult } from "~/contracts/search/results";
import type { SearchIntent } from "~/contracts/search/vocabulary";
import type {
  SearchCapacityGrantsRepo,
  SearchUsageCommitsRepo,
  SearchUsageReservationsRepo,
} from "~/server/capacity-usage/repos";
import {
  cancelSearchUsage,
  commitSearchUsage,
  reserveSearchUsage,
} from "~/server/capacity-usage/search-usage";
import type { ActorScope } from "~/server/capacity/application/actor-scope";
import { getSearchCapacitySnapshot } from "~/server/capacity/application/queries/get-search-capacity-snapshot";
import type {
  SearchPolicyDefaultsRepo,
  SearchPolicyOverridesRepo,
} from "~/server/capacity/infrastructure/policy-repos";
import { type DomainError } from "~/server/shared/domain-error";
import type { EngineClient } from "~/server/shared/engine/client";
import type { UserId } from "~/server/shared/ids";
import { isErr, Ok, type Result } from "~/server/shared/result";

export interface RunDirectSearchCommand {
  actorUserId: UserId;
  intent: SearchIntent;
  query: string;
  limit: number;
}

interface SearchRepos {
  users: {
    findById(id: UserId): Promise<ActorScope | undefined>;
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
  engine: Pick<EngineClient, "search">,
): Promise<Result<SearchDirectResult, DomainError>> {
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
    command.intent,
    command.query,
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

  return Ok({ rows: searchResult.value });
}

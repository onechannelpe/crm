import type { SearchDirectResult } from "~/contracts/search/results";
import type { SearchIntent } from "~/contracts/search/vocabulary";
import type { ActorScope } from "~/server/capacity/application/actor-scope";
import { getSearchCapacitySnapshot } from "~/server/capacity/application/queries/get-search-capacity-snapshot";
import { executeWithUsageReservation } from "~/server/capacity/application/usage/ledger";
import type {
  SearchPolicyDefaultsRepo,
  SearchPolicyOverridesRepo,
} from "~/server/capacity/infrastructure/policy-repos";
import type {
  SearchCapacityGrantsRepo,
  SearchUsageCommitsRepo,
  SearchUsageReservationsRepo,
} from "~/server/capacity/infrastructure/usage-repo";
import { type DomainError } from "~/server/shared/domain-error";
import type { EngineClient } from "~/server/shared/engine/client";
import { asSearchReservationId, type UserId } from "~/server/shared/ids";
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

  return executeWithUsageReservation(
    {
      kind: "search",
      actorUserId: command.actorUserId,
      requested: 1,
      remainingCapacity: snapshotResult.value.remaining,
      reserveReason: "direct_search",
      failureReason: "external_failure",
      brand: asSearchReservationId,
    },
    {
      reservations: repos.searchUsageReservations,
      commits: repos.searchUsageCommits,
    },
    async () => {
      const searchResult = await engine.search(
        command.intent,
        command.query,
        command.limit,
      );
      if (isErr(searchResult)) return searchResult;
      return Ok({ value: { rows: searchResult.value }, consumed: 1 });
    },
  );
}

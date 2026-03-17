import {
  cancelSearchUsage,
  commitSearchUsage,
  reserveSearchUsage,
} from "~/server/capacity-usage/search-usage";
import type {
  SearchCapacityGrantsRepo,
  SearchUsageCommitsRepo,
  SearchUsageReservationsRepo,
} from "~/server/capacity-usage/repos";
import type { SearchPolicyDefaultsRepo, SearchPolicyOverridesRepo } from "~/server/capacity-policy/repos";
import { type DomainError } from "~/server/shared/domain-error";
import type { UserId } from "~/server/shared/ids";
import { isErr, Ok, type Result } from "~/server/shared/result";
import type { SearchType } from "~/server/shared/pipeline-types";

import { mapToSearchResult, type SearchResult_ } from "./domain";
import { search } from "./gateway";
import type { EngineClient } from "~/server/shared/engine/client";
import { engineClient } from "~/server/shared/engine";

export interface RunDirectSearchCommand {
  actorUserId: UserId;
  type: SearchType;
  value: string;
  limit: number;
}

interface SearchRepos {
  users: { findById(id: UserId): Promise<{ team_id: number | null; branch_id: number } | undefined> };
  searchPolicyDefaults: SearchPolicyDefaultsRepo;
  searchPolicyOverrides: SearchPolicyOverridesRepo;
  searchCapacityGrants: SearchCapacityGrantsRepo;
  searchUsageReservations: SearchUsageReservationsRepo;
  searchUsageCommits: SearchUsageCommitsRepo;
}

export async function runDirectSearch(
  command: RunDirectSearchCommand,
  repos: SearchRepos,
  engine: EngineClient = engineClient,
): Promise<Result<SearchResult_, DomainError>> {
  const reservationResult = await reserveSearchUsage(
    { actorUserId: command.actorUserId, amount: 1, reason: "direct_search" },
    repos,
  );
  if (isErr(reservationResult)) return reservationResult;

  const reservationId = reservationResult.value;

  const searchResult = await search({ type: command.type, value: command.value, limit: command.limit }, engine);

  if (isErr(searchResult)) {
    await cancelSearchUsage({ reservationId, reason: "external_failure" }, repos);
    return searchResult;
  }

  await commitSearchUsage({ reservationId, amount: 1 }, repos);
  return Ok(mapToSearchResult(searchResult.value));
}

import { getSearchCapacitySnapshot } from "~/server/capacity/application/queries/get-search-capacity-snapshot";
import type { UsageReservationPorts } from "~/server/capacity/application/usage/ledger";
import { createCapacityUsersRepo } from "~/server/capacity/infrastructure/capacity-users-repo";
import {
  createSearchPolicyDefaultsRepo,
  createSearchPolicyOverridesRepo,
} from "~/server/capacity/infrastructure/policy-repos";
import {
  createSearchCapacityGrantsRepo,
  createSearchUsageCommitsRepo,
  createSearchUsageReservationsRepo,
} from "~/server/capacity/infrastructure/usage-repo";
import { createEventsRepo } from "~/server/event-logs/events-repo";
import type { DatabaseExecutor } from "~/server/platform/database/executor";
import { createActionRateLimitsRepo } from "~/server/security/repos-action-rate-limits";
import { isErr, Ok } from "~/shared/result";

import { infra, type ServerInfra } from "./infra";
import { memo } from "./memo";

function buildSearchUsageRepos(executor: DatabaseExecutor) {
  return {
    users: createCapacityUsersRepo(executor),
    searchPolicyDefaults: createSearchPolicyDefaultsRepo(executor),
    searchPolicyOverrides: createSearchPolicyOverridesRepo(executor),
    searchCapacityGrants: createSearchCapacityGrantsRepo(executor),
    searchUsageReservations: createSearchUsageReservationsRepo(executor),
    searchUsageCommits: createSearchUsageCommitsRepo(executor),
  };
}

export function createSearchUsageReservationPorts(
  executor: DatabaseExecutor,
): UsageReservationPorts<"search"> {
  return {
    executor,
    async checkRemaining(trx, actorUserId) {
      const snapshot = await getSearchCapacitySnapshot(
        actorUserId,
        buildSearchUsageRepos(trx),
        new Date(),
      );
      if (isErr(snapshot)) return snapshot;
      return Ok(snapshot.value.remaining);
    },
    reservations: createSearchUsageReservationsRepo,
    commits: createSearchUsageCommitsRepo,
  };
}

export function createSearchRuntime(infra: ServerInfra) {
  return {
    repos: buildSearchUsageRepos(infra.db),
    usageReservationPorts: createSearchUsageReservationPorts(infra.db),
    rateLimitDeps: {
      actionRateLimits: createActionRateLimitsRepo(infra.db),
      events: createEventsRepo(infra.db),
    },
  };
}

export const getSearchRuntime = memo(() => createSearchRuntime(infra));

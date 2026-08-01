import "server-only";
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
import type { EngineClient } from "~/server/integrations/engine/client";
import type { ServerInfrastructure } from "~/server/platform/composition/infrastructure";
import type { DatabaseExecutor } from "~/server/platform/database/executor";
import { runDirectSearch } from "~/server/search-workflow/run-search";
import { checkActionRateLimit } from "~/server/security/action-rate-limit";
import { createActionRateLimitsRepo } from "~/server/security/repos-action-rate-limits";
import { isErr, Ok } from "~/shared/result";

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
    async checkRemaining(trx, actorUserId, evaluatedAt) {
      const snapshot = await getSearchCapacitySnapshot(
        actorUserId,
        buildSearchUsageRepos(trx),
        evaluatedAt,
      );
      if (isErr(snapshot)) return snapshot;
      return Ok(snapshot.value.remaining);
    },
    reservations: createSearchUsageReservationsRepo,
    commits: createSearchUsageCommitsRepo,
  };
}

export function createSearchRuntime(
  serverInfrastructure: ServerInfrastructure,
  engine: Pick<EngineClient, "search">,
) {
  const repos = buildSearchUsageRepos(serverInfrastructure.db);
  const usageReservationPorts = createSearchUsageReservationPorts(
    serverInfrastructure.db,
  );
  const rateLimitDeps = {
    actionRateLimits: createActionRateLimitsRepo(serverInfrastructure.db),
    events: createEventsRepo(serverInfrastructure.db),
  };

  return {
    getAllowance: (
      userId: Parameters<typeof getSearchCapacitySnapshot>[0],
      evaluatedAt: Date,
    ) => getSearchCapacitySnapshot(userId, repos, evaluatedAt),
    runDirect: async (
      ctx: {
        actor: { userId: Parameters<typeof getSearchCapacitySnapshot>[0] };
        operationAt: Date;
      },
      command: Parameters<typeof runDirectSearch>[0],
    ) => {
      await checkActionRateLimit(
        "search.use",
        ctx.actor.userId,
        rateLimitDeps,
        ctx.operationAt,
      );
      return runDirectSearch(command, usageReservationPorts, engine);
    },
  };
}

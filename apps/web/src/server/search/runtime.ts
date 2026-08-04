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
import type { EngineClient } from "~/server/integrations/engine/client";
import type { AppContext } from "~/server/platform/action/context";
import type { DatabaseExecutor } from "~/server/platform/database/executor";
import type { ServerInfrastructure } from "~/server/platform/infrastructure";
import type { OperationContext } from "~/server/platform/operation/context";
import { runDirectSearch } from "~/server/search-workflow/run-search";
import { createActionRateLimiter } from "~/server/security/action-rate-limit";
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

function createSearchUsageReservationPorts(
  executor: DatabaseExecutor,
): UsageReservationPorts<"search"> {
  return {
    executor,
    async checkRemaining(trx, actorUserId, operation) {
      const snapshot = await getSearchCapacitySnapshot(
        actorUserId,
        buildSearchUsageRepos(trx),
        operation,
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
  const rateLimiter = createActionRateLimiter(serverInfrastructure.db);

  return {
    getAllowance: (
      userId: Parameters<typeof getSearchCapacitySnapshot>[0],
      operation: OperationContext,
    ) => getSearchCapacitySnapshot(userId, repos, operation),
    runDirect: async (
      ctx: AppContext,
      command: Parameters<typeof runDirectSearch>[0],
    ) => {
      await rateLimiter.enforce(
        "search.use",
        ctx.actor.userId,
        ctx,
        ctx.ipAddress,
      );
      return runDirectSearch(command, usageReservationPorts, engine, ctx);
    },
  };
}

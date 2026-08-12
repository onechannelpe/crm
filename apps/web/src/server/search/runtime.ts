import { getSearchCapacitySnapshot } from "~/server/capacity/application/queries/get-search-capacity-snapshot";
import type { EngineClient } from "~/server/integrations/engine/client";
import type { AppContext } from "~/server/platform/action/context";
import type { ServerInfrastructure } from "~/server/platform/infrastructure";
import type { OperationContext } from "~/server/platform/operation/context";
import { runDirectSearch } from "~/server/search-workflow/run-search";
import { createActionRateLimiter } from "~/server/security/action-rate-limit";

import { buildSearchUsageRepos } from "./infrastructure/search-usage-repos";
import { createSearchUsageReservationPorts } from "./infrastructure/search-usage-reservation-ports";

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

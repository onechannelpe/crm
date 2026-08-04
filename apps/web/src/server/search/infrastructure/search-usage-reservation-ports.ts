import { getSearchCapacitySnapshot } from "~/server/capacity/application/queries/get-search-capacity-snapshot";
import type { UsageReservationPorts } from "~/server/capacity/application/usage/ledger";
import {
  createSearchUsageCommitsRepo,
  createSearchUsageReservationsRepo,
} from "~/server/capacity/infrastructure/usage-repo";
import type { DatabaseExecutor } from "~/server/platform/database/executor";
import { isErr, Ok } from "~/shared/result";

import { buildSearchUsageRepos } from "./search-usage-repos";

export function createSearchUsageReservationPorts(
  executor: DatabaseExecutor,
): UsageReservationPorts<"search"> {
  return {
    executor,
    async checkRemaining(tx, actorUserId, operation) {
      const snapshot = await getSearchCapacitySnapshot(
        actorUserId,
        buildSearchUsageRepos(tx),
        operation,
      );
      if (isErr(snapshot)) return snapshot;
      return Ok(snapshot.value.remaining);
    },
    reservations: createSearchUsageReservationsRepo,
    commits: createSearchUsageCommitsRepo,
  };
}

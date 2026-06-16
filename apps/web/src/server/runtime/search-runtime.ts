import {
  createSearchCapacityGrantsRepo,
  createSearchUsageCommitsRepo,
  createSearchUsageReservationsRepo,
} from "~/server/capacity-usage/repos";
import { createCapacityUsersRepo } from "~/server/capacity/infrastructure/capacity-users-repo";
import {
  createSearchPolicyDefaultsRepo,
  createSearchPolicyOverridesRepo,
} from "~/server/capacity/infrastructure/policy-repos";
import { createActionRateLimitsRepo } from "~/server/security/repos-action-rate-limits";
import { createEventsRepo } from "~/server/shared/repos-events";

import type { ServerInfra } from "./infra";

export function createSearchRuntime(infra: ServerInfra) {
  return {
    repos: {
      users: createCapacityUsersRepo(infra.db),
      searchPolicyDefaults: createSearchPolicyDefaultsRepo(infra.db),
      searchPolicyOverrides: createSearchPolicyOverridesRepo(infra.db),
      searchCapacityGrants: createSearchCapacityGrantsRepo(infra.db),
      searchUsageReservations: createSearchUsageReservationsRepo(infra.db),
      searchUsageCommits: createSearchUsageCommitsRepo(infra.db),
    },
    rateLimitDeps: {
      actionRateLimits: createActionRateLimitsRepo(infra.db),
      events: createEventsRepo(infra.db),
    },
  };
}

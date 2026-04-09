"use server";

import { throwDomainError } from "~/actions/throw-domain-error";
import { requirePermission } from "~/lib/auth/access/session";
import {
  createSearchCapacityGrantsRepo,
  createSearchUsageCommitsRepo,
  createSearchUsageReservationsRepo,
} from "~/server/capacity-usage/repos";
import { getSearchCapacitySnapshot } from "~/server/capacity/application/get-search-capacity-snapshot";
import { createCapacityUsersRepo } from "~/server/capacity/infrastructure/capacity-users-repo";
import {
  createSearchPolicyDefaultsRepo,
  createSearchPolicyOverridesRepo,
} from "~/server/capacity/infrastructure/policy-repos";
import { serverRuntime } from "~/server/runtime";
import { isErr } from "~/server/shared/result";

function createSearchRepos() {
  return {
    users: createCapacityUsersRepo(serverRuntime.infra.db),
    searchPolicyDefaults: createSearchPolicyDefaultsRepo(
      serverRuntime.infra.db,
    ),
    searchPolicyOverrides: createSearchPolicyOverridesRepo(
      serverRuntime.infra.db,
    ),
    searchCapacityGrants: createSearchCapacityGrantsRepo(
      serverRuntime.infra.db,
    ),
    searchUsageReservations: createSearchUsageReservationsRepo(
      serverRuntime.infra.db,
    ),
    searchUsageCommits: createSearchUsageCommitsRepo(serverRuntime.infra.db),
  };
}

export async function getMySearchAllowance() {
  const repos = createSearchRepos();
  const session = await requirePermission("capacity:read:self");
  const result = await getSearchCapacitySnapshot(session.userId, repos);
  if (isErr(result)) throwDomainError(result.error);
  return result.value;
}

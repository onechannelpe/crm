"use server";

import { throwDomainError } from "~/actions/throw-domain-error";
import { requirePermission } from "~/lib/auth/access/session";
import { db } from "~/lib/db/db";
import {
  createSearchCapacityGrantsRepo,
  createSearchUsageCommitsRepo,
  createSearchUsageReservationsRepo,
} from "~/server/capacity-usage/repos";
import { getSearchCapacitySnapshot } from "~/server/capacity/application/get-search-capacity-snapshot";
import {
  createSearchPolicyDefaultsRepo,
  createSearchPolicyOverridesRepo,
} from "~/server/capacity/infrastructure/policy-repos";
import { isErr } from "~/server/shared/result";
import { createUsersRepo } from "~/server/users/repos-users";

const repos = {
  users: createUsersRepo(db),
  searchPolicyDefaults: createSearchPolicyDefaultsRepo(db),
  searchPolicyOverrides: createSearchPolicyOverridesRepo(db),
  searchCapacityGrants: createSearchCapacityGrantsRepo(db),
  searchUsageReservations: createSearchUsageReservationsRepo(db),
  searchUsageCommits: createSearchUsageCommitsRepo(db),
};

export async function getMySearchAllowance() {
  const session = await requirePermission("capacity:read:self");
  const result = await getSearchCapacitySnapshot(session.userId, repos);
  if (isErr(result)) throwDomainError(result.error);
  return result.value;
}

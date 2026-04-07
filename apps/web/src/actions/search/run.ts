"use server";

import type { SearchDirectResult } from "~/actions/search/contracts";
import { requirePermission } from "~/lib/auth/access/session";
import { db } from "~/lib/db/db";
import { checkActionRateLimit } from "~/lib/security/action-rate-limit";
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
import { runDirectSearch } from "~/server/search-workflow/run-search";
import { createActionRateLimitsRepo } from "~/server/security/repos-action-rate-limits";
import { createAuditLogsRepo } from "~/server/shared/repos-audit-logs";
import { isErr } from "~/server/shared/result";

import { mapSearchError } from "./errors";
import { parseSearchCommand } from "./input";

const repos = {
  users: createCapacityUsersRepo(db),
  searchPolicyDefaults: createSearchPolicyDefaultsRepo(db),
  searchPolicyOverrides: createSearchPolicyOverridesRepo(db),
  searchCapacityGrants: createSearchCapacityGrantsRepo(db),
  searchUsageReservations: createSearchUsageReservationsRepo(db),
  searchUsageCommits: createSearchUsageCommitsRepo(db),
};
const rateLimitDeps = {
  actionRateLimits: createActionRateLimitsRepo(db),
  auditLogs: createAuditLogsRepo(db),
};

export async function searchDirect(
  type: unknown,
  value: unknown,
  limit?: unknown,
): Promise<SearchDirectResult> {
  const session = await requirePermission("search:use");
  await checkActionRateLimit("search.use", session.userId, rateLimitDeps);

  const cmdResult = parseSearchCommand(session.userId, type, value, limit);
  if (isErr(cmdResult)) mapSearchError(cmdResult.error);

  const result = await runDirectSearch(cmdResult.value, repos);
  if (isErr(result)) mapSearchError(result.error);

  return result.value;
}

"use server";

import type { SearchDirectResult } from "~/actions/search/contracts";
import { requirePermission } from "~/lib/auth/access/session";
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
import { serverRuntime } from "~/server/runtime";
import { runDirectSearch } from "~/server/search-workflow/run-search";
import { createActionRateLimitsRepo } from "~/server/security/repos-action-rate-limits";
import { createAuditLogsRepo } from "~/server/shared/repos-audit-logs";
import { isErr } from "~/server/shared/result";

import { mapSearchError } from "./errors";
import { parseSearchCommand } from "./input";

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

function createRateLimitDeps() {
  return {
    actionRateLimits: createActionRateLimitsRepo(serverRuntime.infra.db),
    auditLogs: createAuditLogsRepo(serverRuntime.infra.db),
  };
}

export async function searchDirect(
  type: unknown,
  value: unknown,
  limit?: unknown,
): Promise<SearchDirectResult> {
  const repos = createSearchRepos();
  const rateLimitDeps = createRateLimitDeps();
  const session = await requirePermission("search:use");
  await checkActionRateLimit("search.use", session.userId, rateLimitDeps);

  const cmdResult = parseSearchCommand(session.userId, type, value, limit);
  if (isErr(cmdResult)) mapSearchError(cmdResult.error);

  const result = await runDirectSearch(cmdResult.value, repos);
  if (isErr(result)) mapSearchError(result.error);

  return result.value;
}

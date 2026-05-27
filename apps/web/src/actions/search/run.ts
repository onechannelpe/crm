"use server";

import type { SearchDirectResult } from "~/actions/search/contracts";
import { requirePermission } from "~/lib/auth/access/session";
import { checkActionRateLimit } from "~/lib/security/action-rate-limit";
import { getServerRuntime } from "~/server/runtime";
import { runDirectSearch } from "~/server/search-workflow/run-search";
import { isErr } from "~/server/shared/result";

import { mapSearchError } from "./errors";
import { parseSearchCommand } from "./input";

export async function searchDirect(
  intent: unknown,
  query: unknown,
  limit?: unknown,
): Promise<SearchDirectResult> {
  const { repos, rateLimitDeps } = getServerRuntime().search;
  const session = await requirePermission("search:use");
  await checkActionRateLimit("search.use", session.userId, rateLimitDeps);

  const cmdResult = parseSearchCommand(session.userId, intent, query, limit);
  if (isErr(cmdResult)) mapSearchError(cmdResult.error);

  const result = await runDirectSearch(
    cmdResult.value,
    repos,
    getServerRuntime().engine,
  );
  if (isErr(result)) mapSearchError(result.error);

  return result.value;
}

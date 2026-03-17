"use server";

import { requirePermission } from "~/lib/auth/access/session";
import { checkActionRateLimit } from "~/lib/security/action-rate-limit";
import { runDirectSearch } from "~/server/search-workflow/run-search";
import { rateLimitDeps, repos } from "~/server/shared/context";
import { isErr } from "~/server/shared/result";

import { mapSearchError } from "./errors";
import { parseSearchCommand } from "./input";

export async function searchDirect(
  type: unknown,
  value: unknown,
  limit?: unknown,
) {
  const session = await requirePermission("search:use");
  await checkActionRateLimit("search.use", session.userId, rateLimitDeps);

  const cmdResult = parseSearchCommand(session.userId, type, value, limit);
  if (isErr(cmdResult)) mapSearchError(cmdResult.error);

  const result = await runDirectSearch(cmdResult.value, repos);
  if (isErr(result)) mapSearchError(result.error);

  return result.value;
}

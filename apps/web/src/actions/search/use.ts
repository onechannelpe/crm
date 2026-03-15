"use server";

import { internalError } from "~/lib/app-errors";
import { requirePermission } from "~/lib/auth/access/session";
import { checkActionRateLimit } from "~/lib/security/action-rate-limit";
import {
  engineSearchService,
  searchAllowanceService,
} from "~/server/shared/context";
import { repos } from "~/server/shared/context";
import type { SearchResponse, SearchType } from "~/server/shared/engine/types";
import { isErr } from "~/server/shared/result";

export async function runDirectSearch(
  type: SearchType,
  value: string,
  limit?: number,
): Promise<SearchResponse> {
  const session = await requirePermission("search:use");
  await checkActionRateLimit("search.use", session.userId, repos);
  const allowanceResult = await searchAllowanceService.reserveSearchUsage(
    session.userId,
  );
  if (isErr(allowanceResult)) {
    throw internalError(allowanceResult.error.message);
  }

  const result = await engineSearchService.searchDirect({ type, value, limit });
  if (isErr(result)) {
    await searchAllowanceService.rollbackSearchUsage(session.userId);
    throw internalError(result.error.message);
  }

  return result.value;
}

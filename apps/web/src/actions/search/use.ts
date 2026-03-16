"use server";

import { validationError } from "~/lib/app-errors";
import { requirePermission } from "~/lib/auth/access/session";
import { checkActionRateLimit } from "~/lib/security/action-rate-limit";
import {
  engineSearchService,
  rateLimitDeps,
  searchAllowanceService,
} from "~/server/shared/context";
import { validateSearchInput } from "~/server/shared/engine/input";
import type { SearchResponse } from "~/server/shared/engine/types";
import { asUserId } from "~/server/shared/ids";
import type { SearchType } from "~/server/shared/pipeline-types";
import { isErr } from "~/server/shared/result";

import {
  fromDirectSearchError,
  fromSearchAllowanceError,
  throwSearchActionError,
} from "./errors";

function validateSearchCommand(
  type: SearchType,
  value: string,
  limit?: number,
): number {
  const safeLimit = limit ?? 20;
  try {
    validateSearchInput(type, value, safeLimit);
  } catch (error) {
    throw validationError(
      error instanceof Error ? error.message : "Invalid search command",
    );
  }
  return safeLimit;
}

export async function runDirectSearch(
  type: SearchType,
  value: string,
  limit?: number,
): Promise<SearchResponse> {
  const safeLimit = validateSearchCommand(type, value, limit);

  const session = await requirePermission("search:use");
  await checkActionRateLimit("search.use", session.userId, rateLimitDeps);
  const userId = asUserId(session.userId);

  const allowanceResult =
    await searchAllowanceService.reserveSearchUsage(userId);
  if (isErr(allowanceResult)) {
    throwSearchActionError(fromSearchAllowanceError(allowanceResult.error));
  }

  const result = await engineSearchService.searchDirect({
    type,
    value,
    limit: safeLimit,
  });
  if (isErr(result)) {
    await searchAllowanceService.rollbackSearchUsage(userId);
    throwSearchActionError(fromDirectSearchError(result.error));
  }

  return result.value;
}

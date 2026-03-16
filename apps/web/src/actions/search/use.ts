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
import type { SearchType } from "~/server/shared/pipeline-types";
import { isErr } from "~/server/shared/result";

import {
  fromDirectSearchError,
  fromSearchAllowanceError,
  fromSearchRollbackError,
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

  const allowanceResult = await searchAllowanceService.reserveSearchUsage(
    session.userId,
  );
  if (isErr(allowanceResult)) {
    throwSearchActionError(fromSearchAllowanceError(allowanceResult.error));
  }

  const result = await engineSearchService.searchDirect({
    type,
    value,
    limit: safeLimit,
  });
  if (isErr(result)) {
    try {
      await searchAllowanceService.rollbackSearchUsage(session.userId);
    } catch (rollbackError) {
      throwSearchActionError(
        fromSearchRollbackError({
          reason: "unexpected",
          message:
            rollbackError instanceof Error
              ? rollbackError.message
              : "Rollback failed unexpectedly",
        }),
      );
    }
    throwSearchActionError(fromDirectSearchError(result.error));
  }

  return result.value;
}

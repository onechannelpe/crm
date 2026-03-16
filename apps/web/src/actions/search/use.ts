"use server";

import { validationError } from "~/lib/app-errors";
import { requirePermission } from "~/lib/auth/access/session";
import { checkActionRateLimit } from "~/lib/security/action-rate-limit";
import {
  engineSearchService,
  searchAllowanceService,
} from "~/server/shared/context";
import { repos } from "~/server/shared/context";
import { validateSearchInput } from "~/server/shared/engine/input";
import type { SearchResponse, SearchType } from "~/server/shared/engine/types";
import { isErr } from "~/server/shared/result";

import { throwSearchActionError } from "./errors";

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
  await checkActionRateLimit("search.use", session.userId, repos);
  const allowanceResult = await searchAllowanceService.reserveSearchUsage(
    session.userId,
  );
  if (isErr(allowanceResult)) {
    if (allowanceResult.error.reason === "search_exhausted") {
      throwSearchActionError({
        reason: "conflict",
        message: allowanceResult.error.message,
      });
    }
    throwSearchActionError({
      reason: "unexpected",
      message: allowanceResult.error.message,
    });
  }

  const result = await engineSearchService.searchDirect({
    type,
    value,
    limit: safeLimit,
  });
  if (isErr(result)) {
    await searchAllowanceService.rollbackSearchUsage(session.userId);
    throwSearchActionError({
      reason: "unexpected",
      message: result.error.message,
    });
  }

  return result.value;
}

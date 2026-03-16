"use server";

import { validationError } from "~/lib/app-errors";
import { requirePermission } from "~/lib/auth/access/session";
import { checkActionRateLimit } from "~/lib/security/action-rate-limit";
import {
  engineSearchService,
  searchAllowanceService,
} from "~/server/shared/context";
import { repos } from "~/server/shared/context";
import type { SearchResponse, SearchType } from "~/server/shared/engine/types";
import { isErr } from "~/server/shared/result";

import { throwSearchActionError } from "./errors";

function hasOnlyDigits(value: string): boolean {
  return /^\d+$/.test(value);
}

function validateSearchCommand(
  type: SearchType,
  value: string,
  limit?: number,
) {
  const query = value.trim();
  if (!query) {
    throw validationError("Search value is required");
  }

  const safeLimit = limit ?? 20;
  if (!Number.isInteger(safeLimit) || safeLimit < 1 || safeLimit > 100) {
    throw validationError("Search limit must be an integer between 1 and 100");
  }

  if (type === "dni" && (!/^\d{8,12}$/.test(query) || !hasOnlyDigits(query))) {
    throw validationError("DNI must contain 8 to 12 digits");
  }
  if (type === "ruc" && (!/^\d{11}$/.test(query) || !hasOnlyDigits(query))) {
    throw validationError("RUC must contain exactly 11 digits");
  }
  if (
    (type === "phone" || type === "phone_enriched") &&
    (!/^\d{7,15}$/.test(query) || !hasOnlyDigits(query))
  ) {
    throw validationError("Phone must contain 7 to 15 digits");
  }
  if ((type === "person_name" || type === "company_name") && query.length < 2) {
    throw validationError("Name query must contain 2 to 120 characters");
  }
  if (
    (type === "person_name" || type === "company_name") &&
    query.length > 120
  ) {
    throw validationError("Name query must contain 2 to 120 characters");
  }
}

export async function runDirectSearch(
  type: SearchType,
  value: string,
  limit?: number,
): Promise<SearchResponse> {
  validateSearchCommand(type, value, limit);

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

  const result = await engineSearchService.searchDirect({ type, value, limit });
  if (isErr(result)) {
    await searchAllowanceService.rollbackSearchUsage(session.userId);
    throwSearchActionError({
      reason: "unexpected",
      message: result.error.message,
    });
  }

  return result.value;
}

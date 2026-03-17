"use server";

import { validationError } from "~/lib/app-errors";
import { requirePermission } from "~/lib/auth/access/session";
import { config } from "~/lib/config";
import {
  assertFinitePositive,
  assertPositiveInt,
} from "~/lib/contracts/guards";
import { capacityManageService } from "~/server/shared/context";
import { asBranchId, asTeamId, asUserId } from "~/server/shared/ids";
import { isErr } from "~/server/shared/result";

import { fromCapacityManageError, throwCapacityActionError } from "./errors";

function toScopeId(scopeType: "branch" | "team", scopeId: number) {
  return scopeType === "branch" ? asBranchId(scopeId) : asTeamId(scopeId);
}

function validateSearchPolicyLimit(monthlySearchLimit: number): number {
  const safeLimit = assertFinitePositive(
    monthlySearchLimit,
    "monthlySearchLimit",
  );
  if (safeLimit > config.searchAccess.maxMonthlyLimit) {
    throw validationError("monthlySearchLimit exceeds configured maximum");
  }
  return safeLimit;
}

function validateLeadPolicyValues(input: {
  activeBufferTarget: number;
  dailyRefillLimit: number;
}) {
  const safeBuffer = assertFinitePositive(
    input.activeBufferTarget,
    "activeBufferTarget",
  );
  if (safeBuffer > config.leadAssignment.maxBufferTarget) {
    throw validationError("activeBufferTarget exceeds configured maximum");
  }

  const safeRefill = assertFinitePositive(
    input.dailyRefillLimit,
    "dailyRefillLimit",
  );
  if (safeRefill > config.capacityRequests.maxRequestAmount) {
    throw validationError("dailyRefillLimit exceeds configured maximum");
  }

  return { safeBuffer, safeRefill };
}

export async function updateSearchPolicyOverride(input: {
  userId: number;
  monthlySearchLimit: number;
  expiresAt: number | null;
}) {
  const session = await requirePermission("capacity:policy:manage");
  const safeUserId = asUserId(assertPositiveInt(input.userId, "userId"));
  const safeLimit = validateSearchPolicyLimit(input.monthlySearchLimit);
  const result = await capacityManageService.updateSearchPolicyOverride(
    session,
    {
      userId: safeUserId,
      monthlySearchLimit: safeLimit,
      expiresAt: input.expiresAt,
    },
  );
  if (isErr(result)) {
    throwCapacityActionError(fromCapacityManageError(result.error));
  }
  return result.value;
}

export async function updateLeadPolicyOverride(input: {
  userId: number;
  activeBufferTarget: number;
  dailyRefillLimit: number;
  expiresAt: number | null;
}) {
  const session = await requirePermission("capacity:policy:manage");
  const safeUserId = asUserId(assertPositiveInt(input.userId, "userId"));
  const { safeBuffer, safeRefill } = validateLeadPolicyValues({
    activeBufferTarget: input.activeBufferTarget,
    dailyRefillLimit: input.dailyRefillLimit,
  });
  const result = await capacityManageService.updateLeadPolicyOverride(session, {
    userId: safeUserId,
    activeBufferTarget: safeBuffer,
    dailyRefillLimit: safeRefill,
    expiresAt: input.expiresAt,
  });
  if (isErr(result)) {
    throwCapacityActionError(fromCapacityManageError(result.error));
  }
  return result.value;
}

export async function updateSearchScopeDefault(input: {
  scopeType: "branch" | "team";
  scopeId: number;
  monthlySearchLimit: number;
}) {
  const session = await requirePermission("capacity:policy:manage");
  const safeScopeId = assertPositiveInt(input.scopeId, "scopeId");
  const safeLimit = validateSearchPolicyLimit(input.monthlySearchLimit);
  const result = await capacityManageService.updateSearchScopeDefault(session, {
    scopeType: input.scopeType,
    scopeId: toScopeId(input.scopeType, safeScopeId),
    monthlySearchLimit: safeLimit,
  });
  if (isErr(result)) {
    throwCapacityActionError(fromCapacityManageError(result.error));
  }
  return result.value;
}

export async function updateLeadScopeDefault(input: {
  scopeType: "branch" | "team";
  scopeId: number;
  activeBufferTarget: number;
  dailyRefillLimit: number;
}) {
  const session = await requirePermission("capacity:policy:manage");
  const safeScopeId = assertPositiveInt(input.scopeId, "scopeId");
  const { safeBuffer, safeRefill } = validateLeadPolicyValues({
    activeBufferTarget: input.activeBufferTarget,
    dailyRefillLimit: input.dailyRefillLimit,
  });
  const result = await capacityManageService.updateLeadScopeDefault(session, {
    scopeType: input.scopeType,
    scopeId: toScopeId(input.scopeType, safeScopeId),
    activeBufferTarget: safeBuffer,
    dailyRefillLimit: safeRefill,
  });
  if (isErr(result)) {
    throwCapacityActionError(fromCapacityManageError(result.error));
  }
  return result.value;
}

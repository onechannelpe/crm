"use server";

import { requirePermission } from "~/lib/auth/access/session";
import {
  assertFinitePositive,
  assertPositiveInt,
} from "~/lib/contracts/guards";
import { capacityManageService } from "~/server/shared/context";
import { isErr } from "~/server/shared/result";

import { throwCapacityActionError } from "./errors";

export async function updateSearchPolicyOverride(input: {
  userId: number;
  monthlySearchLimit: number;
  expiresAt: number | null;
}) {
  const session = await requirePermission("capacity:policy:manage");
  const safeUserId = assertPositiveInt(input.userId, "userId");
  const safeLimit = assertFinitePositive(
    input.monthlySearchLimit,
    "monthlySearchLimit",
  );
  const result = await capacityManageService.updateSearchPolicyOverride(
    session,
    {
      userId: safeUserId,
      monthlySearchLimit: safeLimit,
      expiresAt: input.expiresAt,
    },
  );
  if (isErr(result)) {
    throwCapacityActionError(result.error);
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
  const safeUserId = assertPositiveInt(input.userId, "userId");
  const safeBuffer = assertFinitePositive(
    input.activeBufferTarget,
    "activeBufferTarget",
  );
  const safeRefill = assertFinitePositive(
    input.dailyRefillLimit,
    "dailyRefillLimit",
  );
  const result = await capacityManageService.updateLeadPolicyOverride(session, {
    userId: safeUserId,
    activeBufferTarget: safeBuffer,
    dailyRefillLimit: safeRefill,
    expiresAt: input.expiresAt,
  });
  if (isErr(result)) {
    throwCapacityActionError(result.error);
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
  const safeLimit = assertFinitePositive(
    input.monthlySearchLimit,
    "monthlySearchLimit",
  );
  const result = await capacityManageService.updateSearchScopeDefault(session, {
    scopeType: input.scopeType,
    scopeId: safeScopeId,
    monthlySearchLimit: safeLimit,
  });
  if (isErr(result)) {
    throwCapacityActionError(result.error);
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
  const safeBuffer = assertFinitePositive(
    input.activeBufferTarget,
    "activeBufferTarget",
  );
  const safeRefill = assertFinitePositive(
    input.dailyRefillLimit,
    "dailyRefillLimit",
  );
  const result = await capacityManageService.updateLeadScopeDefault(session, {
    scopeType: input.scopeType,
    scopeId: safeScopeId,
    activeBufferTarget: safeBuffer,
    dailyRefillLimit: safeRefill,
  });
  if (isErr(result)) {
    throwCapacityActionError(result.error);
  }
  return result.value;
}

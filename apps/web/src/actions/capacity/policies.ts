"use server";

import {
  conflictError,
  forbiddenError,
  internalError,
  validationError,
} from "~/lib/app-errors";
import { requirePermission } from "~/lib/auth/access/session";
import { config } from "~/lib/config";
import {
  assertFinitePositive,
  assertPositiveInt,
} from "~/lib/contracts/guards";
import {
  assertCanManageTeam,
  canManageExecutive,
} from "~/server/capacity/scope";
import { createLeadPolicyService } from "~/server/lead-operations/policy-service";
import { createSearchPolicyService } from "~/server/search-access/policy-service";
import { repos } from "~/server/shared/context";

export async function updateSearchPolicyOverride(input: {
  userId: number;
  monthlySearchLimit: number;
  expiresAt: number | null;
}) {
  const session = await requirePermission("capacity:manage");
  const safeUserId = assertPositiveInt(input.userId, "userId");
  const safeLimit = assertFinitePositive(
    input.monthlySearchLimit,
    "monthlySearchLimit",
  );
  if (safeLimit > config.searchAccess.maxMonthlyLimit) {
    throw internalError("Monthly search limit exceeds configured maximum");
  }
  const managed = await canManageExecutive(session, safeUserId, repos);
  if (!managed.ok) throw forbiddenError("Cannot manage this executive");
  const policyService = createSearchPolicyService(repos);
  await policyService.setUserOverride({
    targetUserId: safeUserId,
    monthlySearchLimit: safeLimit,
    setByUserId: session.userId,
    expiresAt: input.expiresAt,
  });
  return { success: true };
}

export async function updateLeadPolicyOverride(input: {
  userId: number;
  activeBufferTarget: number;
  dailyRefillLimit: number;
  expiresAt: number | null;
}) {
  const session = await requirePermission("capacity:manage");
  const safeUserId = assertPositiveInt(input.userId, "userId");
  const safeBuffer = assertFinitePositive(
    input.activeBufferTarget,
    "activeBufferTarget",
  );
  const safeRefill = assertFinitePositive(
    input.dailyRefillLimit,
    "dailyRefillLimit",
  );
  if (safeBuffer > config.leadAssignment.maxBufferTarget) {
    throw internalError("Buffer target exceeds configured maximum");
  }
  if (safeRefill > config.capacityRequests.maxRequestAmount) {
    throw internalError("Daily refill limit exceeds configured maximum");
  }
  const managed = await canManageExecutive(session, safeUserId, repos);
  if (!managed.ok) throw forbiddenError("Cannot manage this executive");
  const policyService = createLeadPolicyService(repos);
  await policyService.setUserOverride({
    targetUserId: safeUserId,
    activeBufferTarget: safeBuffer,
    dailyRefillLimit: safeRefill,
    setByUserId: session.userId,
    expiresAt: input.expiresAt,
  });
  return { success: true };
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
  if (safeLimit > config.searchAccess.maxMonthlyLimit) {
    throw internalError("Monthly search limit exceeds configured maximum");
  }
  if (input.scopeType === "branch" && safeScopeId !== session.branchId) {
    throw conflictError("Cannot modify defaults outside your branch");
  }
  if (input.scopeType === "team") {
    const access = await assertCanManageTeam(session, safeScopeId, repos);
    if (!access.ok)
      throw forbiddenError("Cannot modify defaults for this team");
  }
  if (input.scopeType !== "branch" && input.scopeType !== "team") {
    throw validationError("Invalid scope type");
  }
  const policyService = createSearchPolicyService(repos);
  await policyService.setScopeDefault({
    scopeType: input.scopeType,
    scopeId: safeScopeId,
    monthlySearchLimit: safeLimit,
  });
  return { success: true };
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
  if (safeBuffer > config.leadAssignment.maxBufferTarget) {
    throw internalError("Buffer target exceeds configured maximum");
  }
  if (safeRefill > config.capacityRequests.maxRequestAmount) {
    throw internalError("Daily refill limit exceeds configured maximum");
  }
  if (input.scopeType === "branch" && safeScopeId !== session.branchId) {
    throw conflictError("Cannot modify defaults outside your branch");
  }
  if (input.scopeType === "team") {
    const access = await assertCanManageTeam(session, safeScopeId, repos);
    if (!access.ok)
      throw forbiddenError("Cannot modify defaults for this team");
  }
  if (input.scopeType !== "branch" && input.scopeType !== "team") {
    throw validationError("Invalid scope type");
  }
  const policyService = createLeadPolicyService(repos);
  await policyService.setScopeDefault({
    scopeType: input.scopeType,
    scopeId: safeScopeId,
    activeBufferTarget: safeBuffer,
    dailyRefillLimit: safeRefill,
  });
  return { success: true };
}

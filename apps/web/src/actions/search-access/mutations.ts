"use server";

import {
  conflictError,
  forbiddenError,
  validationError,
} from "~/lib/app-errors";
import { requirePermission } from "~/lib/auth/access/session";
import {
  assertFinitePositive,
  assertNonEmptyString,
  assertPositiveInt,
} from "~/lib/contracts/guards";
import { createSearchPolicyService } from "~/server/search-access/policy-service";
import { searchAccessService } from "~/server/shared/context";
import { repos } from "~/server/shared/context";
import { canManageExecutive } from "~/server/team-admin/scope";

export async function requestMoreSearches(amount: number, reason: string) {
  const safeAmount = assertPositiveInt(amount, "amount");
  const safeReason = assertNonEmptyString(reason, "reason");
  const session = await requirePermission("client_search:read");
  await repos.allowanceRequests.create({
    user_id: session.userId,
    kind: "search_extra",
    status: "pending",
    requested_amount: safeAmount,
    reason: safeReason,
  });
  return { success: true };
}

export async function grantMoreSearches(
  userId: number,
  amount: number,
  reason: string,
) {
  const safeUserId = assertPositiveInt(userId, "userId");
  const safeAmount = assertPositiveInt(amount, "amount");
  const safeReason = assertNonEmptyString(reason, "reason");
  const session = await requirePermission("team:manage");
  const managed = await canManageExecutive(session, safeUserId, repos);
  if (!managed.ok) throw forbiddenError("Cannot manage this executive");
  return searchAccessService.grantExtraAllowance(
    session.userId,
    safeUserId,
    safeAmount,
    safeReason,
  );
}

export async function updateSearchPolicyOverride(input: {
  userId: number;
  monthlySearchLimit: number;
  expiresAt: number | null;
}) {
  const session = await requirePermission("team:manage");
  const safeUserId = assertPositiveInt(input.userId, "userId");
  const safeLimit = assertFinitePositive(
    input.monthlySearchLimit,
    "monthlySearchLimit",
  );
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

export async function updateSearchScopeDefault(input: {
  scopeType: "branch" | "team";
  scopeId: number;
  monthlySearchLimit: number;
}) {
  const session = await requirePermission("admin:manage");
  const safeScopeId = assertPositiveInt(input.scopeId, "scopeId");
  const safeLimit = assertFinitePositive(
    input.monthlySearchLimit,
    "monthlySearchLimit",
  );
  if (input.scopeType === "branch" && safeScopeId !== session.branchId) {
    throw conflictError("Cannot modify defaults outside your branch");
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

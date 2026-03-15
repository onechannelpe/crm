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
import { createLeadPolicyService } from "~/server/lead-ops/policy-service";
import { leadOpsService } from "~/server/shared/context";
import { repos } from "~/server/shared/context";
import { canManageExecutive } from "~/server/team-admin/scope";

export async function requestMoreLeadRefill(amount: number, reason: string) {
  const safeAmount = assertPositiveInt(amount, "amount");
  const safeReason = assertNonEmptyString(reason, "reason");
  const session = await requirePermission("leads:read");
  await repos.allowanceRequests.create({
    user_id: session.userId,
    kind: "lead_refill_extra",
    status: "pending",
    requested_amount: safeAmount,
    reason: safeReason,
  });
  return { success: true };
}

export async function requestLeadRefillNow() {
  const session = await requirePermission("leads:request");
  return leadOpsService.refillToTarget(session.userId, session.branchId);
}

export async function grantMoreLeadRefill(
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
  return leadOpsService.grantExtraRefill(
    session.userId,
    safeUserId,
    safeAmount,
    safeReason,
  );
}

export async function updateLeadPolicyOverride(input: {
  userId: number;
  activeBufferTarget: number;
  dailyRefillLimit: number;
  expiresAt: number | null;
}) {
  const session = await requirePermission("team:manage");
  const safeUserId = assertPositiveInt(input.userId, "userId");
  const safeBuffer = assertFinitePositive(
    input.activeBufferTarget,
    "activeBufferTarget",
  );
  const safeRefill = assertFinitePositive(
    input.dailyRefillLimit,
    "dailyRefillLimit",
  );
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

export async function updateLeadScopeDefault(input: {
  scopeType: "branch" | "team";
  scopeId: number;
  activeBufferTarget: number;
  dailyRefillLimit: number;
}) {
  const session = await requirePermission("admin:manage");
  const safeScopeId = assertPositiveInt(input.scopeId, "scopeId");
  const safeBuffer = assertFinitePositive(
    input.activeBufferTarget,
    "activeBufferTarget",
  );
  const safeRefill = assertFinitePositive(
    input.dailyRefillLimit,
    "dailyRefillLimit",
  );
  if (input.scopeType === "branch" && safeScopeId !== session.branchId) {
    throw conflictError("Cannot modify defaults outside your branch");
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

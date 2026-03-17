"use server";

import { requirePermission } from "~/lib/auth/access/session";
import { assertPositiveInt } from "~/lib/contracts/guards";
import {
  updateLeadScopeDefault,
  updateLeadUserOverride,
  updateSearchScopeDefault,
  updateSearchUserOverride,
} from "~/server/capacity-admin/manage-capacity";
import { repos } from "~/server/shared/context";
import { asBranchId, asTeamId, asUserId } from "~/server/shared/ids";
import { isErr } from "~/server/shared/result";

import { mapCapacityError } from "./errors";
import { parseLeadPolicyValues, parseSearchPolicyLimit } from "./input";

function toScopeId(scopeType: "branch" | "team", scopeId: number) {
  return scopeType === "branch" ? asBranchId(scopeId) : asTeamId(scopeId);
}

export async function updateSearchPolicyOverride(input: {
  userId: number;
  monthlySearchLimit: number;
  expiresAt: number | null;
}) {
  const safeUserId = asUserId(assertPositiveInt(input.userId, "userId"));
  const limitResult = parseSearchPolicyLimit(input.monthlySearchLimit);
  if (isErr(limitResult)) mapCapacityError(limitResult.error);

  const session = await requirePermission("capacity:policy:manage");

  const result = await updateSearchUserOverride(
    { actorUserId: session.userId, targetUserId: safeUserId, monthlyLimit: limitResult.value, expiresAt: input.expiresAt },
    session,
    repos,
  );
  if (isErr(result)) mapCapacityError(result.error);
  return result.value;
}

export async function updateLeadPolicyOverride(input: {
  userId: number;
  activeBufferTarget: number;
  dailyRefillLimit: number;
  expiresAt: number | null;
}) {
  const safeUserId = asUserId(assertPositiveInt(input.userId, "userId"));
  const policyResult = parseLeadPolicyValues({
    activeBufferTarget: input.activeBufferTarget,
    dailyRefillLimit: input.dailyRefillLimit,
  });
  if (isErr(policyResult)) mapCapacityError(policyResult.error);

  const session = await requirePermission("capacity:policy:manage");

  const result = await updateLeadUserOverride(
    { actorUserId: session.userId, targetUserId: safeUserId, bufferTarget: policyResult.value.activeBufferTarget, dailyLimit: policyResult.value.dailyRefillLimit, expiresAt: input.expiresAt },
    session,
    repos,
  );
  if (isErr(result)) mapCapacityError(result.error);
  return result.value;
}

export async function updateSearchScopeDefault_(input: {
  scopeType: "branch" | "team";
  scopeId: number;
  monthlySearchLimit: number;
}) {
  const safeScopeId = assertPositiveInt(input.scopeId, "scopeId");
  const limitResult = parseSearchPolicyLimit(input.monthlySearchLimit);
  if (isErr(limitResult)) mapCapacityError(limitResult.error);

  const session = await requirePermission("capacity:policy:manage");

  const result = await updateSearchScopeDefault(
    { actorUserId: session.userId, scopeType: input.scopeType, scopeId: toScopeId(input.scopeType, safeScopeId), monthlyLimit: limitResult.value },
    session,
    repos,
  );
  if (isErr(result)) mapCapacityError(result.error);
  return result.value;
}

export async function updateLeadScopeDefault_(input: {
  scopeType: "branch" | "team";
  scopeId: number;
  activeBufferTarget: number;
  dailyRefillLimit: number;
}) {
  const safeScopeId = assertPositiveInt(input.scopeId, "scopeId");
  const policyResult = parseLeadPolicyValues({
    activeBufferTarget: input.activeBufferTarget,
    dailyRefillLimit: input.dailyRefillLimit,
  });
  if (isErr(policyResult)) mapCapacityError(policyResult.error);

  const session = await requirePermission("capacity:policy:manage");

  const result = await updateLeadScopeDefault(
    { actorUserId: session.userId, scopeType: input.scopeType, scopeId: toScopeId(input.scopeType, safeScopeId), bufferTarget: policyResult.value.activeBufferTarget, dailyLimit: policyResult.value.dailyRefillLimit },
    session,
    repos,
  );
  if (isErr(result)) mapCapacityError(result.error);
  return result.value;
}

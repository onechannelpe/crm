"use server";

import { throwDomainError } from "~/actions/throw-domain-error";
import { requirePermission } from "~/lib/auth/access/session";
import { assertPositiveInt } from "~/lib/contracts/guards";
import { capacityManageService } from "~/server/shared/context";
import { asBranchId, asTeamId, asUserId } from "~/server/shared/ids";
import { isErr } from "~/server/shared/result";

import {
  parseLeadPolicyValues,
  parseSearchPolicyLimit,
} from "./capacity-input";

function toScopeId(scopeType: "branch" | "team", scopeId: number) {
  return scopeType === "branch" ? asBranchId(scopeId) : asTeamId(scopeId);
}

export async function updateSearchPolicyOverride(input: {
  userId: number;
  monthlySearchLimit: number;
  expiresAt: number | null;
}) {
  const session = await requirePermission("capacity:policy:manage");
  const safeUserId = asUserId(assertPositiveInt(input.userId, "userId"));
  const limitResult = parseSearchPolicyLimit(input.monthlySearchLimit);
  if (isErr(limitResult)) {
    throwDomainError(limitResult.error);
  }
  const result = await capacityManageService.updateSearchPolicyOverride(
    session,
    {
      userId: safeUserId,
      monthlySearchLimit: limitResult.value,
      expiresAt: input.expiresAt,
    },
  );
  if (isErr(result)) {
    throwDomainError(result.error);
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
  const policyResult = parseLeadPolicyValues({
    activeBufferTarget: input.activeBufferTarget,
    dailyRefillLimit: input.dailyRefillLimit,
  });
  if (isErr(policyResult)) {
    throwDomainError(policyResult.error);
  }
  const result = await capacityManageService.updateLeadPolicyOverride(session, {
    userId: safeUserId,
    activeBufferTarget: policyResult.value.activeBufferTarget,
    dailyRefillLimit: policyResult.value.dailyRefillLimit,
    expiresAt: input.expiresAt,
  });
  if (isErr(result)) {
    throwDomainError(result.error);
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
  const limitResult = parseSearchPolicyLimit(input.monthlySearchLimit);
  if (isErr(limitResult)) {
    throwDomainError(limitResult.error);
  }
  const result = await capacityManageService.updateSearchScopeDefault(session, {
    scopeType: input.scopeType,
    scopeId: toScopeId(input.scopeType, safeScopeId),
    monthlySearchLimit: limitResult.value,
  });
  if (isErr(result)) {
    throwDomainError(result.error);
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
  const policyResult = parseLeadPolicyValues({
    activeBufferTarget: input.activeBufferTarget,
    dailyRefillLimit: input.dailyRefillLimit,
  });
  if (isErr(policyResult)) {
    throwDomainError(policyResult.error);
  }
  const result = await capacityManageService.updateLeadScopeDefault(session, {
    scopeType: input.scopeType,
    scopeId: toScopeId(input.scopeType, safeScopeId),
    activeBufferTarget: policyResult.value.activeBufferTarget,
    dailyRefillLimit: policyResult.value.dailyRefillLimit,
  });
  if (isErr(result)) {
    throwDomainError(result.error);
  }
  return result.value;
}

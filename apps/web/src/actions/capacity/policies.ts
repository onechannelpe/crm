"use server";

import { requirePermission } from "~/lib/auth/access/session";
import {
  updateLeadScopeDefault,
  updateLeadUserOverride,
  updateSearchScopeDefault,
  updateSearchUserOverride,
} from "~/server/capacity-admin/manage-capacity";
import { repos } from "~/server/shared/context";
import { isErr } from "~/server/shared/result";

import { mapCapacityError } from "./errors";
import {
  parseLeadPolicyOverrideInput,
  parseScopeDefaultInput,
  parseLeadPolicyValues,
  parseSearchPolicyLimit,
  parseSearchPolicyOverrideInput,
} from "./input";

export async function updateSearchPolicyOverride(input: {
  userId: number;
  monthlySearchLimit: number;
  expiresAt: number | null;
}) {
  const overrideInput = parseSearchPolicyOverrideInput(input);
  if (isErr(overrideInput)) mapCapacityError(overrideInput.error);

  const session = await requirePermission("capacity:policy:manage");

  const result = await updateSearchUserOverride(
    {
      actorUserId: session.userId,
      targetUserId: overrideInput.value.userId,
      monthlyLimit: overrideInput.value.monthlyLimit,
      expiresAt: overrideInput.value.expiresAt,
    },
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
  const overrideInput = parseLeadPolicyOverrideInput(input);
  if (isErr(overrideInput)) mapCapacityError(overrideInput.error);

  const session = await requirePermission("capacity:policy:manage");

  const result = await updateLeadUserOverride(
    {
      actorUserId: session.userId,
      targetUserId: overrideInput.value.userId,
      bufferTarget: overrideInput.value.bufferTarget,
      dailyLimit: overrideInput.value.dailyLimit,
      expiresAt: overrideInput.value.expiresAt,
    },
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
  const scopeInput = parseScopeDefaultInput(input);
  if (isErr(scopeInput)) mapCapacityError(scopeInput.error);
  const limitResult = parseSearchPolicyLimit(input.monthlySearchLimit);
  if (isErr(limitResult)) mapCapacityError(limitResult.error);

  const session = await requirePermission("capacity:policy:manage");

  const searchScopeCommand =
    scopeInput.value.scopeType === "branch"
      ? {
          actorUserId: session.userId,
          scopeType: "branch" as const,
          scopeId: scopeInput.value.scopeId,
          monthlyLimit: limitResult.value,
        }
      : {
          actorUserId: session.userId,
          scopeType: "team" as const,
          scopeId: scopeInput.value.scopeId,
          monthlyLimit: limitResult.value,
        };

  const result = await updateSearchScopeDefault(
    searchScopeCommand,
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
  const scopeInput = parseScopeDefaultInput(input);
  if (isErr(scopeInput)) mapCapacityError(scopeInput.error);
  const policyResult = parseLeadPolicyValues({
    activeBufferTarget: input.activeBufferTarget,
    dailyRefillLimit: input.dailyRefillLimit,
  });
  if (isErr(policyResult)) mapCapacityError(policyResult.error);

  const session = await requirePermission("capacity:policy:manage");

  const leadScopeCommand =
    scopeInput.value.scopeType === "branch"
      ? {
          actorUserId: session.userId,
          scopeType: "branch" as const,
          scopeId: scopeInput.value.scopeId,
          bufferTarget: policyResult.value.activeBufferTarget,
          dailyLimit: policyResult.value.dailyRefillLimit,
        }
      : {
          actorUserId: session.userId,
          scopeType: "team" as const,
          scopeId: scopeInput.value.scopeId,
          bufferTarget: policyResult.value.activeBufferTarget,
          dailyLimit: policyResult.value.dailyRefillLimit,
        };

  const result = await updateLeadScopeDefault(leadScopeCommand, session, repos);
  if (isErr(result)) mapCapacityError(result.error);
  return result.value;
}

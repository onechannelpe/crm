"use server";

import {
  updateLeadPolicyDefault as updateLeadPolicyDefaultService,
  updateLeadPolicyOverride as updateLeadPolicyOverrideService,
  updateSearchPolicyDefault as updateSearchPolicyDefaultService,
  updateSearchPolicyOverride as updateSearchPolicyOverrideService,
} from "~/server/capacity/application/commands";
import type { ScopeRef } from "~/server/capacity/domain/types";
import { serverRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";
import type { BranchId, TeamId, UserId } from "~/server/shared/ids";

import {
  parseLeadPolicyOverrideInput,
  parseLeadPolicyValues,
  parseScopeDefaultInput,
  parseSearchPolicyLimit,
  parseSearchPolicyOverrideInput,
} from "./input";

export async function updateSearchPolicyOverride(input: {
  userId: UserId;
  monthlySearchLimit: number;
  expiresAt: number | null;
}) {
  const overrideInput = parseSearchPolicyOverrideInput(input);
  if (!overrideInput.ok) throw overrideInput.error;
  return runAction({
    actionName: "capacity.search_policy_override.update",
    access: { kind: "permission", permission: "capacity:policy:manage" },
    input: overrideInput.value,
    execute: (ctx) =>
      updateSearchPolicyOverrideService(
        ctx,
        serverRuntime.capacity.commands.repos,
        overrideInput.value,
      ),
  });
}

export async function updateLeadPolicyOverride(input: {
  userId: UserId;
  activeBufferTarget: number;
  dailyRefillLimit: number;
  expiresAt: number | null;
}) {
  const overrideInput = parseLeadPolicyOverrideInput(input);
  if (!overrideInput.ok) throw overrideInput.error;
  return runAction({
    actionName: "capacity.lead_policy_override.update",
    access: { kind: "permission", permission: "capacity:policy:manage" },
    input: overrideInput.value,
    execute: (ctx) =>
      updateLeadPolicyOverrideService(
        ctx,
        serverRuntime.capacity.commands.repos,
        overrideInput.value,
      ),
  });
}

export async function updateSearchPolicyDefault(input: {
  scopeType: "branch" | "team";
  scopeId: BranchId | TeamId;
  monthlySearchLimit: number;
}) {
  const scopeInput = parseScopeDefaultInput(input);
  if (!scopeInput.ok) throw scopeInput.error;
  const scope: ScopeRef =
    scopeInput.value.scopeType === "branch"
      ? { kind: "branch", scopeId: scopeInput.value.scopeId }
      : { kind: "team", scopeId: scopeInput.value.scopeId };
  const limitResult = parseSearchPolicyLimit(input.monthlySearchLimit);
  if (!limitResult.ok) throw limitResult.error;
  return runAction({
    actionName: "capacity.search_policy_default.update",
    access: { kind: "permission", permission: "capacity:policy:manage" },
    input: {
      scope,
      monthlyLimit: limitResult.value,
    },
    execute: (ctx) =>
      updateSearchPolicyDefaultService(
        ctx,
        serverRuntime.capacity.commands.repos,
        {
          scope,
          monthlyLimit: limitResult.value,
        },
      ),
  });
}

export async function updateLeadPolicyDefault(input: {
  scopeType: "branch" | "team";
  scopeId: BranchId | TeamId;
  activeBufferTarget: number;
  dailyRefillLimit: number;
}) {
  const scopeInput = parseScopeDefaultInput(input);
  if (!scopeInput.ok) throw scopeInput.error;
  const scope: ScopeRef =
    scopeInput.value.scopeType === "branch"
      ? { kind: "branch", scopeId: scopeInput.value.scopeId }
      : { kind: "team", scopeId: scopeInput.value.scopeId };
  const policyResult = parseLeadPolicyValues({
    activeBufferTarget: input.activeBufferTarget,
    dailyRefillLimit: input.dailyRefillLimit,
  });
  if (!policyResult.ok) throw policyResult.error;
  return runAction({
    actionName: "capacity.lead_policy_default.update",
    access: { kind: "permission", permission: "capacity:policy:manage" },
    input: {
      scope,
      bufferTarget: policyResult.value.activeBufferTarget,
      dailyLimit: policyResult.value.dailyRefillLimit,
    },
    execute: (ctx) =>
      updateLeadPolicyDefaultService(
        ctx,
        serverRuntime.capacity.commands.repos,
        {
          scope,
          bufferTarget: policyResult.value.activeBufferTarget,
          dailyLimit: policyResult.value.dailyRefillLimit,
        },
      ),
  });
}

"use server";

import {
  updateLeadPolicyDefault as updateLeadPolicyDefaultService,
  updateLeadPolicyOverride as updateLeadPolicyOverrideService,
  updateSearchPolicyDefault as updateSearchPolicyDefaultService,
  updateSearchPolicyOverride as updateSearchPolicyOverrideService,
} from "~/server/capacity/application/commands";
import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";

import {
  parseLeadPolicyOverrideInput,
  parseLeadPolicyValues,
  parseScopeDefaultInput,
  parseSearchPolicyLimit,
  parseSearchPolicyOverrideInput,
} from "./input";

export async function updateSearchPolicyOverride(input: {
  userId: number;
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
        getServerRuntime().capacity.commands.repos,
        overrideInput.value,
      ),
  });
}

export async function updateLeadPolicyOverride(input: {
  userId: number;
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
        getServerRuntime().capacity.commands.repos,
        overrideInput.value,
      ),
  });
}

export async function updateSearchPolicyDefault(input: {
  scopeType: "branch" | "team";
  scopeId: number;
  monthlySearchLimit: number;
}) {
  const scopeInput = parseScopeDefaultInput(input);
  if (!scopeInput.ok) throw scopeInput.error;
  const limitResult = parseSearchPolicyLimit(input.monthlySearchLimit);
  if (!limitResult.ok) throw limitResult.error;
  return runAction({
    actionName: "capacity.search_policy_default.update",
    access: { kind: "permission", permission: "capacity:policy:manage" },
    input: {
      scope: {
        kind: scopeInput.value.scopeType,
        scopeId: scopeInput.value.scopeId,
      },
      monthlyLimit: limitResult.value,
    },
    execute: (ctx) =>
      updateSearchPolicyDefaultService(
        ctx,
        getServerRuntime().capacity.commands.repos,
        {
          scope: {
            kind: scopeInput.value.scopeType,
            scopeId: scopeInput.value.scopeId,
          },
          monthlyLimit: limitResult.value,
        },
      ),
  });
}

export async function updateLeadPolicyDefault(input: {
  scopeType: "branch" | "team";
  scopeId: number;
  activeBufferTarget: number;
  dailyRefillLimit: number;
}) {
  const scopeInput = parseScopeDefaultInput(input);
  if (!scopeInput.ok) throw scopeInput.error;
  const policyResult = parseLeadPolicyValues({
    activeBufferTarget: input.activeBufferTarget,
    dailyRefillLimit: input.dailyRefillLimit,
  });
  if (!policyResult.ok) throw policyResult.error;
  return runAction({
    actionName: "capacity.lead_policy_default.update",
    access: { kind: "permission", permission: "capacity:policy:manage" },
    input: {
      scope: {
        kind: scopeInput.value.scopeType,
        scopeId: scopeInput.value.scopeId,
      },
      bufferTarget: policyResult.value.activeBufferTarget,
      dailyLimit: policyResult.value.dailyRefillLimit,
    },
    execute: (ctx) =>
      updateLeadPolicyDefaultService(
        ctx,
        getServerRuntime().capacity.commands.repos,
        {
          scope: {
            kind: scopeInput.value.scopeType,
            scopeId: scopeInput.value.scopeId,
          },
          bufferTarget: policyResult.value.activeBufferTarget,
          dailyLimit: policyResult.value.dailyRefillLimit,
        },
      ),
  });
}

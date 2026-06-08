"use server";

import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";
import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";

import {
  parseLeadPolicyOverrideInput,
  parseLeadPolicyValues,
  parseScopeDefaultInput,
  parseSearchPolicyLimit,
  parseSearchPolicyOverrideInput,
} from "./input";

type ScopeDefault = { scope: { kind: "branch" | "team"; scopeId: number } };

function parseSearchScopeDefault(input: {
  scopeType: "branch" | "team";
  scopeId: number;
  monthlySearchLimit: number;
}): Result<ScopeDefault & { monthlyLimit: number }, DomainError> {
  const scope = parseScopeDefaultInput(input);
  if (!scope.ok) return scope;

  const limit = parseSearchPolicyLimit(input.monthlySearchLimit);
  if (!limit.ok) return limit;

  return Ok({
    scope: { kind: scope.value.scopeType, scopeId: scope.value.scopeId },
    monthlyLimit: limit.value,
  });
}

function parseLeadScopeDefault(input: {
  scopeType: "branch" | "team";
  scopeId: number;
  activeBufferTarget: number;
  dailyRefillLimit: number;
}): Result<
  ScopeDefault & { bufferTarget: number; dailyLimit: number },
  DomainError
> {
  const scope = parseScopeDefaultInput(input);
  if (!scope.ok) return scope;

  const values = parseLeadPolicyValues({
    activeBufferTarget: input.activeBufferTarget,
    dailyRefillLimit: input.dailyRefillLimit,
  });
  if (!values.ok) return values;

  return Ok({
    scope: { kind: scope.value.scopeType, scopeId: scope.value.scopeId },
    bufferTarget: values.value.activeBufferTarget,
    dailyLimit: values.value.dailyRefillLimit,
  });
}

export async function updateSearchPolicyOverride(input: {
  userId: number;
  monthlySearchLimit: number;
  expiresAt: number | null;
}) {
  return runAction({
    actionName: "capacity.search_policy_override.update",
    access: { kind: "permission", permission: "capacity:policy:manage" },
    parse: () => parseSearchPolicyOverrideInput(input),
    audit: ({ userId }) => ({ userId }),
    execute: (ctx, override) =>
      getServerRuntime().capacity.useCases.updateSearchPolicyOverride(
        ctx,
        override,
      ),
  });
}

export async function updateLeadPolicyOverride(input: {
  userId: number;
  activeBufferTarget: number;
  dailyRefillLimit: number;
  expiresAt: number | null;
}) {
  return runAction({
    actionName: "capacity.lead_policy_override.update",
    access: { kind: "permission", permission: "capacity:policy:manage" },
    parse: () => parseLeadPolicyOverrideInput(input),
    audit: ({ userId }) => ({ userId }),
    execute: (ctx, override) =>
      getServerRuntime().capacity.useCases.updateLeadPolicyOverride(
        ctx,
        override,
      ),
  });
}

export async function updateSearchPolicyDefault(input: {
  scopeType: "branch" | "team";
  scopeId: number;
  monthlySearchLimit: number;
}) {
  return runAction({
    actionName: "capacity.search_policy_default.update",
    access: { kind: "permission", permission: "capacity:policy:manage" },
    parse: () => parseSearchScopeDefault(input),
    audit: ({ scope }) => ({ scopeKind: scope.kind, scopeId: scope.scopeId }),
    execute: (ctx, params) =>
      getServerRuntime().capacity.useCases.updateSearchPolicyDefault(
        ctx,
        params,
      ),
  });
}

export async function updateLeadPolicyDefault(input: {
  scopeType: "branch" | "team";
  scopeId: number;
  activeBufferTarget: number;
  dailyRefillLimit: number;
}) {
  return runAction({
    actionName: "capacity.lead_policy_default.update",
    access: { kind: "permission", permission: "capacity:policy:manage" },
    parse: () => parseLeadScopeDefault(input),
    audit: ({ scope }) => ({ scopeKind: scope.kind, scopeId: scope.scopeId }),
    execute: (ctx, params) =>
      getServerRuntime().capacity.useCases.updateLeadPolicyDefault(ctx, params),
  });
}

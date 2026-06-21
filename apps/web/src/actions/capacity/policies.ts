"use server";

import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import { parseObject, validationFail } from "~/server/shared/parsing";

const SCOPE_TYPES = ["branch", "team"] as const;

export async function updateSearchPolicyOverride(input: unknown) {
  return runAction({
    name: "capacity.search_policy_override.update",
    access: { kind: "permission", permission: "capacity:policy:manage" },

    parse: () =>
      parseObject(input, validationFail, (r) => ({
        userId: r.posInt("userId"),
        monthlyLimit: r.posInt("monthlySearchLimit"),
        expiresAt: r.optNum("expiresAt"),
      })),

    audit: ({ userId }) => ({ userId }),

    execute: (ctx, override) =>
      getServerRuntime().capacity.useCases.updateSearchPolicyOverride(
        ctx,
        override,
      ),
  });
}

export async function updateLeadPolicyOverride(input: unknown) {
  return runAction({
    name: "capacity.lead_policy_override.update",
    access: { kind: "permission", permission: "capacity:policy:manage" },

    parse: () =>
      parseObject(input, validationFail, (r) => ({
        userId: r.posInt("userId"),
        bufferTarget: r.num("activeBufferTarget"),
        dailyLimit: r.num("dailyRefillLimit"),
        expiresAt: r.optNum("expiresAt"),
      })),

    audit: ({ userId }) => ({ userId }),

    execute: (ctx, override) =>
      getServerRuntime().capacity.useCases.updateLeadPolicyOverride(
        ctx,
        override,
      ),
  });
}

export async function updateSearchPolicyDefault(input: unknown) {
  return runAction({
    name: "capacity.search_policy_default.update",
    access: { kind: "permission", permission: "capacity:policy:manage" },

    parse: () =>
      parseObject(input, validationFail, (r) => ({
        scope: {
          kind: r.enum("scopeType", SCOPE_TYPES),
          scopeId: r.posInt("scopeId"),
        },
        monthlyLimit: r.posInt("monthlySearchLimit"),
      })),

    audit: ({ scope }) => ({
      scopeKind: scope.kind,
      scopeId: scope.scopeId,
    }),

    execute: (ctx, params) =>
      getServerRuntime().capacity.useCases.updateSearchPolicyDefault(
        ctx,
        params,
      ),
  });
}

export async function updateLeadPolicyDefault(input: unknown) {
  return runAction({
    name: "capacity.lead_policy_default.update",
    access: { kind: "permission", permission: "capacity:policy:manage" },

    parse: () =>
      parseObject(input, validationFail, (r) => ({
        scope: {
          kind: r.enum("scopeType", SCOPE_TYPES),
          scopeId: r.posInt("scopeId"),
        },
        bufferTarget: r.num("activeBufferTarget"),
        dailyLimit: r.num("dailyRefillLimit"),
      })),

    audit: ({ scope }) => ({
      scopeKind: scope.kind,
      scopeId: scope.scopeId,
    }),

    execute: (ctx, params) =>
      getServerRuntime().capacity.useCases.updateLeadPolicyDefault(ctx, params),
  });
}

"use server";

import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import { BranchId, TeamId, UserId } from "~/server/shared/ids";
import { parseObject, validationFail } from "~/server/shared/parsing";

const SCOPE_TYPES = ["branch", "team"] as const;

export async function updateSearchPolicyOverride(input: unknown) {
  return runAction({
    name: "capacity.search_policy_override.update",
    access: { kind: "permission", permission: "capacity:policy:manage" },

    parse: () =>
      parseObject(input, validationFail, (r) => ({
        userId: r.id("userId", UserId),
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
        userId: r.id("userId", UserId),
        bufferTarget: r.posInt("activeBufferTarget"),
        dailyLimit: r.posInt("dailyRefillLimit"),
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
        scope: (() => {
          const kind = r.enum("scopeType", SCOPE_TYPES);
          return kind === "branch"
            ? { kind, scopeId: r.id("scopeId", BranchId) }
            : { kind, scopeId: r.id("scopeId", TeamId) };
        })(),
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
        scope: (() => {
          const kind = r.enum("scopeType", SCOPE_TYPES);
          return kind === "branch"
            ? { kind, scopeId: r.id("scopeId", BranchId) }
            : { kind, scopeId: r.id("scopeId", TeamId) };
        })(),
        bufferTarget: r.posInt("activeBufferTarget"),
        dailyLimit: r.posInt("dailyRefillLimit"),
      })),

    audit: ({ scope }) => ({
      scopeKind: scope.kind,
      scopeId: scope.scopeId,
    }),

    execute: (ctx, params) =>
      getServerRuntime().capacity.useCases.updateLeadPolicyDefault(ctx, params),
  });
}

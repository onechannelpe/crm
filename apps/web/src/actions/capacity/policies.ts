"use server";

import { BranchId, TeamId, UserId } from "~/domain/ids";
import { runAction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";
import { getServerRuntime } from "~/server/platform/container";

const SCOPE_TYPES = ["branch", "team"] as const;

export async function updateExecutivePolicyOverride(input: unknown) {
  return runAction({
    name: "capacity.executive_policy_override.update",
    access: { kind: "permission", permission: "capacity:policy:manage" },

    parse: () =>
      parseObject(input, validationFail, (r) => ({
        userId: r.id("userId", UserId),
        monthlyLimit: r.posInt("monthlySearchLimit"),
        bufferTarget: r.posInt("activeBufferTarget"),
        dailyLimit: r.posInt("dailyRefillLimit"),
        expiresAt: r.optNum("expiresAt"),
      })),

    audit: ({ userId }) => ({ userId }),

    execute: (ctx, override) =>
      getServerRuntime().capacity.useCases.updateExecutivePolicyOverride(
        ctx,
        override,
      ),
  });
}

export async function updateScopePolicy(input: unknown) {
  return runAction({
    name: "capacity.scope_policy.update",
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
        bufferTarget: r.posInt("activeBufferTarget"),
        dailyLimit: r.posInt("dailyRefillLimit"),
      })),

    audit: ({ scope }) => ({
      scopeKind: scope.kind,
      scopeId: scope.scopeId,
    }),

    execute: (ctx, params) =>
      getServerRuntime().capacity.useCases.updateScopePolicy(ctx, params),
  });
}

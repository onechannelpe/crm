import type { AppContext } from "~/server/shared/action-runtime";
import { repos } from "~/server/shared/context";
import { updateLeadScopeDefault, updateLeadUserOverride, updateSearchScopeDefault, updateSearchUserOverride } from "~/server/capacity-admin/manage-capacity";

import type { ScopeRef } from "./types";

export function updateSearchPolicyOverride(
  ctx: AppContext,
  input: { userId: number; monthlyLimit: number; expiresAt: number | null },
) {
  return updateSearchUserOverride(
    {
      actorUserId: ctx.actor.userId,
      targetUserId: input.userId,
      monthlyLimit: input.monthlyLimit,
      expiresAt: input.expiresAt,
    },
    ctx.actor,
    repos,
  );
}

export function updateLeadPolicyOverride(
  ctx: AppContext,
  input: {
    userId: number;
    bufferTarget: number;
    dailyLimit: number;
    expiresAt: number | null;
  },
) {
  return updateLeadUserOverride(
    {
      actorUserId: ctx.actor.userId,
      targetUserId: input.userId,
      bufferTarget: input.bufferTarget,
      dailyLimit: input.dailyLimit,
      expiresAt: input.expiresAt,
    },
    ctx.actor,
    repos,
  );
}

export function updateSearchPolicyDefault(
  ctx: AppContext,
  input: { scope: ScopeRef; monthlyLimit: number },
) {
  return updateSearchScopeDefault(
    {
      actorUserId: ctx.actor.userId,
      scopeType: input.scope.kind,
      scopeId: input.scope.scopeId,
      monthlyLimit: input.monthlyLimit,
    },
    ctx.actor,
    repos,
  );
}

export function updateLeadPolicyDefault(
  ctx: AppContext,
  input: { scope: ScopeRef; bufferTarget: number; dailyLimit: number },
) {
  return updateLeadScopeDefault(
    {
      actorUserId: ctx.actor.userId,
      scopeType: input.scope.kind,
      scopeId: input.scope.scopeId,
      bufferTarget: input.bufferTarget,
      dailyLimit: input.dailyLimit,
    },
    ctx.actor,
    repos,
  );
}

"use server";

import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";
import type { DomainError } from "~/server/shared/domain-error";
import { parseObject, validationFail } from "~/server/shared/parsing";
import type { Result } from "~/server/shared/result";

type CapacityDecision = {
  requestId: number;
  note: string | null;
};

type CapacityGrant = {
  userId: number;
  amount: number;
  reason: string;
};

function parseCapacityDecision(
  requestId: unknown,
  note: unknown,
): Result<CapacityDecision, DomainError> {
  return parseObject({ requestId, note }, validationFail, (r) => ({
    requestId: r.posInt("requestId"),
    note: r.optStr("note"),
  }));
}

function parseCapacityGrant(
  userId: unknown,
  amount: unknown,
  reason: unknown,
): Result<CapacityGrant, DomainError> {
  return parseObject({ userId, amount, reason }, validationFail, (r) => ({
    userId: r.posInt("userId"),
    amount: r.num("amount"),
    reason: r.str("reason"),
  }));
}

export async function approveCapacity(requestId: unknown, note?: unknown) {
  return runAction({
    name: "capacity.approve",
    access: { kind: "permission", permission: "capacity:approve" },
    parse: () => parseCapacityDecision(requestId, note),
    audit: ({ requestId }) => ({ requestId }),
    execute: (ctx, decision) =>
      getServerRuntime().capacity.useCases.approveCapacityRequest(
        ctx,
        decision,
      ),
  });
}

export async function rejectCapacity(requestId: unknown, note: unknown) {
  return runAction({
    name: "capacity.reject",
    access: { kind: "permission", permission: "capacity:approve" },
    parse: () => parseCapacityDecision(requestId, note),
    audit: ({ requestId }) => ({ requestId }),
    execute: (ctx, decision) =>
      getServerRuntime().capacity.useCases.rejectCapacityRequest(ctx, decision),
  });
}

export async function grantMoreSearches(
  userId: unknown,
  amount: unknown,
  reason: unknown,
) {
  return runAction({
    name: "capacity.grant_search",
    access: { kind: "permission", permission: "capacity:manage" },
    parse: () => parseCapacityGrant(userId, amount, reason),
    audit: ({ userId, amount }) => ({ userId, amount }),
    execute: (ctx, grant) =>
      getServerRuntime().capacity.useCases.grantSearchCapacityDirect(ctx, {
        targetUserId: grant.userId,
        amount: grant.amount,
        reason: grant.reason,
      }),
  });
}

export async function grantMoreLeadRefill(
  userId: unknown,
  amount: unknown,
  reason: unknown,
) {
  return runAction({
    name: "capacity.grant_lead",
    access: { kind: "permission", permission: "capacity:manage" },
    parse: () => parseCapacityGrant(userId, amount, reason),
    audit: ({ userId, amount }) => ({ userId, amount }),
    execute: (ctx, grant) =>
      getServerRuntime().capacity.useCases.grantLeadCapacityDirect(ctx, {
        targetUserId: grant.userId,
        amount: grant.amount,
        reason: grant.reason,
      }),
  });
}

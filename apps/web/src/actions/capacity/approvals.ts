"use server";

import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import type { DomainError } from "~/server/shared/domain-error";
import { parseObject, validationFail } from "~/server/shared/parsing";
import type { Result } from "~/server/shared/result";

type CapacityDecision = {
  requestId: number;
  note: string | null;
};

type CapacityGrant = {
  targetUserId: number;
  amount: number;
  reason: string;
};

function parseCapacityDecision(
  rawRequestId: unknown,
  rawNote: unknown,
): Result<CapacityDecision, DomainError> {
  return parseObject(
    { requestId: rawRequestId, note: rawNote },
    validationFail,
    (r) => ({
      requestId: r.posInt("requestId"),
      note: r.optStr("note"),
    }),
  );
}

function parseCapacityGrant(
  rawUserId: unknown,
  rawAmount: unknown,
  rawReason: unknown,
): Result<CapacityGrant, DomainError> {
  return parseObject(
    { userId: rawUserId, amount: rawAmount, reason: rawReason },
    validationFail,
    (r) => ({
      targetUserId: r.posInt("userId"),
      amount: r.num("amount"),
      reason: r.str("reason"),
    }),
  );
}

export async function approveCapacity(
  rawRequestId: unknown,
  rawNote?: unknown,
) {
  return runAction({
    name: "capacity.approve",
    access: { kind: "permission", permission: "capacity:approve" },
    parse: () => parseCapacityDecision(rawRequestId, rawNote),
    audit: (decision) => ({ requestId: decision.requestId }),
    execute: (ctx, decision) =>
      getServerRuntime().capacity.useCases.approveCapacityRequest(
        ctx,
        decision,
      ),
  });
}

export async function rejectCapacity(rawRequestId: unknown, rawNote: unknown) {
  return runAction({
    name: "capacity.reject",
    access: { kind: "permission", permission: "capacity:approve" },
    parse: () => parseCapacityDecision(rawRequestId, rawNote),
    audit: (decision) => ({ requestId: decision.requestId }),
    execute: (ctx, decision) =>
      getServerRuntime().capacity.useCases.rejectCapacityRequest(ctx, decision),
  });
}

export async function grantMoreSearches(
  rawUserId: unknown,
  rawAmount: unknown,
  rawReason: unknown,
) {
  return runAction({
    name: "capacity.grant_search",
    access: { kind: "permission", permission: "capacity:manage" },
    parse: () => parseCapacityGrant(rawUserId, rawAmount, rawReason),
    audit: (grant) => ({
      targetUserId: grant.targetUserId,
      amount: grant.amount,
    }),
    execute: (ctx, grant) =>
      getServerRuntime().capacity.useCases.grantSearchCapacityDirect(ctx, {
        targetUserId: grant.targetUserId,
        amount: grant.amount,
        reason: grant.reason,
      }),
  });
}

export async function grantMoreLeadRefill(
  rawUserId: unknown,
  rawAmount: unknown,
  rawReason: unknown,
) {
  return runAction({
    name: "capacity.grant_lead",
    access: { kind: "permission", permission: "capacity:manage" },
    parse: () => parseCapacityGrant(rawUserId, rawAmount, rawReason),
    audit: (grant) => ({
      targetUserId: grant.targetUserId,
      amount: grant.amount,
    }),
    execute: (ctx, grant) =>
      getServerRuntime().capacity.useCases.grantLeadCapacityDirect(ctx, {
        targetUserId: grant.targetUserId,
        amount: grant.amount,
        reason: grant.reason,
      }),
  });
}

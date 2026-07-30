import type { DomainError } from "~/domain/errors";
import { CapacityRequestId, UserId } from "~/domain/ids";
import { composeCapacity } from "~/server/capacity/ui/composition";
import { executeSessionServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";
import type { Result } from "~/shared/result";

type CapacityDecision = {
  requestId: CapacityRequestId;
  note: string | null;
};

type CapacityGrant = {
  targetUserId: UserId;
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
      requestId: r.id("requestId", CapacityRequestId),
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
      targetUserId: r.id("userId", UserId),
      amount: r.posInt("amount"),
      reason: r.str("reason"),
    }),
  );
}

export async function approveCapacity(
  rawRequestId: unknown,
  rawNote?: unknown,
) {
  "use server";

  return executeSessionServerFunction({
    name: "capacity.approve",
    access: { kind: "permission", permission: "capacity:approve" },
    parse: () => parseCapacityDecision(rawRequestId, rawNote),
    audit: (decision) => ({ requestId: decision.requestId }),
    execute: (ctx, decision) =>
      composeCapacity().useCases.approveCapacityRequest(ctx, decision),
  });
}

export async function rejectCapacity(rawRequestId: unknown, rawNote: unknown) {
  "use server";

  return executeSessionServerFunction({
    name: "capacity.reject",
    access: { kind: "permission", permission: "capacity:approve" },
    parse: () => parseCapacityDecision(rawRequestId, rawNote),
    audit: (decision) => ({ requestId: decision.requestId }),
    execute: (ctx, decision) =>
      composeCapacity().useCases.rejectCapacityRequest(ctx, decision),
  });
}

export async function grantMoreSearches(
  rawUserId: unknown,
  rawAmount: unknown,
  rawReason: unknown,
) {
  "use server";

  return executeSessionServerFunction({
    name: "capacity.grant_search",
    access: { kind: "permission", permission: "capacity:manage" },
    parse: () => parseCapacityGrant(rawUserId, rawAmount, rawReason),
    audit: (grant) => ({
      targetUserId: grant.targetUserId,
      amount: grant.amount,
    }),
    execute: (ctx, grant) =>
      composeCapacity().useCases.grantSearchCapacityDirect(ctx, {
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
  "use server";

  return executeSessionServerFunction({
    name: "capacity.grant_lead",
    access: { kind: "permission", permission: "capacity:manage" },
    parse: () => parseCapacityGrant(rawUserId, rawAmount, rawReason),
    audit: (grant) => ({
      targetUserId: grant.targetUserId,
      amount: grant.amount,
    }),
    execute: (ctx, grant) =>
      composeCapacity().useCases.grantLeadCapacityDirect(ctx, {
        targetUserId: grant.targetUserId,
        amount: grant.amount,
        reason: grant.reason,
      }),
  });
}

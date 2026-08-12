import { CapacityRequestId, UserId } from "~/domain/ids";
import { getApplication } from "~/server/composition/application";
import { executeSessionServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";

function parseCapacityDecision(rawRequestId: unknown, rawNote: unknown) {
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
) {
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
    telemetry: ({ requestId }) => ({ requestId }),
    execute: (ctx, decision) =>
      getApplication().capacity.approveCapacityRequest(ctx, decision),
  });
}

export async function rejectCapacity(rawRequestId: unknown, rawNote: unknown) {
  "use server";

  return executeSessionServerFunction({
    name: "capacity.reject",
    access: { kind: "permission", permission: "capacity:approve" },
    parse: () => parseCapacityDecision(rawRequestId, rawNote),
    telemetry: ({ requestId }) => ({ requestId }),
    execute: (ctx, decision) =>
      getApplication().capacity.rejectCapacityRequest(ctx, decision),
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
    telemetry: ({ targetUserId, amount }) => ({
      targetUserId,
      amount,
    }),
    execute: (ctx, grant) =>
      getApplication().capacity.grantSearchCapacityDirect(ctx, grant),
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
    telemetry: ({ targetUserId, amount }) => ({
      targetUserId,
      amount,
    }),
    execute: (ctx, grant) =>
      getApplication().capacity.grantLeadCapacityDirect(ctx, grant),
  });
}

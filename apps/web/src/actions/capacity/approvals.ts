"use server";

import { requirePermission } from "~/lib/auth/access/session";
import {
  assertNonEmptyString,
  assertPositiveInt,
} from "~/lib/contracts/guards";
import { checkActionRateLimit } from "~/lib/security/action-rate-limit";
import {
  approveCapacityRequest,
  rejectCapacityRequest,
} from "~/server/capacity-admin/approve-capacity";
import {
  grantLeadCapacityDirect,
  grantSearchCapacityDirect,
} from "~/server/capacity-admin/manage-capacity";
import {
  repos,
  rateLimitDeps,
  runInRepositoryTransaction,
} from "~/server/shared/context";
import { isErr } from "~/server/shared/result";

import { mapCapacityError } from "./errors";
import { parseCapacityAmount, parseCapacityReason } from "./input";

export async function approveCapacity(requestId: number, note?: string) {
  const safeRequestId = assertPositiveInt(requestId, "requestId");
  const session = await requirePermission("capacity:approve");
  await checkActionRateLimit("capacity.approve", session.userId, rateLimitDeps);

  const result = await approveCapacityRequest(
    {
      actorUserId: session.userId,
      requestId: safeRequestId,
      note: note ?? null,
    },
    session,
    runInRepositoryTransaction,
  );
  if (isErr(result)) mapCapacityError(result.error);
  return result.value;
}

export async function rejectCapacity(requestId: number, note: string) {
  const safeRequestId = assertPositiveInt(requestId, "requestId");
  const safeNote = assertNonEmptyString(note, "note");
  const session = await requirePermission("capacity:approve");
  await checkActionRateLimit("capacity.approve", session.userId, rateLimitDeps);

  const result = await rejectCapacityRequest(
    { actorUserId: session.userId, requestId: safeRequestId, note: safeNote },
    session,
    runInRepositoryTransaction,
  );
  if (isErr(result)) mapCapacityError(result.error);
  return result.value;
}

export async function grantMoreSearches(
  userId: number,
  amount: number,
  reason: string,
) {
  const safeUserId = assertPositiveInt(userId, "userId");
  const amountResult = parseCapacityAmount(amount);
  if (isErr(amountResult)) mapCapacityError(amountResult.error);
  const reasonResult = parseCapacityReason(reason);
  if (isErr(reasonResult)) mapCapacityError(reasonResult.error);

  const session = await requirePermission("capacity:manage");

  const result = await grantSearchCapacityDirect(
    {
      actorUserId: session.userId,
      targetUserId: safeUserId,
      amount: amountResult.value,
      reason: reasonResult.value,
    },
    session,
    repos,
  );
  if (isErr(result)) mapCapacityError(result.error);
  return result.value;
}

export async function grantMoreLeadRefill(
  userId: number,
  amount: number,
  reason: string,
) {
  const safeUserId = assertPositiveInt(userId, "userId");
  const amountResult = parseCapacityAmount(amount);
  if (isErr(amountResult)) mapCapacityError(amountResult.error);
  const reasonResult = parseCapacityReason(reason);
  if (isErr(reasonResult)) mapCapacityError(reasonResult.error);

  const session = await requirePermission("capacity:manage");

  const result = await grantLeadCapacityDirect(
    {
      actorUserId: session.userId,
      targetUserId: safeUserId,
      amount: amountResult.value,
      reason: reasonResult.value,
    },
    session,
    repos,
  );
  if (isErr(result)) mapCapacityError(result.error);
  return result.value;
}

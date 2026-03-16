"use server";

import { requirePermission } from "~/lib/auth/access/session";
import { config } from "~/lib/config";
import {
  assertNonEmptyString,
  assertPositiveInt,
} from "~/lib/contracts/guards";
import { checkActionRateLimit } from "~/lib/security/action-rate-limit";
import {
  capacityApprovalService,
  capacityManageService,
  rateLimitDeps,
} from "~/server/shared/context";
import { asCapacityRequestId, asUserId } from "~/server/shared/ids";
import { isErr } from "~/server/shared/result";

import {
  fromCapacityApprovalError,
  fromCapacityManageError,
  throwCapacityActionError,
} from "./errors";

function validateGrantAmount(amount: number): number {
  const safeAmount = assertPositiveInt(amount, "amount");
  if (safeAmount > config.capacityRequests.maxRequestAmount) {
    throwCapacityActionError({
      reason: "validation",
      message: "amount exceeds configured maximum",
    });
  }
  return safeAmount;
}

export async function approveCapacityRequest(requestId: number, note?: string) {
  const safeRequestId = asCapacityRequestId(
    assertPositiveInt(requestId, "requestId"),
  );
  const session = await requirePermission("capacity:approve");
  await checkActionRateLimit("capacity.approve", session.userId, rateLimitDeps);
  const result = await capacityApprovalService.approveCapacityRequest(
    session,
    safeRequestId,
    note,
  );
  if (isErr(result)) {
    throwCapacityActionError(fromCapacityApprovalError(result.error));
  }
  return result.value;
}

export async function rejectCapacityRequest(requestId: number, note: string) {
  const safeRequestId = asCapacityRequestId(
    assertPositiveInt(requestId, "requestId"),
  );
  const safeNote = assertNonEmptyString(note, "note");
  const session = await requirePermission("capacity:approve");
  await checkActionRateLimit("capacity.approve", session.userId, rateLimitDeps);
  const result = await capacityApprovalService.rejectCapacityRequest(
    session,
    safeRequestId,
    safeNote,
  );
  if (isErr(result)) {
    throwCapacityActionError(fromCapacityApprovalError(result.error));
  }
  return result.value;
}

export async function grantMoreSearches(
  userId: number,
  amount: number,
  reason: string,
) {
  const safeUserId = asUserId(assertPositiveInt(userId, "userId"));
  const safeAmount = validateGrantAmount(amount);
  const safeReason = assertNonEmptyString(reason, "reason");
  const session = await requirePermission("capacity:manage");
  const result = await capacityManageService.grantMoreSearches(
    session,
    safeUserId,
    safeAmount,
    safeReason,
  );
  if (isErr(result)) {
    throwCapacityActionError(fromCapacityManageError(result.error));
  }
  return result.value;
}

export async function grantMoreLeadRefill(
  userId: number,
  amount: number,
  reason: string,
) {
  const safeUserId = asUserId(assertPositiveInt(userId, "userId"));
  const safeAmount = validateGrantAmount(amount);
  const safeReason = assertNonEmptyString(reason, "reason");
  const session = await requirePermission("capacity:manage");
  const result = await capacityManageService.grantMoreLeadRefill(
    session,
    safeUserId,
    safeAmount,
    safeReason,
  );
  if (isErr(result)) {
    throwCapacityActionError(fromCapacityManageError(result.error));
  }
  return result.value;
}

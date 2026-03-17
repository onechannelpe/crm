"use server";

import { throwDomainError } from "~/actions/throw-domain-error";
import { requirePermission } from "~/lib/auth/access/session";
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

import { parseCapacityAmount, parseCapacityReason } from "./capacity-input";

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
    throwDomainError(result.error);
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
    throwDomainError(result.error);
  }
  return result.value;
}

export async function grantMoreSearches(
  userId: number,
  amount: number,
  reason: string,
) {
  const safeUserId = asUserId(assertPositiveInt(userId, "userId"));
  const amountResult = parseCapacityAmount(amount);
  if (isErr(amountResult)) {
    throwDomainError(amountResult.error);
  }
  const reasonResult = parseCapacityReason(reason);
  if (isErr(reasonResult)) {
    throwDomainError(reasonResult.error);
  }
  const session = await requirePermission("capacity:manage");
  const result = await capacityManageService.grantMoreSearches(
    session,
    safeUserId,
    amountResult.value,
    reasonResult.value,
  );
  if (isErr(result)) {
    throwDomainError(result.error);
  }
  return result.value;
}

export async function grantMoreLeadRefill(
  userId: number,
  amount: number,
  reason: string,
) {
  const safeUserId = asUserId(assertPositiveInt(userId, "userId"));
  const amountResult = parseCapacityAmount(amount);
  if (isErr(amountResult)) {
    throwDomainError(amountResult.error);
  }
  const reasonResult = parseCapacityReason(reason);
  if (isErr(reasonResult)) {
    throwDomainError(reasonResult.error);
  }
  const session = await requirePermission("capacity:manage");
  const result = await capacityManageService.grantMoreLeadRefill(
    session,
    safeUserId,
    amountResult.value,
    reasonResult.value,
  );
  if (isErr(result)) {
    throwDomainError(result.error);
  }
  return result.value;
}

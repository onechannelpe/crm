"use server";

import { forbiddenError, internalError, notFoundError } from "~/lib/app-errors";
import { requirePermission } from "~/lib/auth/access/session";
import { config } from "~/lib/config";
import {
  assertNonEmptyString,
  assertPositiveInt,
} from "~/lib/contracts/guards";
import { checkActionRateLimit } from "~/lib/security/action-rate-limit";
import { canManageExecutive } from "~/server/capacity/scope";
import {
  searchAllowanceService,
  leadRefillService,
  capacityApprovalService,
  repos,
} from "~/server/shared/context";

export async function approveCapacityRequest(requestId: number, note?: string) {
  const safeRequestId = assertPositiveInt(requestId, "requestId");
  const session = await requirePermission("capacity:approve");
  await checkActionRateLimit("capacity.approve", session.userId, repos);
  const request = await repos.capacityRequests.findById(safeRequestId);
  if (!request) throw notFoundError("Request not found");
  const managed = await canManageExecutive(session, request.user_id, repos);
  if (!managed.ok) throw forbiddenError("Cannot approve this request");
  try {
    return await capacityApprovalService.approveCapacityRequest(
      session.userId,
      request.id,
      note?.trim() || null,
    );
  } catch (error) {
    throw internalError(
      error instanceof Error ? error.message : "Approval failed",
    );
  }
}

export async function rejectCapacityRequest(requestId: number, note: string) {
  const safeRequestId = assertPositiveInt(requestId, "requestId");
  const safeNote = assertNonEmptyString(note, "note");
  const session = await requirePermission("capacity:approve");
  await checkActionRateLimit("capacity.approve", session.userId, repos);
  const request = await repos.capacityRequests.findById(safeRequestId);
  if (!request) throw notFoundError("Request not found");
  const managed = await canManageExecutive(session, request.user_id, repos);
  if (!managed.ok) throw forbiddenError("Cannot reject this request");
  try {
    return await capacityApprovalService.rejectCapacityRequest(
      session.userId,
      request.id,
      safeNote,
    );
  } catch (error) {
    throw internalError(
      error instanceof Error ? error.message : "Rejection failed",
    );
  }
}

export async function grantMoreSearches(
  userId: number,
  amount: number,
  reason: string,
) {
  const safeUserId = assertPositiveInt(userId, "userId");
  const safeAmount = assertPositiveInt(amount, "amount");
  const safeReason = assertNonEmptyString(reason, "reason");
  if (safeAmount > config.capacityRequests.maxRequestAmount) {
    throw internalError("Grant exceeds configured maximum");
  }
  const session = await requirePermission("capacity:manage");
  const managed = await canManageExecutive(session, safeUserId, repos);
  if (!managed.ok) throw forbiddenError("Cannot manage this executive");
  return searchAllowanceService.grantExtraSearchAllowance(
    session.userId,
    safeUserId,
    safeAmount,
    safeReason,
  );
}

export async function grantMoreLeadRefill(
  userId: number,
  amount: number,
  reason: string,
) {
  const safeUserId = assertPositiveInt(userId, "userId");
  const safeAmount = assertPositiveInt(amount, "amount");
  const safeReason = assertNonEmptyString(reason, "reason");
  if (safeAmount > config.capacityRequests.maxRequestAmount) {
    throw internalError("Grant exceeds configured maximum");
  }
  const session = await requirePermission("capacity:manage");
  const managed = await canManageExecutive(session, safeUserId, repos);
  if (!managed.ok) throw forbiddenError("Cannot manage this executive");
  return leadRefillService.grantExtraLeadRefill(
    session.userId,
    safeUserId,
    safeAmount,
    safeReason,
  );
}

"use server";

import { requirePermission } from "~/lib/auth/access/session";
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
import { parseCapacityDecisionInput, parseCapacityGrantInput } from "./input";

export async function approveCapacity(requestId: number, note?: string) {
  const decisionInput = parseCapacityDecisionInput({ requestId, note });
  if (isErr(decisionInput)) mapCapacityError(decisionInput.error);
  const session = await requirePermission("capacity:approve");
  await checkActionRateLimit("capacity.approve", session.userId, rateLimitDeps);

  const result = await approveCapacityRequest(
    {
      actorUserId: session.userId,
      requestId: decisionInput.value.requestId,
      note: decisionInput.value.note,
    },
    session,
    runInRepositoryTransaction,
  );
  if (isErr(result)) mapCapacityError(result.error);
  return result.value;
}

export async function rejectCapacity(requestId: number, note: string) {
  const decisionInput = parseCapacityDecisionInput({ requestId, note });
  if (isErr(decisionInput)) mapCapacityError(decisionInput.error);
  const session = await requirePermission("capacity:approve");
  await checkActionRateLimit("capacity.approve", session.userId, rateLimitDeps);

  const result = await rejectCapacityRequest(
    {
      actorUserId: session.userId,
      requestId: decisionInput.value.requestId,
      note: decisionInput.value.note ?? "",
    },
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
  const grantInput = parseCapacityGrantInput({ userId, amount, reason });
  if (isErr(grantInput)) mapCapacityError(grantInput.error);

  const session = await requirePermission("capacity:manage");

  const result = await grantSearchCapacityDirect(
    {
      actorUserId: session.userId,
      targetUserId: grantInput.value.userId,
      amount: grantInput.value.amount,
      reason: grantInput.value.reason,
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
  const grantInput = parseCapacityGrantInput({ userId, amount, reason });
  if (isErr(grantInput)) mapCapacityError(grantInput.error);

  const session = await requirePermission("capacity:manage");

  const result = await grantLeadCapacityDirect(
    {
      actorUserId: session.userId,
      targetUserId: grantInput.value.userId,
      amount: grantInput.value.amount,
      reason: grantInput.value.reason,
    },
    session,
    repos,
  );
  if (isErr(result)) mapCapacityError(result.error);
  return result.value;
}

"use server";

import { requirePermission } from "~/lib/auth/access/session";
import { runAction } from "~/server/shared/action-runtime";
import {
  approveCapacity as approveCapacityService,
  grantLeadCapacity as grantLeadCapacityService,
  grantSearchCapacity as grantSearchCapacityService,
  rejectCapacity as rejectCapacityService,
} from "~/server/capacity/service-requests";

import { parseCapacityDecisionInput, parseCapacityGrantInput } from "./input";

export async function approveCapacity(requestId: number, note?: string) {
  const decisionInput = parseCapacityDecisionInput({ requestId, note });
  if (!decisionInput.ok) throw decisionInput.error;
  const session = await requirePermission("capacity:approve");
  return runAction({
    actionName: "capacity.approve",
    actor: session,
    input: decisionInput.value,
    execute: (ctx) => approveCapacityService(ctx, decisionInput.value),
  });
}

export async function rejectCapacity(requestId: number, note: string) {
  const decisionInput = parseCapacityDecisionInput({ requestId, note });
  if (!decisionInput.ok) throw decisionInput.error;
  const session = await requirePermission("capacity:approve");
  return runAction({
    actionName: "capacity.reject",
    actor: session,
    input: {
      requestId: decisionInput.value.requestId,
      note: decisionInput.value.note ?? "",
    },
    execute: (ctx) =>
      rejectCapacityService(ctx, {
        requestId: decisionInput.value.requestId,
        note: decisionInput.value.note ?? "",
      }),
  });
}

export async function grantMoreSearches(
  userId: number,
  amount: number,
  reason: string,
) {
  const grantInput = parseCapacityGrantInput({ userId, amount, reason });
  if (!grantInput.ok) throw grantInput.error;
  const session = await requirePermission("capacity:manage");
  return runAction({
    actionName: "capacity.grant_search",
    actor: session,
    input: grantInput.value,
    execute: (ctx) =>
      grantSearchCapacityService(ctx, {
        targetUserId: grantInput.value.userId,
        amount: grantInput.value.amount,
        reason: grantInput.value.reason,
      }),
  });
}

export async function grantMoreLeadRefill(
  userId: number,
  amount: number,
  reason: string,
) {
  const grantInput = parseCapacityGrantInput({ userId, amount, reason });
  if (!grantInput.ok) throw grantInput.error;
  const session = await requirePermission("capacity:manage");
  return runAction({
    actionName: "capacity.grant_lead",
    actor: session,
    input: grantInput.value,
    execute: (ctx) =>
      grantLeadCapacityService(ctx, {
        targetUserId: grantInput.value.userId,
        amount: grantInput.value.amount,
        reason: grantInput.value.reason,
      }),
  });
}

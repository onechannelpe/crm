"use server";

import {
  approveCapacity as approveCapacityService,
  grantLeadCapacity as grantLeadCapacityService,
  grantSearchCapacity as grantSearchCapacityService,
  rejectCapacity as rejectCapacityService,
} from "~/server/capacity/service-requests";
import { runAction } from "~/server/shared/action-runtime";

import { parseCapacityDecisionInput, parseCapacityGrantInput } from "./input";

export async function approveCapacity(requestId: number, note?: string) {
  const decisionInput = parseCapacityDecisionInput({ requestId, note });
  if (!decisionInput.ok) throw decisionInput.error;
  return runAction({
    actionName: "capacity.approve",
    permission: "capacity:approve",
    input: decisionInput.value,
    execute: (ctx) => approveCapacityService(ctx, decisionInput.value),
  });
}

export async function rejectCapacity(requestId: number, note: string) {
  const decisionInput = parseCapacityDecisionInput({ requestId, note });
  if (!decisionInput.ok) throw decisionInput.error;
  return runAction({
    actionName: "capacity.reject",
    permission: "capacity:approve",
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
  return runAction({
    actionName: "capacity.grant_search",
    permission: "capacity:manage",
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
  return runAction({
    actionName: "capacity.grant_lead",
    permission: "capacity:manage",
    input: grantInput.value,
    execute: (ctx) =>
      grantLeadCapacityService(ctx, {
        targetUserId: grantInput.value.userId,
        amount: grantInput.value.amount,
        reason: grantInput.value.reason,
      }),
  });
}

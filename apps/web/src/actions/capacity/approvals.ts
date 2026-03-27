"use server";

import { validationError } from "~/lib/app-errors";
import {
  approveCapacityRequest as approveCapacityService,
  grantLeadCapacityDirect as grantLeadCapacityService,
  grantSearchCapacityDirect as grantSearchCapacityService,
  rejectCapacityRequest as rejectCapacityService,
} from "~/server/capacity/service-write";
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
  if (!decisionInput.value.note) throw validationError("note is required");
  const safeNote = decisionInput.value.note;
  return runAction({
    actionName: "capacity.reject",
    permission: "capacity:approve",
    input: { requestId: decisionInput.value.requestId, note: safeNote },
    execute: (ctx) =>
      rejectCapacityService(ctx, {
        requestId: decisionInput.value.requestId,
        note: safeNote,
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

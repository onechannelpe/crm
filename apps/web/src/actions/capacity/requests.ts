"use server";

import { requirePermission } from "~/lib/auth/access/session";
import { runAction } from "~/server/shared/action-runtime";
import { requestCapacity } from "~/server/capacity/service-requests";

import { parseCapacityAmount, parseCapacityReason } from "./input";

export async function requestMoreSearches(amount: number, reason: string) {
  const amountResult = parseCapacityAmount(amount);
  if (!amountResult.ok) throw amountResult.error;
  const reasonResult = parseCapacityReason(reason);
  if (!reasonResult.ok) throw reasonResult.error;

  const session = await requirePermission("capacity:request:self");
  return runAction({
    actionName: "capacity.request_search",
    actor: session,
    input: { amount: amountResult.value, reason: reasonResult.value },
    execute: (ctx) =>
      requestCapacity(ctx, {
        kind: "search_extra",
        amount: amountResult.value,
        reason: reasonResult.value,
      }),
  });
}

export async function requestMoreLeadRefill(amount: number, reason: string) {
  const amountResult = parseCapacityAmount(amount);
  if (!amountResult.ok) throw amountResult.error;
  const reasonResult = parseCapacityReason(reason);
  if (!reasonResult.ok) throw reasonResult.error;

  const session = await requirePermission("capacity:request:self");
  return runAction({
    actionName: "capacity.request_lead_refill",
    actor: session,
    input: { amount: amountResult.value, reason: reasonResult.value },
    execute: (ctx) =>
      requestCapacity(ctx, {
        kind: "lead_refill_extra",
        amount: amountResult.value,
        reason: reasonResult.value,
      }),
  });
}

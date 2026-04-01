"use server";

import { requestCapacity } from "~/server/capacity/application/commands";
import { createCapacityCommandsContext } from "~/server/capacity/infrastructure/commands-context";
import { runAction } from "~/server/shared/action-runtime";

import { parseCapacityAmount, parseCapacityReason } from "./input";

export async function requestMoreSearches(amount: number, reason: string) {
  const amountResult = parseCapacityAmount(amount);
  if (!amountResult.ok) throw amountResult.error;
  const reasonResult = parseCapacityReason(reason);
  if (!reasonResult.ok) throw reasonResult.error;

  return runAction({
    actionName: "capacity.request_search",
    permission: "capacity:request:self",
    input: { amount: amountResult.value, reason: reasonResult.value },
    execute: (ctx) =>
      requestCapacity(ctx, createCapacityCommandsContext(), {
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

  return runAction({
    actionName: "capacity.request_lead_refill",
    permission: "capacity:request:self",
    input: { amount: amountResult.value, reason: reasonResult.value },
    execute: (ctx) =>
      requestCapacity(ctx, createCapacityCommandsContext(), {
        kind: "lead_refill",
        amount: amountResult.value,
        reason: reasonResult.value,
      }),
  });
}

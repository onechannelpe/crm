"use server";

import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";
import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";

import { parseCapacityAmount, parseCapacityReason } from "./input";

function parseCapacityRequest(
  amount: number,
  reason: string,
): Result<{ amount: number; reason: string }, DomainError> {
  const amountResult = parseCapacityAmount(amount);
  if (!amountResult.ok) return amountResult;

  const reasonResult = parseCapacityReason(reason);
  if (!reasonResult.ok) return reasonResult;

  return Ok({ amount: amountResult.value, reason: reasonResult.value });
}

export async function requestMoreSearches(amount: number, reason: string) {
  return runAction({
    actionName: "capacity.request_search",
    access: { kind: "permission", permission: "capacity:request:self" },
    parse: () => parseCapacityRequest(amount, reason),
    audit: ({ amount }) => ({ amount }),
    execute: (ctx, request) =>
      getServerRuntime().capacity.useCases.requestCapacity(ctx, {
        kind: "search_extra",
        amount: request.amount,
        reason: request.reason,
      }),
  });
}

export async function requestMoreLeadRefill(amount: number, reason: string) {
  return runAction({
    actionName: "capacity.request_lead_refill",
    access: { kind: "permission", permission: "capacity:request:self" },
    parse: () => parseCapacityRequest(amount, reason),
    audit: ({ amount }) => ({ amount }),
    execute: (ctx, request) =>
      getServerRuntime().capacity.useCases.requestCapacity(ctx, {
        kind: "lead_refill",
        amount: request.amount,
        reason: request.reason,
      }),
  });
}

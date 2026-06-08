"use server";

import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";
import type { DomainError } from "~/server/shared/domain-error";
import { parseObject, validationFail } from "~/server/shared/parsing";
import type { Result } from "~/server/shared/result";

function parseCapacityRequest(
  amount: unknown,
  reason: unknown,
): Result<{ amount: number; reason: string }, DomainError> {
  return parseObject({ amount, reason }, validationFail, (r) => ({
    amount: r.num("amount"),
    reason: r.str("reason"),
  }));
}

export async function requestMoreSearches(amount: unknown, reason: unknown) {
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

export async function requestMoreLeadRefill(amount: unknown, reason: unknown) {
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

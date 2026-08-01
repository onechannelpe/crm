import type { DomainError } from "~/domain/errors";
import { executeSessionServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";
import { application } from "~/server/platform/composition/application";
import type { Result } from "~/shared/result";

function parseCapacityRequest(
  rawAmount: unknown,
  rawReason: unknown,
): Result<{ amount: number; reason: string }, DomainError> {
  return parseObject(
    { amount: rawAmount, reason: rawReason },
    validationFail,
    (r) => ({
      amount: r.posInt("amount"),
      reason: r.str("reason"),
    }),
  );
}

export async function requestMoreSearches(
  rawAmount: unknown,
  rawReason: unknown,
) {
  "use server";

  return executeSessionServerFunction({
    name: "capacity.request_search",
    access: { kind: "permission", permission: "capacity:request:self" },
    parse: () => parseCapacityRequest(rawAmount, rawReason),
    audit: (request) => ({ amount: request.amount }),

    execute: (ctx, request) =>
      application.capacity.requestCapacity(ctx, {
        kind: "search_extra",
        amount: request.amount,
        reason: request.reason,
      }),
  });
}

export async function requestMoreLeadRefill(
  rawAmount: unknown,
  rawReason: unknown,
) {
  "use server";

  return executeSessionServerFunction({
    name: "capacity.request_lead_refill",
    access: { kind: "permission", permission: "capacity:request:self" },
    parse: () => parseCapacityRequest(rawAmount, rawReason),
    audit: (request) => ({ amount: request.amount }),

    execute: (ctx, request) =>
      application.capacity.requestCapacity(ctx, {
        kind: "lead_refill",
        amount: request.amount,
        reason: request.reason,
      }),
  });
}

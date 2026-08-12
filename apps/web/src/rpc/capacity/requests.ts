import type { DomainError } from "~/domain/errors";
import { getApplication } from "~/server/composition/application";
import { executeSessionServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";
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
    telemetry: (input) => ({ amount: input.amount }),

    execute: (ctx, input) =>
      getApplication().capacity.requestCapacity(ctx, {
        kind: "search_extra",
        amount: input.amount,
        reason: input.reason,
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
    telemetry: (input) => ({ amount: input.amount }),

    execute: (ctx, input) =>
      getApplication().capacity.requestCapacity(ctx, {
        kind: "lead_refill",
        amount: input.amount,
        reason: input.reason,
      }),
  });
}

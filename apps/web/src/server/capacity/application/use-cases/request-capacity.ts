import type { DomainError } from "~/domain/errors";
import type { AppContext } from "~/server/platform/action/context";
import { Ok, type Result } from "~/shared/result";

import { validateRequestAmount } from "../../domain/limits";
import { toDbCapacityRequestKind } from "../../domain/request-policy";
import type { CapacityRequestKind } from "../../domain/types";
import type { CapacityRequestDeps } from "./shared";

export async function requestCapacity(
  ctx: AppContext,
  deps: CapacityRequestDeps,
  input: { kind: CapacityRequestKind; amount: number; reason: string },
): Promise<Result<{ success: true }, DomainError>> {
  await deps.rateLimiter.enforce(
    "capacity.request",
    ctx.actor.userId,
    ctx,
    ctx.ipAddress,
  );

  const amount = validateRequestAmount(input.amount);
  if (!amount.ok) {
    return amount;
  }

  return deps.uow.run(async (tx) => {
    await tx.capacityRequests.create({
      user_id: ctx.actor.userId,
      kind: toDbCapacityRequestKind(input.kind),
      status: "pending",
      requested_amount: amount.value,
      reason: input.reason,
      created_at: ctx.operationAt,
      updated_at: ctx.operationAt,
    });
    return Ok({ success: true });
  });
}

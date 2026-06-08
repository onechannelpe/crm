import { checkActionRateLimit } from "~/lib/security/action-rate-limit";
import type { AppContext } from "~/server/shared/action-runtime/context";
import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";

import { validateRequestAmount } from "../../domain/limits";
import { toDbCapacityRequestKind } from "../../domain/request-policy";
import type { CapacityRequestKind } from "../../domain/types";
import type { CapacityRequestDeps } from "./shared";

export async function requestCapacity(
  ctx: AppContext,
  deps: CapacityRequestDeps,
  input: { kind: CapacityRequestKind; amount: number; reason: string },
): Promise<Result<{ success: true }, DomainError>> {
  const amount = validateRequestAmount(input.amount);
  if (!amount.ok) return amount;

  await checkActionRateLimit(
    "capacity.request",
    ctx.actor.userId,
    deps.rateLimitDeps,
  );
  return deps.uow.run(async (tx) => {
    await tx.capacityRequests.create({
      user_id: ctx.actor.userId,
      kind: toDbCapacityRequestKind(input.kind),
      status: "pending",
      requested_amount: amount.value,
      reason: input.reason,
    });
    return Ok({ success: true });
  });
}

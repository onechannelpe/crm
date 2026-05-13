import { checkActionRateLimit } from "~/lib/security/action-rate-limit";
import type { AppContext } from "~/server/shared/action-runtime";
import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";

import { toDbCapacityRequestKind } from "../../domain/request-policy";
import type { CapacityRequestKind } from "../../domain/types";
import type { CapacityRequestDeps } from "./shared";

export async function requestCapacity(
  ctx: AppContext,
  deps: CapacityRequestDeps,
  input: { kind: CapacityRequestKind; amount: number; reason: string },
): Promise<Result<{ success: true }, DomainError>> {
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
      requested_amount: input.amount,
      reason: input.reason,
    });
    return Ok({ success: true });
  });
}

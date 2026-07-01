import { grantUsageCapacity } from "~/server/capacity/application/usage/ledger";
import type { AppContext } from "~/server/platform/action/context";
import { fail, type DomainError } from "~/server/shared/domain-error";
import type { UserId } from "~/server/shared/ids";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

import { canManageExecutive } from "../authorize-capacity-actor";
import { validateRequestAmount } from "../../domain/limits";
import type { CapacityGrantDeps } from "./shared";

export async function grantSearchCapacityDirect(
  ctx: AppContext,
  deps: CapacityGrantDeps,
  input: { targetUserId: UserId; amount: number; reason: string },
): Promise<Result<{ success: true }, DomainError>> {
  const amount = validateRequestAmount(input.amount);
  if (!amount.ok) return amount;

  return deps.uow.run(async (tx) => {
    const check = await canManageExecutive(ctx.actor, input.targetUserId, tx);
    if (!check.target) {
      return Err(fail("executive_not_found"));
    }
    if (!check.ok) {
      return Err(fail("cannot_manage_executive"));
    }

    const result = await grantUsageCapacity(
      {
        kind: "search",
        actorUserId: ctx.actor.userId,
        targetUserId: input.targetUserId,
        amount: amount.value,
        reason: input.reason,
      },
      { grants: tx.searchCapacityGrants },
    );
    if (isErr(result)) return result;
    return Ok({ success: true });
  });
}

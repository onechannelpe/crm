import { grantSearchCapacity } from "~/server/capacity-usage/search-usage";
import type { AppContext } from "~/server/shared/action-runtime/context";
import { fail, type DomainError } from "~/server/shared/domain-error";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

import { canManageExecutive } from "../../domain/access-policy";
import { validateRequestAmount } from "../../domain/limits";
import type { CapacityGrantDeps } from "./shared";

export async function grantSearchCapacityDirect(
  ctx: AppContext,
  deps: CapacityGrantDeps,
  input: { targetUserId: number; amount: number; reason: string },
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

    const result = await grantSearchCapacity(
      { actorUserId: ctx.actor.userId, ...input, amount: amount.value },
      tx,
    );
    if (isErr(result)) return result;
    return Ok({ success: true });
  });
}

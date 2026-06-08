import { grantLeadCapacity } from "~/server/capacity-usage/lead-usage";
import type { AppContext } from "~/server/shared/action-runtime/context";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

import { canManageExecutive } from "../../domain/access-policy";
import { validateRequestAmount } from "../../domain/limits";
import type { CapacityGrantDeps } from "./shared";

export async function grantLeadCapacityDirect(
  ctx: AppContext,
  deps: CapacityGrantDeps,
  input: { targetUserId: number; amount: number; reason: string },
): Promise<Result<{ success: true }, DomainError>> {
  const amount = validateRequestAmount(input.amount);
  if (!amount.ok) return amount;

  return deps.uow.run(async (tx) => {
    const check = await canManageExecutive(ctx.actor, input.targetUserId, tx);
    if (!check.target) {
      return Err(
        domainError("not_found", "executive_not_found", "Executive not found"),
      );
    }
    if (!check.ok) {
      return Err(
        domainError(
          "forbidden",
          "cannot_manage_executive",
          "Cannot manage this executive",
        ),
      );
    }

    const result = await grantLeadCapacity(
      { actorUserId: ctx.actor.userId, ...input, amount: amount.value },
      tx,
    );
    if (isErr(result)) return result;
    return Ok({ success: true });
  });
}

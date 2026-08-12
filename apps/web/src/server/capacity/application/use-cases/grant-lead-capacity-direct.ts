import { fail, type DomainError } from "~/domain/errors";
import type { UserId } from "~/domain/ids";
import { grantUsageCapacity } from "~/server/capacity/application/usage/ledger";
import type { AppContext } from "~/server/platform/action/context";
import { Err, isErr, Ok, type Result } from "~/shared/result";

import { validateRequestAmount } from "../../domain/limits";
import { canManageExecutive } from "../authorize-capacity-actor";
import type { CapacityGrantDeps } from "./shared";

export async function grantLeadCapacityDirect(
  ctx: AppContext,
  deps: CapacityGrantDeps,
  input: {
    targetUserId: UserId;
    amount: number;
    reason: string;
  },
): Promise<Result<{ success: true }, DomainError>> {
  const validatedAmount = validateRequestAmount(input.amount);

  if (!validatedAmount.ok) {
    return validatedAmount;
  }

  return deps.uow.run(async (tx) => {
    const access = await canManageExecutive(ctx.actor, input.targetUserId, tx);

    if (!access.target) {
      return Err(fail("executive_not_found"));
    }

    if (!access.ok) {
      return Err(fail("cannot_manage_executive"));
    }

    const grant = await grantUsageCapacity(
      {
        kind: "lead",
        actorUserId: ctx.actor.userId,
        targetUserId: input.targetUserId,
        amount: validatedAmount.value,
        reason: input.reason,
      },
      { grants: tx.leadCapacityGrants },
      ctx,
    );

    if (isErr(grant)) {
      return grant;
    }

    return Ok({ success: true });
  });
}

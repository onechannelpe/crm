import type { AppContext } from "~/server/shared/action-runtime";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

import { canManageExecutive } from "../../domain/access-policy";
import { setSearchUserOverride } from "../search-policy";
import type { CapacityPolicyDeps } from "./shared";

export async function updateSearchPolicyOverride(
  ctx: AppContext,
  deps: CapacityPolicyDeps,
  input: {
    userId: number;
    monthlyLimit: number;
    expiresAt: number | null;
  },
): Promise<Result<{ success: true }, DomainError>> {
  return deps.uow.run(async (tx) => {
    const access = await canManageExecutive(ctx.actor, input.userId, tx);

    if (!access.target) {
      return Err(
        domainError("not_found", "executive_not_found", "Executive not found"),
      );
    }

    if (!access.ok) {
      return Err(
        domainError(
          "forbidden",
          "cannot_manage_executive",
          "Cannot manage this executive",
        ),
      );
    }

    const result = await setSearchUserOverride(
      {
        actorUserId: ctx.actor.userId,
        targetUserId: input.userId,
        monthlyLimit: input.monthlyLimit,
        expiresAt: input.expiresAt,
      },
      tx,
    );

    if (isErr(result)) {
      return result;
    }

    return Ok({ success: true });
  });
}

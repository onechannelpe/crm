import type { AppContext } from "~/server/platform/action/context";
import { fail, type DomainError } from "~/server/shared/domain-error";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

import { canManageExecutive } from "../../domain/access-policy";
import {
  validateOverrideExpiry,
  validateSearchLimit,
} from "../../domain/limits";
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
  const monthlyLimit = validateSearchLimit(input.monthlyLimit);
  if (!monthlyLimit.ok) return monthlyLimit;
  const expiresAt = validateOverrideExpiry(input.expiresAt);
  if (!expiresAt.ok) return expiresAt;

  return deps.uow.run(async (tx) => {
    const access = await canManageExecutive(ctx.actor, input.userId, tx);

    if (!access.target) {
      return Err(fail("executive_not_found"));
    }

    if (!access.ok) {
      return Err(fail("cannot_manage_executive"));
    }

    const result = await setSearchUserOverride(
      {
        actorUserId: ctx.actor.userId,
        targetUserId: input.userId,
        monthlyLimit: monthlyLimit.value,
        expiresAt: expiresAt.value,
      },
      tx,
    );

    if (isErr(result)) {
      return result;
    }

    return Ok({ success: true });
  });
}

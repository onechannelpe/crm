import { fail, type DomainError } from "~/domain/errors";
import type { UserId } from "~/domain/ids";
import type { AppContext } from "~/server/platform/action/context";
import { Err, isErr, Ok, type Result } from "~/shared/result";

import {
  validateLeadPolicyValues,
  validateOverrideExpiry,
  validateSearchLimit,
} from "../../domain/limits";
import { canManageExecutive } from "../authorize-capacity-actor";
import { setLeadUserOverride } from "../resolve-lead-policy";
import { setSearchUserOverride } from "../resolve-search-policy";
import type { CapacityPolicyDeps } from "./shared";

// The override form sets a user's search and lead limits together. Both writes
// share one uow.run and one manage-executive check so an executive's override
// never lands half-applied.
export async function updateExecutivePolicyOverride(
  ctx: AppContext,
  deps: CapacityPolicyDeps,
  input: {
    userId: UserId;
    monthlyLimit: number;
    bufferTarget: number;
    dailyLimit: number;
    expiresAt: number | null;
  },
): Promise<Result<{ success: true }, DomainError>> {
  const monthlyLimit = validateSearchLimit(input.monthlyLimit);
  if (!monthlyLimit.ok) {
    return monthlyLimit;
  }
  const leadValues = validateLeadPolicyValues(input);
  if (!leadValues.ok) {
    return leadValues;
  }
  const expiresAt = validateOverrideExpiry(input.expiresAt, ctx.operationAt);
  if (!expiresAt.ok) {
    return expiresAt;
  }

  return deps.uow.run(async (tx) => {
    const access = await canManageExecutive(ctx.actor, input.userId, tx);
    if (!access.target) {
      return Err(fail("executive_not_found"));
    }
    if (!access.ok) {
      return Err(fail("cannot_manage_executive"));
    }

    const searchWrite = await setSearchUserOverride(
      {
        actorUserId: ctx.actor.userId,
        targetUserId: input.userId,
        monthlyLimit: monthlyLimit.value,
        expiresAt: expiresAt.value,
      },
      tx,
      ctx,
    );
    if (isErr(searchWrite)) {
      return searchWrite;
    }

    const leadWrite = await setLeadUserOverride(
      {
        actorUserId: ctx.actor.userId,
        targetUserId: input.userId,
        bufferTarget: leadValues.value.bufferTarget,
        dailyLimit: leadValues.value.dailyLimit,
        expiresAt: expiresAt.value,
      },
      tx,
      ctx,
    );
    if (isErr(leadWrite)) {
      return leadWrite;
    }

    return Ok({ success: true });
  });
}

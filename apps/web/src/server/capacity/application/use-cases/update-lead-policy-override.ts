import type { AppContext } from "~/server/platform/action/context";
import { fail, type DomainError } from "~/server/shared/domain-error";
import type { UserId } from "~/server/shared/ids";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

import { canManageExecutive } from "../authorize-capacity-actor";
import {
  validateLeadPolicyValues,
  validateOverrideExpiry,
} from "../../domain/limits";
import { setLeadUserOverride } from "../lead-policy";
import type { CapacityPolicyDeps } from "./shared";

export async function updateLeadPolicyOverride(
  ctx: AppContext,
  deps: CapacityPolicyDeps,
  input: {
    userId: UserId;
    bufferTarget: number;
    dailyLimit: number;
    expiresAt: number | null;
  },
): Promise<Result<{ success: true }, DomainError>> {
  const values = validateLeadPolicyValues(input);
  if (!values.ok) return values;
  const expiresAt = validateOverrideExpiry(input.expiresAt);
  if (!expiresAt.ok) return expiresAt;

  return deps.uow.run(async (tx) => {
    const check = await canManageExecutive(ctx.actor, input.userId, tx);
    if (!check.target) {
      return Err(fail("executive_not_found"));
    }
    if (!check.ok) {
      return Err(fail("cannot_manage_executive"));
    }
    const result = await setLeadUserOverride(
      {
        actorUserId: ctx.actor.userId,
        targetUserId: input.userId,
        bufferTarget: values.value.bufferTarget,
        dailyLimit: values.value.dailyLimit,
        expiresAt: expiresAt.value,
      },
      tx,
    );
    if (isErr(result)) return result;
    return Ok({ success: true });
  });
}

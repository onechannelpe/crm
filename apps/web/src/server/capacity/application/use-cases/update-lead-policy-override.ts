import type { AppContext } from "~/server/shared/action-runtime";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

import { canManageExecutive } from "../../domain/access-policy";
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
    userId: number;
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

import type { DomainError } from "~/domain/errors";
import type { AppContext } from "~/server/platform/action/context";
import { isErr, Ok, type Result } from "~/shared/result";

import {
  validateLeadPolicyValues,
  validateSearchLimit,
} from "../../domain/limits";
import type { ScopeRef } from "../../domain/types";
import { canManageScope } from "../authorize-capacity-actor";
import { setLeadScopeDefault } from "../resolve-lead-policy";
import { setSearchScopeDefault } from "../resolve-search-policy";
import type { CapacityPolicyDeps } from "./shared";

export async function updateScopePolicy(
  ctx: AppContext,
  deps: CapacityPolicyDeps,
  input: {
    scope: ScopeRef;
    monthlyLimit: number;
    bufferTarget: number;
    dailyLimit: number;
  },
): Promise<Result<{ success: true }, DomainError>> {
  const monthlyLimit = validateSearchLimit(input.monthlyLimit);
  if (!monthlyLimit.ok) return monthlyLimit;
  const leadValues = validateLeadPolicyValues(input);
  if (!leadValues.ok) return leadValues;

  return deps.uow.run(async (tx) => {
    const check = await canManageScope(ctx.actor, input.scope, tx);
    if (isErr(check)) return check;

    const searchWrite = await setSearchScopeDefault(
      input.scope.kind === "branch"
        ? {
            scopeType: "branch",
            scopeId: input.scope.scopeId,
            monthlyLimit: monthlyLimit.value,
          }
        : {
            scopeType: "team",
            scopeId: input.scope.scopeId,
            monthlyLimit: monthlyLimit.value,
          },
      tx,
    );
    if (isErr(searchWrite)) return searchWrite;

    const leadWrite = await setLeadScopeDefault(
      input.scope.kind === "branch"
        ? {
            scopeType: "branch",
            scopeId: input.scope.scopeId,
            bufferTarget: leadValues.value.bufferTarget,
            dailyLimit: leadValues.value.dailyLimit,
          }
        : {
            scopeType: "team",
            scopeId: input.scope.scopeId,
            bufferTarget: leadValues.value.bufferTarget,
            dailyLimit: leadValues.value.dailyLimit,
          },
      tx,
    );
    if (isErr(leadWrite)) return leadWrite;

    return Ok({ success: true });
  });
}

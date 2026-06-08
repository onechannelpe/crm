import type { AppContext } from "~/server/shared/action-runtime/context";
import type { DomainError } from "~/server/shared/domain-error";
import { isErr, Ok, type Result } from "~/server/shared/result";

import { canManageScope } from "../../domain/access-policy";
import { validateSearchLimit } from "../../domain/limits";
import type { ScopeRef } from "../../domain/types";
import { setSearchScopeDefault } from "../search-policy";
import type { CapacityPolicyDeps } from "./shared";

export async function updateSearchPolicyDefault(
  ctx: AppContext,
  deps: CapacityPolicyDeps,
  input: {
    scope: ScopeRef;
    monthlyLimit: number;
  },
): Promise<Result<{ success: true }, DomainError>> {
  const monthlyLimit = validateSearchLimit(input.monthlyLimit);
  if (!monthlyLimit.ok) return monthlyLimit;

  return deps.uow.run(async (tx) => {
    const check = await canManageScope(ctx.actor, input.scope, tx);

    if (isErr(check)) {
      return check;
    }

    const result = await setSearchScopeDefault(
      {
        scopeType: input.scope.kind,
        scopeId: input.scope.scopeId,
        monthlyLimit: input.monthlyLimit,
      },
      tx,
    );

    if (isErr(result)) {
      return result;
    }

    return Ok({ success: true });
  });
}

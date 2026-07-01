import type { AppContext } from "~/server/platform/action/context";
import type { DomainError } from "~/server/shared/domain-error";
import { isErr, Ok, type Result } from "~/server/shared/result";

import { validateLeadPolicyValues } from "../../domain/limits";
import type { ScopeRef } from "../../domain/types";
import { canManageScope } from "../authorize-capacity-actor";
import { setLeadScopeDefault } from "../lead-policy";
import type { CapacityPolicyDeps } from "./shared";

export async function updateLeadPolicyDefault(
  ctx: AppContext,
  deps: CapacityPolicyDeps,
  input: {
    scope: ScopeRef;
    bufferTarget: number;
    dailyLimit: number;
  },
): Promise<Result<{ success: true }, DomainError>> {
  const values = validateLeadPolicyValues(input);
  if (!values.ok) return values;

  return deps.uow.run(async (tx) => {
    const check = await canManageScope(ctx.actor, input.scope, tx);

    if (isErr(check)) {
      return check;
    }

    const result = await setLeadScopeDefault(
      input.scope.kind === "branch"
        ? {
            scopeType: "branch",
            scopeId: input.scope.scopeId,
            bufferTarget: values.value.bufferTarget,
            dailyLimit: values.value.dailyLimit,
          }
        : {
            scopeType: "team",
            scopeId: input.scope.scopeId,
            bufferTarget: values.value.bufferTarget,
            dailyLimit: values.value.dailyLimit,
          },
      tx,
    );

    if (isErr(result)) {
      return result;
    }

    return Ok({ success: true });
  });
}

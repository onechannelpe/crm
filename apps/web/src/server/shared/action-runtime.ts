import type { DomainError } from "~/server/shared/domain-error";
import { isErr, type Result } from "~/server/shared/result";
import { throwDomainError } from "~/server/shared/throw-domain-error";

import {
  type ActionAccess,
  type ActionStepUpRequirement,
  resolveActionContext,
} from "./action-runtime/auth";
import { type AppContext } from "./action-runtime/context";
import {
  recordActionError,
  recordActionSuccess,
  toTelemetryError,
  type ActionTelemetryInput,
} from "./action-runtime/telemetry";
export { createAppContext, type AppContext } from "./action-runtime/context";

type ActionMeta = {
  actionName: string;
  input?: unknown;
};

type RunActionParams<T, E extends DomainError> = {
  access: ActionAccess;
} & ActionStepUpRequirement &
  ActionMeta & {
    execute: (ctx: AppContext) => Promise<Result<T, E>>;
  };

type ActionTelemetryParams = Pick<
  RunActionParams<unknown, DomainError>,
  "access" | "stepUp" | "actionName" | "input"
>;

async function createActionTelemetry(
  params: ActionTelemetryParams,
): Promise<ActionTelemetryInput> {
  const ctx = await resolveActionContext(params);
  return {
    actionName: params.actionName,
    ctx,
    startedAt: Date.now(),
    input: params.input,
  };
}

async function executeActionResult<T, E extends DomainError>(
  ctx: AppContext,
  execute: (ctx: AppContext) => Promise<Result<T, E>>,
): Promise<T> {
  const result = await execute(ctx);
  if (isErr(result)) {
    throwDomainError(result.error);
  }

  return result.value;
}

export async function runAction<T, E extends DomainError>(
  params: RunActionParams<T, E>,
): Promise<T> {
  const telemetry = await createActionTelemetry(params);
  try {
    const value = await executeActionResult(telemetry.ctx, params.execute);
    recordActionSuccess(telemetry);
    return value;
  } catch (error) {
    recordActionError(telemetry, toTelemetryError(error));

    throw error;
  }
}

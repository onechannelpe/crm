import { captureException } from "@sentry/bun";

import {
  AppError,
  conflictError,
  forbiddenError,
  internalError,
  notFoundError,
  rateLimitError,
  toAppError,
  validationError,
} from "~/lib/app-errors";
import type { DomainError } from "~/server/shared/domain-error";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

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

function domainToAppError(error: DomainError): AppError {
  switch (error.kind) {
    case "validation":
      return validationError(error.message);
    case "forbidden":
      return forbiddenError(error.message);
    case "not_found":
      return notFoundError(error.message);
    case "conflict":
      return conflictError(error.message);
    case "rate_limited":
      return rateLimitError(error.message);
    case "external":
      return internalError("An unexpected error occurred");
  }

  const unreachable: never = error.kind;
  return internalError(String(unreachable));
}

function sanitize(error: AppError): AppError {
  const safe = new AppError({
    code: error.code,
    publicMessage: error.publicMessage,
    retryAfterSeconds: error.retryAfterSeconds ?? undefined,
  });
  delete safe.stack;
  return safe;
}

export async function runAction<T, E extends DomainError>(
  params: RunActionParams<T, E>,
): Promise<T> {
  const result = await runActionResult(params);
  if (isErr(result)) {
    throw result.error;
  }
  return result.value;
}

export async function runActionResult<T, E extends DomainError>(
  params: RunActionParams<T, E>,
): Promise<Result<T, AppError>> {
  let telemetry!: ActionTelemetryInput;
  try {
    telemetry = await createActionTelemetry(params);
  } catch (error) {
    return Err(sanitize(toAppError(error, "An unexpected error occurred")));
  }

  let result: Result<T, E>;
  try {
    result = await params.execute(telemetry.ctx);
  } catch (error) {
    if (error instanceof Response) throw error;
    if (error instanceof AppError) {
      const safeError = sanitize(error);
      recordActionError(telemetry, toTelemetryError(safeError));
      return Err(safeError);
    }
    captureException(error);
    recordActionError(telemetry, toTelemetryError(error));
    return Err(sanitize(internalError("An unexpected error occurred")));
  }

  if (isErr(result)) {
    const appError = domainToAppError(result.error);
    if (result.error.kind === "external") {
      captureException(appError, {
        extra: {
          domainCode: result.error.code,
          domainDetails: result.error.details,
        },
      });
    }
    recordActionError(telemetry, toTelemetryError(appError));
    return Err(sanitize(appError));
  }

  recordActionSuccess(telemetry);
  return Ok(result.value);
}

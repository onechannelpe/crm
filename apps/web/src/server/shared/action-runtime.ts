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
  type AuditFields,
} from "./action-runtime/telemetry";
export { createAppContext, type AppContext } from "./action-runtime/context";

/**
 * Every action is an RPC trust boundary, so its wire input is `unknown` and is
 * validated here exactly once. `parse` narrows that input to TIn (or returns a
 * DomainError), `audit` projects the parsed value down to the scalar fields
 * that are safe to record, and `execute` runs the command with the trusted
 * value. The raw input is never handed to telemetry, only `audit(parsed)`.
 */
type RunActionParams<TIn, TOut, E extends DomainError> = {
  actionName: string;
  access: ActionAccess;
  input: unknown;
  parse: (input: unknown) => Result<TIn, DomainError>;
  audit?: (input: TIn) => AuditFields;
  execute: (input: TIn, ctx: AppContext) => Promise<Result<TOut, E>>;
} & ActionStepUpRequirement;

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

export async function runAction<TIn, TOut, E extends DomainError>(
  params: RunActionParams<TIn, TOut, E>,
): Promise<TOut> {
  const result = await runActionResult(params);
  if (isErr(result)) {
    throw result.error;
  }
  return result.value;
}

export async function runActionResult<TIn, TOut, E extends DomainError>(
  params: RunActionParams<TIn, TOut, E>,
): Promise<Result<TOut, AppError>> {
  let ctx: AppContext;
  try {
    ctx = await resolveActionContext(params);
  } catch (error) {
    return Err(sanitize(toAppError(error, "An unexpected error occurred")));
  }

  const telemetry: ActionTelemetryInput = {
    actionName: params.actionName,
    ctx,
    startedAt: Date.now(),
    audit: {},
  };

  const parsed = params.parse(params.input);
  if (isErr(parsed)) {
    const appError = domainToAppError(parsed.error);
    recordActionError(telemetry, toTelemetryError(appError));
    return Err(sanitize(appError));
  }

  telemetry.audit = params.audit?.(parsed.value) ?? {};

  let result: Result<TOut, E>;
  try {
    result = await params.execute(parsed.value, ctx);
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

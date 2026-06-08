import { captureException } from "@sentry/bun";

import {
  AppError,
  internalError,
  toAppError,
  type AppErrorCode,
} from "~/lib/app-errors";
import type {
  DomainError,
  DomainErrorKind,
} from "~/server/shared/domain-error";
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

const GENERIC_ERROR = "An unexpected error occurred";

/**
 * Every action is an RPC trust boundary with three concerns, in fail-fast
 * order (inputs -> auth -> business): validate the untrusted payload (`parse`),
 * resolve the actor (`access`/`stepUp`), run the command (`execute`). Parsing
 * first means malformed input is rejected before any session or database work,
 * and the raw value stays in the action's closure, never reaching `execute` or
 * telemetry. `audit` projects the trusted value down to the scalar fields safe
 * to record. No-input actions omit `parse` and ignore the trailing argument
 * (`execute: (ctx) => ...`).
 *
 * A telemetry row is written once an actor is resolved (success or business
 * failure). Failures before that point, a bad payload or a rejected actor, are
 * surfaced sanitized without a row, since there is no authenticated actor to
 * attribute one to.
 */
type RunActionParams<TIn, TOut, E extends DomainError> = {
  actionName: string;
  access: ActionAccess;
  parse?: () => Result<TIn, DomainError>;
  audit?: (input: TIn) => AuditFields;
  execute: (ctx: AppContext, input: TIn) => Promise<Result<TOut, E>>;
} & ActionStepUpRequirement;

// The coarse code groups errors for HTTP-style handling; the granular domain
// code rides along separately on the AppError so the client localizes on it.
const DOMAIN_TO_APP_CODE: Record<DomainErrorKind, AppErrorCode> = {
  validation: "validation",
  forbidden: "forbidden",
  not_found: "not_found",
  conflict: "conflict",
  rate_limited: "rate_limit",
  external: "internal",
};

// Maps a domain failure onto the wire error, carrying its stable code as
// domainCode. External faults hide their message but keep the code so the
// client and logs can still correlate.
function domainToAppError(error: DomainError): AppError {
  return new AppError({
    code: DOMAIN_TO_APP_CODE[error.kind],
    publicMessage: error.kind === "external" ? GENERIC_ERROR : error.message,
    domainCode: error.code,
  });
}

// Strips the stack and internal-only fields before an error crosses the wire,
// keeping the code, public message, domain code, and retry hint.
function sanitize(error: AppError): AppError {
  const safe = new AppError({
    code: error.code,
    publicMessage: error.publicMessage,
    domainCode: error.domainCode ?? undefined,
    retryAfterSeconds: error.retryAfterSeconds ?? undefined,
  });
  delete safe.stack;
  return safe;
}

export async function runAction<TIn, TOut, E extends DomainError>(
  params: RunActionParams<TIn, TOut, E>,
): Promise<TOut> {
  const result = await runActionResult(params);
  if (isErr(result)) throw result.error;
  return result.value;
}

export async function runActionResult<TIn, TOut, E extends DomainError>(
  params: RunActionParams<TIn, TOut, E>,
): Promise<Result<TOut, AppError>> {
  const startedAt = Date.now();

  // Validate first: reject a malformed payload before any session or database
  // work. There is no actor yet, so the rejection is surfaced without a row.
  const parsed = params.parse ? params.parse() : Ok(undefined as TIn);
  if (isErr(parsed)) {
    return Err(sanitize(domainToAppError(parsed.error)));
  }

  let ctx: AppContext;
  try {
    ctx = await resolveActionContext(params);
  } catch (error) {
    // Auth or step-up failed before we have an actor, so there is no one to
    // attribute a telemetry row to. Sanitize and surface.
    return Err(sanitize(toAppError(error, GENERIC_ERROR)));
  }

  const audit = params.audit?.(parsed.value) ?? {};
  const result = await runExecute(ctx, parsed.value, params.execute);
  return finish(ctx, params.actionName, startedAt, audit, result);
}

// Runs the command and folds both thrown errors and domain failures into one
// Result<TOut, AppError>. This is the only place an error becomes an AppError,
// so the rest of the pipeline has a single shape to record and return.
async function runExecute<TIn, TOut, E extends DomainError>(
  ctx: AppContext,
  input: TIn,
  execute: (ctx: AppContext, input: TIn) => Promise<Result<TOut, E>>,
): Promise<Result<TOut, AppError>> {
  let result: Result<TOut, E>;
  try {
    result = await execute(ctx, input);
  } catch (error) {
    if (error instanceof Response) throw error; // redirects and streamed bodies
    if (error instanceof AppError) return Err(sanitize(error));
    captureException(error);
    return Err(sanitize(internalError(GENERIC_ERROR)));
  }

  if (!isErr(result)) return Ok(result.value);

  if (result.error.kind === "external") {
    captureException(domainToAppError(result.error), {
      extra: {
        domainCode: result.error.code,
        domainDetails: result.error.details,
      },
    });
  }
  return Err(sanitize(domainToAppError(result.error)));
}

// The single telemetry write for an action: exactly one row per attempt,
// success or failure, carrying the audited scalar projection of the input.
function finish<TOut>(
  ctx: AppContext,
  actionName: string,
  startedAt: number,
  audit: AuditFields,
  result: Result<TOut, AppError>,
): Result<TOut, AppError> {
  const telemetry: ActionTelemetryInput = { actionName, ctx, startedAt, audit };
  if (isErr(result)) {
    recordActionError(telemetry, toTelemetryError(result.error));
  } else {
    recordActionSuccess(telemetry);
  }
  return result;
}

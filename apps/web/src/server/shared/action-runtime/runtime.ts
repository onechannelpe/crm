import type { AuthSession } from "~/lib/auth/access/session-types";
import { ActionError, type WireError } from "~/lib/wire-error";
import {
  type DomainError,
  toWire,
  unexpectedFault,
} from "~/server/shared/domain-error";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

import {
  type ActionAccess,
  type ActionStepUpRequirement,
  authenticateAccess,
  authorizeAccess,
} from "./access";
import { type AppContext, createAppContext } from "./context";
import { defaultPorts, type RuntimePorts } from "./ports";
import {
  type AuditFields,
  errorRow,
  successRow,
  type TelemetryContext,
} from "./telemetry";

/**
 * Every action is an RPC trust boundary. The pipeline runs fixed, named stages
 * in fail-fast order (inputs -> identity -> authorization -> business) and folds
 * every outcome into a single `WireError` channel:
 *
 *   parse -> authenticate -> [actor known] -> authorize/step-up -> execute
 *
 * `toWire` is the only internal-to-wire projection and runs once per failure;
 * there is no separate sanitize step because `WireError` has no internal fields
 * to strip. A telemetry row is written the moment an actor is authenticated, so
 * authorization, step-up, and business failures are all recorded and attributed
 * (a denied attempt by a known actor is auditable); failures before identity
 * (bad payload, no session) surface without a row.
 */
type ActionDef<TIn, TOut, E extends DomainError> = {
  name: string;
  access: ActionAccess;
  parse?: () => Result<TIn, DomainError>;
  audit?: (input: TIn) => AuditFields;
  execute: (ctx: AppContext, input: TIn) => Promise<Result<TOut, E>>;
} & ActionStepUpRequirement;

// Reports unexpected faults (server bugs and third-party failures), then
// projects to the wire. Expected failures (validation, forbidden, not_found,
// conflict, rate_limit, unauthenticated) are not reported.
function domainFailureToWire(
  error: DomainError,
  ports: RuntimePorts,
): WireError {
  if (error.kind === "external" || error.kind === "internal") {
    ports.report(error);
  }
  return toWire(error);
}

// Converts a thrown value to the wire. `Response` is control flow (redirects,
// streamed bodies) and must be rethrown by the caller before reaching here.
function thrownToWire(error: unknown, ports: RuntimePorts): WireError {
  if (error instanceof ActionError) return error.wire;
  ports.report(error);
  return toWire(unexpectedFault(error));
}

function runParse<TIn>(
  parse: (() => Result<TIn, DomainError>) | undefined,
  ports: RuntimePorts,
): Result<TIn, WireError> {
  if (!parse) {
    // oxlint-disable-next-line typescript-eslint/no-unsafe-type-assertion
    return Ok(undefined as TIn);
  }

  try {
    const parsed = parse();
    if (isErr(parsed)) return Err(domainFailureToWire(parsed.error, ports));
    return Ok(parsed.value);
  } catch (error) {
    if (error instanceof Response) throw error;
    return Err(thrownToWire(error, ports));
  }
}

async function runExecute<TIn, TOut, E extends DomainError>(
  ctx: AppContext,
  input: TIn,
  execute: (ctx: AppContext, input: TIn) => Promise<Result<TOut, E>>,
  ports: RuntimePorts,
): Promise<Result<TOut, WireError>> {
  let result: Result<TOut, E>;
  try {
    result = await execute(ctx, input);
  } catch (error) {
    if (error instanceof Response) throw error;
    return Err(thrownToWire(error, ports));
  }

  if (!isErr(result)) return Ok(result.value);
  return Err(domainFailureToWire(result.error, ports));
}

export function createActionRunner(ports: RuntimePorts) {
  async function runActionResult<TIn, TOut, E extends DomainError>(
    def: ActionDef<TIn, TOut, E>,
  ): Promise<Result<TOut, WireError>> {
    const startedAt = ports.now();

    const parsed = runParse(def.parse, ports);
    if (isErr(parsed)) return parsed;

    let identity: Result<AuthSession, DomainError>;
    try {
      identity = await authenticateAccess(def.access);
    } catch (error) {
      if (error instanceof Response) throw error;
      return Err(thrownToWire(error, ports));
    }
    if (isErr(identity)) return Err(domainFailureToWire(identity.error, ports));

    const ctx = createAppContext(identity.value, ports.now);
    const audit = def.audit?.(parsed.value) ?? {};
    const tele: TelemetryContext = {
      actionName: def.name,
      ctx,
      startedAt,
      audit,
    };

    const authorized = authorizeAccess(identity.value, def.access, def.stepUp);
    if (isErr(authorized)) {
      const wire = domainFailureToWire(authorized.error, ports);
      ports.record(errorRow(tele, wire));
      return Err(wire);
    }

    const executed = await runExecute(ctx, parsed.value, def.execute, ports);
    if (isErr(executed)) {
      ports.record(errorRow(tele, executed.error));
      return executed;
    }

    ports.record(successRow(tele));
    return executed;
  }

  async function runAction<TIn, TOut, E extends DomainError>(
    def: ActionDef<TIn, TOut, E>,
  ): Promise<TOut> {
    const result = await runActionResult(def);
    if (isErr(result)) throw new ActionError(result.error);
    return result.value;
  }

  return { runAction, runActionResult };
}

// The default runner wires production ports. `createActionRunner` is exported so
// tests inject fakes (clock, Sentry, telemetry) without mocking modules.
const runner = createActionRunner(defaultPorts);
export const runAction = runner.runAction;
export const runActionResult = runner.runActionResult;

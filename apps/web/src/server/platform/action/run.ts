import { ActionError, type WireError } from "~/contracts/errors";
import type { AuthSession } from "~/domain/auth/access/session-types";
import { type DomainError } from "~/domain/errors";
import { Err, isErr, Ok, type Result } from "~/shared/result";

import {
  type ActionAccess,
  type ActionStepUpRequirement,
  authenticateAccess,
  authorizeAccess,
} from "./access";
import { type AppContext, createAppContext } from "./context";
import { toWire } from "./domain-error";
import { type ServerFunctionPorts } from "./ports";
import {
  type TelemetryFields,
  errorRow,
  successRow,
  type TelemetryContext,
} from "./telemetry";

type ActionCommon = {
  name: string;
  access: ActionAccess;
} & ActionStepUpRequirement;

type ParsedActionDef<TIn, TOut, E extends DomainError> = ActionCommon & {
  parse: () => Result<TIn, DomainError>;
  telemetry?: (input: TIn) => TelemetryFields;
  execute: (ctx: AppContext, input: TIn) => Promise<Result<TOut, E>>;
};

type EmptyActionDef<TOut, E extends DomainError> = ActionCommon & {
  parse?: undefined;
  telemetry?: () => TelemetryFields;
  execute: (ctx: AppContext) => Promise<Result<TOut, E>>;
};

export type ActionDef<TIn, TOut, E extends DomainError> =
  | ParsedActionDef<TIn, TOut, E>
  | EmptyActionDef<TOut, E>;

/**
 * Single owner for the DomainError to WireError projection.
 *
 * Internal and external faults are reported here because this is the last
 * point that still holds the DomainError. The WireError keeps only kind, code
 * and a translated message, so internalMessage, details and cause are gone
 * after this returns and nothing downstream can report them.
 */
function projectFault(
  error: DomainError,
  ports: ServerFunctionPorts,
): WireError {
  if (error.kind === "internal" || error.kind === "external") {
    ports.report(error);
  }
  return toWire(error);
}

function runParse<TIn>(
  parse: () => Result<TIn, DomainError>,
  ports: ServerFunctionPorts,
): Result<TIn, WireError> {
  const parsed = parse();
  if (isErr(parsed)) return Err(projectFault(parsed.error, ports));
  return Ok(parsed.value);
}

async function runExecute<TIn, TOut, E extends DomainError>(
  ctx: AppContext,
  input: TIn,
  execute: (ctx: AppContext, input: TIn) => Promise<Result<TOut, E>>,
  ports: ServerFunctionPorts,
): Promise<Result<TOut, WireError>> {
  const result = await execute(ctx, input);

  if (!isErr(result)) return Ok(result.value);
  return Err(projectFault(result.error, ports));
}

async function runExecuteEmpty<TOut, E extends DomainError>(
  ctx: AppContext,
  execute: (ctx: AppContext) => Promise<Result<TOut, E>>,
  ports: ServerFunctionPorts,
): Promise<Result<TOut, WireError>> {
  const result = await execute(ctx);

  if (!isErr(result)) return Ok(result.value);
  return Err(projectFault(result.error, ports));
}

export function createServerFunctionExecutor(ports: ServerFunctionPorts) {
  async function runAuthenticated<TOut>(
    def: ActionCommon,
    startedTicks: number,
    telemetry: TelemetryFields,
    executeAction: (ctx: AppContext) => Promise<Result<TOut, WireError>>,
  ): Promise<Result<TOut, WireError>> {
    const identity: Result<AuthSession, DomainError> = await authenticateAccess(
      def.access,
    );
    if (isErr(identity)) return Err(projectFault(identity.error, ports));

    const ctx = createAppContext(identity.value);
    const tele: TelemetryContext = {
      actionName: def.name,
      ctx,
      startedTicks,
      telemetry,
    };

    const authorized = authorizeAccess(
      identity.value,
      def.access,
      def.stepUp,
      ctx,
    );
    if (isErr(authorized)) {
      const wire = projectFault(authorized.error, ports);
      ports.record(errorRow(tele, wire));
      return Err(wire);
    }

    const executed = await executeAction(ctx);
    if (isErr(executed)) {
      ports.record(errorRow(tele, executed.error));
      return executed;
    }

    ports.record(successRow(tele));
    return executed;
  }

  async function executeResult<TIn, TOut, E extends DomainError>(
    def: ActionDef<TIn, TOut, E>,
  ): Promise<Result<TOut, WireError>> {
    // Monotonic tick, not an instant. This measures how long the action takes;
    // the instant it stamps its writes with comes from the request edge via
    // ctx.operationAt. The wall clock is not monotonic, so it cannot time anything.
    const startedTicks = performance.now();

    if (def.parse) {
      const parsed = runParse(def.parse, ports);
      if (isErr(parsed)) return parsed;
      const telemetry = def.telemetry?.(parsed.value) ?? {};
      return runAuthenticated(def, startedTicks, telemetry, (ctx) =>
        runExecute(ctx, parsed.value, def.execute, ports),
      );
    }

    const telemetry = def.telemetry?.() ?? {};
    return runAuthenticated(def, startedTicks, telemetry, (ctx) =>
      runExecuteEmpty(ctx, def.execute, ports),
    );
  }

  async function execute<TIn, TOut, E extends DomainError>(
    def: ActionDef<TIn, TOut, E>,
  ): Promise<TOut> {
    const result = await executeResult(def);
    if (isErr(result)) throw new ActionError(result.error);
    return result.value;
  }

  return { execute, executeResult };
}

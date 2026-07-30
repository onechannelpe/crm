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
import { domainToWire } from "./fault-boundary";
import { type RuntimePorts } from "./ports";
import {
  type AuditFields,
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
  audit?: (input: TIn) => AuditFields;
  execute: (ctx: AppContext, input: TIn) => Promise<Result<TOut, E>>;
};

type EmptyActionDef<TOut, E extends DomainError> = ActionCommon & {
  parse?: undefined;
  audit?: () => AuditFields;
  execute: (ctx: AppContext) => Promise<Result<TOut, E>>;
};

export type ActionDef<TIn, TOut, E extends DomainError> =
  | ParsedActionDef<TIn, TOut, E>
  | EmptyActionDef<TOut, E>;

function runParse<TIn>(
  parse: () => Result<TIn, DomainError>,
  ports: RuntimePorts,
): Result<TIn, WireError> {
  const parsed = parse();
  if (isErr(parsed)) return Err(domainToWire(parsed.error, ports));
  return Ok(parsed.value);
}

async function runExecute<TIn, TOut, E extends DomainError>(
  ctx: AppContext,
  input: TIn,
  execute: (ctx: AppContext, input: TIn) => Promise<Result<TOut, E>>,
  ports: RuntimePorts,
): Promise<Result<TOut, WireError>> {
  const result = await execute(ctx, input);

  if (!isErr(result)) return Ok(result.value);
  return Err(domainToWire(result.error, ports));
}

async function runExecuteEmpty<TOut, E extends DomainError>(
  ctx: AppContext,
  execute: (ctx: AppContext) => Promise<Result<TOut, E>>,
  ports: RuntimePorts,
): Promise<Result<TOut, WireError>> {
  const result = await execute(ctx);

  if (!isErr(result)) return Ok(result.value);
  return Err(domainToWire(result.error, ports));
}

export function createActionRunner(ports: RuntimePorts) {
  async function runAuthenticated<TOut>(
    def: ActionCommon,
    startedAt: Date,
    audit: AuditFields,
    execute: (ctx: AppContext) => Promise<Result<TOut, WireError>>,
  ): Promise<Result<TOut, WireError>> {
    const identity: Result<AuthSession, DomainError> = await authenticateAccess(
      def.access,
    );
    if (isErr(identity)) return Err(domainToWire(identity.error, ports));

    const ctx = createAppContext(identity.value, ports.now);
    const tele: TelemetryContext = {
      actionName: def.name,
      ctx,
      startedAt,
      audit,
    };

    const authorized = authorizeAccess(identity.value, def.access, def.stepUp);
    if (isErr(authorized)) {
      const wire = domainToWire(authorized.error, ports);
      ports.record(errorRow(tele, wire));
      return Err(wire);
    }

    const executed = await execute(ctx);
    if (isErr(executed)) {
      ports.record(errorRow(tele, executed.error));
      return executed;
    }

    ports.record(successRow(tele));
    return executed;
  }

  async function runActionResult<TIn, TOut, E extends DomainError>(
    def: ActionDef<TIn, TOut, E>,
  ): Promise<Result<TOut, WireError>> {
    const startedAt = ports.now();

    if (def.parse) {
      const parsed = runParse(def.parse, ports);
      if (isErr(parsed)) return parsed;
      const audit = def.audit?.(parsed.value) ?? {};
      return runAuthenticated(def, startedAt, audit, (ctx) =>
        runExecute(ctx, parsed.value, def.execute, ports),
      );
    }

    const audit = def.audit?.() ?? {};
    return runAuthenticated(def, startedAt, audit, (ctx) =>
      runExecuteEmpty(ctx, def.execute, ports),
    );
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

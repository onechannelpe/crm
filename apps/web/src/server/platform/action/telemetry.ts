import type { WireError } from "~/lib/wire-error";
import type { RecordActionObservationInput } from "~/server/observability/service";

import type { AppContext } from "./context";

/**
 * The subset of an action's input that is safe to persist for observability.
 * Restricted to scalar identifiers (lead ids, venue ids, counts, flags) so a
 * raw request payload, which may carry PII or bank data, cannot be assigned
 * here and reach the telemetry store.
 */
export type AuditFields = Record<string, string | number | boolean | null>;

export type TelemetryRow = RecordActionObservationInput;

export type TelemetryContext = {
  actionName: string;
  ctx: AppContext;
  startedAt: Date;
  audit: AuditFields;
};

function baseRow(
  t: TelemetryContext,
): Omit<TelemetryRow, "status" | "errorCode" | "errorMessage"> {
  const at = t.ctx.now();
  return {
    traceId: t.ctx.traceId,
    requestId: t.ctx.requestId,
    routePath: null,
    httpMethod: null,
    actionName: t.actionName,
    actorUserId: t.ctx.actor.userId,
    actorRole: t.ctx.actor.role,
    durationMs: at.getTime() - t.startedAt.getTime(),
    input: t.audit,
    createdAt: at,
  };
}

export function successRow(t: TelemetryContext): TelemetryRow {
  return { ...baseRow(t), status: "ok", errorCode: null, errorMessage: null };
}

export function errorRow(t: TelemetryContext, error: WireError): TelemetryRow {
  return {
    ...baseRow(t),
    status: "error",
    errorCode: error.kind,
    errorMessage: error.message,
  };
}

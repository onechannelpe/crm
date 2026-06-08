import { isAppError, type AppErrorCode } from "~/lib/app-errors";
import { getErrorMessage } from "~/lib/errors";
import { getServerRuntime } from "~/server/runtime";

import type { AppContext } from "./context";

/**
 * The subset of an action's input that is safe to persist for observability.
 * Restricted to scalar identifiers (lead ids, venue ids, counts, flags) so a
 * raw request payload, which may carry PII or bank data, cannot be assigned
 * here and reach the telemetry store.
 */
export type AuditFields = Record<string, string | number | boolean | null>;

export type ActionTelemetryInput = {
  actionName: string;
  ctx: AppContext;
  startedAt: number;
  audit: AuditFields;
};

type ActionTelemetryError = {
  code: AppErrorCode | null;
  message: string | null;
};

export function toTelemetryError(error: unknown): ActionTelemetryError {
  if (isAppError(error)) {
    return { code: error.code, message: error.publicMessage };
  }
  return { code: null, message: getErrorMessage(error, "Unknown error") };
}

export function recordActionSuccess(input: ActionTelemetryInput) {
  const { observabilityService } = getServerRuntime().observability;
  void observabilityService
    .recordAction({
      traceId: input.ctx.traceId,
      requestId: input.ctx.requestId,
      routePath: null,
      httpMethod: null,
      actionName: input.actionName,
      actorUserId: input.ctx.actor.userId,
      actorRole: input.ctx.actor.role,
      status: "ok",
      durationMs: input.ctx.now() - input.startedAt,
      errorCode: null,
      errorMessage: null,
      input: input.audit,
      createdAt: input.ctx.now(),
    })
    .catch(() => {});
}

export function recordActionError(
  input: ActionTelemetryInput,
  error: ActionTelemetryError,
) {
  const { observabilityService } = getServerRuntime().observability;
  void observabilityService
    .recordAction({
      traceId: input.ctx.traceId,
      requestId: input.ctx.requestId,
      routePath: null,
      httpMethod: null,
      actionName: input.actionName,
      actorUserId: input.ctx.actor.userId,
      actorRole: input.ctx.actor.role,
      status: "error",
      durationMs: input.ctx.now() - input.startedAt,
      errorCode: error.code,
      errorMessage: error.message,
      input: input.audit,
      createdAt: input.ctx.now(),
    })
    .catch(() => {});
}

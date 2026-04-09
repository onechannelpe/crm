import { isAppError, type AppErrorCode } from "~/lib/app-errors";
import { getErrorMessage } from "~/lib/errors";
import { serverRuntime } from "~/server/runtime";

import type { AppContext } from "./context";

export type ActionTelemetryInput = {
  actionName: string;
  ctx: AppContext;
  startedAt: number;
  input: unknown;
};

type ActionTelemetryError = {
  code: AppErrorCode | null;
  message: string | null;
};

export function toTelemetryError(error: unknown): ActionTelemetryError {
  return {
    code: isAppError(error) ? error.code : null,
    message: getErrorMessage(error, "Unknown error"),
  };
}

export function recordActionSuccess(input: ActionTelemetryInput) {
  const { observabilityService } = serverRuntime.observability;
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
      input: input.input ?? null,
      createdAt: input.ctx.now(),
    })
    .catch(() => {});
}

export function recordActionError(
  input: ActionTelemetryInput,
  error: ActionTelemetryError,
) {
  const { observabilityService } = serverRuntime.observability;
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
      input: input.input ?? null,
      createdAt: input.ctx.now(),
    })
    .catch(() => {});
}

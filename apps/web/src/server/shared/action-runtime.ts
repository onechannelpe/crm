import { isAppError, type AppErrorCode } from "~/lib/app-errors";
import type { Permission, Role } from "~/lib/auth/access/rbac";
import {
  requireAuth as requireAuthActor,
  requirePermission,
  requireRole,
  requireSession as requireSessionActor,
  type SessionData,
} from "~/lib/auth/access/session";
import { assertRecentStrongAuth } from "~/lib/auth/security/step-up";
import { getErrorMessage } from "~/lib/errors";
import { getRequestContext } from "~/lib/http/request-context";
import { getActionRequestContext } from "~/lib/observability/context";
import { getObservabilityRuntime } from "~/server/observability/runtime";
import type { DomainError } from "~/server/shared/domain-error";
import { isErr, type Result } from "~/server/shared/result";
import { throwDomainError } from "~/server/shared/throw-domain-error";

const { observabilityService } = getObservabilityRuntime();

type ActionAuthRequirement = {
  permission?: Permission;
  role?: Role;
  requireAuth?: boolean;
  requireSession?: boolean;
};

type ActionTelemetryInput = {
  actionName: string;
  ctx: AppContext;
  startedAt: number;
  input: unknown;
};

type ActionTelemetryError = {
  code: AppErrorCode | null;
  message: string | null;
};

export interface AppContext {
  actor: SessionData;
  requestId: string;
  traceId: string;
  ipAddress: string;
  userAgent: string | null;
  publicOrigin: string;
  now: () => number;
}

type RunActionParams<T, E extends DomainError> = ActionAuthRequirement & {
  actionName: string;
  stepUp?: "recent_strong_auth";
  input?: unknown;
  execute: (ctx: AppContext) => Promise<Result<T, E>>;
};

export function createAppContext(actor: SessionData): AppContext {
  const request = getRequestContext();
  const action = getActionRequestContext();
  return {
    actor,
    requestId: action.requestId,
    traceId: action.traceId,
    ipAddress: request.clientIp,
    userAgent: request.userAgent,
    publicOrigin: request.publicOrigin,
    now: Date.now,
  };
}

async function resolveActor(
  params: ActionAuthRequirement,
): Promise<SessionData> {
  if (params.permission) {
    return requirePermission(params.permission);
  }
  if (params.role) {
    return requireRole(params.role);
  }
  if (params.requireAuth) {
    return requireAuthActor();
  }
  if (params.requireSession) {
    return requireSessionActor();
  }
  throw new Error("runAction requires an auth requirement");
}

function toTelemetryError(error: unknown): ActionTelemetryError {
  return {
    code: isAppError(error) ? error.code : null,
    message: getErrorMessage(error, "Unknown error"),
  };
}

function recordActionSuccess(input: ActionTelemetryInput) {
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

function recordActionError(
  input: ActionTelemetryInput,
  error: ActionTelemetryError,
) {
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

async function createActionTelemetry(
  params: ActionAuthRequirement & Pick<RunActionParams<unknown, DomainError>, "actionName" | "stepUp" | "input">,
): Promise<ActionTelemetryInput> {
  const actor = await resolveActor(params);
  if (params.stepUp === "recent_strong_auth") {
    assertRecentStrongAuth(actor);
  }

  return {
    actionName: params.actionName,
    ctx: createAppContext(actor),
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

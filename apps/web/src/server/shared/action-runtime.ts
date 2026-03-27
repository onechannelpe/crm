import { throwDomainError } from "~/actions/throw-domain-error";
import {
  requirePermission,
  requireRole,
  requireSession as requireSessionActor,
  type SessionData,
} from "~/lib/auth/access/session";
import type { Permission, Role } from "~/lib/auth/access/rbac";
import { getErrorMessage } from "~/lib/errors";
import { getRequestContext } from "~/lib/http/request-context";
import { getActionRequestContext } from "~/lib/observability/context";
import { observabilityService } from "~/server/shared/context";
import type { DomainError } from "~/server/shared/domain-error";
import { isErr, type Result } from "~/server/shared/result";

export interface AppContext {
  actor: SessionData;
  requestId: string;
  traceId: string;
  ipAddress: string;
  userAgent: string | null;
  publicOrigin: string;
  now: () => number;
}

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

async function resolveActor(params: {
  actor?: SessionData;
  permission?: Permission;
  role?: Role;
  requireSession?: boolean;
}): Promise<SessionData> {
  if (params.actor) {
    return params.actor;
  }
  if (params.permission) {
    return requirePermission(params.permission);
  }
  if (params.role) {
    return requireRole(params.role);
  }
  if (params.requireSession) {
    return requireSessionActor();
  }
  throw new Error("runAction requires an actor or auth requirement");
}

export async function runAction<T, E extends DomainError>(params: {
  actionName: string;
  actor?: SessionData;
  permission?: Permission;
  role?: Role;
  requireSession?: boolean;
  input?: unknown;
  execute: (ctx: AppContext) => Promise<Result<T, E>>;
}): Promise<T> {
  const actor = await resolveActor(params);
  const ctx = createAppContext(actor);
  const startedAt = ctx.now();

  try {
    const result = await params.execute(ctx);
    if (isErr(result)) {
      throwDomainError(result.error);
    }

    void observabilityService
      .recordAction({
        traceId: ctx.traceId,
        requestId: ctx.requestId,
        routePath: null,
        httpMethod: null,
        actionName: params.actionName,
        actorUserId: ctx.actor.userId,
        actorRole: ctx.actor.role,
        status: "ok",
        durationMs: ctx.now() - startedAt,
        errorCode: null,
        errorMessage: null,
        input: params.input ?? null,
        createdAt: ctx.now(),
      })
      .catch(() => {});

    return result.value;
  } catch (error) {
    void observabilityService
      .recordAction({
        traceId: ctx.traceId,
        requestId: ctx.requestId,
        routePath: null,
        httpMethod: null,
        actionName: params.actionName,
        actorUserId: ctx.actor.userId,
        actorRole: ctx.actor.role,
        status: "error",
        durationMs: ctx.now() - startedAt,
        errorCode: null,
        errorMessage: getErrorMessage(error, "Unknown error"),
        input: params.input ?? null,
        createdAt: ctx.now(),
      })
      .catch(() => {});

    throw error;
  }
}

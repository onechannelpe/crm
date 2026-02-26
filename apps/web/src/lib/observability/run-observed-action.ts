import type { AppErrorCode } from "~/lib/app-errors";
import { toAppError } from "~/lib/app-errors";
import type { Role } from "~/lib/auth/access/rbac";
import { getErrorMessage } from "~/lib/errors";
import { getActionRequestContext } from "~/lib/observability/context";
import { observabilityService } from "~/server/shared/context";

export interface ObservedActionActor {
  userId: number | null;
  role: Role | null;
}

function recordActionInBackground(params: {
  traceId: string;
  requestId: string;
  routePath: string | null;
  httpMethod: string | null;
  actionName: string;
  actorUserId: number | null;
  actorRole: Role | null;
  status: "ok" | "error";
  durationMs: number;
  errorCode: AppErrorCode | null;
  errorMessage: string | null;
  input: unknown;
  createdAt: number;
}): void {
  void observabilityService.recordAction(params).catch(() => {});
}

export async function runObservedAction<T>(params: {
  actionName: string;
  actor: ObservedActionActor;
  input?: unknown;
  run: () => Promise<T>;
  resolveActor?: (result: T) => ObservedActionActor;
}): Promise<T> {
  const context = getActionRequestContext();
  const startedAt = Date.now();

  try {
    const result = await params.run();
    const actor = params.resolveActor?.(result) ?? params.actor;
    recordActionInBackground({
      traceId: context.traceId,
      requestId: context.requestId,
      routePath: context.routePath,
      httpMethod: context.httpMethod,
      actionName: params.actionName,
      actorUserId: actor.userId,
      actorRole: actor.role,
      status: "ok",
      durationMs: Date.now() - startedAt,
      errorCode: null,
      errorMessage: null,
      input: params.input ?? null,
      createdAt: Date.now(),
    });
    return result;
  } catch (error: unknown) {
    const appError = toAppError(error, "Unexpected error");
    recordActionInBackground({
      traceId: context.traceId,
      requestId: context.requestId,
      routePath: context.routePath,
      httpMethod: context.httpMethod,
      actionName: params.actionName,
      actorUserId: params.actor.userId,
      actorRole: params.actor.role,
      status: "error",
      durationMs: Date.now() - startedAt,
      errorCode: appError.code,
      errorMessage: getErrorMessage(error, "Unknown error"),
      input: params.input ?? null,
      createdAt: Date.now(),
    });
    throw error;
  }
}

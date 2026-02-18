import type { Role } from "~/lib/auth/access/rbac";
import { getErrorMessage } from "~/lib/errors";
import { getActionRequestContext } from "~/lib/observability/context";
import { observabilityService } from "~/server/shared/context";

export interface ObservedActionActor {
  userId: number | null;
  role: Role | null;
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
    await observabilityService
      .recordAction({
        traceId: context.traceId,
        requestId: context.requestId,
        routePath: context.routePath,
        httpMethod: context.httpMethod,
        actionName: params.actionName,
        actorUserId: actor.userId,
        actorRole: actor.role,
        status: "ok",
        durationMs: Date.now() - startedAt,
        errorMessage: null,
        input: params.input ?? null,
        createdAt: Date.now(),
      })
      .catch(() => {});
    return result;
  } catch (error: unknown) {
    await observabilityService
      .recordAction({
        traceId: context.traceId,
        requestId: context.requestId,
        routePath: context.routePath,
        httpMethod: context.httpMethod,
        actionName: params.actionName,
        actorUserId: params.actor.userId,
        actorRole: params.actor.role,
        status: "error",
        durationMs: Date.now() - startedAt,
        errorMessage: getErrorMessage(error, "Unknown error"),
        input: params.input ?? null,
        createdAt: Date.now(),
      })
      .catch(() => {});
    throw error;
  }
}

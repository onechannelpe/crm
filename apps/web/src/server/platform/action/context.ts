import type { AuthSession } from "~/domain/auth/access/session-types";
import type { Clock } from "~/domain/time/clock";
import { getRequestContext } from "~/server/platform/http/request-context";
import { getActionRequestContext } from "~/server/platform/observability/context";

export interface AppContext {
  actor: AuthSession;
  requestId: string;
  traceId: string;
  ipAddress: string;
  userAgent: string | null;
  publicOrigin: string;
  now: Clock;
}

export function createAppContext(
  actor: AuthSession,
  now: Clock,
): AppContext {
  const request = getRequestContext();
  const action = getActionRequestContext();
  return {
    actor,
    requestId: action.requestId,
    traceId: action.traceId,
    ipAddress: request.clientIp,
    userAgent: request.userAgent,
    publicOrigin: request.publicOrigin,
    now,
  };
}

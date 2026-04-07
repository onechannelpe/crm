import type { AuthSession } from "~/lib/auth/access/session-types";
import { getRequestContext } from "~/lib/http/request-context";
import { getActionRequestContext } from "~/lib/observability/context";

export interface AppContext {
  actor: AuthSession;
  requestId: string;
  traceId: string;
  ipAddress: string;
  userAgent: string | null;
  publicOrigin: string;
  now: () => number;
}

export function createAppContext(actor: AuthSession): AppContext {
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

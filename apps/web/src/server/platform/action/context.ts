import type { AuthSession } from "~/domain/auth/access/session-types";
import { getRequestContext } from "~/server/platform/http/request-context";
import { getActionRequestContext } from "~/server/platform/observability/context";
import type { OperationContext } from "~/server/platform/operation/context";

export interface AppContext extends OperationContext {
  actor: AuthSession;
  /**
   * The instant this operation happened. See `~/domain/time/clock` for why
   * everything one operation writes has to agree on it.
   */
  traceId: string;
  requestId: string;
  ipAddress: string;
  userAgent: string | null;
  publicOrigin: string;
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
    // Inherited, not read. A server function runs inside an HTTP request, so
    // the action's instant is the request's instant.
    operationAt: request.startedAt,
  };
}

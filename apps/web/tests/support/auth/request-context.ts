import type { AuthSession } from "~/domain/auth/access/session-types";
import type { RequestContext } from "~/server/platform/http/request-context";

export function createRequestContext(
  session: AuthSession | null,
  csrfToken: string | null = "csrf-token",
): RequestContext {
  return {
    traceId: "trace-id",
    requestId: "request-id",
    route: "/home",
    method: "GET",
    startedAt: new Date(1_700_000_000_000),
    startedTicks: 0,
    nonce: "nonce",
    csrf: csrfToken
      ? { kind: "available", token: csrfToken }
      : { kind: "missing" },
    principal: session,
    publicOrigin: "http://localhost:3000",
    clientIp: "127.0.0.1",
    userAgent: "vitest",
  };
}

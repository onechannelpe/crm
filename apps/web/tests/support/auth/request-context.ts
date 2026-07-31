import type { AuthSession } from "~/domain/auth/access/session-types";
import type { RequestContext } from "~/server/platform/http/request-context";

export function createRequestContext(
  session: AuthSession | null,
  csrfToken: string | null = "csrf-token",
): RequestContext {
  return {
    publicOrigin: "http://localhost:3000",
    clientIp: "127.0.0.1",
    userAgent: "vitest",
    observability: {
      traceId: "trace-id",
      requestId: "request-id",
      routePath: "/home",
      httpMethod: "GET",
      requestStartedAt: 1_700_000_000_000,
    },
    csrfToken,
    getAuthSession: async () => session,
    getRequestCsrfToken: async () => csrfToken,
  };
}

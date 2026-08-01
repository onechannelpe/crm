import "server-only";
import { application } from "~/server/platform/composition/application";
import type { RequestContextDeps } from "~/server/platform/http/request-context";

export function createRequestContextDependencies(): RequestContextDeps {
  return {
    resolveAuthSession: (token, now) =>
      application.auth.sessionService.resolve(token, now),
    requestSessions: application.security.requestSessions,
  };
}

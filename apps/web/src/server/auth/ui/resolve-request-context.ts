import "server-only";
import { createAuthSessionRepo } from "~/server/auth/infrastructure/session-repo";
import { createAuthUsersRepo } from "~/server/auth/infrastructure/users-repo";
import { createSessionService } from "~/server/auth/session/session.service";
import { db } from "~/server/platform/database/db";
import type { RequestContextDeps } from "~/server/platform/http/request-context";
import { createRequestSessionsRepo } from "~/server/security/repos-request-sessions";
import { createLogger } from "~/shared/observability/runtime-logger";

export function createRequestContextDependencies(): RequestContextDeps {
  const sessionService = createSessionService({
    sessions: createAuthSessionRepo(db),
    users: createAuthUsersRepo(db),
    events: {
      append: async () => {
        throw new Error(
          "Session establishment is unavailable during request resolution",
        );
      },
    },
    logger: createLogger("request-session-resolution"),
  });

  return {
    resolveAuthSession: (token, now) => sessionService.resolve(token, now),
    requestSessions: createRequestSessionsRepo(db),
  };
}

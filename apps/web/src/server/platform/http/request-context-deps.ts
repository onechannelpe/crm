import "server-only";
import { createAuthSessionRepo } from "~/server/auth/infrastructure/session-repo";
import { createAuthUsersRepo } from "~/server/auth/infrastructure/users-repo";
import { createSessionService } from "~/server/auth/session/session.service";
import { db } from "~/server/platform/database/db";
import { createRequestSessionsRepo } from "~/server/security/repos-request-sessions";
import { createLogger } from "~/shared/observability/runtime-logger";

const sessionService = createSessionService({
  sessions: createAuthSessionRepo(db),
  users: createAuthUsersRepo(db),
  events: {
    append: async () => {
      throw new Error("Session establishment is unavailable during resolution");
    },
  },
  now: () => new Date(),
  logger: createLogger("request-session-resolution"),
});

export const requestContextDeps = {
  resolveAuthSession: sessionService.resolve,
  requestSessions: createRequestSessionsRepo(db),
};

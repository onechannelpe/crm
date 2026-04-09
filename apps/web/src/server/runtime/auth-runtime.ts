import { createAuthThrottleRepo } from "~/server/auth/repos-auth-throttle";
import { createSessionService } from "~/server/features/auth/application/session-service";
import { createAuthThrottleService } from "~/server/features/auth/application/throttle-service";
import { createAuthSessionRepo } from "~/server/features/auth/infra/session-repo";
import { createAuthUsersRepo } from "~/server/features/auth/infra/users-repo";

import type { ServerInfra } from "./infra";

export function createAuthRuntime(infra: ServerInfra) {
  return {
    authThrottleService: createAuthThrottleService({
      authThrottle: createAuthThrottleRepo(infra.db),
      now: infra.now,
    }),
    sessionService: createSessionService({
      sessions: createAuthSessionRepo(infra.db),
      users: createAuthUsersRepo(infra.db),
      now: infra.now,
      logger: infra.logger,
    }),
  };
}

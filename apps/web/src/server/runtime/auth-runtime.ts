import { createSessionService } from "~/server/features/auth/application/session-service";
import { createAuthSessionRepo } from "~/server/features/auth/infra/session-repo";
import { createAuthUsersRepo } from "~/server/features/auth/infra/users-repo";

import type { ServerInfra } from "./infra";
import { createServerInfra } from "./infra";

export function createAuthRuntime(infra: ServerInfra) {
  return {
    sessionService: createSessionService({
      sessions: createAuthSessionRepo(infra.db),
      users: createAuthUsersRepo(infra.db),
      now: infra.now,
      logger: infra.logger,
    }),
  };
}

export const authRuntime = createAuthRuntime(createServerInfra());

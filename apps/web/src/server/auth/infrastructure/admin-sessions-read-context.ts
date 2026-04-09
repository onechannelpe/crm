import { createSessionRepository } from "~/server/sessions/repos-sessions";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

export function createAdminSessionsReadContext(executor: DatabaseExecutor) {
  return {
    repos: {
      sessions: createSessionRepository(executor),
    },
  };
}

export type AdminSessionsReadContext = ReturnType<
  typeof createAdminSessionsReadContext
>;

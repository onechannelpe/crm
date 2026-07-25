import type { DatabaseExecutor } from "~/server/platform/database/executor";
import { createSessionRepository } from "~/server/sessions/repos-sessions";

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

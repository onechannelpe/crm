import { db } from "~/lib/db/db";
import { createSessionRepository } from "~/server/sessions/repos-sessions";

export function createAdminSessionsReadContext() {
  return {
    repos: {
      sessions: createSessionRepository(db),
    },
  };
}

export type AdminSessionsReadContext = ReturnType<
  typeof createAdminSessionsReadContext
>;

import { repos } from "~/server/shared/context";

export function createAdminSessionsReadContext() {
  return {
    repos: {
      sessions: repos.sessions,
    },
  };
}

export type AdminSessionsReadContext = ReturnType<
  typeof createAdminSessionsReadContext
>;

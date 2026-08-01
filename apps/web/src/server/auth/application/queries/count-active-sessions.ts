import type { AdminSessionsReadContext } from "../../infrastructure/admin-sessions-read-context";

export async function countActiveSessions(
  deps: AdminSessionsReadContext,
  asOf: Date,
): Promise<number> {
  return deps.repos.sessions.countActive(asOf);
}

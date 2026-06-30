import type { AdminSessionsReadContext } from "../../infrastructure/admin-sessions-read-context";
import type { SessionInfo } from "../contracts";

export async function listAllActiveSessions(
  deps: AdminSessionsReadContext,
): Promise<SessionInfo[]> {
  const sessions = await deps.repos.sessions.listAllActive();

  return sessions.map((session) => ({
    ...session,
    createdAt: session.createdAt.getTime(),
    lastActivity: session.lastActivity.getTime(),
    expiresAt: session.expiresAt.getTime(),
  }));
}

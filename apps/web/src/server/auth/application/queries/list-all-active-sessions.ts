import type { AdminSessionsReadContext } from "../../infrastructure/admin-sessions-read-context";
import type { SessionInfo } from "../contracts";

export async function listAllActiveSessions(
  deps: AdminSessionsReadContext,
): Promise<SessionInfo[]> {
  return deps.repos.sessions.listAllActive();
}

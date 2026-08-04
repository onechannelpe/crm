import type { SessionInfo } from "~/contracts/auth";
import type { OperationContext } from "~/server/platform/operation/context";
import type { SessionRepository } from "~/server/sessions/repos-sessions";

export async function listAllActiveSessions(
  sessions: Pick<SessionRepository, "listAllActive">,
  operation: OperationContext,
): Promise<SessionInfo[]> {
  const activeSessions = await sessions.listAllActive(operation.operationAt);

  return activeSessions.map((session) => ({
    id: session.id,
    userId: session.userId,
    userEmail: session.userEmail,
    userName: session.userName,
    role: session.role,
    branchName: session.branchName,
    ipAddress: session.ipAddress,
    userAgent: session.userAgent,
    createdAt: session.createdAt.getTime(),
    lastActivity: session.lastActivity.getTime(),
    expiresAt: session.expiresAt.getTime(),
  }));
}

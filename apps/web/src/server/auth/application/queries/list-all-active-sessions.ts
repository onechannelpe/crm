import type { SessionInfo } from "~/contracts/auth";
import type { OperationContext } from "~/server/platform/operation/context";

import type { AdminSessionsReadContext } from "../../infrastructure/admin-sessions-read-context";

export async function listAllActiveSessions(
  deps: AdminSessionsReadContext,
  operation: OperationContext,
): Promise<SessionInfo[]> {
  const sessions = await deps.repos.sessions.listAllActive(
    operation.operationAt,
  );

  return sessions.map((session) => ({
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

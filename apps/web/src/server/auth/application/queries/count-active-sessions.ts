import type { OperationContext } from "~/server/platform/operation/context";

import type { AdminSessionsReadContext } from "../../infrastructure/admin-sessions-read-context";

export async function countActiveSessions(
  deps: AdminSessionsReadContext,
  operation: OperationContext,
): Promise<number> {
  return deps.repos.sessions.countActive(operation.operationAt);
}

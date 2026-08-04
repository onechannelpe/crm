import type { OperationContext } from "~/server/platform/operation/context";
import type { SessionRepository } from "~/server/sessions/repos-sessions";

export async function countActiveSessions(
  sessions: Pick<SessionRepository, "countActive">,
  operation: OperationContext,
): Promise<number> {
  return sessions.countActive(operation.operationAt);
}

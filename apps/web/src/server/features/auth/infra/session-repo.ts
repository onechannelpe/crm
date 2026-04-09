import {
  createSessionRepository,
  type SessionRepository,
} from "~/server/sessions/repos-sessions";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

export function createAuthSessionRepo(
  executor: DatabaseExecutor,
): SessionRepository {
  return createSessionRepository(executor);
}

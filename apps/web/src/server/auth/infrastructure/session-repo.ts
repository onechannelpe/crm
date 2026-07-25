import type { DatabaseExecutor } from "~/server/platform/database/executor";
import {
  createSessionRepository,
  type SessionRepository,
} from "~/server/sessions/repos-sessions";

export function createAuthSessionRepo(
  executor: DatabaseExecutor,
): SessionRepository {
  return createSessionRepository(executor);
}

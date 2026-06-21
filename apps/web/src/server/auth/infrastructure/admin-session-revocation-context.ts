import { createExtensionRuntimeRepo } from "~/server/extension/repos";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { createEventsRepo } from "~/server/shared/repos-events";

import type { AdminSessionRevocationPort } from "../application/ports";

interface AdminSessionRevocationRuntimeDeps {
  executor: DatabaseExecutor;
  revokeSession(sessionId: string): Promise<void>;
  revokeUserSessions(userId: number): Promise<void>;
}

export function createAdminSessionRevocationContext(
  deps: AdminSessionRevocationRuntimeDeps,
): AdminSessionRevocationPort {
  const executor = deps.executor;
  const events = createEventsRepo(executor);
  const extensionRuntime = createExtensionRuntimeRepo(executor);

  return {
    revokeSession(sessionId) {
      return deps.revokeSession(sessionId);
    },
    revokeUserSessions(userId) {
      return deps.revokeUserSessions(userId);
    },
    async revokeInstallationSessionsByAuthSession(sessionId, now) {
      await extensionRuntime.revokeInstallationSessionsByAuthSession(
        sessionId,
        now,
      );
    },
    async revokeInstallationSessionsByUser(userId, now) {
      await extensionRuntime.revokeInstallationSessionsByUser(userId, now);
    },
    async updateExecutiveSyncHealth(input) {
      await extensionRuntime.updateExecutiveSyncHealthByUser({
        user_id: input.userId,
        sync_health: input.syncHealth,
        sync_updated_at: input.syncUpdatedAt,
      });
    },
    async appendEvent(input) {
      await events.append(input);
    },
  };
}

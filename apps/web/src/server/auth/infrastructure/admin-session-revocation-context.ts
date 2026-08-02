import type { UserId } from "~/domain/ids";
import { createEventsRepo } from "~/server/event-logs/events-repo";
import { createExtensionRuntimeRepo } from "~/server/extension/repos";
import type { DatabaseExecutor } from "~/server/platform/database/executor";

import type { AdminSessionRevocationPort } from "../application/ports";

interface AdminSessionRevocationRuntimeDeps {
  executor: DatabaseExecutor;
  revokeSession(sessionId: string): Promise<void>;
  revokeUserSessions(userId: UserId): Promise<void>;
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
    async revokeInstallationSessionsByAuthSession(sessionId, revokedAt) {
      await extensionRuntime.revokeInstallationSessionsByAuthSession(
        sessionId,
        revokedAt,
      );
    },
    async revokeInstallationSessionsByUser(userId, revokedAt) {
      await extensionRuntime.revokeInstallationSessionsByUser(
        userId,
        revokedAt,
      );
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

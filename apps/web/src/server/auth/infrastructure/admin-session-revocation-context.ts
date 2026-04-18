import { createExtensionRuntimeRepo } from "~/server/extension/repos";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { UserId } from "~/server/shared/ids";
import { createAuditLogsRepo } from "~/server/shared/repos-audit-logs";

import type { AdminSessionRevocationPort } from "../application/ports";

interface AdminSessionRevocationRuntimeDeps {
  executor: DatabaseExecutor;
  invalidateSession(sessionId: string): Promise<void>;
  invalidateUserSessions(userId: UserId): Promise<void>;
}

export function createAdminSessionRevocationContext(
  deps: AdminSessionRevocationRuntimeDeps,
): AdminSessionRevocationPort {
  const executor = deps.executor;
  const auditLogs = createAuditLogsRepo(executor);
  const extensionRuntime = createExtensionRuntimeRepo(executor);

  return {
    invalidateSession(sessionId) {
      return deps.invalidateSession(sessionId);
    },
    invalidateUserSessions(userId) {
      return deps.invalidateUserSessions(userId);
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
    async createAuditLog(input) {
      await auditLogs.create({
        user_id: input.userId,
        action: input.action,
        entity_type: input.entityType,
        entity_id: input.entityId,
        changes: input.changes,
        created_at: input.createdAt,
      });
    },
  };
}

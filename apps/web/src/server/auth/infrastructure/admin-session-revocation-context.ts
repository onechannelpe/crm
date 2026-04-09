import { createExtensionRuntimeRepo } from "~/server/extension/repos";
import { serverRuntime } from "~/server/runtime";
import { createAuditLogsRepo } from "~/server/shared/repos-audit-logs";

import type { AdminSessionRevocationPort } from "../application/ports";

export function createAdminSessionRevocationContext(): AdminSessionRevocationPort {
  const executor = serverRuntime.infra.db;
  const auditLogs = createAuditLogsRepo(executor);
  const extensionRuntime = createExtensionRuntimeRepo(executor);

  return {
    invalidateSession(sessionId) {
      return serverRuntime.auth.sessionService.invalidateSession(sessionId);
    },
    invalidateUserSessions(userId) {
      return serverRuntime.auth.sessionService.invalidateUserSessions(userId);
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

import {
  invalidateSession,
  invalidateUserSessions,
} from "~/lib/auth/session/session-manager";
import { db } from "~/lib/db/db";
import { createExtensionRuntimeRepo } from "~/server/extension/repos";
import { createAuditLogsRepo } from "~/server/shared/repos-audit-logs";

import type { AdminSessionRevocationPort } from "../application/ports";

export function createAdminSessionRevocationContext(): AdminSessionRevocationPort {
  const auditLogs = createAuditLogsRepo(db);
  const extensionRuntime = createExtensionRuntimeRepo(db);

  return {
    invalidateSession,
    invalidateUserSessions,
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

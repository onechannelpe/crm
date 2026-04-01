import {
  invalidateSession,
  invalidateUserSessions,
} from "~/lib/auth/session/session-manager";
import { repos } from "~/server/shared/context";

import type { AdminSessionRevocationPort } from "../application/ports";

export function createAdminSessionRevocationContext(): AdminSessionRevocationPort {
  return {
    invalidateSession,
    invalidateUserSessions,
    async revokeInstallationSessionsByAuthSession(sessionId, now) {
      await repos.extensionRuntime.revokeInstallationSessionsByAuthSession(
        sessionId,
        now,
      );
    },
    async revokeInstallationSessionsByUser(userId, now) {
      await repos.extensionRuntime.revokeInstallationSessionsByUser(
        userId,
        now,
      );
    },
    async updateExecutiveSyncHealth(input) {
      await repos.extensionRuntime.updateExecutiveSyncHealthByUser({
        user_id: input.userId,
        sync_health: input.syncHealth,
        sync_updated_at: input.syncUpdatedAt,
      });
    },
    async createAuditLog(input) {
      await repos.auditLogs.create({
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

import { createExtensionRuntimeRepo } from "~/server/extension/repos";
import { serverRuntime } from "~/server/runtime";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { createAuditLogsRepo } from "~/server/shared/repos-audit-logs";

import type { AdminSessionRevocationPort } from "../application/ports";

interface AdminSessionRevocationRuntimeDeps {
  executor: DatabaseExecutor;
  invalidateSession(sessionId: string): Promise<void>;
  invalidateUserSessions(userId: number): Promise<void>;
}

function resolveAdminSessionRevocationRuntimeDeps(
  deps?: Partial<AdminSessionRevocationRuntimeDeps>,
): AdminSessionRevocationRuntimeDeps {
  return {
    executor: deps?.executor ?? serverRuntime.infra.db,
    invalidateSession:
      deps?.invalidateSession ??
      ((sessionId: string) =>
        serverRuntime.auth.sessionService.invalidateSession(sessionId)),
    invalidateUserSessions:
      deps?.invalidateUserSessions ??
      ((userId: number) =>
        serverRuntime.auth.sessionService.invalidateUserSessions(userId)),
  };
}

export function createAdminSessionRevocationContext(
  deps?: Partial<AdminSessionRevocationRuntimeDeps>,
): AdminSessionRevocationPort {
  const runtimeDeps = resolveAdminSessionRevocationRuntimeDeps(deps);
  const executor = runtimeDeps.executor;
  const auditLogs = createAuditLogsRepo(executor);
  const extensionRuntime = createExtensionRuntimeRepo(executor);

  return {
    invalidateSession(sessionId) {
      return runtimeDeps.invalidateSession(sessionId);
    },
    invalidateUserSessions(userId) {
      return runtimeDeps.invalidateUserSessions(userId);
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

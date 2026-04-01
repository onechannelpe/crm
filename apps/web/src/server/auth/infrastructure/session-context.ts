import { deleteSessionCookie } from "~/lib/auth/session/cookies";
import { invalidateSession } from "~/lib/auth/session/session-manager";
import { repos } from "~/server/shared/context";

import type { AuthSessionLogoutPort } from "../application/ports";

export function createAuthSessionReadContext() {
  return {
    repos: {
      users: repos.users,
      branches: repos.branches,
      teams: repos.teams,
      passkeys: repos.passkeys,
      userTotpFactors: repos.userTotpFactors,
    },
  };
}

export function createAuthSessionLogoutContext(): AuthSessionLogoutPort {
  return {
    invalidateSession,
    async revokeInstallationSessionsByAuthSession(sessionId, now) {
      await repos.extensionRuntime.revokeInstallationSessionsByAuthSession(
        sessionId,
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
    clearSessionCookie() {
      deleteSessionCookie();
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

export type AuthSessionReadContext = ReturnType<
  typeof createAuthSessionReadContext
>;

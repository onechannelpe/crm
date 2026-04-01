import {
  invalidateSession,
  invalidateUserSessions,
} from "~/lib/auth/session/session-manager";
import { repos } from "~/server/shared/context";

import type { AdminSessionRevocationPort } from "../application/ports";

export function createAdminSessionRevocationPort(): AdminSessionRevocationPort {
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
    async updateExecutiveSyncHealthByUser(input) {
      await repos.extensionRuntime.updateExecutiveSyncHealthByUser(input);
    },
    async createAuditLog(input) {
      await repos.auditLogs.create(input);
    },
  };
}

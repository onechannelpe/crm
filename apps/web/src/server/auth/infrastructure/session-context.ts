import { deleteSessionCookie } from "~/lib/auth/session/cookies";
import { createUserTotpFactorsRepo } from "~/server/auth/repos-user-totp-factors";
import { createExtensionRuntimeRepo } from "~/server/extension/repos";
import { createUserChannelAddressRepo } from "~/server/notifications/repos/user-channel-address";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { createAuditLogsRepo } from "~/server/shared/repos-audit-logs";
import { createBranchSupervisorsRepo } from "~/server/users/repos-branch-supervisors";
import { createBranchesRepo } from "~/server/users/repos-branches";
import { createPasskeysRepo } from "~/server/users/repos-passkeys";
import { createTeamsRepo } from "~/server/users/repos-teams";
import { createUsersRepo } from "~/server/users/repos-users";

import type { AuthSessionLogoutPort } from "../application/ports";

interface AuthSessionRuntimeDeps {
  executor: DatabaseExecutor;
  revokeSession(sessionId: string): Promise<void>;
}

export function createAuthSessionReadContext(deps: AuthSessionRuntimeDeps) {
  const executor = deps.executor;
  return {
    repos: {
      users: createUsersRepo(executor),
      branches: createBranchesRepo(executor),
      teams: createTeamsRepo(executor),
      branchSupervisors: createBranchSupervisorsRepo(executor),
      passkeys: createPasskeysRepo(executor),
      userTotpFactors: createUserTotpFactorsRepo(executor),
      userChannelAddresses: createUserChannelAddressRepo(executor),
    },
  };
}

export function createAuthSessionLogoutContext(
  deps: AuthSessionRuntimeDeps,
): AuthSessionLogoutPort {
  const executor = deps.executor;
  const auditLogs = createAuditLogsRepo(executor);
  const extensionRuntime = createExtensionRuntimeRepo(executor);

  return {
    revokeSession(sessionId) {
      return deps.revokeSession(sessionId);
    },
    async revokeInstallationSessionsByAuthSession(sessionId, now) {
      await extensionRuntime.revokeInstallationSessionsByAuthSession(
        sessionId,
        now,
      );
    },
    async updateExecutiveSyncHealth(input) {
      await extensionRuntime.updateExecutiveSyncHealthByUser({
        user_id: input.userId,
        sync_health: input.syncHealth,
        sync_updated_at: input.syncUpdatedAt,
      });
    },
    clearSessionCookie() {
      deleteSessionCookie();
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

export type AuthSessionReadContext = ReturnType<
  typeof createAuthSessionReadContext
>;

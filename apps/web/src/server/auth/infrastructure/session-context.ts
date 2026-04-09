import { deleteSessionCookie } from "~/lib/auth/session/cookies";
import { createUserTotpFactorsRepo } from "~/server/auth/repos-user-totp-factors";
import { createExtensionRuntimeRepo } from "~/server/extension/repos";
import { serverRuntime } from "~/server/runtime";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { createAuditLogsRepo } from "~/server/shared/repos-audit-logs";
import { createBranchesRepo } from "~/server/users/repos-branches";
import { createPasskeysRepo } from "~/server/users/repos-passkeys";
import { createTeamsRepo } from "~/server/users/repos-teams";
import { createUsersRepo } from "~/server/users/repos-users";

import type { AuthSessionLogoutPort } from "../application/ports";

interface AuthSessionRuntimeDeps {
  executor: DatabaseExecutor;
  invalidateSession(sessionId: string): Promise<void>;
}

function resolveAuthSessionRuntimeDeps(
  deps?: Partial<AuthSessionRuntimeDeps>,
): AuthSessionRuntimeDeps {
  return {
    executor: deps?.executor ?? serverRuntime.infra.db,
    invalidateSession:
      deps?.invalidateSession ??
      ((sessionId: string) =>
        serverRuntime.auth.sessionService.invalidateSession(sessionId)),
  };
}

export function createAuthSessionReadContext(
  deps?: Partial<AuthSessionRuntimeDeps>,
) {
  const runtimeDeps = resolveAuthSessionRuntimeDeps(deps);
  const executor = runtimeDeps.executor;
  return {
    repos: {
      users: createUsersRepo(executor),
      branches: createBranchesRepo(executor),
      teams: createTeamsRepo(executor),
      passkeys: createPasskeysRepo(executor),
      userTotpFactors: createUserTotpFactorsRepo(executor),
    },
  };
}

export function createAuthSessionLogoutContext(
  deps?: Partial<AuthSessionRuntimeDeps>,
): AuthSessionLogoutPort {
  const runtimeDeps = resolveAuthSessionRuntimeDeps(deps);
  const executor = runtimeDeps.executor;
  const auditLogs = createAuditLogsRepo(executor);
  const extensionRuntime = createExtensionRuntimeRepo(executor);

  return {
    invalidateSession(sessionId) {
      return runtimeDeps.invalidateSession(sessionId);
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

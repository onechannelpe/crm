import { createUserTotpFactorsRepo } from "~/server/auth/repos-user-totp-factors";
import { createEventsRepo } from "~/server/event-logs/events-repo";
import { createExtensionRuntimeRepo } from "~/server/extension/repos";
import { createUserChannelAddressRepo } from "~/server/notifications/repos/user-channel-address";
import type { DatabaseExecutor } from "~/server/platform/database/executor";
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

export function createAuthSessionReadContext(executor: DatabaseExecutor) {
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
  const events = createEventsRepo(executor);
  const extensionRuntime = createExtensionRuntimeRepo(executor);

  return {
    revokeSession(sessionId) {
      return deps.revokeSession(sessionId);
    },
    async revokeInstallationSessionsByAuthSession(sessionId, revokedAt) {
      await extensionRuntime.revokeInstallationSessionsByAuthSession(
        sessionId,
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

export type AuthSessionReadContext = ReturnType<
  typeof createAuthSessionReadContext
>;

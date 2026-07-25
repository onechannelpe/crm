import { createAuthThrottleRepo } from "~/server/auth/repos-auth-throttle";
import { createUserRecoveryCodesRepo } from "~/server/auth/repos-user-recovery-codes";
import { createUserTotpFactorsRepo } from "~/server/auth/repos-user-totp-factors";
import { createEventsRepo } from "~/server/event-logs/events-repo";
import { createUserChannelAddressRepo } from "~/server/notifications/repos/user-channel-address";
import type { DatabaseExecutor } from "~/server/platform/database/executor";
import { createExecutorUow } from "~/server/platform/database/uow";
import { createSessionRepository } from "~/server/sessions/repos-sessions";
import { createPasskeysRepo } from "~/server/users/repos-passkeys";
import { createUsersRepo } from "~/server/users/repos-users";
import { createWebauthnChallengesRepo } from "~/server/users/repos-webauthn-challenges";

export type AuthSetupRepos = ReturnType<typeof createAuthSetupRepos>;

function createAuthSetupRepos(executor: DatabaseExecutor) {
  return {
    users: createUsersRepo(executor),
    sessions: createSessionRepository(executor),
    passkeys: createPasskeysRepo(executor),
    webauthnChallenges: createWebauthnChallengesRepo(executor),
    events: createEventsRepo(executor),
    authThrottle: createAuthThrottleRepo(executor),
    userTotpFactors: createUserTotpFactorsRepo(executor),
    userRecoveryCodes: createUserRecoveryCodesRepo(executor),
    userChannelAddresses: createUserChannelAddressRepo(executor),
  };
}

export function createAuthSetupContext(executor: DatabaseExecutor) {
  return {
    repos: createAuthSetupRepos(executor),
    uow: createExecutorUow(executor, createAuthSetupRepos),
  };
}

export type AuthSetupContext = ReturnType<typeof createAuthSetupContext>;

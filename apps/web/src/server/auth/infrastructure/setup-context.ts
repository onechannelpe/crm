import { createAuthThrottleRepo } from "~/server/auth/repos-auth-throttle";
import { createUserRecoveryCodesRepo } from "~/server/auth/repos-user-recovery-codes";
import { createUserTotpFactorsRepo } from "~/server/auth/repos-user-totp-factors";
import { createUserChannelAddressRepo } from "~/server/notifications/repos/user-channel-address";
import { createSessionRepository } from "~/server/sessions/repos-sessions";
import { createExecutorUow } from "~/server/shared/application/uow";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { createEventsRepo } from "~/server/shared/repos-events";
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

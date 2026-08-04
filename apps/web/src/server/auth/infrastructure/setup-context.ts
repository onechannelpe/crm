import type { Kysely, Transaction } from "kysely";

import { createAuthThrottleRepo } from "~/server/auth/repos-auth-throttle";
import { createUserRecoveryCodesRepo } from "~/server/auth/repos-user-recovery-codes";
import { createUserTotpFactorsRepo } from "~/server/auth/repos-user-totp-factors";
import { createEventsWriter } from "~/server/event-logs/events-repo";
import { createUserChannelAddressRepo } from "~/server/notifications/repos/user-channel-address";
import type { DatabaseExecutor } from "~/server/platform/database/executor";
import type { Database } from "~/server/platform/database/types";
import { createExecutorUow } from "~/server/platform/database/uow";
import { createSessionRepository } from "~/server/sessions/repos-sessions";
import { createPasskeysRepo } from "~/server/users/repos-passkeys";
import { createUsersRepo } from "~/server/users/repos-users";
import { createWebauthnChallengesRepo } from "~/server/users/repos-webauthn-challenges";

export type AuthSetupRepos = ReturnType<typeof createAuthSetupTransactionRepos>;

function createAuthSetupBaseRepos(executor: DatabaseExecutor) {
  return {
    users: createUsersRepo(executor),
    sessions: createSessionRepository(executor),
    passkeys: createPasskeysRepo(executor),
    webauthnChallenges: createWebauthnChallengesRepo(executor),
    authThrottle: createAuthThrottleRepo(executor),
    userTotpFactors: createUserTotpFactorsRepo(executor),
    userRecoveryCodes: createUserRecoveryCodesRepo(executor),
    userChannelAddresses: createUserChannelAddressRepo(executor),
  };
}

function createAuthSetupTransactionRepos(tx: Transaction<Database>) {
  return {
    ...createAuthSetupBaseRepos(tx),
    events: createEventsWriter(tx),
  };
}

export function createAuthSetupContext(executor: Kysely<Database>) {
  return {
    repos: createAuthSetupBaseRepos(executor),
    uow: createExecutorUow(executor, createAuthSetupTransactionRepos),
  };
}

export type AuthSetupContext = ReturnType<typeof createAuthSetupContext>;

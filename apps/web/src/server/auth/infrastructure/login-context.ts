import type { Kysely, Transaction } from "kysely";

import type { AuthLoginRepos } from "~/server/auth/flows/login-deps";
import { createAuthEventsRepo } from "~/server/auth/repos-auth-events";
import { createAuthThrottleRepo } from "~/server/auth/repos-auth-throttle";
import { createLoginFlowsRepo } from "~/server/auth/repos-login-flows";
import { createOAuthAccountsRepo } from "~/server/auth/repos-oauth-accounts";
import { createUserRecoveryCodesRepo } from "~/server/auth/repos-user-recovery-codes";
import { createUserTotpFactorsRepo } from "~/server/auth/repos-user-totp-factors";
import { createEventsWriter } from "~/server/event-logs/events-repo";
import type { DatabaseExecutor } from "~/server/platform/database/executor";
import type { Database } from "~/server/platform/database/types";
import { createExecutorUow } from "~/server/platform/database/uow";
import { createSessionRepository } from "~/server/sessions/repos-sessions";
import { createPasskeysRepo } from "~/server/users/repos-passkeys";
import { createUsersRepo } from "~/server/users/repos-users";
import { createWebauthnChallengesRepo } from "~/server/users/repos-webauthn-challenges";

function createAuthLoginBaseRepos(executor: DatabaseExecutor) {
  return {
    oauthAccounts: createOAuthAccountsRepo(executor),
    loginFlows: createLoginFlowsRepo(executor),
    users: createUsersRepo(executor),
    sessions: createSessionRepository(executor),
    authThrottle: createAuthThrottleRepo(executor),
    authEvents: createAuthEventsRepo(executor),
    userTotpFactors: createUserTotpFactorsRepo(executor),
    userRecoveryCodes: createUserRecoveryCodesRepo(executor),
    passkeys: createPasskeysRepo(executor),
    webauthnChallenges: createWebauthnChallengesRepo(executor),
  };
}

function createAuthLoginTransactionRepos(
  tx: Transaction<Database>,
): AuthLoginRepos {
  return {
    ...createAuthLoginBaseRepos(tx),
    events: createEventsWriter(tx),
  };
}

export function createAuthLoginContext(executor: Kysely<Database>) {
  return {
    repos: createAuthLoginBaseRepos(executor),
    uow: createExecutorUow(executor, createAuthLoginTransactionRepos),
  };
}

export type AuthLoginContext = ReturnType<typeof createAuthLoginContext>;

import type { AuthLoginRepos } from "~/server/auth/flows/login-deps";
import { createAuthEventsRepo } from "~/server/auth/repos-auth-events";
import { createAuthThrottleRepo } from "~/server/auth/repos-auth-throttle";
import { createLoginFlowsRepo } from "~/server/auth/repos-login-flows";
import { createOAuthAccountsRepo } from "~/server/auth/repos-oauth-accounts";
import { createUserRecoveryCodesRepo } from "~/server/auth/repos-user-recovery-codes";
import { createUserTotpFactorsRepo } from "~/server/auth/repos-user-totp-factors";
import { enqueueNotifications } from "~/server/notifications/intent/enqueue";
import { createSessionRepository } from "~/server/sessions/repos-sessions";
import { createExecutorUow } from "~/server/shared/application/uow";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { createEventsRepo } from "~/server/shared/repos-events";
import type { Clock } from "~/server/shared/time";
import { createPasskeysRepo } from "~/server/users/repos-passkeys";
import { createUsersRepo } from "~/server/users/repos-users";
import { createWebauthnChallengesRepo } from "~/server/users/repos-webauthn-challenges";

function createAuthLoginRepos(executor: DatabaseExecutor): AuthLoginRepos {
  return {
    oauthAccounts: createOAuthAccountsRepo(executor),
    loginFlows: createLoginFlowsRepo(executor),
    users: createUsersRepo(executor),
    sessions: createSessionRepository(executor),
    events: createEventsRepo(executor),
    authThrottle: createAuthThrottleRepo(executor),
    authEvents: createAuthEventsRepo(executor),
    userTotpFactors: createUserTotpFactorsRepo(executor),
    userRecoveryCodes: createUserRecoveryCodesRepo(executor),
    passkeys: createPasskeysRepo(executor),
    webauthnChallenges: createWebauthnChallengesRepo(executor),
    notificationIntents: {
      enqueue: (intents, occurredAt) =>
        enqueueNotifications(executor, intents, occurredAt),
    },
  };
}

export function createAuthLoginContext(
  executor: DatabaseExecutor,
  now: Clock = () => new Date(),
) {
  return {
    now,
    repos: createAuthLoginRepos(executor),
    uow: createExecutorUow(executor, createAuthLoginRepos),
  };
}

export type AuthLoginContext = ReturnType<typeof createAuthLoginContext>;

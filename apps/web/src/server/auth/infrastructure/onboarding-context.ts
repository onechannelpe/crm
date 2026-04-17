import { createAuthEventsRepo } from "~/server/auth/repos-auth-events";
import { createAuthThrottleRepo } from "~/server/auth/repos-auth-throttle";
import { createLoginFlowsRepo } from "~/server/auth/repos-login-flows";
import { createUserTotpFactorsRepo } from "~/server/auth/repos-user-totp-factors";
import { createNotificationContactRepo } from "~/server/notifications/repos/contact";
import { createNotificationPreferenceRepo } from "~/server/notifications/repos/preference";
import { createSessionRepository } from "~/server/sessions/repos-sessions";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { createAuditLogsRepo } from "~/server/shared/repos-audit-logs";
import type { RepositoryTransactionRunner } from "~/server/shared/transaction";
import { createPasskeysRepo } from "~/server/users/repos-passkeys";
import { createUsersRepo } from "~/server/users/repos-users";
import { createWebauthnChallengesRepo } from "~/server/users/repos-webauthn-challenges";

export type AuthOnboardingRepos = {
  users: ReturnType<typeof createUsersRepo>;
  sessions: ReturnType<typeof createSessionRepository>;
  loginFlows: ReturnType<typeof createLoginFlowsRepo>;
  passkeys: ReturnType<typeof createPasskeysRepo>;
  webauthnChallenges: ReturnType<typeof createWebauthnChallengesRepo>;
  auditLogs: ReturnType<typeof createAuditLogsRepo>;
  authThrottle: ReturnType<typeof createAuthThrottleRepo>;
  authEvents: ReturnType<typeof createAuthEventsRepo>;
  userTotpFactors: ReturnType<typeof createUserTotpFactorsRepo>;
  notificationContacts: ReturnType<typeof createNotificationContactRepo>;
  notificationPreferences: ReturnType<typeof createNotificationPreferenceRepo>;
};

function createAuthOnboardingRepos(
  executor: DatabaseExecutor,
): AuthOnboardingRepos {
  return {
    users: createUsersRepo(executor),
    sessions: createSessionRepository(executor),
    loginFlows: createLoginFlowsRepo(executor),
    passkeys: createPasskeysRepo(executor),
    webauthnChallenges: createWebauthnChallengesRepo(executor),
    auditLogs: createAuditLogsRepo(executor),
    authThrottle: createAuthThrottleRepo(executor),
    authEvents: createAuthEventsRepo(executor),
    userTotpFactors: createUserTotpFactorsRepo(executor),
    notificationContacts: createNotificationContactRepo(executor),
    notificationPreferences: createNotificationPreferenceRepo(executor),
  };
}

export function createAuthOnboardingContext(executor: DatabaseExecutor) {
  const runInRepositoryTransaction: RepositoryTransactionRunner<
    AuthOnboardingRepos
  > = (operation) =>
    executor
      .transaction()
      .execute((transactionDb) =>
        operation(createAuthOnboardingRepos(transactionDb)),
      );

  return {
    repos: createAuthOnboardingRepos(executor),
    runInRepositoryTransaction,
  };
}

export type AuthOnboardingContext = ReturnType<
  typeof createAuthOnboardingContext
>;

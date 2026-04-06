import { db } from "~/lib/db/db";
import { createAuthEventsRepo } from "~/server/auth/repos-auth-events";
import { createAuthThrottleRepo } from "~/server/auth/repos-auth-throttle";
import { createLoginFlowsRepo } from "~/server/auth/repos-login-flows";
import { createUserTotpFactorsRepo } from "~/server/auth/repos-user-totp-factors";
import { createNotificationContactsRepo } from "~/server/notifications/repos-contacts";
import { createNotificationPreferencesRepo } from "~/server/notifications/repos-preferences";
import { createSessionRepository } from "~/server/sessions/repos-sessions";
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
  notificationContacts: ReturnType<typeof createNotificationContactsRepo>;
  notificationPreferences: ReturnType<typeof createNotificationPreferencesRepo>;
};

function createAuthOnboardingRepos(currentDb: typeof db): AuthOnboardingRepos {
  return {
    users: createUsersRepo(currentDb),
    sessions: createSessionRepository(currentDb),
    loginFlows: createLoginFlowsRepo(currentDb),
    passkeys: createPasskeysRepo(currentDb),
    webauthnChallenges: createWebauthnChallengesRepo(currentDb),
    auditLogs: createAuditLogsRepo(currentDb),
    authThrottle: createAuthThrottleRepo(currentDb),
    authEvents: createAuthEventsRepo(currentDb),
    userTotpFactors: createUserTotpFactorsRepo(currentDb),
    notificationContacts: createNotificationContactsRepo(currentDb),
    notificationPreferences: createNotificationPreferencesRepo(currentDb),
  };
}

const runInRepositoryTransaction: RepositoryTransactionRunner<
  AuthOnboardingRepos
> = (operation) =>
  db
    .transaction()
    .execute((transactionDb) =>
      operation(createAuthOnboardingRepos(transactionDb)),
    );

export function createAuthOnboardingContext() {
  return {
    repos: createAuthOnboardingRepos(db),
    runInRepositoryTransaction,
  };
}

export type AuthOnboardingContext = ReturnType<
  typeof createAuthOnboardingContext
>;

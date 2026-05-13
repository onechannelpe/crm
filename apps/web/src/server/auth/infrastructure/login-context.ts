import { createPrivilegedLoginAlertSender } from "~/lib/auth/security/login-alerts";
import { createAuthEventsRepo } from "~/server/auth/repos-auth-events";
import { createAuthThrottleRepo } from "~/server/auth/repos-auth-throttle";
import { createLoginFlowsRepo } from "~/server/auth/repos-login-flows";
import { createOAuthAccountsRepo } from "~/server/auth/repos-oauth-accounts";
import {
  createUserTotpFactorsRepo,
  createUserTotpRecoveryCodesRepo,
} from "~/server/auth/repos-user-totp-factors";
import type { AuthLoginDeps } from "~/server/auth/application/login-deps";
import type { NotificationIntent } from "~/server/notifications/types";
import { createSessionRepository } from "~/server/sessions/repos-sessions";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { createAuditLogsRepo } from "~/server/shared/repos-audit-logs";
import { createPasskeysRepo } from "~/server/users/repos-passkeys";
import { createUsersRepo } from "~/server/users/repos-users";
import { createWebauthnChallengesRepo } from "~/server/users/repos-webauthn-challenges";

export function createAuthLoginContext(
  executor: DatabaseExecutor,
  notifications: {
    enqueue(intents: NotificationIntent[], now?: number): Promise<void>;
    dispatchPendingJobs(): Promise<void>;
  },
) {
  return {
    repos: {
      oauthAccounts: createOAuthAccountsRepo(executor),
      loginFlows: createLoginFlowsRepo(executor),
      users: createUsersRepo(executor),
      sessions: createSessionRepository(executor),
      auditLogs: createAuditLogsRepo(executor),
      authThrottle: createAuthThrottleRepo(executor),
      authEvents: createAuthEventsRepo(executor),
      userTotpFactors: createUserTotpFactorsRepo(executor),
      userTotpRecoveryCodes: createUserTotpRecoveryCodesRepo(executor),
      passkeys: createPasskeysRepo(executor),
      webauthnChallenges: createWebauthnChallengesRepo(executor),
    } satisfies AuthLoginDeps,
    privilegedLoginAlertSender: createPrivilegedLoginAlertSender(notifications),
  };
}

export type AuthLoginContext = ReturnType<typeof createAuthLoginContext>;

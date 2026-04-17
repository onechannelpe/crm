import { createPrivilegedLoginAlertSender } from "~/lib/auth/security/login-alerts";
import { createAuthEventsRepo } from "~/server/auth/repos-auth-events";
import { createAuthThrottleRepo } from "~/server/auth/repos-auth-throttle";
import { createLoginFlowsRepo } from "~/server/auth/repos-login-flows";
import { createOAuthAccountsRepo } from "~/server/auth/repos-oauth-accounts";
import {
  createUserTotpFactorsRepo,
  createUserTotpRecoveryCodesRepo,
} from "~/server/auth/repos-user-totp-factors";
import type { NotificationService } from "~/server/notifications/service";
import { createSessionRepository } from "~/server/sessions/repos-sessions";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { createAuditLogsRepo } from "~/server/shared/repos-audit-logs";
import { createPasskeysRepo } from "~/server/users/repos-passkeys";
import { createUsersRepo } from "~/server/users/repos-users";
import { createWebauthnChallengesRepo } from "~/server/users/repos-webauthn-challenges";

export type AuthLoginRepos = {
  oauthAccounts: ReturnType<typeof createOAuthAccountsRepo>;
  loginFlows: ReturnType<typeof createLoginFlowsRepo>;
  users: ReturnType<typeof createUsersRepo>;
  sessions: ReturnType<typeof createSessionRepository>;
  auditLogs: ReturnType<typeof createAuditLogsRepo>;
  authThrottle: ReturnType<typeof createAuthThrottleRepo>;
  authEvents: ReturnType<typeof createAuthEventsRepo>;
  userTotpFactors: ReturnType<typeof createUserTotpFactorsRepo>;
  userTotpRecoveryCodes: ReturnType<typeof createUserTotpRecoveryCodesRepo>;
  passkeys: ReturnType<typeof createPasskeysRepo>;
  webauthnChallenges: ReturnType<typeof createWebauthnChallengesRepo>;
};

export function createAuthLoginContext(
  executor: DatabaseExecutor,
  notifications: {
    service: Pick<
      NotificationService,
      "publishCampaign" | "enqueueDueCampaigns"
    >;
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
    } satisfies AuthLoginRepos,
    privilegedLoginAlertSender: createPrivilegedLoginAlertSender(notifications),
  };
}

export type AuthLoginContext = ReturnType<typeof createAuthLoginContext>;

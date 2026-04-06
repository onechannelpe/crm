import { createPrivilegedLoginAlertSender } from "~/lib/auth/security/login-alerts";
import { db } from "~/lib/db/db";
import { env } from "~/lib/env";
import { createAuthEventsRepo } from "~/server/auth/repos-auth-events";
import { createAuthThrottleRepo } from "~/server/auth/repos-auth-throttle";
import { createLoginFlowsRepo } from "~/server/auth/repos-login-flows";
import { createOAuthAccountsRepo } from "~/server/auth/repos-oauth-accounts";
import {
  createUserTotpFactorsRepo,
  createUserTotpRecoveryCodesRepo,
} from "~/server/auth/repos-user-totp-factors";
import { createNotificationCampaignsRepo } from "~/server/notifications/repos-campaigns";
import { createNotificationContactsRepo } from "~/server/notifications/repos-contacts";
import { createNotificationPreferencesRepo } from "~/server/notifications/repos-preferences";
import { createSessionRepository } from "~/server/sessions/repos-sessions";
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

export function createAuthLoginContext() {
  return {
    repos: {
      oauthAccounts: createOAuthAccountsRepo(db),
      loginFlows: createLoginFlowsRepo(db),
      users: createUsersRepo(db),
      sessions: createSessionRepository(db),
      auditLogs: createAuditLogsRepo(db),
      authThrottle: createAuthThrottleRepo(db),
      authEvents: createAuthEventsRepo(db),
      userTotpFactors: createUserTotpFactorsRepo(db),
      userTotpRecoveryCodes: createUserTotpRecoveryCodesRepo(db),
      passkeys: createPasskeysRepo(db),
      webauthnChallenges: createWebauthnChallengesRepo(db),
    } satisfies AuthLoginRepos,
    privilegedLoginAlertSender: createPrivilegedLoginAlertSender(
      {
        notificationCampaigns: createNotificationCampaignsRepo(db),
        notificationContacts: createNotificationContactsRepo(db),
        notificationPreferences: createNotificationPreferencesRepo(db),
      },
      {
        resendApiKey: env.resendApiKey || undefined,
        fromEmail: env.emailFrom || undefined,
        whatsappAccessToken: env.whatsappAccessToken || undefined,
        whatsappPhoneNumberId: env.whatsappPhoneNumberId || undefined,
        whatsappApiVersion: env.whatsappApiVersion || undefined,
      },
    ),
  };
}

export type AuthLoginContext = ReturnType<typeof createAuthLoginContext>;

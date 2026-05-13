import { createAuthEventsRepo } from "~/server/auth/repos-auth-events";
import { createAuthThrottleRepo } from "~/server/auth/repos-auth-throttle";
import { createLoginFlowsRepo } from "~/server/auth/repos-login-flows";
import { createOAuthAccountsRepo } from "~/server/auth/repos-oauth-accounts";
import {
  createUserTotpFactorsRepo,
  createUserTotpRecoveryCodesRepo,
} from "~/server/auth/repos-user-totp-factors";
import { createSessionRepository } from "~/server/sessions/repos-sessions";
import { createAuditLogsRepo } from "~/server/shared/repos-audit-logs";
import { createPasskeysRepo } from "~/server/users/repos-passkeys";
import { createUsersRepo } from "~/server/users/repos-users";
import { createWebauthnChallengesRepo } from "~/server/users/repos-webauthn-challenges";

export type AuthLoginDeps = {
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

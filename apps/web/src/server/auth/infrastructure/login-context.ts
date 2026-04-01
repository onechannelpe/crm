import { privilegedLoginAlertSender, repos } from "~/server/shared/context";
import type { Repositories } from "~/server/shared/registry";

export type AuthLoginRepos = Pick<
  Repositories,
  | "oauthAccounts"
  | "loginFlows"
  | "users"
  | "sessions"
  | "auditLogs"
  | "authThrottle"
  | "authEvents"
  | "userTotpFactors"
  | "userTotpRecoveryCodes"
  | "passkeys"
  | "webauthnChallenges"
>;

export function createAuthLoginContext() {
  return {
    repos: {
      oauthAccounts: repos.oauthAccounts,
      loginFlows: repos.loginFlows,
      users: repos.users,
      sessions: repos.sessions,
      auditLogs: repos.auditLogs,
      authThrottle: repos.authThrottle,
      authEvents: repos.authEvents,
      userTotpFactors: repos.userTotpFactors,
      userTotpRecoveryCodes: repos.userTotpRecoveryCodes,
      passkeys: repos.passkeys,
      webauthnChallenges: repos.webauthnChallenges,
    } satisfies AuthLoginRepos,
    privilegedLoginAlertSender,
  };
}

export type AuthLoginContext = ReturnType<typeof createAuthLoginContext>;

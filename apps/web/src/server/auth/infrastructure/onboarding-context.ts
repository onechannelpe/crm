import { repos, runInRepositoryTransaction } from "~/server/shared/context";
import type { Repositories } from "~/server/shared/registry";

export type AuthOnboardingRepos = Pick<
  Repositories,
  | "users"
  | "sessions"
  | "loginFlows"
  | "passkeys"
  | "webauthnChallenges"
  | "auditLogs"
  | "authThrottle"
  | "authEvents"
  | "userTotpFactors"
>;

export function createAuthOnboardingContext() {
  return {
    repos: {
      users: repos.users,
      sessions: repos.sessions,
      loginFlows: repos.loginFlows,
      passkeys: repos.passkeys,
      webauthnChallenges: repos.webauthnChallenges,
      auditLogs: repos.auditLogs,
      authThrottle: repos.authThrottle,
      authEvents: repos.authEvents,
      userTotpFactors: repos.userTotpFactors,
    } satisfies AuthOnboardingRepos,
    runInRepositoryTransaction,
  };
}

export type AuthOnboardingContext = ReturnType<
  typeof createAuthOnboardingContext
>;

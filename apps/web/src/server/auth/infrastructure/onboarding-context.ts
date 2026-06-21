import { createAuthEventsRepo } from "~/server/auth/repos-auth-events";
import { createAuthThrottleRepo } from "~/server/auth/repos-auth-throttle";
import { createLoginFlowsRepo } from "~/server/auth/repos-login-flows";
import { createUserTotpFactorsRepo } from "~/server/auth/repos-user-totp-factors";
import { createNotificationPreferenceRepo } from "~/server/notifications/repos/preference";
import { createUserChannelAddressRepo } from "~/server/notifications/repos/user-channel-address";
import { createSessionRepository } from "~/server/sessions/repos-sessions";
import { createExecutorUow } from "~/server/shared/application/uow";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { createEventsRepo } from "~/server/shared/repos-events";
import { createPasskeysRepo } from "~/server/users/repos-passkeys";
import { createUsersRepo } from "~/server/users/repos-users";
import { createWebauthnChallengesRepo } from "~/server/users/repos-webauthn-challenges";

export type AuthOnboardingRepos = {
  users: ReturnType<typeof createUsersRepo>;
  sessions: ReturnType<typeof createSessionRepository>;
  loginFlows: ReturnType<typeof createLoginFlowsRepo>;
  passkeys: ReturnType<typeof createPasskeysRepo>;
  webauthnChallenges: ReturnType<typeof createWebauthnChallengesRepo>;
  events: ReturnType<typeof createEventsRepo>;
  authThrottle: ReturnType<typeof createAuthThrottleRepo>;
  authEvents: ReturnType<typeof createAuthEventsRepo>;
  userTotpFactors: ReturnType<typeof createUserTotpFactorsRepo>;
  userChannelAddresses: ReturnType<typeof createUserChannelAddressRepo>;
  notificationPreferences: ReturnType<typeof createNotificationPreferenceRepo>;
};

export function createAuthOnboardingContext(executor: DatabaseExecutor) {
  const repos: AuthOnboardingRepos = {
    users: createUsersRepo(executor),
    sessions: createSessionRepository(executor),
    loginFlows: createLoginFlowsRepo(executor),
    passkeys: createPasskeysRepo(executor),
    webauthnChallenges: createWebauthnChallengesRepo(executor),
    events: createEventsRepo(executor),
    authThrottle: createAuthThrottleRepo(executor),
    authEvents: createAuthEventsRepo(executor),
    userTotpFactors: createUserTotpFactorsRepo(executor),
    userChannelAddresses: createUserChannelAddressRepo(executor),
    notificationPreferences: createNotificationPreferenceRepo(executor),
  };

  return {
    repos,
    uow: createExecutorUow(
      executor,
      (txDb): AuthOnboardingRepos => ({
        users: createUsersRepo(txDb),
        sessions: createSessionRepository(txDb),
        loginFlows: createLoginFlowsRepo(txDb),
        passkeys: createPasskeysRepo(txDb),
        webauthnChallenges: createWebauthnChallengesRepo(txDb),
        events: createEventsRepo(txDb),
        authThrottle: createAuthThrottleRepo(txDb),
        authEvents: createAuthEventsRepo(txDb),
        userTotpFactors: createUserTotpFactorsRepo(txDb),
        userChannelAddresses: createUserChannelAddressRepo(txDb),
        notificationPreferences: createNotificationPreferenceRepo(txDb),
      }),
    ),
  };
}

export type AuthOnboardingContext = ReturnType<
  typeof createAuthOnboardingContext
>;

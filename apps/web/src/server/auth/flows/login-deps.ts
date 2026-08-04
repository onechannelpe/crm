import type { AuthEventsRepo } from "~/server/auth/repos-auth-events";
import type { AuthThrottleRepo } from "~/server/auth/repos-auth-throttle";
import type { LoginFlowsRepo } from "~/server/auth/repos-login-flows";
import type { OAuthAccountsRepo } from "~/server/auth/repos-oauth-accounts";
import { type UserRecoveryCodesRepo } from "~/server/auth/repos-user-recovery-codes";
import { type UserTotpFactorsRepo } from "~/server/auth/repos-user-totp-factors";
import type { EventsWriter } from "~/server/event-logs/events-repo";
import type { NotificationIntent } from "~/server/notifications/types";
import type { SessionRepository } from "~/server/sessions/repos-sessions";
import type { PasskeysRepo } from "~/server/users/repos-passkeys";
import type { UsersRepo } from "~/server/users/repos-users";
import type { WebauthnChallengesRepo } from "~/server/users/repos-webauthn-challenges";

export type AuthLoginRepos = {
  oauthAccounts: OAuthAccountsRepo;
  loginFlows: LoginFlowsRepo;
  users: UsersRepo;
  sessions: SessionRepository;
  events: EventsWriter;
  authThrottle: AuthThrottleRepo;
  authEvents: AuthEventsRepo;
  userTotpFactors: UserTotpFactorsRepo;
  userRecoveryCodes: UserRecoveryCodesRepo;
  passkeys: PasskeysRepo;
  webauthnChallenges: WebauthnChallengesRepo;
  notificationIntents: {
    enqueue(intents: NotificationIntent[], occurredAt: Date): Promise<void>;
  };
};

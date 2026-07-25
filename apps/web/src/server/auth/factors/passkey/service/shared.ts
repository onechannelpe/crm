import type { AuthEventsRepo } from "~/server/auth/repos-auth-events";
import type { AuthThrottleRepo } from "~/server/auth/repos-auth-throttle";
import type { LoginFlowsRepo } from "~/server/auth/repos-login-flows";
import type { UserTotpFactorsRepo } from "~/server/auth/repos-user-totp-factors";
import type { EventsRepo } from "~/server/event-logs/events-repo";
import type { SessionRepository } from "~/server/sessions/repos-sessions";
import type { PasskeysRepo } from "~/server/users/repos-passkeys";
import type { UsersRepo } from "~/server/users/repos-users";
import type { WebauthnChallengesRepo } from "~/server/users/repos-webauthn-challenges";

export type PasskeyAuthRepos = {
  users: UsersRepo;
  sessions: SessionRepository;
  loginFlows: LoginFlowsRepo;
  passkeys: PasskeysRepo;
  webauthnChallenges: WebauthnChallengesRepo;
  events: EventsRepo;
  authThrottle: AuthThrottleRepo;
  authEvents: AuthEventsRepo;
  userTotpFactors: UserTotpFactorsRepo;
};

import type { AuthEventsRepo } from "~/server/auth/repos-auth-events";
import type { AuthThrottleRepo } from "~/server/auth/repos-auth-throttle";
import type { LoginFlowsRepo } from "~/server/auth/repos-login-flows";
import type { OAuthAccountsRepo } from "~/server/auth/repos-oauth-accounts";
import { type UserRecoveryCodesRepo } from "~/server/auth/repos-user-recovery-codes";
import { type UserTotpFactorsRepo } from "~/server/auth/repos-user-totp-factors";
import type { SessionRepository } from "~/server/sessions/repos-sessions";
import type { EventsRepo } from "~/server/shared/repos-events";
import type { PasskeysRepo } from "~/server/users/repos-passkeys";
import type { UsersRepo } from "~/server/users/repos-users";
import type { WebauthnChallengesRepo } from "~/server/users/repos-webauthn-challenges";

export type AuthLoginDeps = {
  oauthAccounts: OAuthAccountsRepo;
  loginFlows: LoginFlowsRepo;
  users: UsersRepo;
  sessions: SessionRepository;
  events: EventsRepo;
  authThrottle: AuthThrottleRepo;
  authEvents: AuthEventsRepo;
  userTotpFactors: UserTotpFactorsRepo;
  userRecoveryCodes: UserRecoveryCodesRepo;
  passkeys: PasskeysRepo;
  webauthnChallenges: WebauthnChallengesRepo;
};

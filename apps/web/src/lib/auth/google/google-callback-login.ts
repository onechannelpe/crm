import type { SendPrivilegedLoginAlert } from "~/lib/auth/security/privileged-login-alert";
import type { createAuthEventsRepo } from "~/server/auth/repos-auth-events";
import type { createAuthThrottleRepo } from "~/server/auth/repos-auth-throttle";
import type { createLoginFlowsRepo } from "~/server/auth/repos-login-flows";
import type { createOAuthAccountsRepo } from "~/server/auth/repos-oauth-accounts";
import type {
  createUserTotpFactorsRepo,
  createUserTotpRecoveryCodesRepo,
} from "~/server/auth/repos-user-totp-factors";
import { submitGoogleLogin } from "~/server/features/auth/application/login/primary";
import type { createSessionRepository } from "~/server/sessions/repos-sessions";
import type { createAuditLogsRepo } from "~/server/shared/repos-audit-logs";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";
import type { createPasskeysRepo } from "~/server/users/repos-passkeys";
import type { createUsersRepo } from "~/server/users/repos-users";
import type { createWebauthnChallengesRepo } from "~/server/users/repos-webauthn-challenges";

import { authenticateGoogleAuthorizationCode } from "./google-oauth";

type GoogleCallbackDeps = {
  oauthAccounts: ReturnType<typeof createOAuthAccountsRepo>;
  users: ReturnType<typeof createUsersRepo>;
  loginFlows: ReturnType<typeof createLoginFlowsRepo>;
  sessions: ReturnType<typeof createSessionRepository>;
  auditLogs: ReturnType<typeof createAuditLogsRepo>;
  authThrottle: ReturnType<typeof createAuthThrottleRepo>;
  authEvents: ReturnType<typeof createAuthEventsRepo>;
  userTotpFactors: ReturnType<typeof createUserTotpFactorsRepo>;
  userTotpRecoveryCodes: ReturnType<typeof createUserTotpRecoveryCodesRepo>;
  passkeys: ReturnType<typeof createPasskeysRepo>;
  webauthnChallenges: ReturnType<typeof createWebauthnChallengesRepo>;
};

export type CompleteGoogleOAuthCallbackError =
  | { kind: "bad_request" }
  | {
      kind: "redirect_to_login";
      error: "google_not_linked" | "strong_auth_required";
    };

export interface CompleteGoogleOAuthCallbackSuccess {
  redirectPath:
    | "/"
    | "/onboarding"
    | `/login/verify?flow=${number}`
    | `/login/passkey?flow=${number}`;
  sessionToken: string | null;
}

export async function completeGoogleOAuthCallback(
  input: {
    code: string | null;
    state: string | null;
    storedState: string | null;
    codeVerifier: string | null;
    ipAddress: string;
    userAgent: string | null;
  },
  deps: GoogleCallbackDeps,
  sendPrivilegedLoginAlert: SendPrivilegedLoginAlert,
): Promise<
  Result<CompleteGoogleOAuthCallbackSuccess, CompleteGoogleOAuthCallbackError>
> {
  if (
    !input.code ||
    !input.state ||
    !input.storedState ||
    !input.codeVerifier
  ) {
    return Err({ kind: "bad_request" });
  }

  if (input.state !== input.storedState) {
    return Err({ kind: "bad_request" });
  }

  const googleProfile = await authenticateGoogleAuthorizationCode({
    code: input.code,
    codeVerifier: input.codeVerifier,
  });
  if (isErr(googleProfile)) {
    return Err({ kind: "bad_request" });
  }

  const oauthAccount = await deps.oauthAccounts.findByProvider(
    "google",
    googleProfile.value.sub,
  );
  if (!oauthAccount) {
    return Err({ kind: "redirect_to_login", error: "google_not_linked" });
  }

  const user = await deps.users.findById(oauthAccount.user_id);
  if (!user || !user.is_active) {
    return Err({ kind: "redirect_to_login", error: "google_not_linked" });
  }

  const loginResult = await submitGoogleLogin(
    {
      userId: user.id,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      trustedFederatedMfa: false,
    },
    deps,
    sendPrivilegedLoginAlert,
  );

  if (isErr(loginResult)) {
    if (loginResult.error.kind === "unexpected") {
      throw new Error(loginResult.error.message);
    }

    return Err({
      kind: "redirect_to_login",
      error:
        loginResult.error.kind === "strong_auth_required"
          ? "strong_auth_required"
          : "google_not_linked",
    });
  }

  if (loginResult.value.kind === "totp_required") {
    return Ok({
      redirectPath: `/login/verify?flow=${loginResult.value.flow.id}`,
      sessionToken: null,
    });
  }

  if (loginResult.value.kind === "passkey_required") {
    return Ok({
      redirectPath: `/login/passkey?flow=${loginResult.value.flow.id}`,
      sessionToken: null,
    });
  }

  return Ok({
    redirectPath: loginResult.value.result.onboardingCompleted
      ? "/"
      : "/onboarding",
    sessionToken: loginResult.value.result.token,
  });
}

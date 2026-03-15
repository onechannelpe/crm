import type { SendPrivilegedLoginAlert } from "~/lib/auth/security/privileged-login-alert";
import type { Repositories } from "~/server/shared/registry";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

import { submitGoogleLogin } from "../login-flow";
import { authenticateGoogleAuthorizationCode } from "./google-oauth";

type GoogleCallbackDeps = Pick<
  Repositories,
  | "oauthAccounts"
  | "users"
  | "loginFlows"
  | "sessions"
  | "auditLogs"
  | "authThrottle"
  | "authEvents"
  | "userTotpFactors"
  | "userTotpRecoveryCodes"
  | "passkeys"
  | "webauthnChallenges"
>;

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

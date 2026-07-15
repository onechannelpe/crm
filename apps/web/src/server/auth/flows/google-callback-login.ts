import { getSessionPath } from "~/lib/auth/access/route-policy";
import { loadActiveAuthContextForUser } from "~/lib/auth/context/auth-context";
import { authenticateGoogleAuthorizationCode } from "~/lib/auth/google/google-oauth";
import type { WebauthnProvider } from "~/server/auth/factors/passkey-provider";
import type { AuthLoginContext } from "~/server/auth/infrastructure/login-context";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

import { completePrimaryAuthProof } from "./primary-login";

export type CompleteGoogleOAuthCallbackError =
  | { kind: "bad_request" }
  | {
      kind: "redirect_to_login";
      error: "google_not_linked" | "strong_auth_required";
    };

export interface CompleteGoogleOAuthCallbackSuccess {
  redirectPath: string;
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
  deps: AuthLoginContext,
  webauthnProvider: WebauthnProvider,
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

  const oauthAccount = await deps.repos.oauthAccounts.findByProvider(
    "google",
    googleProfile.value.sub,
  );
  if (!oauthAccount) {
    return Err({ kind: "redirect_to_login", error: "google_not_linked" });
  }

  const user = await deps.repos.users.findById(oauthAccount.user_id);
  if (!user || !user.is_active) {
    return Err({ kind: "redirect_to_login", error: "google_not_linked" });
  }

  const context = await loadActiveAuthContextForUser(
    user,
    deps.repos,
    deps.now(),
  );
  if (!context) {
    return Err({ kind: "redirect_to_login", error: "google_not_linked" });
  }
  const loginResult = await completePrimaryAuthProof({
    proof: {
      kind: "google",
      userId: user.id,
      trustedFederatedMfa: false,
    },
    identifier: user.username,
    request: {
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    },
    context,
    deps,
    webauthnProvider,
  });

  if (isErr(loginResult)) {
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
    redirectPath: getSessionPath(
      loginResult.value.result.sessionClass,
      loginResult.value.result.role,
    ),
    sessionToken: loginResult.value.result.token,
  });
}

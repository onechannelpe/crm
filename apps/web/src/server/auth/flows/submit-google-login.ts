import { loadActiveAuthContext } from "~/lib/auth/context/auth-context";
import type { SendPrivilegedLoginAlert } from "~/lib/auth/security/privileged-login-alert";
import type {
  SubmitPrimaryLoginError,
  SubmitPrimaryLoginResult,
} from "~/server/auth/application/contracts";
import type { WebauthnProvider } from "~/server/auth/factors/passkey-provider";
import type { AuthLoginDeps } from "~/server/auth/flows/login-deps";
import type { AuthProof } from "~/server/auth/policy/types";
import { Err, type Result } from "~/server/shared/result";

import { completePrimaryAuthProof } from "./primary-login";

export async function submitGoogleLogin(
  input: {
    userId: number;
    ipAddress: string;
    userAgent: string | null;
    trustedFederatedMfa?: boolean;
  },
  deps: AuthLoginDeps,
  sendPrivilegedLoginAlert: SendPrivilegedLoginAlert,
  webauthnProvider: WebauthnProvider,
): Promise<Result<SubmitPrimaryLoginResult, SubmitPrimaryLoginError>> {
  const proof: Extract<AuthProof, { kind: "google" }> = {
    kind: "google",
    userId: input.userId,
    trustedFederatedMfa: input.trustedFederatedMfa === true,
  };
  const context = await loadActiveAuthContext(proof.userId, deps);
  if (!context) {
    return Err({ kind: "invalid_credentials" });
  }

  return completePrimaryAuthProof({
    proof,
    identifier: context.user.username,
    request: {
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    },
    context,
    deps,
    sendPrivilegedLoginAlert,
    webauthnProvider,
  });
}

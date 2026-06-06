import { loadActiveAuthContext } from "~/lib/auth/context/auth-context";
import type { SendPrivilegedLoginAlert } from "~/lib/auth/security/privileged-login-alert";
import type { AuthLoginDeps } from "~/server/auth/application/login-deps";
import type { AuthProof } from "~/server/auth/policy/types";
import { Err, type Result } from "~/server/shared/result";

import type {
  SubmitPrimaryLoginError,
  SubmitPrimaryLoginResult,
} from "../contracts";
import { completePrimaryAuthProof } from "../services/primary-login";

export async function submitGoogleLogin(
  input: {
    userId: number;
    ipAddress: string;
    userAgent: string | null;
    trustedFederatedMfa?: boolean;
  },
  deps: AuthLoginDeps,
  sendPrivilegedLoginAlert: SendPrivilegedLoginAlert,
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
  });
}

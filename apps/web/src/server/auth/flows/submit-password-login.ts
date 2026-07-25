import type {
  SubmitPrimaryLoginError,
  SubmitPrimaryLoginResult,
} from "~/server/auth/application/login-contracts";
import { loadActiveAuthContextForUser } from "~/server/auth/context/auth-context";
import type { WebauthnProvider } from "~/server/auth/factors/passkey-provider";
import { authenticatePassword } from "~/server/auth/factors/password";
import type { AuthLoginContext } from "~/server/auth/infrastructure/login-context";
import { Err, isErr, type Result } from "~/shared/result";

import { completePrimaryAuthProof } from "./primary-login";

export async function submitPasswordLogin(
  input: {
    identifier: string;
    password: string;
    ipAddress: string;
    userAgent: string | null;
  },
  deps: AuthLoginContext,
  webauthnProvider: WebauthnProvider,
): Promise<Result<SubmitPrimaryLoginResult, SubmitPrimaryLoginError>> {
  const safeIdentifier = input.identifier.trim();
  const authenticated = await authenticatePassword(
    {
      identifier: safeIdentifier,
      password: input.password,
      ipAddress: input.ipAddress,
    },
    { ...deps.repos, now: deps.now },
  );
  if (isErr(authenticated)) {
    return Err(authenticated.error);
  }

  const context = await loadActiveAuthContextForUser(
    authenticated.value.user,
    deps.repos,
    deps.now(),
  );
  if (!context) {
    return Err({ kind: "invalid_credentials" });
  }

  return completePrimaryAuthProof({
    proof: authenticated.value.proof,
    identifier: safeIdentifier,
    request: {
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    },
    context,
    deps,
    webauthnProvider,
  });
}

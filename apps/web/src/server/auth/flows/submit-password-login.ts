import type { SendPrivilegedLoginAlert } from "~/lib/auth/security/privileged-login-alert";
import type {
  SubmitPrimaryLoginError,
  SubmitPrimaryLoginResult,
} from "~/server/auth/application/contracts";
import type { WebauthnProvider } from "~/server/auth/factors/passkey-provider";
import { authenticatePassword } from "~/server/auth/factors/password";
import type { AuthLoginDeps } from "~/server/auth/flows/login-deps";
import { Err, isErr, type Result } from "~/server/shared/result";

import { completePrimaryAuthProof } from "./primary-login";

export async function submitPasswordLogin(
  input: {
    identifier: string;
    password: string;
    ipAddress: string;
    userAgent: string | null;
  },
  deps: AuthLoginDeps,
  sendPrivilegedLoginAlert: SendPrivilegedLoginAlert,
  webauthnProvider: WebauthnProvider,
): Promise<Result<SubmitPrimaryLoginResult, SubmitPrimaryLoginError>> {
  const safeIdentifier = input.identifier.trim();
  const proof = await authenticatePassword(
    {
      identifier: safeIdentifier,
      password: input.password,
      ipAddress: input.ipAddress,
    },
    deps,
  );
  if (isErr(proof)) {
    return Err(proof.error);
  }

  return completePrimaryAuthProof({
    proof: proof.value,
    identifier: safeIdentifier,
    request: {
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    },
    deps,
    sendPrivilegedLoginAlert,
    webauthnProvider,
  });
}

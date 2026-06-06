import { authenticatePassword } from "~/lib/auth/providers/password-provider";
import type { SendPrivilegedLoginAlert } from "~/lib/auth/security/privileged-login-alert";
import type { AuthLoginDeps } from "~/server/auth/application/login-deps";
import { Err, isErr, type Result } from "~/server/shared/result";

import type {
  SubmitPrimaryLoginError,
  SubmitPrimaryLoginResult,
} from "../contracts";
import { completePrimaryAuthProof } from "../services/primary-login";

export async function submitPasswordLogin(
  input: {
    identifier: string;
    password: string;
    ipAddress: string;
    userAgent: string | null;
  },
  deps: AuthLoginDeps,
  sendPrivilegedLoginAlert: SendPrivilegedLoginAlert,
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
  });
}

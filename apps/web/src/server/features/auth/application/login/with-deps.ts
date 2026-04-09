import type { AuthLoginContext } from "~/server/auth/infrastructure/login-context";

import { submitPasswordLogin, submitGoogleLogin } from "./primary";
import { submitTotpForLoginFlow } from "./totp";

export function submitPasswordLoginWithDeps(
  deps: AuthLoginContext,
  input: {
    identifier: string;
    password: string;
    ipAddress: string;
    userAgent: string | null;
  },
) {
  return submitPasswordLogin(
    input,
    deps.repos,
    deps.privilegedLoginAlertSender,
  );
}

export function submitTotpLoginWithDeps(
  deps: AuthLoginContext,
  input: {
    flowId: number;
    totpCode: string;
    ipAddress: string;
    userAgent: string | null;
  },
) {
  return submitTotpForLoginFlow(
    input,
    deps.repos,
    deps.privilegedLoginAlertSender,
  );
}

export function submitGoogleLoginWithDeps(
  deps: AuthLoginContext,
  input: {
    userId: number;
    ipAddress: string;
    userAgent: string | null;
    trustedFederatedMfa?: boolean;
  },
) {
  return submitGoogleLogin(input, deps.repos, deps.privilegedLoginAlertSender);
}

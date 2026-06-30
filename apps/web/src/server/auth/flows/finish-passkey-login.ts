import type { AuthenticationResponseJSON } from "@simplewebauthn/server";

import type { SendPrivilegedLoginAlert } from "~/lib/auth/security/privileged-login-alert";
import type { WebauthnProvider } from "~/server/auth/factors/passkey-provider";
import { createPasskeyLoginFinishAuthService } from "~/server/auth/factors/passkey/service";
import type { AuthLoginFlowId } from "~/server/shared/ids";

import type { AuthLoginDeps } from "./login-deps";

export async function finishPasskeyLogin(
  deps: {
    repos: AuthLoginDeps;
    sendPrivilegedLoginAlert: SendPrivilegedLoginAlert;
  },
  input: {
    flowId: AuthLoginFlowId;
    response: AuthenticationResponseJSON;
    ipAddress: string;
    userAgent: string | null;
    webauthnProvider: WebauthnProvider;
  },
) {
  const service = createPasskeyLoginFinishAuthService(deps.repos, {
    webauthnProvider: input.webauthnProvider,
  });
  return service.finishLogin({
    flowId: input.flowId,
    response: input.response,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    sendPrivilegedLoginAlert: deps.sendPrivilegedLoginAlert,
  });
}

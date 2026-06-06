import type { AuthenticationResponseJSON } from "@simplewebauthn/server";

import type { SendPrivilegedLoginAlert } from "~/lib/auth/security/privileged-login-alert";
import { createPasskeyLoginFinishAuthService } from "~/server/auth/passkey/service";

import type { AuthLoginDeps } from "../login-deps";

type PasskeyFinishProviderFactory = NonNullable<
  Parameters<typeof createPasskeyLoginFinishAuthService>[1]
>["createWebauthnProvider"];

export async function finishPasskeyLogin(
  deps: {
    repos: AuthLoginDeps;
    sendPrivilegedLoginAlert: SendPrivilegedLoginAlert;
  },
  input: {
    flowId: number;
    response: AuthenticationResponseJSON;
    ipAddress: string;
    userAgent: string | null;
    createWebauthnProvider: PasskeyFinishProviderFactory;
  },
) {
  const service = createPasskeyLoginFinishAuthService(deps.repos, {
    createWebauthnProvider: input.createWebauthnProvider,
  });
  return service.finishLogin({
    flowId: input.flowId,
    response: input.response,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    sendPrivilegedLoginAlert: deps.sendPrivilegedLoginAlert,
  });
}

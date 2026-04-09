import type { AuthenticationResponseJSON } from "@simplewebauthn/server";

import {
  createPasskeyLoginFinishAuthService,
  createPasskeyLoginStartAuthService,
} from "~/lib/auth/passkey/service";
import type {
  AuthLoginContext,
  AuthLoginRepos,
} from "~/server/auth/infrastructure/login-context";

type PasskeyStartProviderFactory = NonNullable<
  Parameters<typeof createPasskeyLoginStartAuthService>[1]
>["createWebauthnProvider"];

type PasskeyFinishProviderFactory = NonNullable<
  Parameters<typeof createPasskeyLoginFinishAuthService>[1]
>["createWebauthnProvider"];

export function createPasskeyStartService(
  repos: AuthLoginRepos,
  input: {
    createWebauthnProvider: PasskeyStartProviderFactory;
  },
) {
  return createPasskeyLoginStartAuthService(repos, {
    createWebauthnProvider: input.createWebauthnProvider,
  });
}

export async function finishPasskeyLoginWithDeps(
  deps: AuthLoginContext,
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
    sendPrivilegedLoginAlert: deps.privilegedLoginAlertSender,
  });
}

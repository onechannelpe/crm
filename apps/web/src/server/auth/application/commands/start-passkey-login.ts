import {
  createPasskeyLoginStartAuthService,
  type BeginPasskeyLoginInput,
} from "~/server/auth/passkey/service";

import type { AuthLoginDeps } from "../login-deps";

type PasskeyStartProviderFactory = NonNullable<
  Parameters<typeof createPasskeyLoginStartAuthService>[1]
>["createWebauthnProvider"];

export async function startPasskeyLogin(
  input: BeginPasskeyLoginInput,
  repos: AuthLoginDeps,
  deps: {
    createWebauthnProvider: PasskeyStartProviderFactory;
  },
) {
  return createPasskeyLoginStartAuthService(repos, {
    createWebauthnProvider: deps.createWebauthnProvider,
  }).beginLogin(input);
}

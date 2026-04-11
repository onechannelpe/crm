import {
  createPasskeyLoginStartAuthService,
  type BeginPasskeyLoginInput,
} from "~/server/auth/passkey/service";

import type { AuthLoginRepos } from "../../infrastructure/login-context";

type PasskeyStartProviderFactory = NonNullable<
  Parameters<typeof createPasskeyLoginStartAuthService>[1]
>["createWebauthnProvider"];

export async function startPasskeyLogin(
  input: BeginPasskeyLoginInput,
  repos: AuthLoginRepos,
  deps: {
    createWebauthnProvider: PasskeyStartProviderFactory;
  },
) {
  return createPasskeyLoginStartAuthService(repos, {
    createWebauthnProvider: deps.createWebauthnProvider,
  }).beginLogin(input);
}

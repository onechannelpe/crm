import type { WebauthnProvider } from "~/server/auth/factors/passkey-provider";
import {
  createPasskeyLoginStartAuthService,
  type BeginPasskeyLoginInput,
} from "~/server/auth/factors/passkey/service";

import type { AuthLoginDeps } from "./login-deps";

export async function startPasskeyLogin(
  input: BeginPasskeyLoginInput,
  repos: AuthLoginDeps,
  webauthnProvider: WebauthnProvider,
) {
  return createPasskeyLoginStartAuthService(repos, {
    webauthnProvider,
  }).beginLogin(input);
}

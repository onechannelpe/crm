import type { WebauthnProvider } from "~/server/auth/factors/passkey-provider";
import type {
  IssuedSession,
  SessionSpec,
} from "~/server/auth/session/session-spec";
import { createSessionService } from "~/server/auth/session/session.service";

import { createPasskeyEnrollmentService } from "./enrollment";
import { createPasskeyLoginFinishService } from "./login-finish";
import { createPasskeyLoginStartService } from "./login-start";
import type { PasskeyAuthRepos } from "./shared";

export type { BeginPasskeyLoginInput } from "./login-start";

export function createPasskeyEnrollmentAuthService(
  repos: PasskeyAuthRepos,
  deps: { webauthnProvider: WebauthnProvider },
) {
  return createPasskeyEnrollmentService(repos, {
    webauthnProvider: deps.webauthnProvider,
  });
}

export function createPasskeyLoginStartAuthService(
  repos: PasskeyAuthRepos,
  deps: { webauthnProvider: WebauthnProvider },
) {
  return createPasskeyLoginStartService(repos, {
    webauthnProvider: deps.webauthnProvider,
  });
}

export function createPasskeyLoginFinishAuthService(
  repos: PasskeyAuthRepos,
  deps: {
    webauthnProvider: WebauthnProvider;
    establishSession?: (spec: SessionSpec) => Promise<IssuedSession>;
  },
) {
  const establishSession =
    deps.establishSession ??
    ((spec: SessionSpec) => createSessionService(repos).establish(spec));

  return createPasskeyLoginFinishService(repos, {
    webauthnProvider: deps.webauthnProvider,
    establishSession,
  });
}

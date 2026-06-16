import { createPasskeyProvider } from "~/server/auth/factors/passkey-provider";
import type {
  IssuedSession,
  SessionSpec,
} from "~/server/auth/session/session-spec";
import { createSessionService } from "~/server/auth/session/session.service";
import type { createEventsRepo } from "~/server/shared/repos-events";
import type { createPasskeysRepo } from "~/server/users/repos-passkeys";

import { createPasskeyEnrollmentService } from "./enrollment";
import { createPasskeyLoginFinishService } from "./login-finish";
import { createPasskeyLoginStartService } from "./login-start";
import type { PasskeyAuthRepos } from "./shared";

export type { BeginPasskeyLoginInput } from "./login-start";

interface PasskeyServiceDeps {
  createWebauthnProvider?: (repos: {
    passkeys: ReturnType<typeof createPasskeysRepo>;
    events: ReturnType<typeof createEventsRepo>;
  }) => ReturnType<typeof createPasskeyProvider>;
  establishSession?: (spec: SessionSpec) => Promise<IssuedSession>;
}

export type PasskeyWebauthnProviderFactory = NonNullable<
  PasskeyServiceDeps["createWebauthnProvider"]
>;

export function createPasskeyEnrollmentAuthService(
  repos: PasskeyAuthRepos,
  deps: Omit<PasskeyServiceDeps, "establishSession"> = {},
) {
  const webauthnProvider =
    deps.createWebauthnProvider?.(repos) ?? createPasskeyProvider(repos);

  return createPasskeyEnrollmentService(repos, {
    webauthnService: webauthnProvider,
  });
}

export function createPasskeyLoginStartAuthService(
  repos: PasskeyAuthRepos,
  deps: Omit<PasskeyServiceDeps, "establishSession"> = {},
) {
  const webauthnProvider =
    deps.createWebauthnProvider?.(repos) ?? createPasskeyProvider(repos);

  return createPasskeyLoginStartService(repos, { webauthnProvider });
}

export function createPasskeyLoginFinishAuthService(
  repos: PasskeyAuthRepos,
  deps: PasskeyServiceDeps = {},
) {
  const webauthnProvider =
    deps.createWebauthnProvider?.(repos) ?? createPasskeyProvider(repos);
  const establishSession =
    deps.establishSession ??
    ((spec: SessionSpec) => createSessionService(repos).establish(spec));

  return createPasskeyLoginFinishService(repos, {
    webauthnProvider,
    establishSession,
  });
}

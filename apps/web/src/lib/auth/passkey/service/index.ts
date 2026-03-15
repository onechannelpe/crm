import type { Repositories } from "~/server/shared/registry";

import { createPasskeyProvider } from "../../providers/passkey-provider";
import { issueLoginSession } from "../../session/session-transition";
import { createPasskeyEnrollmentService } from "./enrollment";
import { createPasskeyLoginFinishService } from "./login-finish";
import { createPasskeyLoginStartService } from "./login-start";
import type { PasskeyAuthRepos } from "./shared";

export type {
  BeginPasskeyLoginError,
  FinishPasskeyLoginError,
  PasskeyEnrollmentChallenge,
  PasskeyEnrollmentError,
  PasskeyLoginFlowState,
  PasskeyLoginMode,
  PasskeyLoginResult,
} from "./types";

interface PasskeyServiceDeps {
  createWebauthnProvider?: (
    repos: Pick<Repositories, "passkeys" | "auditLogs">,
  ) => ReturnType<typeof createPasskeyProvider>;
  issueLoginSession?: typeof issueLoginSession;
}

export function createPasskeyEnrollmentAuthService(
  repos: PasskeyAuthRepos,
  deps: Omit<PasskeyServiceDeps, "issueLoginSession"> = {},
) {
  const webauthnProvider =
    deps.createWebauthnProvider?.(repos) ?? createPasskeyProvider(repos);

  return createPasskeyEnrollmentService(repos, {
    webauthnService: webauthnProvider,
  });
}

export function createPasskeyLoginStartAuthService(
  repos: PasskeyAuthRepos,
  deps: Omit<PasskeyServiceDeps, "issueLoginSession"> = {},
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
  const issueLoginSessionForRepos = deps.issueLoginSession ?? issueLoginSession;

  return createPasskeyLoginFinishService(repos, {
    webauthnProvider,
    issueLoginSession: issueLoginSessionForRepos,
  });
}

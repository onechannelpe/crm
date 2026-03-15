import type { Repositories } from "~/server/shared/registry";

import { issueLoginSession } from "../../session/session-transition";
import { createPasskeyService } from "../passkey";
import { createPasskeyEnrollmentService } from "./enrollment";
import { createPasskeyLoginService } from "./login";
import { createPasskeyLoginStateService } from "./login-state";
import type { PasskeyAuthRepos } from "./shared";

export type {
  BeginPasskeyLoginError,
  FinishPasskeyLoginError,
  PasskeyEnrollmentChallenge,
  PasskeyEnrollmentError,
  PasskeyLoginFlowState,
  PasskeyLoginResult,
} from "./types";

interface PasskeyServiceDeps {
  createWebauthnService?: (
    repos: Pick<Repositories, "passkeys" | "auditLogs">,
  ) => ReturnType<typeof createPasskeyService>;
  issueLoginSession?: typeof issueLoginSession;
}

export function createPasskeyAuthService(
  repos: PasskeyAuthRepos,
  deps: PasskeyServiceDeps = {},
) {
  const webauthnService =
    deps.createWebauthnService?.(repos) ?? createPasskeyService(repos);
  const issueLoginSessionForRepos = deps.issueLoginSession ?? issueLoginSession;

  return {
    ...createPasskeyEnrollmentService(repos, { webauthnService }),
    ...createPasskeyLoginStateService(repos, { webauthnService }),
    ...createPasskeyLoginService(repos, {
      webauthnService,
      issueLoginSession: issueLoginSessionForRepos,
    }),
  };
}

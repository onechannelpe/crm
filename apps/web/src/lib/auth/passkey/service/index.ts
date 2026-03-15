import type { Repositories } from "~/server/shared/registry";

import {
  issueAppSession,
  issuePreAuthSession,
} from "../../session/session-issuer";
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
  issueAppSession?: typeof issueAppSession;
  issuePreAuthSession?: typeof issuePreAuthSession;
}

export function createPasskeyAuthService(
  repos: PasskeyAuthRepos,
  deps: PasskeyServiceDeps = {},
) {
  const webauthnService =
    deps.createWebauthnService?.(repos) ?? createPasskeyService(repos);
  const issueAppSessionForRepos = deps.issueAppSession ?? issueAppSession;
  const issuePreAuthSessionForRepos =
    deps.issuePreAuthSession ?? issuePreAuthSession;

  return {
    ...createPasskeyEnrollmentService(repos, { webauthnService }),
    ...createPasskeyLoginStateService(repos, { webauthnService }),
    ...createPasskeyLoginService(repos, {
      webauthnService,
      issueAppSession: issueAppSessionForRepos,
      issuePreAuthSession: issuePreAuthSessionForRepos,
    }),
  };
}

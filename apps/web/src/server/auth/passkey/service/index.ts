import { createPasskeyProvider } from "~/lib/auth/providers/passkey-provider";
import { issueLoginSession } from "~/lib/auth/session/session-transition";
import type { createAuditLogsRepo } from "~/server/shared/repos-audit-logs";
import type { createPasskeysRepo } from "~/server/users/repos-passkeys";

import { createPasskeyEnrollmentService } from "./enrollment";
import { createPasskeyLoginFinishService } from "./login-finish";
import { createPasskeyLoginStartService } from "./login-start";
import type { PasskeyAuthRepos } from "./shared";

export type {
  BeginPasskeyLoginError,
  FinishPasskeyLoginError,
  PasskeyEnrollmentChallenge,
  PasskeyLoginFlowState,
  PasskeyLoginMode,
  PasskeyLoginResult,
} from "./types";
export type { BeginPasskeyLoginInput } from "./login-start";

interface PasskeyServiceDeps {
  createWebauthnProvider?: (repos: {
    passkeys: ReturnType<typeof createPasskeysRepo>;
    auditLogs: ReturnType<typeof createAuditLogsRepo>;
  }) => ReturnType<typeof createPasskeyProvider>;
  issueLoginSession?: typeof issueLoginSession;
}

export type PasskeyWebauthnProviderFactory = NonNullable<
  PasskeyServiceDeps["createWebauthnProvider"]
>;

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

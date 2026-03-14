import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/server";

import type { Role } from "~/lib/auth/access/rbac";
import type { SendPrivilegedLoginAlert } from "~/lib/auth/security/privileged-login-alert";
import { config } from "~/lib/config";
import {
  assertNonEmptyString,
  assertPositiveInt,
} from "~/lib/contracts/guards";
import type { Repositories } from "~/server/shared/registry";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";
import {
  completeAccountOnboardingWithRepos,
  type CompleteOnboardingError,
} from "~/server/users/service-account-onboarding";

import type { InvalidCredentialsError } from "../errors";
import { issueLoginSession } from "../session/login-completion";
import { beginPasskeyLoginFlow, finishPasskeyLoginFlow } from "./login-flow";
import { createPasskeyService } from "./passkey";
import {
  beginPasskeyRegistrationFlow,
  finishPasskeyRegistrationFlow,
  type PasskeyRegistrationFlowError,
} from "./registration-flow";

type PasskeyEnrollmentRepos = Pick<
  Repositories,
  "passkeys" | "webauthnChallenges" | "auditLogs" | "authThrottle"
>;

type PasskeyLoginRepos = Pick<
  Repositories,
  | "users"
  | "sessions"
  | "loginFlows"
  | "passkeys"
  | "webauthnChallenges"
  | "auditLogs"
  | "authThrottle"
  | "authEvents"
>;

type PasskeyOnboardingRepos = Pick<
  Repositories,
  | "users"
  | "passkeys"
  | "userTotpFactors"
  | "notificationContacts"
  | "notificationPreferences"
  | "webauthnChallenges"
  | "auditLogs"
  | "authThrottle"
>;

export type CompletePasskeyOnboardingError =
  | PasskeyRegistrationFlowError
  | CompleteOnboardingError;

export interface PasskeyLoginFlowState {
  id: number;
  identifier: string;
  state: "passkey";
  requestOptions: PublicKeyCredentialRequestOptionsJSON;
}

export interface PasskeyLoginResult {
  userId: number;
  role: Role;
  onboardingCompleted: boolean;
  token: string;
}

export type FinishPasskeyEnrollmentError = PasskeyRegistrationFlowError;
export type SubmitPasskeyLoginError =
  | { kind: "flow_expired" }
  | InvalidCredentialsError;

interface PasskeyWorkflowSharedDeps {
  createPasskeyService?: (
    repos: Pick<Repositories, "passkeys" | "auditLogs">,
  ) => ReturnType<typeof createPasskeyService>;
}

interface PasskeyOnboardingWorkflowDeps extends PasskeyWorkflowSharedDeps {
  runInTransaction?: <T>(
    operation: (repos: PasskeyOnboardingRepos) => Promise<T>,
  ) => Promise<T>;
}

interface BeginPasskeyEnrollmentInput {
  userId: number;
  ipAddress: string;
}

interface FinishPasskeyEnrollmentInput extends BeginPasskeyEnrollmentInput {
  challengeId: number;
  response: RegistrationResponseJSON;
}

interface CompletePasskeyOnboardingInput extends FinishPasskeyEnrollmentInput {
  phoneE164: string;
}

interface BeginPasskeyLoginInput {
  identifier: string;
  ipAddress: string;
}

interface FinishPasskeyLoginInput {
  flowId: number;
  response: AuthenticationResponseJSON;
  ipAddress: string;
  userAgent: string | null;
  sendPrivilegedLoginAlert: SendPrivilegedLoginAlert;
}

async function deleteLoginFlow(
  flow: Awaited<ReturnType<PasskeyLoginRepos["loginFlows"]["findById"]>>,
  repos: PasskeyLoginRepos,
): Promise<void> {
  if (!flow) {
    return;
  }

  if (flow.challenge_id) {
    await repos.webauthnChallenges.delete(flow.challenge_id);
  }

  await repos.loginFlows.delete(flow.id);
}

export function createPasskeyEnrollmentWorkflowService(
  repos: PasskeyEnrollmentRepos,
  deps: PasskeyWorkflowSharedDeps = {},
) {
  const createPasskeyServiceForRepos =
    deps.createPasskeyService ?? createPasskeyService;

  return {
    async beginEnrollment(input: BeginPasskeyEnrollmentInput) {
      return beginPasskeyRegistrationFlow(
        input.userId,
        input.ipAddress,
        repos,
        createPasskeyServiceForRepos(repos),
      );
    },

    async finishEnrollment(
      input: FinishPasskeyEnrollmentInput,
    ): Promise<Result<void, FinishPasskeyEnrollmentError>> {
      return finishPasskeyRegistrationFlow(
        input.userId,
        input.challengeId,
        input.response,
        input.ipAddress,
        repos,
        createPasskeyServiceForRepos(repos),
      );
    },
  };
}

export function createPasskeyLoginWorkflowService(
  repos: PasskeyLoginRepos,
  deps: PasskeyWorkflowSharedDeps = {},
) {
  const createPasskeyServiceForRepos =
    deps.createPasskeyService ?? createPasskeyService;

  return {
    async beginLogin(
      input: BeginPasskeyLoginInput,
    ): Promise<Result<PasskeyLoginFlowState, InvalidCredentialsError>> {
      const identifier = assertNonEmptyString(
        input.identifier,
        "identifier",
      ).trim();
      const passkeyService = createPasskeyServiceForRepos(repos);
      const challenge = await beginPasskeyLoginFlow(
        identifier,
        input.ipAddress,
        repos,
        passkeyService,
      );
      if (isErr(challenge)) {
        return Err(challenge.error);
      }

      const flowId = await repos.loginFlows.create({
        identifier,
        user_id: challenge.value.userId,
        challenge_id: challenge.value.challengeId,
        state: "passkey",
        expires_at: Date.now() + config.auth.loginFlowTtlMs,
      });

      return Ok({
        id: flowId,
        identifier,
        state: "passkey",
        requestOptions: challenge.value.options,
      });
    },

    async finishLogin(
      input: FinishPasskeyLoginInput,
    ): Promise<
      Result<
        { kind: "complete"; result: PasskeyLoginResult },
        SubmitPasskeyLoginError
      >
    > {
      const safeFlowId = assertPositiveInt(input.flowId, "flowId");
      const flow = await repos.loginFlows.findById(safeFlowId);
      if (
        !flow ||
        flow.state !== "passkey" ||
        flow.expires_at < Date.now() ||
        !flow.challenge_id
      ) {
        await deleteLoginFlow(flow, repos);
        return Err({ kind: "flow_expired" });
      }

      const passkeyService = createPasskeyServiceForRepos(repos);
      const verified = await finishPasskeyLoginFlow(
        flow.challenge_id,
        input.response,
        input.ipAddress,
        repos,
        passkeyService,
        input.sendPrivilegedLoginAlert,
      );
      await repos.loginFlows.delete(flow.id);
      if (isErr(verified)) {
        return Err(verified.error);
      }

      const user = await repos.users.findById(verified.value.userId);
      if (!user || !user.is_active) {
        return Err({ kind: "invalid_credentials" });
      }

      const session = await issueLoginSession({
        user,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        authMethod: "passkey",
        strongAuthAt: Date.now(),
        auditAction: "login_passkey",
        deps: repos,
      });

      return Ok({ kind: "complete", result: session });
    },
  };
}

export function createPasskeyOnboardingWorkflowService(
  repos: PasskeyOnboardingRepos,
  deps: PasskeyOnboardingWorkflowDeps = {},
) {
  const runInTransaction =
    deps.runInTransaction ??
    (async <T>(
      operation: (transactionRepos: PasskeyOnboardingRepos) => Promise<T>,
    ) => operation(repos));
  const createPasskeyServiceForRepos =
    deps.createPasskeyService ?? createPasskeyService;

  return {
    async completeOnboarding(
      input: CompletePasskeyOnboardingInput,
    ): Promise<Result<void, CompletePasskeyOnboardingError>> {
      try {
        return await runInTransaction(async (transactionRepos) => {
          const passkeyResult = await finishPasskeyRegistrationFlow(
            input.userId,
            input.challengeId,
            input.response,
            input.ipAddress,
            transactionRepos,
            createPasskeyServiceForRepos(transactionRepos),
          );
          if (isErr(passkeyResult)) {
            return Err(passkeyResult.error);
          }

          return completeAccountOnboardingWithRepos(transactionRepos, {
            userId: input.userId,
            phoneE164: input.phoneE164,
          });
        });
      } catch {
        return Err({
          reason: "unexpected",
          message: "Unexpected onboarding completion failure",
        });
      }
    },
  };
}

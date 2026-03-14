import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/server";

import {
  checkPasskeyChallengeThrottle,
  checkPasskeyVerifyThrottle,
  clearPasskeyVerifyFailureState,
  recordPasskeyChallengeFailure,
  recordPasskeyVerifyFailure,
} from "~/lib/auth/password/throttle";
import { recordAuthEvent } from "~/lib/auth/security/auth-events";
import { sendAlertOnNewLoginSource } from "~/lib/auth/security/login-source-alert";
import type { SendPrivilegedLoginAlert } from "~/lib/auth/security/privileged-login-alert";
import { config } from "~/lib/config";
import {
  assertNonEmptyString,
  assertPositiveInt,
} from "~/lib/contracts/guards";
import type { Repositories } from "~/server/shared/registry";
import { Err, Ok, type Result } from "~/server/shared/result";

import type { InvalidCredentialsError } from "../errors";
import {
  issueLoginSession,
  type LoginCompletionResult,
} from "../session/login-completion";
import {
  createPasskeyService,
  isPasskeyRequestError,
} from "./passkey";

type PasskeyAuthRepos = Pick<
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

export interface PasskeyEnrollmentChallenge {
  challengeId: number;
  options: PublicKeyCredentialCreationOptionsJSON;
}

export interface PasskeyLoginFlowState {
  id: number;
  identifier: string;
  state: "passkey";
  requestOptions: PublicKeyCredentialRequestOptionsJSON;
}

export type PasskeyLoginResult = LoginCompletionResult;

export type PasskeyEnrollmentError =
  | { reason: "invalid_request"; message: string }
  | { reason: "unexpected"; message: string };

export type BeginPasskeyLoginError =
  | InvalidCredentialsError
  | { kind: "unexpected"; message: string };

export type FinishPasskeyLoginError =
  | { kind: "flow_expired" }
  | InvalidCredentialsError
  | { kind: "unexpected"; message: string };

interface PasskeyServiceDeps {
  createWebauthnService?: (
    repos: Pick<Repositories, "passkeys" | "auditLogs">,
  ) => ReturnType<typeof createPasskeyService>;
  issueLoginSession?: typeof issueLoginSession;
}

interface BeginPasskeyEnrollmentInput {
  userId: number;
  ipAddress: string;
}

interface FinishPasskeyEnrollmentInput extends BeginPasskeyEnrollmentInput {
  challengeId: number;
  response: RegistrationResponseJSON;
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

const INVALID_PASSKEY_REQUEST = "Invalid passkey request";
const UNEXPECTED_PASSKEY_ENROLLMENT_FAILURE =
  "Unexpected passkey registration failure";
const UNEXPECTED_PASSKEY_LOGIN_FAILURE = "Unexpected passkey login failure";

function unexpectedPasskeyLoginError(): {
  kind: "unexpected";
  message: string;
} {
  return {
    kind: "unexpected",
    message: UNEXPECTED_PASSKEY_LOGIN_FAILURE,
  };
}

function normalizePasskeyIdentifier(
  identifier: string,
): string | InvalidCredentialsError {
  try {
    return assertNonEmptyString(identifier, "identifier").trim();
  } catch {
    return { kind: "invalid_credentials" };
  }
}

function normalizePasskeyFlowId(
  flowId: number,
): number | { kind: "flow_expired" } {
  try {
    return assertPositiveInt(flowId, "flowId");
  } catch {
    return { kind: "flow_expired" };
  }
}

async function deleteLoginFlow(
  flow: Awaited<ReturnType<PasskeyAuthRepos["loginFlows"]["findById"]>>,
  repos: PasskeyAuthRepos,
): Promise<void> {
  if (!flow) {
    return;
  }

  if (flow.challenge_id) {
    await repos.webauthnChallenges.delete(flow.challenge_id);
  }

  await repos.loginFlows.delete(flow.id);
}

export function createPasskeyAuthService(
  repos: PasskeyAuthRepos,
  deps: PasskeyServiceDeps = {},
) {
  const createWebauthnService =
    deps.createWebauthnService ?? createPasskeyService;
  const issueLoginSessionForRepos = deps.issueLoginSession ?? issueLoginSession;

  return {
    async beginEnrollment(
      input: BeginPasskeyEnrollmentInput,
    ): Promise<Result<PasskeyEnrollmentChallenge, PasskeyEnrollmentError>> {
      const identifier = `user:${input.userId}`;
      const throttle = await checkPasskeyChallengeThrottle(
        identifier,
        input.ipAddress,
        repos,
      );
      if (!throttle.allowed) {
        return Err({
          reason: "invalid_request",
          message: INVALID_PASSKEY_REQUEST,
        });
      }

      let options: PublicKeyCredentialCreationOptionsJSON;
      try {
        options = await createWebauthnService(repos).getRegistrationOptions(
          input.userId,
        );
      } catch {
        return Err({
          reason: "unexpected",
          message: UNEXPECTED_PASSKEY_ENROLLMENT_FAILURE,
        });
      }

      try {
        const challengeId = await repos.webauthnChallenges.create({
          user_id: input.userId,
          type: "registration",
          challenge: options.challenge,
          expires_at: Date.now() + config.auth.webauthnChallengeTtlMs,
        });

        return Ok({ challengeId, options });
      } catch {
        return Err({
          reason: "unexpected",
          message: UNEXPECTED_PASSKEY_ENROLLMENT_FAILURE,
        });
      }
    },

    async finishEnrollment(
      input: FinishPasskeyEnrollmentInput,
    ): Promise<Result<void, PasskeyEnrollmentError>> {
      const identifier = `user:${input.userId}`;

      let safeChallengeId: number;
      try {
        safeChallengeId = assertPositiveInt(input.challengeId, "challengeId");
      } catch {
        return Err({
          reason: "invalid_request",
          message: INVALID_PASSKEY_REQUEST,
        });
      }

      try {
        const throttle = await checkPasskeyVerifyThrottle(
          identifier,
          input.ipAddress,
          repos,
        );
        if (!throttle.allowed) {
          return Err({
            reason: "invalid_request",
            message: INVALID_PASSKEY_REQUEST,
          });
        }

        const challenge = await repos.webauthnChallenges.findById(
          safeChallengeId,
        );
        if (
          !challenge ||
          challenge.type !== "registration" ||
          challenge.user_id !== input.userId
        ) {
          await recordPasskeyVerifyFailure(identifier, input.ipAddress, repos);
          return Err({
            reason: "invalid_request",
            message: INVALID_PASSKEY_REQUEST,
          });
        }

        await repos.webauthnChallenges.delete(challenge.id);
        if (challenge.expires_at < Date.now()) {
          await recordPasskeyVerifyFailure(identifier, input.ipAddress, repos);
          return Err({
            reason: "invalid_request",
            message: INVALID_PASSKEY_REQUEST,
          });
        }

        try {
          await createWebauthnService(repos).verifyRegistration(
            input.userId,
            input.response,
            challenge.challenge,
          );
        } catch (error: unknown) {
          if (!isPasskeyRequestError(error)) {
            return Err({
              reason: "unexpected",
              message: UNEXPECTED_PASSKEY_ENROLLMENT_FAILURE,
            });
          }

          await recordPasskeyVerifyFailure(identifier, input.ipAddress, repos);
          return Err({
            reason: "invalid_request",
            message: INVALID_PASSKEY_REQUEST,
          });
        }

        await clearPasskeyVerifyFailureState(identifier, input.ipAddress, repos);
        await repos.auditLogs.create({
          user_id: input.userId,
          action: "passkey_registered",
          entity_type: "passkey",
          entity_id: input.userId,
          changes: null,
          created_at: Date.now(),
        });
        return Ok(undefined);
      } catch {
        return Err({
          reason: "unexpected",
          message: UNEXPECTED_PASSKEY_ENROLLMENT_FAILURE,
        });
      }
    },

    async beginLogin(
      input: BeginPasskeyLoginInput,
    ): Promise<Result<PasskeyLoginFlowState, BeginPasskeyLoginError>> {
      const identifier = normalizePasskeyIdentifier(input.identifier);
      if (typeof identifier !== "string") {
        return Err(identifier);
      }

      try {
        const throttle = await checkPasskeyChallengeThrottle(
          identifier,
          input.ipAddress,
          repos,
        );
        if (!throttle.allowed) {
          const blockedUser = await repos.users.findByUsername(identifier);
          await recordAuthEvent(repos, {
            userId: blockedUser?.id ?? null,
            identifier,
            ipAddress: input.ipAddress,
            method: "passkey",
            stage: "challenge",
            outcome: "throttled",
            reason: "threshold_exceeded",
          });
          return Err({ kind: "invalid_credentials" });
        }

        const user = await repos.users.findByUsername(identifier);
        if (!user || !user.is_active) {
          await recordPasskeyChallengeFailure(identifier, input.ipAddress, repos);
          await recordAuthEvent(repos, {
            userId: user?.id ?? null,
            identifier,
            ipAddress: input.ipAddress,
            method: "passkey",
            stage: "challenge",
            outcome: "failure",
            reason: user ? "inactive_user" : "user_not_found",
          });
          return Err({ kind: "invalid_credentials" });
        }

        const options = await createWebauthnService(repos).getAuthenticationOptions(
          user.id,
        );
        const challengeId = await repos.webauthnChallenges.create({
          user_id: user.id,
          type: "authentication",
          challenge: options.challenge,
          expires_at: Date.now() + config.auth.webauthnChallengeTtlMs,
        });
        const flowId = await repos.loginFlows.create({
          identifier,
          user_id: user.id,
          challenge_id: challengeId,
          state: "passkey",
          expires_at: Date.now() + config.auth.loginFlowTtlMs,
        });

        return Ok({
          id: flowId,
          identifier,
          state: "passkey",
          requestOptions: options,
        });
      } catch {
        return Err(unexpectedPasskeyLoginError());
      }
    },

    async finishLogin(
      input: FinishPasskeyLoginInput,
    ): Promise<Result<PasskeyLoginResult, FinishPasskeyLoginError>> {
      const safeFlowId = normalizePasskeyFlowId(input.flowId);
      if (typeof safeFlowId !== "number") {
        return Err(safeFlowId);
      }

      try {
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

        const challenge = await repos.webauthnChallenges.findById(
          flow.challenge_id,
        );
        const identifier = challenge?.user_id
          ? `user:${challenge.user_id}`
          : `challenge:${flow.challenge_id}`;
        const throttle = await checkPasskeyVerifyThrottle(
          identifier,
          input.ipAddress,
          repos,
        );
        if (!throttle.allowed) {
          await recordAuthEvent(repos, {
            userId: challenge?.user_id ?? null,
            identifier,
            ipAddress: input.ipAddress,
            method: "passkey",
            stage: "verify",
            outcome: "throttled",
            reason: "threshold_exceeded",
          });
          return Err({ kind: "invalid_credentials" });
        }
        if (!challenge || challenge.type !== "authentication") {
          await recordPasskeyVerifyFailure(identifier, input.ipAddress, repos);
          await recordAuthEvent(repos, {
            userId: null,
            identifier,
            ipAddress: input.ipAddress,
            method: "passkey",
            stage: "verify",
            outcome: "failure",
            reason: "invalid_challenge",
          });
          await repos.loginFlows.delete(flow.id);
          return Err({ kind: "invalid_credentials" });
        }

        await repos.webauthnChallenges.delete(challenge.id);
        if (challenge.expires_at < Date.now()) {
          await recordPasskeyVerifyFailure(identifier, input.ipAddress, repos);
          await recordAuthEvent(repos, {
            userId: challenge.user_id,
            identifier,
            ipAddress: input.ipAddress,
            method: "passkey",
            stage: "verify",
            outcome: "failure",
            reason: "challenge_expired",
          });
          await repos.loginFlows.delete(flow.id);
          return Err({ kind: "invalid_credentials" });
        }

        let verifiedUserId: number;
        try {
          const verification = await createWebauthnService(
            repos,
          ).verifyAuthentication(input.response, challenge.challenge);
          verifiedUserId = verification.userId;
        } catch (error: unknown) {
          if (!isPasskeyRequestError(error)) {
            return Err(unexpectedPasskeyLoginError());
          }

          await recordPasskeyVerifyFailure(identifier, input.ipAddress, repos);
          await recordAuthEvent(repos, {
            userId: challenge.user_id,
            identifier,
            ipAddress: input.ipAddress,
            method: "passkey",
            stage: "verify",
            outcome: "failure",
            reason: "assertion_invalid",
          });
          await repos.loginFlows.delete(flow.id);
          return Err({ kind: "invalid_credentials" });
        }

        await repos.loginFlows.delete(flow.id);
        const user = await repos.users.findById(verifiedUserId);
        if (!user || !user.is_active) {
          await recordPasskeyVerifyFailure(identifier, input.ipAddress, repos);
          await recordAuthEvent(repos, {
            userId: user?.id ?? verifiedUserId,
            identifier,
            ipAddress: input.ipAddress,
            method: "passkey",
            stage: "verify",
            outcome: "failure",
            reason: user ? "inactive_user" : "user_not_found",
          });
          return Err({ kind: "invalid_credentials" });
        }

        await sendAlertOnNewLoginSource({
          user,
          ipAddress: input.ipAddress,
          method: "passkey",
          deps: repos,
          sendPrivilegedLoginAlert: input.sendPrivilegedLoginAlert,
        });
        await clearPasskeyVerifyFailureState(
          identifier,
          input.ipAddress,
          repos,
        );
        await recordAuthEvent(repos, {
          userId: user.id,
          identifier,
          ipAddress: input.ipAddress,
          method: "passkey",
          stage: "verify",
          outcome: "success",
        });

        const session = await issueLoginSessionForRepos({
          user,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
          authMethod: "passkey",
          strongAuthAt: Date.now(),
          auditAction: "login_passkey",
          deps: repos,
        });

        return Ok(session);
      } catch {
        return Err(unexpectedPasskeyLoginError());
      }
    },
  };
}

import type { AuthenticationResponseJSON } from "@simplewebauthn/server";

import type { InvalidCredentialsError } from "~/domain/auth/errors";
import type {
  AuthLoginFlowId,
  UserId,
  WebauthnChallengeId,
} from "~/domain/ids";
import { createAuthThrottleService } from "~/server/auth/application/throttle-service";
import {
  isPasskeyRequestError,
  PasskeyRequestError,
  type VerifiedAuthenticationCredential,
  type WebauthnProvider,
} from "~/server/auth/factors/passkey-provider";
import { deleteLoginFlow } from "~/server/auth/login-flow/shared";
import { recordAuthEvent } from "~/server/auth/security/auth-events";
import type { OperationContext } from "~/server/platform/operation/context";
import { Err, Ok, type Result } from "~/shared/result";

import type { PasskeyAuthRepos } from "./shared";

export type FinishPasskeyLoginError =
  | { kind: "flow_expired" }
  | InvalidCredentialsError;

export interface VerifiedPasskeyLogin {
  challengeId: WebauthnChallengeId;
  credential: VerifiedAuthenticationCredential;
  flowId: AuthLoginFlowId;
  identifier: string;
  method: "passkey";
  userId: UserId;
}

export async function verifyPasskeyLogin(
  repos: PasskeyAuthRepos,
  input: {
    flowId: AuthLoginFlowId;
    response: AuthenticationResponseJSON;
    ipAddress: string;
    webauthnProvider: WebauthnProvider;
  },
  operation: OperationContext,
): Promise<Result<VerifiedPasskeyLogin, FinishPasskeyLoginError>> {
  const flow = await repos.loginFlows.findById(input.flowId);
  if (
    !flow ||
    flow.state !== "passkey" ||
    flow.expires_at < operation.operationAt ||
    !flow.challenge_id
  ) {
    await deleteLoginFlow(flow, repos);
    return Err({ kind: "flow_expired" });
  }

  const challenge = await repos.webauthnChallenges.findById(flow.challenge_id);
  const identifier = challenge?.user_id
    ? `user:${challenge.user_id}`
    : `challenge:${flow.challenge_id}`;
  const throttleService = createAuthThrottleService({
    authThrottle: repos.authThrottle,
  });
  const throttle = await throttleService.checkPasskeyVerifyThrottle(
    identifier,
    input.ipAddress,
    operation.operationAt,
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
      occurredAt: operation.operationAt,
    });
    return Err({ kind: "invalid_credentials" });
  }

  if (
    !challenge ||
    challenge.type !== "authentication" ||
    challenge.expires_at < operation.operationAt
  ) {
    await throttleService.recordPasskeyVerifyFailure(
      identifier,
      input.ipAddress,
      operation.operationAt,
    );
    await recordAuthEvent(repos, {
      userId: challenge?.user_id ?? null,
      identifier,
      ipAddress: input.ipAddress,
      method: "passkey",
      stage: "verify",
      outcome: "failure",
      reason: challenge ? "challenge_expired" : "invalid_challenge",
      occurredAt: operation.operationAt,
    });
    await deleteLoginFlow(flow, repos);
    return Err({ kind: "invalid_credentials" });
  }

  try {
    const verification = await input.webauthnProvider.verifyAuthentication(
      input.response,
      challenge.challenge,
    );
    if (!verification.verified) {
      throw new PasskeyRequestError("Authentication verification failed");
    }
    if (challenge.user_id && verification.userId !== challenge.user_id) {
      throw new PasskeyRequestError("Credential user mismatch");
    }

    return Ok({
      challengeId: challenge.id,
      credential: verification,
      flowId: flow.id,
      identifier,
      method: "passkey",
      userId: verification.userId,
    });
  } catch (error: unknown) {
    if (!isPasskeyRequestError(error)) throw error;

    await throttleService.recordPasskeyVerifyFailure(
      identifier,
      input.ipAddress,
      operation.operationAt,
    );
    await recordAuthEvent(repos, {
      userId: challenge.user_id,
      identifier,
      ipAddress: input.ipAddress,
      method: "passkey",
      stage: "verify",
      outcome: "failure",
      reason: "assertion_invalid",
      occurredAt: operation.operationAt,
    });
    await deleteLoginFlow(flow, repos);
    return Err({ kind: "invalid_credentials" });
  }
}

import type { AuthenticationResponseJSON } from "@simplewebauthn/server";

import type { InvalidCredentialsError } from "~/lib/auth/errors";
import { deleteLoginFlow } from "~/lib/auth/login-flow/shared";
import { recordAuthEvent } from "~/lib/auth/security/auth-events";
import { createAuthThrottleService } from "~/server/auth/application/throttle-service";
import {
  isPasskeyRequestError,
  PasskeyRequestError,
  type VerifiedAuthenticationCredential,
  type WebauthnProvider,
} from "~/server/auth/factors/passkey-provider";
import type {
  AuthLoginFlowId,
  UserId,
  WebauthnChallengeId,
} from "~/server/shared/ids";
import { Err, Ok, type Result } from "~/server/shared/result";

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
    occurredAt: Date;
    webauthnProvider: WebauthnProvider;
  },
): Promise<Result<VerifiedPasskeyLogin, FinishPasskeyLoginError>> {
  const flow = await repos.loginFlows.findById(input.flowId);
  if (
    !flow ||
    flow.state !== "passkey" ||
    flow.expires_at < input.occurredAt ||
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
    now: () => input.occurredAt,
  });
  const throttle = await throttleService.checkPasskeyVerifyThrottle(
    identifier,
    input.ipAddress,
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
      occurredAt: input.occurredAt,
    });
    return Err({ kind: "invalid_credentials" });
  }

  if (
    !challenge ||
    challenge.type !== "authentication" ||
    challenge.expires_at < input.occurredAt
  ) {
    await throttleService.recordPasskeyVerifyFailure(
      identifier,
      input.ipAddress,
    );
    await recordAuthEvent(repos, {
      userId: challenge?.user_id ?? null,
      identifier,
      ipAddress: input.ipAddress,
      method: "passkey",
      stage: "verify",
      outcome: "failure",
      reason: challenge ? "challenge_expired" : "invalid_challenge",
      occurredAt: input.occurredAt,
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
    );
    await recordAuthEvent(repos, {
      userId: challenge.user_id,
      identifier,
      ipAddress: input.ipAddress,
      method: "passkey",
      stage: "verify",
      outcome: "failure",
      reason: "assertion_invalid",
      occurredAt: input.occurredAt,
    });
    await deleteLoginFlow(flow, repos);
    return Err({ kind: "invalid_credentials" });
  }
}

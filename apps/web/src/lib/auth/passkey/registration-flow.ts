import type {
  PublicKeyCredentialCreationOptionsJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/server";

import {
  checkPasskeyChallengeThrottle,
  checkPasskeyVerifyThrottle,
  clearPasskeyVerifyFailureState,
  recordPasskeyChallengeFailure,
  recordPasskeyVerifyFailure,
} from "~/lib/auth/password/throttle";
import { config } from "~/lib/config";
import { assertPositiveInt } from "~/lib/contracts/guards";
import type { Repositories } from "~/server/shared/registry";
import { Err, Ok, type Result } from "~/server/shared/result";

const INVALID_REQUEST = "Invalid passkey request";
const UNEXPECTED_FAILURE = "Unexpected passkey registration failure";

type PasskeyService = {
  getRegistrationOptions: (
    userId: number,
  ) => Promise<PublicKeyCredentialCreationOptionsJSON>;
  verifyRegistration: (
    userId: number,
    response: RegistrationResponseJSON,
    challenge: string,
  ) => Promise<{ verified: boolean }>;
};

type Deps = Pick<
  Repositories,
  "webauthnChallenges" | "auditLogs" | "authThrottle"
>;

export type PasskeyRegistrationFlowError =
  | { reason: "invalid_request"; message: string }
  | { reason: "unexpected"; message: string };

export type BeginPasskeyRegistrationFlowError = PasskeyRegistrationFlowError;

export async function beginPasskeyRegistrationFlow(
  userId: number,
  ipAddress: string,
  deps: Deps,
  passkeyService: PasskeyService,
): Promise<
  Result<
    {
      challengeId: number;
      options: PublicKeyCredentialCreationOptionsJSON;
    },
    BeginPasskeyRegistrationFlowError
  >
> {
  const identifier = `user:${userId}`;
  const throttle = await checkPasskeyChallengeThrottle(
    identifier,
    ipAddress,
    deps,
  );
  if (!throttle.allowed) {
    return Err({
      reason: "invalid_request",
      message: INVALID_REQUEST,
    });
  }

  let options: PublicKeyCredentialCreationOptionsJSON;
  try {
    options = await passkeyService.getRegistrationOptions(userId);
  } catch {
    await recordPasskeyChallengeFailure(identifier, ipAddress, deps);
    return Err({
      reason: "invalid_request",
      message: INVALID_REQUEST,
    });
  }

  try {
    const challengeId = await deps.webauthnChallenges.create({
      user_id: userId,
      type: "registration",
      challenge: options.challenge,
      expires_at: Date.now() + config.auth.webauthnChallengeTtlMs,
    });

    return Ok({ challengeId, options });
  } catch {
    return Err({
      reason: "unexpected",
      message: UNEXPECTED_FAILURE,
    });
  }
}

export async function finishPasskeyRegistrationFlow(
  userId: number,
  challengeId: number,
  response: RegistrationResponseJSON,
  ipAddress: string,
  deps: Deps,
  passkeyService: PasskeyService,
): Promise<Result<void, PasskeyRegistrationFlowError>> {
  const identifier = `user:${userId}`;

  let safeChallengeId: number;
  try {
    safeChallengeId = assertPositiveInt(challengeId, "challengeId");
  } catch {
    return Err({
      reason: "invalid_request",
      message: INVALID_REQUEST,
    });
  }

  try {
    const throttle = await checkPasskeyVerifyThrottle(
      identifier,
      ipAddress,
      deps,
    );
    if (!throttle.allowed) {
      return Err({
        reason: "invalid_request",
        message: INVALID_REQUEST,
      });
    }

    const challenge = await deps.webauthnChallenges.findById(safeChallengeId);
    if (
      !challenge ||
      challenge.type !== "registration" ||
      challenge.user_id !== userId
    ) {
      await recordPasskeyVerifyFailure(identifier, ipAddress, deps);
      return Err({
        reason: "invalid_request",
        message: INVALID_REQUEST,
      });
    }

    await deps.webauthnChallenges.delete(challenge.id);
    if (challenge.expires_at < Date.now()) {
      await recordPasskeyVerifyFailure(identifier, ipAddress, deps);
      return Err({
        reason: "invalid_request",
        message: INVALID_REQUEST,
      });
    }

    try {
      await passkeyService.verifyRegistration(
        userId,
        response,
        challenge.challenge,
      );
    } catch {
      await recordPasskeyVerifyFailure(identifier, ipAddress, deps);
      return Err({
        reason: "invalid_request",
        message: INVALID_REQUEST,
      });
    }

    await clearPasskeyVerifyFailureState(identifier, ipAddress, deps);
    await deps.auditLogs.create({
      user_id: userId,
      action: "passkey_registered",
      entity_type: "passkey",
      entity_id: userId,
      changes: null,
      created_at: Date.now(),
    });
    return Ok(undefined);
  } catch {
    return Err({
      reason: "unexpected",
      message: UNEXPECTED_FAILURE,
    });
  }
}

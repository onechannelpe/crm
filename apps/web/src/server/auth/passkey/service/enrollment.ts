import type { RegistrationResponseJSON } from "@simplewebauthn/server";

import { isPasskeyRequestError } from "~/lib/auth/providers/passkey-provider";
import { config } from "~/lib/config";
import { assertPositiveInt } from "~/lib/contracts/guards";
import { createAuthThrottleService } from "~/server/auth/application/throttle-service";
import { domainError } from "~/server/shared/domain-error";
import type { DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import type { PasskeyAuthRepos } from "./shared";
import { INVALID_PASSKEY_REQUEST } from "./shared";
import type { PasskeyEnrollmentChallenge } from "./types";

interface PasskeyEnrollmentServiceDeps {
  webauthnService: {
    getRegistrationOptions(
      userId: number,
    ): Promise<PasskeyEnrollmentChallenge["options"]>;
    verifyRegistration(
      userId: number,
      response: RegistrationResponseJSON,
      challenge: string,
    ): Promise<{ verified: boolean }>;
  };
}

interface BeginPasskeyEnrollmentInput {
  userId: number;
  ipAddress: string;
}

interface FinishPasskeyEnrollmentInput extends BeginPasskeyEnrollmentInput {
  challengeId: number;
  response: RegistrationResponseJSON;
}

export function createPasskeyEnrollmentService(
  repos: PasskeyAuthRepos,
  deps: PasskeyEnrollmentServiceDeps,
) {
  const throttleService = createAuthThrottleService({
    authThrottle: repos.authThrottle,
  });

  return {
    async beginEnrollment(
      input: BeginPasskeyEnrollmentInput,
    ): Promise<Result<PasskeyEnrollmentChallenge, DomainError>> {
      const identifier = `user:${input.userId}`;
      const throttle = await throttleService.checkPasskeyChallengeThrottle(
        identifier,
        input.ipAddress,
      );
      if (!throttle.allowed) {
        return Err(
          domainError("validation", "invalid_request", INVALID_PASSKEY_REQUEST),
        );
      }

      const options = await deps.webauthnService.getRegistrationOptions(
        input.userId,
      );

      const challengeId = await repos.webauthnChallenges.create({
        user_id: input.userId,
        type: "registration",
        challenge: options.challenge,
        expires_at: Date.now() + config.auth.webauthnChallengeTtlMs,
      });

      return Ok({ challengeId, options });
    },

    async finishEnrollment(
      input: FinishPasskeyEnrollmentInput,
    ): Promise<Result<void, DomainError>> {
      const identifier = `user:${input.userId}`;

      let safeChallengeId: number;
      try {
        safeChallengeId = assertPositiveInt(input.challengeId, "challengeId");
      } catch {
        return Err(
          domainError("validation", "invalid_request", INVALID_PASSKEY_REQUEST),
        );
      }

      const throttle = await throttleService.checkPasskeyVerifyThrottle(
        identifier,
        input.ipAddress,
      );
      if (!throttle.allowed) {
        return Err(
          domainError("validation", "invalid_request", INVALID_PASSKEY_REQUEST),
        );
      }

      const challenge =
        await repos.webauthnChallenges.findById(safeChallengeId);
      if (
        !challenge ||
        challenge.type !== "registration" ||
        challenge.user_id !== input.userId
      ) {
        await throttleService.recordPasskeyVerifyFailure(
          identifier,
          input.ipAddress,
        );
        return Err(
          domainError("validation", "invalid_request", INVALID_PASSKEY_REQUEST),
        );
      }

      await repos.webauthnChallenges.delete(challenge.id);
      if (challenge.expires_at < Date.now()) {
        await throttleService.recordPasskeyVerifyFailure(
          identifier,
          input.ipAddress,
        );
        return Err(
          domainError("validation", "invalid_request", INVALID_PASSKEY_REQUEST),
        );
      }

      try {
        await deps.webauthnService.verifyRegistration(
          input.userId,
          input.response,
          challenge.challenge,
        );
      } catch (error: unknown) {
        if (!isPasskeyRequestError(error)) {
          throw error;
        }

        await throttleService.recordPasskeyVerifyFailure(
          identifier,
          input.ipAddress,
        );
        return Err(
          domainError("validation", "invalid_request", INVALID_PASSKEY_REQUEST),
        );
      }

      await throttleService.clearPasskeyVerifyFailureState(
        identifier,
        input.ipAddress,
      );
      await repos.auditLogs.create({
        user_id: input.userId,
        action: "passkey_registered",
        entity_type: "passkey",
        entity_id: input.userId,
        changes: null,
        created_at: Date.now(),
      });
      return Ok(undefined);
    },
  };
}

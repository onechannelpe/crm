import type { RegistrationResponseJSON } from "@simplewebauthn/server";

import type { PasskeyEnrollmentChallenge } from "~/lib/auth/passkey/types";
import { config } from "~/lib/config";
import { createAuthThrottleService } from "~/server/auth/application/throttle-service";
import { isPasskeyRequestError } from "~/server/auth/factors/passkey-provider";
import { fail, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import type { PasskeyAuthRepos } from "./shared";

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
        return Err(fail("invalid_passkey_request"));
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

      if (!Number.isInteger(input.challengeId) || input.challengeId < 1) {
        return Err(fail("invalid_passkey_request"));
      }

      const throttle = await throttleService.checkPasskeyVerifyThrottle(
        identifier,
        input.ipAddress,
      );

      if (!throttle.allowed) {
        return Err(fail("invalid_passkey_request"));
      }

      const challenge = await repos.webauthnChallenges.findById(
        input.challengeId,
      );

      if (
        !challenge ||
        challenge.type !== "registration" ||
        challenge.user_id !== input.userId
      ) {
        await throttleService.recordPasskeyVerifyFailure(
          identifier,
          input.ipAddress,
        );

        return Err(fail("invalid_passkey_request"));
      }

      await repos.webauthnChallenges.delete(challenge.id);

      if (challenge.expires_at < Date.now()) {
        await throttleService.recordPasskeyVerifyFailure(
          identifier,
          input.ipAddress,
        );

        return Err(fail("invalid_passkey_request"));
      }

      try {
        const registration = await deps.webauthnService.verifyRegistration(
          input.userId,
          input.response,
          challenge.challenge,
        );

        if (!registration.verified) {
          await throttleService.recordPasskeyVerifyFailure(
            identifier,
            input.ipAddress,
          );

          return Err(fail("invalid_passkey_request"));
        }
      } catch (error: unknown) {
        if (!isPasskeyRequestError(error)) {
          throw error;
        }

        await throttleService.recordPasskeyVerifyFailure(
          identifier,
          input.ipAddress,
        );

        return Err(fail("invalid_passkey_request"));
      }

      await throttleService.clearPasskeyVerifyFailureState(
        identifier,
        input.ipAddress,
      );

      await repos.events.append({
        type: "passkey_registered",
        entityType: "passkey",
        entityId: input.userId,
        actorUserId: input.userId,
        occurredAt: Date.now(),
      });

      return Ok(undefined);
    },
  };
}

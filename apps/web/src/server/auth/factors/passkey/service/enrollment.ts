import type { RegistrationResponseJSON } from "@simplewebauthn/server";

import { auditEntityId } from "~/domain/audit/entity";
import type { PasskeyEnrollmentChallenge } from "~/domain/auth/passkey/types";
import { fail, type DomainError } from "~/domain/errors";
import type { UserId, WebauthnChallengeId } from "~/domain/ids";
import { createAuthThrottleService } from "~/server/auth/application/throttle-service";
import { AUTH_WEBAUTHN_CHALLENGE_TTL_MS } from "~/server/auth/config";
import {
  isPasskeyRequestError,
  type VerifiedRegistrationCredential,
  type WebauthnProvider,
} from "~/server/auth/factors/passkey-provider";
import { Err, Ok, type Result } from "~/shared/result";

import type { PasskeyAuthRepos } from "./shared";

type PasskeyEnrollmentRepos = Pick<
  PasskeyAuthRepos,
  "authThrottle" | "events" | "passkeys" | "webauthnChallenges"
>;

interface EnrollmentActor {
  userId: UserId;
  ipAddress: string;
}

interface BeginPasskeyEnrollmentInput extends EnrollmentActor {
  occurredAt: Date;
}

interface FinishPasskeyEnrollmentInput extends EnrollmentActor {
  challengeId: WebauthnChallengeId;
  response: RegistrationResponseJSON;
  verifiedAt: Date;
}

export interface VerifiedPasskeyEnrollment {
  userId: UserId;
  challengeId: WebauthnChallengeId;
  ipAddress: string;
  credential: VerifiedRegistrationCredential;
}

interface PreparedPasskeyEnrollment extends EnrollmentActor {
  occurredAt: Date;
  options: PasskeyEnrollmentChallenge["options"];
}

async function recordVerificationFailure(
  repos: PasskeyEnrollmentRepos,
  input: EnrollmentActor,
) {
  await createAuthThrottleService({
    authThrottle: repos.authThrottle,
  }).recordPasskeyVerifyFailure(`user:${input.userId}`, input.ipAddress);
}

export async function persistVerifiedPasskeyEnrollment(
  repos: PasskeyEnrollmentRepos,
  enrollment: VerifiedPasskeyEnrollment,
  occurredAt: Date,
): Promise<Result<void, DomainError>> {
  if (!(await repos.webauthnChallenges.consume(enrollment.challengeId))) {
    return Err(fail("invalid_passkey_request"));
  }

  await repos.passkeys.create({
    id: enrollment.credential.id,
    user_id: enrollment.userId,
    public_key: enrollment.credential.publicKey,
    counter: enrollment.credential.counter,
    transports: enrollment.credential.transports,
    created_at: occurredAt,
  });
  await createAuthThrottleService({
    authThrottle: repos.authThrottle,
  }).clearPasskeyVerifyFailureState(
    `user:${enrollment.userId}`,
    enrollment.ipAddress,
  );
  await repos.events.append({
    type: "passkey_registered",
    entityType: "passkey",
    entityId: auditEntityId("passkey", enrollment.userId),
    actorUserId: enrollment.userId,
    occurredAt,
  });

  return Ok(undefined);
}

export async function preparePasskeyEnrollment(
  repos: PasskeyEnrollmentRepos,
  webauthnProvider: Pick<WebauthnProvider, "getRegistrationOptions">,
  input: BeginPasskeyEnrollmentInput,
): Promise<Result<PreparedPasskeyEnrollment, DomainError>> {
  const throttleService = createAuthThrottleService({
    authThrottle: repos.authThrottle,
  });
  const throttle = await throttleService.checkPasskeyChallengeThrottle(
    `user:${input.userId}`,
    input.ipAddress,
  );
  if (!throttle.allowed) {
    return Err(fail("invalid_passkey_request"));
  }

  const options = await webauthnProvider.getRegistrationOptions(input.userId);
  return Ok({ ...input, options });
}

export async function persistPasskeyEnrollmentChallenge(
  repos: PasskeyEnrollmentRepos,
  prepared: PreparedPasskeyEnrollment,
): Promise<Result<PasskeyEnrollmentChallenge, DomainError>> {
  const challengeId = await repos.webauthnChallenges.create({
    user_id: prepared.userId,
    type: "registration",
    challenge: prepared.options.challenge,
    expires_at: new Date(
      prepared.occurredAt.getTime() + AUTH_WEBAUTHN_CHALLENGE_TTL_MS,
    ),
    created_at: prepared.occurredAt,
  });
  await repos.events.append({
    type: "passkey_registration_started",
    entityType: "passkey",
    entityId: auditEntityId("passkey", prepared.userId),
    actorUserId: prepared.userId,
    occurredAt: prepared.occurredAt,
  });
  return Ok({ challengeId, options: prepared.options });
}

export async function verifyPasskeyEnrollment(
  repos: PasskeyEnrollmentRepos,
  webauthnProvider: Pick<WebauthnProvider, "verifyRegistration">,
  input: FinishPasskeyEnrollmentInput,
): Promise<Result<VerifiedPasskeyEnrollment, DomainError>> {
  const throttleService = createAuthThrottleService({
    authThrottle: repos.authThrottle,
  });
  const identifier = `user:${input.userId}`;
  const throttle = await throttleService.checkPasskeyVerifyThrottle(
    identifier,
    input.ipAddress,
  );
  if (!throttle.allowed) {
    return Err(fail("invalid_passkey_request"));
  }

  const challenge = await repos.webauthnChallenges.findById(input.challengeId);
  if (
    !challenge ||
    challenge.type !== "registration" ||
    challenge.user_id !== input.userId
  ) {
    await recordVerificationFailure(repos, input);
    return Err(fail("invalid_passkey_request"));
  }
  if (challenge.expires_at < input.verifiedAt) {
    await repos.webauthnChallenges.delete(challenge.id);
    await recordVerificationFailure(repos, input);
    return Err(fail("invalid_passkey_request"));
  }

  try {
    const registration = await webauthnProvider.verifyRegistration(
      input.userId,
      input.response,
      challenge.challenge,
    );
    if (!registration.verified) {
      await recordVerificationFailure(repos, input);
      return Err(fail("invalid_passkey_request"));
    }

    return Ok({
      userId: input.userId,
      challengeId: input.challengeId,
      ipAddress: input.ipAddress,
      credential: registration.credential,
    });
  } catch (error: unknown) {
    if (!isPasskeyRequestError(error)) throw error;
    await recordVerificationFailure(repos, input);
    return Err(fail("invalid_passkey_request"));
  }
}

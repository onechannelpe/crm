"use server";

import type { RegistrationResponseJSON } from "@simplewebauthn/server";

import { getRequestEvent } from "solid-js/web";

import { requireAuth } from "~/lib/auth/access/session";
import { createPasskeyService } from "~/lib/auth/passkey/passkey";
import { getClientIp } from "~/lib/auth/password/client-ip";
import {
  checkPasskeyChallengeThrottle,
  checkPasskeyVerifyThrottle,
  clearPasskeyVerifyFailureState,
  recordPasskeyChallengeFailure,
  recordPasskeyVerifyFailure,
} from "~/lib/auth/password/throttle";
import { config } from "~/lib/config";
import { assertPositiveInt } from "~/lib/contracts/guards";
import { repos } from "~/server/shared/context";

const INVALID_REQUEST = "Invalid passkey request";

export interface PasskeyRegistrationChallengeResult {
  challengeId: number;
  options: Awaited<
    ReturnType<
      ReturnType<typeof createPasskeyService>["getRegistrationOptions"]
    >
  >;
}

export async function beginPasskeyRegistration(): Promise<PasskeyRegistrationChallengeResult> {
  const session = await requireAuth();
  const event = getRequestEvent();
  const ipAddress = getClientIp(event?.request.headers ?? new Headers());
  const identifier = `user:${session.userId}`;
  const throttle = await checkPasskeyChallengeThrottle(identifier, ipAddress);
  if (!throttle.allowed) throw new Error(INVALID_REQUEST);

  let options: Awaited<
    ReturnType<
      ReturnType<typeof createPasskeyService>["getRegistrationOptions"]
    >
  >;
  try {
    const passkeyService = createPasskeyService(repos);
    options = await passkeyService.getRegistrationOptions(session.userId);
  } catch {
    await recordPasskeyChallengeFailure(identifier, ipAddress);
    throw new Error(INVALID_REQUEST);
  }

  const challengeId = await repos.webauthnChallenges.create({
    user_id: session.userId,
    type: "registration",
    challenge: options.challenge,
    expires_at: Date.now() + config.auth.webauthnChallengeTtlMs,
  });

  return { challengeId, options };
}

export async function finishPasskeyRegistration(
  challengeId: number,
  response: RegistrationResponseJSON,
): Promise<void> {
  const session = await requireAuth();
  const safeChallengeId = assertPositiveInt(challengeId, "challengeId");
  const event = getRequestEvent();
  const ipAddress = getClientIp(event?.request.headers ?? new Headers());
  const identifier = `user:${session.userId}`;
  const throttle = await checkPasskeyVerifyThrottle(identifier, ipAddress);
  if (!throttle.allowed) throw new Error(INVALID_REQUEST);

  const challenge = await repos.webauthnChallenges.findById(safeChallengeId);
  if (
    !challenge ||
    challenge.type !== "registration" ||
    challenge.user_id !== session.userId
  ) {
    await recordPasskeyVerifyFailure(identifier, ipAddress);
    throw new Error(INVALID_REQUEST);
  }

  await repos.webauthnChallenges.delete(challenge.id);
  if (challenge.expires_at < Date.now()) {
    await recordPasskeyVerifyFailure(identifier, ipAddress);
    throw new Error(INVALID_REQUEST);
  }

  const passkeyService = createPasskeyService(repos);
  try {
    await passkeyService.verifyRegistration(
      session.userId,
      response,
      challenge.challenge,
    );
  } catch {
    await recordPasskeyVerifyFailure(identifier, ipAddress);
    throw new Error(INVALID_REQUEST);
  }

  await clearPasskeyVerifyFailureState(identifier, ipAddress);
  await repos.auditLogs.create({
    user_id: session.userId,
    action: "passkey_registered",
    entity_type: "passkey",
    entity_id: session.userId,
    changes: null,
    created_at: Date.now(),
  });
}

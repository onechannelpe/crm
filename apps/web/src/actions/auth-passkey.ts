"use server";

import type { AuthenticationResponseJSON } from "@simplewebauthn/server";

import { getRequestEvent } from "solid-js/web";

import type { Role } from "~/lib/auth/access/rbac";

import { createPasskeyService } from "~/lib/auth/passkey/passkey";
import { getClientIp } from "~/lib/auth/password/client-ip";
import {
  checkPasskeyChallengeThrottle,
  checkPasskeyVerifyThrottle,
  clearPasskeyVerifyFailureState,
  recordPasskeyChallengeFailure,
  recordPasskeyVerifyFailure,
} from "~/lib/auth/password/throttle";
import { getSessionCookie, setSessionCookie } from "~/lib/auth/session/cookies";
import {
  createSession,
  invalidateSession,
} from "~/lib/auth/session/session-manager";
import { hashSessionToken } from "~/lib/auth/session/tokens";
import { config } from "~/lib/config";
import {
  assertNonEmptyString,
  assertPositiveInt,
} from "~/lib/contracts/guards";
import { repos } from "~/server/shared/context";

const INVALID_CREDENTIALS = "Invalid credentials";

export interface PasskeyChallengeResult {
  challengeId: number;
  options: Awaited<
    ReturnType<
      ReturnType<typeof createPasskeyService>["getAuthenticationOptions"]
    >
  >;
}

export interface PasskeyLoginResult {
  userId: number;
  role: Role;
}

export async function beginPasskeyLogin(
  email: string,
): Promise<PasskeyChallengeResult> {
  const safeEmail = assertNonEmptyString(email, "email");
  const event = getRequestEvent();
  const ipAddress = getClientIp(event?.request.headers ?? new Headers());

  const throttle = await checkPasskeyChallengeThrottle(safeEmail, ipAddress);
  if (!throttle.allowed) throw new Error(INVALID_CREDENTIALS);

  const user = await repos.users.findByEmail(safeEmail);
  if (!user || !user.is_active) {
    await recordPasskeyChallengeFailure(safeEmail, ipAddress);
    throw new Error(INVALID_CREDENTIALS);
  }

  const passkeyService = createPasskeyService(repos);
  const options = await passkeyService.getAuthenticationOptions(user.id);
  const challengeId = await repos.webauthnChallenges.create({
    user_id: user.id,
    type: "authentication",
    challenge: options.challenge,
    expires_at: Date.now() + config.auth.webauthnChallengeTtlMs,
  });

  return { challengeId, options };
}

export async function finishPasskeyLogin(
  challengeId: number,
  response: AuthenticationResponseJSON,
): Promise<PasskeyLoginResult> {
  const safeChallengeId = assertPositiveInt(challengeId, "challengeId");
  const event = getRequestEvent();
  const ipAddress = getClientIp(event?.request.headers ?? new Headers());
  const userAgent = event?.request.headers.get("user-agent") ?? null;
  const challenge = await repos.webauthnChallenges.findById(safeChallengeId);
  const identifier = challenge?.user_id
    ? `user:${challenge.user_id}`
    : `challenge:${safeChallengeId}`;
  const throttle = await checkPasskeyVerifyThrottle(identifier, ipAddress);

  if (!throttle.allowed) throw new Error(INVALID_CREDENTIALS);
  if (!challenge || challenge.type !== "authentication") {
    await recordPasskeyVerifyFailure(identifier, ipAddress);
    throw new Error(INVALID_CREDENTIALS);
  }

  await repos.webauthnChallenges.delete(challenge.id);
  if (challenge.expires_at < Date.now()) {
    await recordPasskeyVerifyFailure(identifier, ipAddress);
    throw new Error(INVALID_CREDENTIALS);
  }

  const passkeyService = createPasskeyService(repos);

  let verifiedUserId: number;
  try {
    const verification = await passkeyService.verifyAuthentication(
      response,
      challenge.challenge,
    );
    verifiedUserId = verification.userId;
  } catch {
    await recordPasskeyVerifyFailure(identifier, ipAddress);
    throw new Error(INVALID_CREDENTIALS);
  }

  const user = await repos.users.findById(verifiedUserId);
  if (!user || !user.is_active) {
    await recordPasskeyVerifyFailure(identifier, ipAddress);
    throw new Error(INVALID_CREDENTIALS);
  }

  await clearPasskeyVerifyFailureState(identifier, ipAddress);

  const oldToken = getSessionCookie();
  if (oldToken) {
    const oldSessionId = hashSessionToken(oldToken);
    await invalidateSession(oldSessionId).catch(() => {});
  }

  const token = await createSession(
    user.id,
    user.branch_id,
    user.role,
    ipAddress,
    userAgent,
  );
  setSessionCookie(token);

  await repos.auditLogs.create({
    user_id: user.id,
    action: "login_passkey",
    entity_type: "user",
    entity_id: user.id,
    changes: null,
    created_at: Date.now(),
  });

  return { userId: user.id, role: user.role };
}

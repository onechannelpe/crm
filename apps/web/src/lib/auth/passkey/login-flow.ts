import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/server";

import { checkPasskeyChallengeThrottle } from "~/lib/auth/password/throttle";
import {
  checkPasskeyVerifyThrottle,
  clearPasskeyVerifyFailureState,
  recordPasskeyChallengeFailure,
  recordPasskeyVerifyFailure,
} from "~/lib/auth/password/throttle";
import { recordAuthEvent } from "~/lib/auth/security/auth-events";
import { sendAlertOnNewLoginSource } from "~/lib/auth/security/login-source-alert";
import { config } from "~/lib/config";
import {
  assertNonEmptyString,
  assertPositiveInt,
} from "~/lib/contracts/guards";
import type { Repositories } from "~/server/shared/registry";

const INVALID_CREDENTIALS = "Invalid credentials";

type PasskeyService = {
  getAuthenticationOptions: (
    userId?: number,
  ) => Promise<PublicKeyCredentialRequestOptionsJSON>;
  verifyAuthentication: (
    response: AuthenticationResponseJSON,
    challenge: string,
  ) => Promise<{ verified: boolean; userId: number }>;
};

type Deps = Pick<
  Repositories,
  "users" | "webauthnChallenges" | "auditLogs" | "authThrottle" | "authEvents"
>;

export async function beginPasskeyLoginFlow(
  email: string,
  ipAddress: string,
  deps: Deps,
  passkeyService: PasskeyService,
): Promise<{
  challengeId: number;
  options: PublicKeyCredentialRequestOptionsJSON;
}> {
  const safeEmail = assertNonEmptyString(email, "email");
  const throttle = await checkPasskeyChallengeThrottle(
    safeEmail,
    ipAddress,
    deps,
  );
  if (!throttle.allowed) {
    const blockedUser = await deps.users.findByEmail(safeEmail);
    await recordAuthEvent(deps, {
      userId: blockedUser?.id ?? null,
      identifier: safeEmail,
      ipAddress,
      method: "passkey",
      stage: "challenge",
      outcome: "throttled",
      reason: "threshold_exceeded",
    });
    throw new Error(INVALID_CREDENTIALS);
  }

  const user = await deps.users.findByEmail(safeEmail);
  if (!user || !user.is_active) {
    await recordPasskeyChallengeFailure(safeEmail, ipAddress, deps);
    await recordAuthEvent(deps, {
      userId: user?.id ?? null,
      identifier: safeEmail,
      ipAddress,
      method: "passkey",
      stage: "challenge",
      outcome: "failure",
      reason: user ? "inactive_user" : "user_not_found",
    });
    throw new Error(INVALID_CREDENTIALS);
  }

  const options = await passkeyService.getAuthenticationOptions(user.id);
  const challengeId = await deps.webauthnChallenges.create({
    user_id: user.id,
    type: "authentication",
    challenge: options.challenge,
    expires_at: Date.now() + config.auth.webauthnChallengeTtlMs,
  });

  return { challengeId, options };
}

export async function finishPasskeyLoginFlow(
  challengeId: number,
  response: AuthenticationResponseJSON,
  ipAddress: string,
  deps: Deps,
  passkeyService: PasskeyService,
): Promise<{ userId: number }> {
  const safeChallengeId = assertPositiveInt(challengeId, "challengeId");
  const challenge = await deps.webauthnChallenges.findById(safeChallengeId);
  const identifier = challenge?.user_id
    ? `user:${challenge.user_id}`
    : `challenge:${safeChallengeId}`;
  const throttle = await checkPasskeyVerifyThrottle(
    identifier,
    ipAddress,
    deps,
  );
  if (!throttle.allowed) {
    await recordAuthEvent(deps, {
      userId: challenge?.user_id ?? null,
      identifier,
      ipAddress,
      method: "passkey",
      stage: "verify",
      outcome: "throttled",
      reason: "threshold_exceeded",
    });
    throw new Error(INVALID_CREDENTIALS);
  }
  if (!challenge || challenge.type !== "authentication") {
    await recordPasskeyVerifyFailure(identifier, ipAddress, deps);
    await recordAuthEvent(deps, {
      userId: null,
      identifier,
      ipAddress,
      method: "passkey",
      stage: "verify",
      outcome: "failure",
      reason: "invalid_challenge",
    });
    throw new Error(INVALID_CREDENTIALS);
  }

  await deps.webauthnChallenges.delete(challenge.id);
  if (challenge.expires_at < Date.now()) {
    await recordPasskeyVerifyFailure(identifier, ipAddress, deps);
    await recordAuthEvent(deps, {
      userId: challenge.user_id,
      identifier,
      ipAddress,
      method: "passkey",
      stage: "verify",
      outcome: "failure",
      reason: "challenge_expired",
    });
    throw new Error(INVALID_CREDENTIALS);
  }

  let verifiedUserId: number;
  try {
    const verification = await passkeyService.verifyAuthentication(
      response,
      challenge.challenge,
    );
    verifiedUserId = verification.userId;
  } catch {
    await recordPasskeyVerifyFailure(identifier, ipAddress, deps);
    await recordAuthEvent(deps, {
      userId: challenge.user_id,
      identifier,
      ipAddress,
      method: "passkey",
      stage: "verify",
      outcome: "failure",
      reason: "assertion_invalid",
    });
    throw new Error(INVALID_CREDENTIALS);
  }

  const user = await deps.users.findById(verifiedUserId);
  if (!user || !user.is_active) {
    await recordPasskeyVerifyFailure(identifier, ipAddress, deps);
    await recordAuthEvent(deps, {
      userId: user?.id ?? verifiedUserId,
      identifier,
      ipAddress,
      method: "passkey",
      stage: "verify",
      outcome: "failure",
      reason: user ? "inactive_user" : "user_not_found",
    });
    throw new Error(INVALID_CREDENTIALS);
  }

  await sendAlertOnNewLoginSource({
    user,
    ipAddress,
    method: "passkey",
    deps,
  });
  await clearPasskeyVerifyFailureState(identifier, ipAddress, deps);
  await recordAuthEvent(deps, {
    userId: user.id,
    identifier,
    ipAddress,
    method: "passkey",
    stage: "verify",
    outcome: "success",
  });
  return { userId: user.id };
}

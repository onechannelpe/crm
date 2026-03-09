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
import type { SendPrivilegedLoginAlert } from "~/lib/auth/security/privileged-login-alert";
import { config } from "~/lib/config";
import {
  assertNonEmptyString,
  assertPositiveInt,
} from "~/lib/contracts/guards";
import type { Repositories } from "~/server/shared/registry";
import { Err, Ok, type Result } from "~/server/shared/result";

import type { InvalidCredentialsError } from "../errors";

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
  username: string,
  ipAddress: string,
  deps: Deps,
  passkeyService: PasskeyService,
): Promise<
  Result<
    {
      challengeId: number;
      userId: number;
      options: PublicKeyCredentialRequestOptionsJSON;
    },
    InvalidCredentialsError
  >
> {
  const safeUsername = assertNonEmptyString(username, "username");
  const throttle = await checkPasskeyChallengeThrottle(
    safeUsername,
    ipAddress,
    deps,
  );
  if (!throttle.allowed) {
    const blockedUser = await deps.users.findByUsername(safeUsername);
    await recordAuthEvent(deps, {
      userId: blockedUser?.id ?? null,
      identifier: safeUsername,
      ipAddress,
      method: "passkey",
      stage: "challenge",
      outcome: "throttled",
      reason: "threshold_exceeded",
    });
    return Err({ kind: "invalid_credentials" });
  }

  const user = await deps.users.findByUsername(safeUsername);
  if (!user || !user.is_active) {
    await recordPasskeyChallengeFailure(safeUsername, ipAddress, deps);
    await recordAuthEvent(deps, {
      userId: user?.id ?? null,
      identifier: safeUsername,
      ipAddress,
      method: "passkey",
      stage: "challenge",
      outcome: "failure",
      reason: user ? "inactive_user" : "user_not_found",
    });
    return Err({ kind: "invalid_credentials" });
  }

  const options = await passkeyService.getAuthenticationOptions(user.id);
  const challengeId = await deps.webauthnChallenges.create({
    user_id: user.id,
    type: "authentication",
    challenge: options.challenge,
    expires_at: Date.now() + config.auth.webauthnChallengeTtlMs,
  });

  return Ok({ challengeId, userId: user.id, options });
}

export async function finishPasskeyLoginFlow(
  challengeId: number,
  response: AuthenticationResponseJSON,
  ipAddress: string,
  deps: Deps,
  passkeyService: PasskeyService,
  sendPrivilegedLoginAlert: SendPrivilegedLoginAlert,
): Promise<Result<{ userId: number }, InvalidCredentialsError>> {
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
    return Err({ kind: "invalid_credentials" });
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
    return Err({ kind: "invalid_credentials" });
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
    return Err({ kind: "invalid_credentials" });
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
    return Err({ kind: "invalid_credentials" });
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
    return Err({ kind: "invalid_credentials" });
  }

  await sendAlertOnNewLoginSource({
    user,
    ipAddress,
    method: "passkey",
    deps,
    sendPrivilegedLoginAlert,
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
  return Ok({ userId: user.id });
}

import type { RegistrationResponseJSON } from "@simplewebauthn/server";

import type { WebauthnProvider } from "~/server/auth/factors/passkey-provider";
import { createPasskeyEnrollmentAuthService } from "~/server/auth/factors/passkey/service";
import { issueRecoveryCodesIfAbsent } from "~/server/auth/recovery/issue-recovery-codes";
import { createSessionService } from "~/server/auth/session/session.service";
import type { DomainError } from "~/server/shared/domain-error";
import type { UserId, WebauthnChallengeId } from "~/server/shared/ids";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

import type { AuthOnboardingRepos } from "../infrastructure/onboarding-context";

function createEnrollmentService(
  repos: AuthOnboardingRepos,
  input: {
    webauthnProvider: WebauthnProvider;
  },
) {
  return createPasskeyEnrollmentAuthService(repos, {
    webauthnProvider: input.webauthnProvider,
  });
}

export function beginPasskeyEnrollment(
  repos: AuthOnboardingRepos,
  input: {
    userId: UserId;
    ipAddress: string;
    webauthnProvider: WebauthnProvider;
  },
) {
  return createEnrollmentService(repos, input).beginEnrollment({
    userId: input.userId,
    ipAddress: input.ipAddress,
  });
}

// Complete registration without establishing a session; onboarding establishes
// it after completion.
export async function enrollPasskey(
  repos: AuthOnboardingRepos,
  input: {
    userId: UserId;
    challengeId: WebauthnChallengeId;
    response: RegistrationResponseJSON;
    ipAddress: string;
    webauthnProvider: WebauthnProvider;
  },
): Promise<Result<void, DomainError>> {
  const result = await createEnrollmentService(repos, input).finishEnrollment({
    userId: input.userId,
    challengeId: input.challengeId,
    response: input.response,
    ipAddress: input.ipAddress,
  });
  if (isErr(result)) {
    return Err(result.error);
  }

  return Ok(undefined);
}

export async function finishPasskeyEnrollment(
  repos: AuthOnboardingRepos,
  input: {
    session: {
      userId: UserId;
      sessionClass: "pre_auth" | "app";
      primaryAuthMethod: "password" | "google" | "passkey";
    };
    challengeId: WebauthnChallengeId;
    response: RegistrationResponseJSON;
    ipAddress: string;
    userAgent: string | null;
    webauthnProvider: WebauthnProvider;
  },
): Promise<
  Result<{ sessionToken: string; recoveryCodes: string[] }, DomainError>
> {
  const result = await enrollPasskey(repos, {
    userId: input.session.userId,
    challengeId: input.challengeId,
    response: input.response,
    ipAddress: input.ipAddress,
    webauthnProvider: input.webauthnProvider,
  });
  if (isErr(result)) {
    return result;
  }

  const user = await repos.users.findById(input.session.userId);
  if (!user) {
    throw new Error("No se pudo configurar la clave de acceso");
  }

  // Return newly issued codes for one-time display; an existing set remains hidden.
  const recoveryCodes =
    (await issueRecoveryCodesIfAbsent(repos, user.id)) ?? [];

  const issued = await createSessionService(repos).establish({
    user,
    sessionClass: input.session.sessionClass,
    request: {
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    },
    primaryAuthMethod: input.session.primaryAuthMethod,
    strongAuthMethod: "passkey",
    strongAuthAt: new Date(),
  });

  return Ok({ sessionToken: issued.token, recoveryCodes });
}

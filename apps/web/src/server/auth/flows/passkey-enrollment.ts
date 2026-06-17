import type { RegistrationResponseJSON } from "@simplewebauthn/server";

import type { WebauthnProvider } from "~/server/auth/factors/passkey-provider";
import { createPasskeyEnrollmentAuthService } from "~/server/auth/factors/passkey/service";
import { createSessionService } from "~/server/auth/session/session.service";
import type { DomainError } from "~/server/shared/domain-error";
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
    userId: number;
    ipAddress: string;
    webauthnProvider: WebauthnProvider;
  },
) {
  return createEnrollmentService(repos, input).beginEnrollment({
    userId: input.userId,
    ipAddress: input.ipAddress,
  });
}

/**
 * Register a passkey credential for a user without touching their session. The
 * onboarding flow uses this directly: the final app session is established by
 * `completeOnboarding`, so enrolling a credential here must not mint a session
 * of its own (doing both would double-issue).
 */
export async function enrollPasskey(
  repos: AuthOnboardingRepos,
  input: {
    userId: number;
    challengeId: number;
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

/**
 * Enroll a passkey for an already-authenticated user and re-establish their
 * session as a passkey step-up. Used by the security settings flow, where the
 * user already holds an app session that should now reflect the new strong
 * factor.
 */
export async function finishPasskeyEnrollment(
  repos: AuthOnboardingRepos,
  input: {
    session: {
      userId: number;
      sessionClass: "pre_auth" | "app";
      primaryAuthMethod: "password" | "google" | "passkey";
    };
    challengeId: number;
    response: RegistrationResponseJSON;
    ipAddress: string;
    userAgent: string | null;
    webauthnProvider: WebauthnProvider;
  },
): Promise<Result<{ sessionToken: string }, DomainError>> {
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

  const issued = await createSessionService(repos).establish({
    user,
    sessionClass: input.session.sessionClass,
    request: {
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    },
    primaryAuthMethod: input.session.primaryAuthMethod,
    strongAuthMethod: "passkey",
    strongAuthAt: Date.now(),
  });

  return Ok({ sessionToken: issued.token });
}

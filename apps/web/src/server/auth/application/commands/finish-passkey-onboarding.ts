import type { RegistrationResponseJSON } from "@simplewebauthn/server";

import {
  issueSessionTransition,
  replaceCurrentSession,
} from "~/lib/auth/session/session-transition";
import { createPasskeyEnrollmentAuthService } from "~/server/auth/passkey/service";
import type { PasskeyWebauthnProviderFactory } from "~/server/auth/passkey/service";
import type { DomainError } from "~/server/shared/domain-error";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

import type { AuthOnboardingRepos } from "../../infrastructure/onboarding-context";

function createEnrollmentService(
  repos: AuthOnboardingRepos,
  input: {
    createWebauthnProvider: PasskeyWebauthnProviderFactory;
  },
) {
  return createPasskeyEnrollmentAuthService(repos, {
    createWebauthnProvider: input.createWebauthnProvider,
  });
}

export async function finishPasskeyOnboarding(
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
    createWebauthnProvider: PasskeyWebauthnProviderFactory;
    invalidateSession(sessionId: string): Promise<void>;
  },
): Promise<Result<void, DomainError>> {
  const result = await createEnrollmentService(repos, input).finishEnrollment({
    userId: input.session.userId,
    challengeId: input.challengeId,
    response: input.response,
    ipAddress: input.ipAddress,
  });
  if (isErr(result)) {
    return Err(result.error);
  }

  const user = await repos.users.findById(input.session.userId);
  if (!user) {
    return Err({
      kind: "unexpected",
      code: "user_not_found",
      message: "No se pudo configurar la clave de acceso",
    });
  }

  const issued = await issueSessionTransition({
    user,
    sessionClass: input.session.sessionClass,
    request: {
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    },
    primaryAuthMethod: input.session.primaryAuthMethod,
    strongAuthMethod: "passkey",
    strongAuthAt: Date.now(),
    deps: repos,
  });
  await replaceCurrentSession(issued.token, (sessionId) =>
    input.invalidateSession(sessionId),
  );
  return Ok(undefined);
}

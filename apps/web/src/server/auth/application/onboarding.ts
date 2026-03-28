import type { RegistrationResponseJSON } from "@simplewebauthn/server";

import { getDefaultAppPath } from "~/lib/auth/access/route-policy";
import { createPasskeyEnrollmentAuthService } from "~/lib/auth/passkey/service";
import { requiresStrongAuthRole } from "~/lib/auth/security/strong-auth-status";
import {
  issueSessionTransition,
  replaceCurrentSession,
} from "~/lib/auth/session/session-transition";
import type { DomainError } from "~/server/shared/domain-error";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";
import {
  completeAccountOnboardingWithRepos,
  type CompleteOnboardingError,
} from "~/server/users/service-account-onboarding";

import type { AuthDeps } from "../infrastructure/deps";

type EnrollmentProviderFactory = NonNullable<
  Parameters<typeof createPasskeyEnrollmentAuthService>[1]
>["createWebauthnProvider"];

function createEnrollmentService(
  deps: Pick<AuthDeps, "repos">,
  input: {
    createWebauthnProvider: EnrollmentProviderFactory;
  },
) {
  return createPasskeyEnrollmentAuthService(deps.repos, {
    createWebauthnProvider: input.createWebauthnProvider,
  });
}

export function beginPasskeyRegistration(
  deps: Pick<AuthDeps, "repos">,
  input: {
    userId: number;
    ipAddress: string;
    createWebauthnProvider: EnrollmentProviderFactory;
  },
) {
  return createEnrollmentService(deps, input).beginEnrollment({
    userId: input.userId,
    ipAddress: input.ipAddress,
  });
}

export async function finishPasskeyRegistration(
  deps: Pick<AuthDeps, "repos">,
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
    createWebauthnProvider: EnrollmentProviderFactory;
  },
): Promise<Result<void, DomainError>> {
  const result = await createEnrollmentService(deps, input).finishEnrollment({
    userId: input.session.userId,
    challengeId: input.challengeId,
    response: input.response,
    ipAddress: input.ipAddress,
  });
  if (isErr(result)) {
    return Err(result.error);
  }

  const user = await deps.repos.users.findById(input.session.userId);
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
    deps: deps.repos,
  });
  await replaceCurrentSession(issued.token);
  return Ok(undefined);
}

export async function completeOnboarding(
  deps: Pick<AuthDeps, "repos" | "runInRepositoryTransaction">,
  input: {
    session: {
      userId: number;
      role: Parameters<typeof getDefaultAppPath>[0];
      primaryAuthMethod: "password" | "google" | "passkey";
      strongAuthMethod: "totp" | "passkey" | "federated" | null;
      strongAuthAt: number | null;
    };
    phoneE164: string;
    ipAddress: string;
    userAgent: string | null;
  },
): Promise<Result<{ redirectTo: string }, CompleteOnboardingError>> {
  const result = await deps.runInRepositoryTransaction((transactionRepos) =>
    completeAccountOnboardingWithRepos(transactionRepos, {
      userId: input.session.userId,
      phoneE164: input.phoneE164,
    }),
  );
  if (isErr(result)) {
    return result;
  }

  const user = await deps.repos.users.findById(input.session.userId);
  if (!user) {
    return Err({
      kind: "unexpected",
      code: "unexpected",
      message: "No se pudo completar el registro",
    });
  }

  const strongAuthMethod = input.session.strongAuthMethod;
  const strongAuthAt =
    strongAuthMethod === null
      ? null
      : (input.session.strongAuthAt ?? Date.now());

  if (requiresStrongAuthRole(user.role) && strongAuthMethod === null) {
    return Err({
      kind: "conflict",
      code: "strong_auth_required",
      message: "Strong authentication setup required",
    });
  }

  const issued = await issueSessionTransition({
    user,
    sessionClass: "app",
    request: {
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    },
    primaryAuthMethod: input.session.primaryAuthMethod,
    strongAuthMethod,
    strongAuthAt,
    deps: deps.repos,
  });
  await replaceCurrentSession(issued.token);
  return Ok({ redirectTo: getDefaultAppPath(input.session.role) });
}

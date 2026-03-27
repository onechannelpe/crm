import type { RegistrationResponseJSON } from "@simplewebauthn/server";

import { createRequestPasskeyProviderFactory } from "~/actions/auth/shared/request-passkey-provider";
import { getDefaultAppPath } from "~/lib/auth/access/route-policy";
import { createPasskeyEnrollmentAuthService } from "~/lib/auth/passkey/service";
import {
  issueSessionTransition,
  replaceCurrentSession,
} from "~/lib/auth/session/session-transition";
import { requiresStrongAuthRole } from "~/lib/auth/security/strong-auth-status";
import { repos, runInRepositoryTransaction } from "~/server/shared/context";
import type { DomainError } from "~/server/shared/domain-error";
import {
  completeAccountOnboardingWithRepos,
  type CompleteOnboardingError,
} from "~/server/users/service-account-onboarding";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

function createEnrollmentService() {
  return createPasskeyEnrollmentAuthService(repos, {
    createWebauthnProvider: createRequestPasskeyProviderFactory(),
  });
}

export function beginPasskeyRegistration(input: {
  userId: number;
  ipAddress: string;
}) {
  return createEnrollmentService().beginEnrollment(input);
}

export async function finishPasskeyRegistration(input: {
  session: {
    userId: number;
    sessionClass: "pre_auth" | "app";
    primaryAuthMethod: "password" | "google" | "passkey";
  };
  challengeId: number;
  response: RegistrationResponseJSON;
  ipAddress: string;
  userAgent: string | null;
}): Promise<Result<void, DomainError>> {
  const result = await createEnrollmentService().finishEnrollment({
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
  await replaceCurrentSession(issued.token);
  return Ok(undefined);
}

export async function completeOnboarding(input: {
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
}): Promise<Result<{ redirectTo: string }, CompleteOnboardingError>> {
  const result = await runInRepositoryTransaction((transactionRepos) =>
    completeAccountOnboardingWithRepos(transactionRepos, {
      userId: input.session.userId,
      phoneE164: input.phoneE164,
    }),
  );
  if (isErr(result)) {
    return result;
  }

  const user = await repos.users.findById(input.session.userId);
  if (!user) {
    return Err({
      kind: "unexpected",
      code: "user_not_found",
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
    deps: repos,
  });
  await replaceCurrentSession(issued.token);
  return Ok({ redirectTo: getDefaultAppPath(input.session.role) });
}

"use server";

import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import { getRequestEvent } from "solid-js/web";

import {
  conflictError,
  internalError,
  validationError,
} from "~/lib/app-errors";
import { getDefaultAppPath } from "~/lib/auth/access/route-policy";
import { requireSession } from "~/lib/auth/access/session";
import { createPasskeyEnrollmentAuthService } from "~/lib/auth/passkey/service";
import { getClientIp } from "~/lib/auth/password/client-ip";
import { requiresStrongAuthRole } from "~/lib/auth/security/strong-auth-status";
import {
  issueSessionTransition,
  replaceCurrentSession,
} from "~/lib/auth/session/session-transition";
import { repos, runInRepositoryTransaction } from "~/server/shared/context";
import type { DomainError } from "~/server/shared/domain-error";
import { Err, isErr, type Result } from "~/server/shared/result";
import {
  completeAccountOnboardingWithRepos,
  type CompleteOnboardingError,
} from "~/server/users/service-account-onboarding";

function normalizePeruvianPhone(value: string): string {
  const v = value.replace(/\s+/g, "").trim();
  if (/^\+51\d{9}$/.test(v)) return v;
  if (/^\d{9}$/.test(v)) return `+51${v}`;
  throw validationError("El número debe tener 9 dígitos");
}

function resolveRedirect(
  role: Awaited<ReturnType<typeof requireSession>>["role"],
) {
  return { redirectTo: getDefaultAppPath(role) };
}

async function promoteCompletedOnboardingSession(
  session: Awaited<ReturnType<typeof requireSession>>,
  proof?: {
    strongAuthMethod: "totp" | "passkey" | "federated";
    strongAuthAt: number;
  },
): Promise<void> {
  const user = await repos.users.findById(session.userId);
  if (!user) {
    throw internalError("No se pudo completar el registro");
  }

  const event = getRequestEvent();
  const ipAddress = getClientIp(event?.request.headers ?? new Headers());
  const userAgent = event?.request.headers.get("user-agent") ?? null;
  const strongAuthMethod = proof?.strongAuthMethod ?? session.strongAuthMethod;
  const strongAuthAt =
    strongAuthMethod === null
      ? null
      : (proof?.strongAuthAt ?? session.strongAuthAt ?? Date.now());

  if (requiresStrongAuthRole(user.role) && strongAuthMethod === null) {
    throw conflictError("No se pudo completar el registro");
  }

  const issued = await issueSessionTransition({
    user,
    sessionClass: "app",
    request: {
      ipAddress,
      userAgent,
    },
    primaryAuthMethod: session.primaryAuthMethod,
    strongAuthMethod,
    strongAuthAt,
    deps: repos,
  });
  await replaceCurrentSession(issued.token);
}

function mapCompleteOnboardingError(error: CompleteOnboardingError): never {
  switch (error.code) {
    case "user_not_found":
      throw internalError("No se pudo completar el registro");
    case "strong_auth_required":
      throw conflictError(error.message);
    case "unexpected":
      throw internalError(error.message);
  }
}

function mapOnboardingFailure(
  error: DomainError | CompleteOnboardingError,
  options: {
    userNotFoundMessage?: string;
  } = {},
): never {
  switch (error.code) {
    case "user_not_found":
      throw internalError(
        options.userNotFoundMessage ?? "No se pudo completar el registro",
      );
    case "strong_auth_required":
      throw conflictError(error.message);
    case "invalid_request":
      throw internalError("No se pudo configurar la clave de acceso");
    default:
      throw internalError(error.message);
  }
}

type CompletePasskeyOnboardingResult = Result<
  void,
  DomainError | CompleteOnboardingError
>;

export async function completeOnboarding(
  phoneE164: string,
): Promise<{ redirectTo: string }> {
  const session = await requireSession();
  const safePhone = normalizePeruvianPhone(phoneE164);
  const result = await runInRepositoryTransaction((transactionRepos) =>
    completeAccountOnboardingWithRepos(transactionRepos, {
      userId: session.userId,
      phoneE164: safePhone,
    }),
  );
  if (isErr(result)) {
    mapCompleteOnboardingError(result.error);
  }
  await promoteCompletedOnboardingSession(session);
  return resolveRedirect(session.role);
}

export async function completePasskeyOnboarding(
  phoneE164: string,
  challengeId: number,
  response: RegistrationResponseJSON,
): Promise<{ redirectTo: string }> {
  const session = await requireSession();
  const safePhone = normalizePeruvianPhone(phoneE164);
  const event = getRequestEvent();
  const ipAddress = getClientIp(event?.request.headers ?? new Headers());
  const result =
    await runInRepositoryTransaction<CompletePasskeyOnboardingResult>(
      async (transactionRepos) => {
        const passkeyService =
          createPasskeyEnrollmentAuthService(transactionRepos);
        const passkeyResult = await passkeyService.finishEnrollment({
          userId: session.userId,
          challengeId,
          response,
          ipAddress,
        });
        if (isErr(passkeyResult)) {
          return Err(passkeyResult.error);
        }

        return completeAccountOnboardingWithRepos(transactionRepos, {
          userId: session.userId,
          phoneE164: safePhone,
        });
      },
    );
  if (isErr(result)) {
    mapOnboardingFailure(result.error, {
      userNotFoundMessage: "No se pudo completar el registro",
    });
  }
  await promoteCompletedOnboardingSession(session, {
    strongAuthMethod: "passkey",
    strongAuthAt: Date.now(),
  });
  return resolveRedirect(session.role);
}

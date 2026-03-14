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
import {
  createPasskeyAuthService,
  type PasskeyEnrollmentError,
} from "~/lib/auth/passkey/service";
import { getClientIp } from "~/lib/auth/password/client-ip";
import { runInRepositoryTransaction } from "~/server/shared/context";
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

function mapCompleteOnboardingError(error: CompleteOnboardingError): never {
  switch (error.reason) {
    case "user_not_found":
    case "unexpected":
      throw internalError(error.message);
    case "strong_auth_required":
      throw conflictError(error.message);
  }

  const exhaustive: never = error;
  void exhaustive;
  throw internalError("Unexpected onboarding completion failure");
}

function mapCompletePasskeyOnboardingError(
  error: PasskeyEnrollmentError | CompleteOnboardingError,
): never {
  switch (error.reason) {
    case "invalid_request":
      throw internalError("No se pudo configurar la clave de acceso");
    case "unexpected":
      throw internalError(error.message);
    case "strong_auth_required":
      throw conflictError("No se pudo completar el registro");
    case "user_not_found":
      throw internalError("No se pudo completar el registro");
  }

  const exhaustive: never = error;
  void exhaustive;
  throw internalError("Unexpected onboarding completion failure");
}

type CompletePasskeyOnboardingResult = Result<
  void,
  PasskeyEnrollmentError | CompleteOnboardingError
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
  const result = await runInRepositoryTransaction<
    CompletePasskeyOnboardingResult
  >(async (transactionRepos) => {
    const passkeyService = createPasskeyAuthService(transactionRepos);
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
  });
  if (isErr(result)) {
    mapCompletePasskeyOnboardingError(result.error);
  }
  return resolveRedirect(session.role);
}

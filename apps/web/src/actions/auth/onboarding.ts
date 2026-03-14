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
import { createPasskeyWorkflowService } from "~/lib/auth/passkey/workflows";
import { getClientIp } from "~/lib/auth/password/client-ip";
import { repos, runInRepositoryTransaction } from "~/server/shared/context";
import { isErr, type Result } from "~/server/shared/result";
import {
  createAccountOnboardingService,
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

function unwrapOnboardingResult(
  result: Result<void, CompleteOnboardingError>,
  role: Awaited<ReturnType<typeof requireSession>>["role"],
): { redirectTo: string } {
  if (!isErr(result)) {
    return resolveRedirect(role);
  }

  switch (result.error.reason) {
    case "user_not_found":
    case "unexpected":
      throw internalError(result.error.message);
    case "strong_auth_required":
      throw conflictError(result.error.message);
  }

  const exhaustive: never = result.error;
  void exhaustive;
  throw internalError("Unexpected onboarding completion failure");
}

function unwrapPasskeyOnboardingResult(
  result: Result<
    void,
    { reason: "invalid_request"; message: string } | CompleteOnboardingError
  >,
  role: Awaited<ReturnType<typeof requireSession>>["role"],
): { redirectTo: string } {
  if (!isErr(result)) {
    return resolveRedirect(role);
  }

  switch (result.error.reason) {
    case "invalid_request":
      throw internalError("No se pudo configurar la clave de acceso");
    case "strong_auth_required":
      throw conflictError("No se pudo completar el registro");
    case "user_not_found":
    case "unexpected":
      throw internalError("No se pudo completar el registro");
  }

  const exhaustive: never = result.error;
  void exhaustive;
  throw internalError("Unexpected onboarding completion failure");
}

export async function completeOnboarding(
  phoneE164: string,
): Promise<{ redirectTo: string }> {
  const session = await requireSession();
  const safePhone = normalizePeruvianPhone(phoneE164);
  const service = createAccountOnboardingService(repos, {
    runInTransaction: runInRepositoryTransaction,
  });
  const result = await service.completeOnboarding({
    userId: session.userId,
    phoneE164: safePhone,
  });
  return unwrapOnboardingResult(result, session.role);
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
  const workflow = createPasskeyWorkflowService(repos, {
    runInTransaction: runInRepositoryTransaction,
  });
  const result = await workflow.completeOnboarding({
    userId: session.userId,
    challengeId,
    response,
    ipAddress,
    phoneE164: safePhone,
  });
  return unwrapPasskeyOnboardingResult(result, session.role);
}

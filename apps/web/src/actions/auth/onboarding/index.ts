"use server";

import type { RegistrationResponseJSON } from "@simplewebauthn/server";

import {
  conflictError,
  internalError,
  validationError,
} from "~/lib/app-errors";
import { requireSession } from "~/lib/auth/access/session";
import { getRequestClientMetadata } from "~/lib/http/request-context";
import {
  completeOnboarding as completeOnboardingService,
  finishPasskeyRegistration as finishPasskeyRegistrationService,
} from "~/server/auth/application/onboarding";
import { createAuthOnboardingContext } from "~/server/auth/infrastructure/onboarding-context";
import { createRequestPasskeyProviderFactory } from "~/server/auth/infrastructure/request-passkey-provider";
import { isErr } from "~/server/shared/result";

export interface OnboardingRedirectResponse {
  redirectTo: string;
}

function normalizePeruvianPhone(value: string): string {
  const v = value.replace(/\s+/g, "").trim();
  if (/^\+51\d{9}$/.test(v)) return v;
  if (/^\d{9}$/.test(v)) return `+51${v}`;
  throw validationError("El número debe tener 9 dígitos");
}

function mapOnboardingError(error: { code: string; message: string }): never {
  switch (error.code) {
    case "user_not_found":
      throw internalError("No se pudo completar el registro");
    case "strong_auth_required":
      throw conflictError(error.message);
    default:
      throw internalError(error.message);
  }
}

export async function completeOnboarding(
  phoneE164: string,
): Promise<OnboardingRedirectResponse> {
  const session = await requireSession();
  const request = getRequestClientMetadata();
  const result = await completeOnboardingService(
    createAuthOnboardingContext(),
    {
      session,
      phoneE164: normalizePeruvianPhone(phoneE164),
      ipAddress: request.ipAddress,
      userAgent: request.userAgent,
    },
  );
  if (isErr(result)) {
    mapOnboardingError(result.error);
  }
  return result.value;
}

export async function completePasskeyOnboarding(
  phoneE164: string,
  challengeId: number,
  response: RegistrationResponseJSON,
): Promise<OnboardingRedirectResponse> {
  const session = await requireSession();
  const request = getRequestClientMetadata();
  const registrationResult = await finishPasskeyRegistrationService(
    createAuthOnboardingContext().repos,
    {
      session,
      challengeId,
      response,
      ipAddress: request.ipAddress,
      userAgent: request.userAgent,
      createWebauthnProvider: createRequestPasskeyProviderFactory(),
    },
  );
  if (isErr(registrationResult)) {
    throw internalError(registrationResult.error.message);
  }
  const result = await completeOnboardingService(
    createAuthOnboardingContext(),
    {
      session: {
        ...session,
        strongAuthMethod: "passkey",
        strongAuthAt: Date.now(),
      },
      phoneE164: normalizePeruvianPhone(phoneE164),
      ipAddress: request.ipAddress,
      userAgent: request.userAgent,
    },
  );
  if (isErr(result)) {
    mapOnboardingError(result.error);
  }
  return result.value;
}

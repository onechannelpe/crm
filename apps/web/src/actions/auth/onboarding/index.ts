"use server";

import type { RegistrationResponseJSON } from "@simplewebauthn/server";

import { conflictError, internalError } from "~/lib/app-errors";
import { requireSession } from "~/lib/auth/access/session";
import { getRequestClientMetadata } from "~/lib/http/request-context";
import type { Phone } from "~/lib/phone/pe-mobile";
import { completeOnboarding as completeOnboardingService } from "~/server/auth/application/commands/complete-onboarding";
import { finishPasskeyOnboarding as finishPasskeyRegistrationService } from "~/server/auth/application/commands/finish-passkey-onboarding";
import { createRequestPasskeyProviderFactory } from "~/server/auth/infrastructure/request-passkey-provider";
import { getServerRuntime } from "~/server/runtime";
import { isErr } from "~/server/shared/result";

export interface OnboardingRedirectResponse {
  redirectTo: string;
}

function mapOnboardingError(error: { code: string; message: string }): never {
  switch (error.code) {
    case "user_not_found":
      throw internalError("No se pudo completar el registro");
    case "strong_auth_required":
      throw conflictError(error.message);
    case "address_already_claimed":
      throw conflictError(error.message);
    default:
      throw internalError(error.message);
  }
}

export async function completeOnboarding(
  phone: Phone,
): Promise<OnboardingRedirectResponse> {
  const session = await requireSession();
  const request = getRequestClientMetadata();
  const onboardingContext = getServerRuntime().auth.onboarding;
  const result = await completeOnboardingService(onboardingContext, {
    session,
    phone,
    ipAddress: request.ipAddress,
    userAgent: request.userAgent,
    invalidateSession: (sessionId) =>
      getServerRuntime().auth.sessionService.invalidateSession(sessionId),
  });
  if (isErr(result)) {
    mapOnboardingError(result.error);
  }
  return result.value;
}

export async function completePasskeyOnboarding(
  phone: Phone,
  challengeId: number,
  response: RegistrationResponseJSON,
): Promise<OnboardingRedirectResponse> {
  const session = await requireSession();
  const request = getRequestClientMetadata();
  const onboardingContext = getServerRuntime().auth.onboarding;
  const registrationResult = await finishPasskeyRegistrationService(
    onboardingContext.repos,
    {
      session,
      challengeId,
      response,
      ipAddress: request.ipAddress,
      userAgent: request.userAgent,
      createWebauthnProvider: createRequestPasskeyProviderFactory(),
      invalidateSession: (sessionId) =>
        getServerRuntime().auth.sessionService.invalidateSession(sessionId),
    },
  );
  if (isErr(registrationResult)) {
    throw internalError(registrationResult.error.message);
  }
  const result = await completeOnboardingService(onboardingContext, {
    session: {
      ...session,
      strongAuthMethod: "passkey",
      strongAuthAt: Date.now(),
    },
    phone,
    ipAddress: request.ipAddress,
    userAgent: request.userAgent,
    invalidateSession: (sessionId) =>
      getServerRuntime().auth.sessionService.invalidateSession(sessionId),
  });
  if (isErr(result)) {
    mapOnboardingError(result.error);
  }
  return result.value;
}

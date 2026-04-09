"use server";

import type { RegistrationResponseJSON } from "@simplewebauthn/server";

import { throwDomainError } from "~/actions/throw-domain-error";
import { requireSession } from "~/lib/auth/access/session";
import type { PasskeyEnrollmentChallenge } from "~/lib/auth/passkey/service";
import { getRequestClientMetadata } from "~/lib/http/request-context";
import {
  beginPasskeyRegistration as beginPasskeyRegistrationService,
  finishPasskeyRegistration as finishPasskeyRegistrationService,
} from "~/server/auth/application/onboarding";
import { createAuthOnboardingContext } from "~/server/auth/infrastructure/onboarding-context";
import { createRequestPasskeyProviderFactory } from "~/server/auth/infrastructure/request-passkey-provider";
import { serverRuntime } from "~/server/runtime";
import { isErr } from "~/server/shared/result";

export async function beginPasskeyRegistration(): Promise<PasskeyEnrollmentChallenge> {
  const session = await requireSession();
  const { ipAddress } = getRequestClientMetadata();
  const onboardingContext = createAuthOnboardingContext(serverRuntime.infra.db);
  const result = await beginPasskeyRegistrationService(
    onboardingContext.repos,
    {
      userId: session.userId,
      ipAddress,
      createWebauthnProvider: createRequestPasskeyProviderFactory(),
    },
  );
  if (isErr(result)) {
    throwDomainError(result.error);
  }
  return result.value;
}

export async function finishPasskeyRegistration(
  challengeId: number,
  response: RegistrationResponseJSON,
): Promise<void> {
  const session = await requireSession();
  const request = getRequestClientMetadata();
  const onboardingContext = createAuthOnboardingContext(serverRuntime.infra.db);
  const result = await finishPasskeyRegistrationService(
    onboardingContext.repos,
    {
      session,
      challengeId,
      response,
      ipAddress: request.ipAddress,
      userAgent: request.userAgent,
      createWebauthnProvider: createRequestPasskeyProviderFactory(),
    },
  );
  if (isErr(result)) {
    throwDomainError(result.error);
  }
}

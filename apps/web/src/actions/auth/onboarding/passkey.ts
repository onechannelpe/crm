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
import { isErr } from "~/server/shared/result";

export async function beginPasskeyRegistration(): Promise<PasskeyEnrollmentChallenge> {
  const session = await requireSession();
  const { ipAddress } = getRequestClientMetadata();
  const result = await beginPasskeyRegistrationService({
    userId: session.userId,
    ipAddress,
  });
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
  const result = await finishPasskeyRegistrationService({
    session,
    challengeId,
    response,
    ipAddress: request.ipAddress,
    userAgent: request.userAgent,
  });
  if (isErr(result)) {
    throwDomainError(result.error);
  }
}

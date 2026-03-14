"use server";

import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import { getRequestEvent } from "solid-js/web";

import { internalError } from "~/lib/app-errors";
import { requireSession } from "~/lib/auth/access/session";
import type {
  PasskeyEnrollmentError,
  PasskeyEnrollmentChallenge,
} from "~/lib/auth/passkey/service";
import { createPasskeyAuthService } from "~/lib/auth/passkey/service";
import { getClientIp } from "~/lib/auth/password/client-ip";
import { repos } from "~/server/shared/context";
import { isErr } from "~/server/shared/result";

function throwPasskeyEnrollmentError(error: PasskeyEnrollmentError): never {
  switch (error.reason) {
    case "invalid_request":
      throw internalError("No se pudo configurar la clave de acceso");
    case "unexpected":
      throw internalError(error.message);
  }

  const exhaustive: never = error;
  void exhaustive;
  throw internalError("Unexpected passkey registration failure");
}

export async function beginPasskeyRegistration(): Promise<PasskeyEnrollmentChallenge> {
  const session = await requireSession();
  const event = getRequestEvent();
  const ipAddress = getClientIp(event?.request.headers ?? new Headers());
  const service = createPasskeyAuthService(repos);
  const result = await service.beginEnrollment({
    userId: session.userId,
    ipAddress,
  });
  if (isErr(result)) {
    throwPasskeyEnrollmentError(result.error);
  }
  return result.value;
}

export async function finishPasskeyRegistration(
  challengeId: number,
  response: RegistrationResponseJSON,
): Promise<void> {
  const session = await requireSession();
  const event = getRequestEvent();
  const ipAddress = getClientIp(event?.request.headers ?? new Headers());
  const service = createPasskeyAuthService(repos);
  const result = await service.finishEnrollment({
    userId: session.userId,
    challengeId,
    response,
    ipAddress,
  });
  if (isErr(result)) {
    throwPasskeyEnrollmentError(result.error);
  }
}

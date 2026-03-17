"use server";

import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import { getRequestEvent } from "solid-js/web";

import { throwDomainError } from "~/actions/throw-domain-error";
import { internalError } from "~/lib/app-errors";
import { requireSession } from "~/lib/auth/access/session";
import type { PasskeyEnrollmentChallenge } from "~/lib/auth/passkey/service";
import { createPasskeyEnrollmentAuthService } from "~/lib/auth/passkey/service";
import { getClientIp } from "~/lib/auth/password/client-ip";
import {
  issueSessionTransition,
  replaceCurrentSession,
} from "~/lib/auth/session/session-transition";
import { repos } from "~/server/shared/context";
import { isErr } from "~/server/shared/result";

export async function beginPasskeyRegistration(): Promise<PasskeyEnrollmentChallenge> {
  const session = await requireSession();
  const event = getRequestEvent();
  const ipAddress = getClientIp(event?.request.headers ?? new Headers());
  const service = createPasskeyEnrollmentAuthService(repos);
  const result = await service.beginEnrollment({
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
  const event = getRequestEvent();
  const ipAddress = getClientIp(event?.request.headers ?? new Headers());
  const service = createPasskeyEnrollmentAuthService(repos);
  const result = await service.finishEnrollment({
    userId: session.userId,
    challengeId,
    response,
    ipAddress,
  });
  if (isErr(result)) {
    throwDomainError(result.error);
  }

  const user = await repos.users.findById(session.userId);
  if (!user) {
    throw internalError("No se pudo configurar la clave de acceso");
  }
  const issued = await issueSessionTransition({
    user,
    sessionClass: session.sessionClass,
    request: {
      ipAddress,
      userAgent: event?.request.headers.get("user-agent") ?? null,
    },
    primaryAuthMethod: session.primaryAuthMethod,
    strongAuthMethod: "passkey",
    strongAuthAt: Date.now(),
    deps: repos,
  });
  await replaceCurrentSession(issued.token);
}

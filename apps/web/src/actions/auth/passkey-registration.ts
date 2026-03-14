"use server";

import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import { getRequestEvent } from "solid-js/web";

import { internalError } from "~/lib/app-errors";
import { requireSession } from "~/lib/auth/access/session";
import { createPasskeyService } from "~/lib/auth/passkey/passkey";
import { createPasskeyEnrollmentWorkflowService } from "~/lib/auth/passkey/workflows";
import type {
  BeginPasskeyEnrollmentError,
  FinishPasskeyEnrollmentError,
} from "~/lib/auth/passkey/workflows";
import { getClientIp } from "~/lib/auth/password/client-ip";
import { repos } from "~/server/shared/context";
import { isErr, type Result } from "~/server/shared/result";

export interface PasskeyRegistrationChallengeResult {
  challengeId: number;
  options: Awaited<
    ReturnType<
      ReturnType<typeof createPasskeyService>["getRegistrationOptions"]
    >
  >;
}

function unwrapFinishPasskeyEnrollmentResult(
  result: Result<void, FinishPasskeyEnrollmentError>,
): void {
  if (!isErr(result)) {
    return;
  }

  switch (result.error.reason) {
    case "invalid_request":
      throw internalError("No se pudo configurar la clave de acceso");
    case "unexpected":
      throw internalError(result.error.message);
  }

  const exhaustive: never = result.error;
  void exhaustive;
  throw internalError("Unexpected passkey registration failure");
}

function unwrapBeginPasskeyEnrollmentResult(
  result: Result<
    PasskeyRegistrationChallengeResult,
    BeginPasskeyEnrollmentError
  >,
): PasskeyRegistrationChallengeResult {
  if (!isErr(result)) {
    return result.value;
  }

  switch (result.error.reason) {
    case "invalid_request":
      throw internalError("No se pudo configurar la clave de acceso");
    case "unexpected":
      throw internalError(result.error.message);
  }

  const exhaustive: never = result.error;
  void exhaustive;
  throw internalError("Unexpected passkey registration failure");
}

export async function beginPasskeyRegistration(): Promise<PasskeyRegistrationChallengeResult> {
  const session = await requireSession();
  const event = getRequestEvent();
  const ipAddress = getClientIp(event?.request.headers ?? new Headers());
  const workflow = createPasskeyEnrollmentWorkflowService(repos, {
    createPasskeyService,
  });
  const result = await workflow.beginEnrollment({
    userId: session.userId,
    ipAddress,
  });
  return unwrapBeginPasskeyEnrollmentResult(result);
}

export async function finishPasskeyRegistration(
  challengeId: number,
  response: RegistrationResponseJSON,
): Promise<void> {
  const session = await requireSession();
  const event = getRequestEvent();
  const ipAddress = getClientIp(event?.request.headers ?? new Headers());
  const workflow = createPasskeyEnrollmentWorkflowService(repos, {
    createPasskeyService,
  });
  const result = await workflow.finishEnrollment({
    userId: session.userId,
    challengeId,
    response,
    ipAddress,
  });
  unwrapFinishPasskeyEnrollmentResult(result);
}

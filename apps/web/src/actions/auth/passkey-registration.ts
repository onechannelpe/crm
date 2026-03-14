"use server";

import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import { getRequestEvent } from "solid-js/web";

import { requireSession } from "~/lib/auth/access/session";
import { createPasskeyService } from "~/lib/auth/passkey/passkey";
import { createPasskeyEnrollmentWorkflowService } from "~/lib/auth/passkey/workflows";
import { getClientIp } from "~/lib/auth/password/client-ip";
import { repos } from "~/server/shared/context";

export interface PasskeyRegistrationChallengeResult {
  challengeId: number;
  options: Awaited<
    ReturnType<
      ReturnType<typeof createPasskeyService>["getRegistrationOptions"]
    >
  >;
}

export async function beginPasskeyRegistration(): Promise<PasskeyRegistrationChallengeResult> {
  const session = await requireSession();
  const event = getRequestEvent();
  const ipAddress = getClientIp(event?.request.headers ?? new Headers());
  const workflow = createPasskeyEnrollmentWorkflowService(repos, {
    createPasskeyService,
  });
  return workflow.beginEnrollment({
    userId: session.userId,
    ipAddress,
  });
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
  await workflow.finishEnrollment({
    userId: session.userId,
    challengeId,
    response,
    ipAddress,
  });
}

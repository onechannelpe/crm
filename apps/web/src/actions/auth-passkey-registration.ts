"use server";

import type { RegistrationResponseJSON } from "@simplewebauthn/server";

import { getRequestEvent } from "solid-js/web";

import { requireAuth } from "~/lib/auth/access/session";
import { createPasskeyService } from "~/lib/auth/passkey/passkey";
import {
  beginPasskeyRegistrationFlow,
  finishPasskeyRegistrationFlow,
} from "~/lib/auth/passkey/registration-flow";
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
  const session = await requireAuth();
  const event = getRequestEvent();
  const ipAddress = getClientIp(event?.request.headers ?? new Headers());
  return beginPasskeyRegistrationFlow(
    session.userId,
    ipAddress,
    repos,
    createPasskeyService(repos),
  );
}

export async function finishPasskeyRegistration(
  challengeId: number,
  response: RegistrationResponseJSON,
): Promise<void> {
  const session = await requireAuth();
  const event = getRequestEvent();
  const ipAddress = getClientIp(event?.request.headers ?? new Headers());
  await finishPasskeyRegistrationFlow(
    session.userId,
    challengeId,
    response,
    ipAddress,
    repos,
    createPasskeyService(repos),
  );
}

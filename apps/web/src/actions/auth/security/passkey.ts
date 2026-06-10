"use server";

import type { RegistrationResponseJSON } from "@simplewebauthn/server";

import { installSession } from "~/actions/auth/install-session";
import type { PasskeyEnrollmentChallenge } from "~/lib/auth/passkey/types";
import {
  beginPasskeyEnrollment as beginPasskeyEnrollmentCommand,
  finishPasskeyEnrollment as finishPasskeyEnrollmentCommand,
} from "~/server/auth/flows/passkey-enrollment";
import { createRequestPasskeyProviderFactory } from "~/server/auth/infrastructure/request-passkey-provider";
import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";

export async function beginPasskeyEnrollment(): Promise<PasskeyEnrollmentChallenge> {
  const { repos } = getServerRuntime().auth.onboarding;
  const createWebauthnProvider = createRequestPasskeyProviderFactory();

  return runAction({
    name: "auth.passkey.enroll.begin",
    access: { kind: "session" },

    execute: ({ actor, ipAddress }) =>
      beginPasskeyEnrollmentCommand(repos, {
        userId: actor.userId,
        ipAddress,
        createWebauthnProvider,
      }),
  });
}

export async function finishPasskeyEnrollment(
  challengeId: number,
  response: RegistrationResponseJSON,
): Promise<{ message: string }> {
  const { repos } = getServerRuntime().auth.onboarding;
  const createWebauthnProvider = createRequestPasskeyProviderFactory();

  const result = await runAction({
    name: "auth.passkey.enroll.finish",
    access: { kind: "session" },

    execute: ({ actor, ipAddress, userAgent }) =>
      finishPasskeyEnrollmentCommand(repos, {
        session: {
          userId: actor.userId,
          sessionClass: actor.sessionClass,
          primaryAuthMethod: actor.primaryAuthMethod,
        },
        challengeId,
        response,
        ipAddress,
        userAgent,
        createWebauthnProvider,
      }),
  });

  await installSession(result.sessionToken);

  return { message: "Clave de acceso configurada" };
}

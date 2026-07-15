"use server";

import type { RegistrationResponseJSON } from "@simplewebauthn/server";

import { installSession } from "~/actions/auth/install-session";
import type { PasskeyEnrollmentChallenge } from "~/lib/auth/passkey/types";
import {
  beginPasskeyEnrollment as beginPasskeyEnrollmentCommand,
  finishPasskeyEnrollment as finishPasskeyEnrollmentCommand,
} from "~/server/auth/flows/passkey-enrollment";
import { createRequestPasskeyProvider } from "~/server/auth/infrastructure/request-passkey-provider";
import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import { WebauthnChallengeId } from "~/server/shared/ids";
import { isErr } from "~/server/shared/result";

export async function beginPasskeyEnrollment(): Promise<PasskeyEnrollmentChallenge> {
  const { repos } = getServerRuntime().auth.onboarding;
  const webauthnProvider = createRequestPasskeyProvider(repos);

  return runAction({
    name: "auth.passkey.enroll.begin",
    access: { kind: "session" },

    execute: ({ actor, ipAddress }) =>
      beginPasskeyEnrollmentCommand(repos, {
        userId: actor.userId,
        ipAddress,
        webauthnProvider,
      }),
  });
}

export async function finishPasskeyEnrollment(
  challengeId: string,
  response: RegistrationResponseJSON,
): Promise<{ message: string; recoveryCodes: string[] }> {
  const { repos } = getServerRuntime().auth.onboarding;
  const webauthnProvider = createRequestPasskeyProvider(repos);

  const result = await runAction({
    name: "auth.passkey.enroll.finish",
    access: { kind: "session" },

    execute: async ({ actor, ipAddress, userAgent }) => {
      const parsedChallengeId = WebauthnChallengeId.parse(challengeId);
      if (isErr(parsedChallengeId)) return parsedChallengeId;

      return finishPasskeyEnrollmentCommand(repos, {
        session: {
          userId: actor.userId,
          sessionClass: actor.sessionClass,
          primaryAuthMethod: actor.primaryAuthMethod,
        },
        challengeId: parsedChallengeId.value,
        response,
        ipAddress,
        userAgent,
        webauthnProvider,
      });
    },
  });

  await installSession(result.sessionToken);

  return {
    message: "Clave de acceso configurada",
    recoveryCodes: result.recoveryCodes,
  };
}

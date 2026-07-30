import type { RegistrationResponseJSON } from "@simplewebauthn/server";

import { isRegistrationResponse } from "~/domain/auth/passkey/credential-response";
import type { PasskeyEnrollmentChallenge } from "~/domain/auth/passkey/types";
import { fail, type DomainError } from "~/domain/errors";
import { WebauthnChallengeId } from "~/domain/ids";
import { verifyPasskeyEnrollment } from "~/server/auth/factors/passkey/service";
import { completeFactorEnrollment } from "~/server/auth/flows/complete-factor-enrollment";
import { startPasskeyEnrollment } from "~/server/auth/flows/start-passkey-enrollment";
import { createRequestPasskeyProvider } from "~/server/auth/infrastructure/request-passkey-provider";
import { setSessionCookie } from "~/server/auth/session/cookies";
import { composeAuth } from "~/server/auth/ui/composition";
import { executeSessionServerFunction } from "~/server/platform/action";
import { Err, isErr, Ok, type Result } from "~/shared/result";

export async function beginPasskeyEnrollment(): Promise<PasskeyEnrollmentChallenge> {
  "use server";

  const setup = composeAuth().setup;
  const { repos } = setup;
  const webauthnProvider = createRequestPasskeyProvider(repos);

  return executeSessionServerFunction({
    name: "auth.passkey.enroll.begin",
    access: { kind: "session" },

    execute: ({ actor, ipAddress, now }) =>
      startPasskeyEnrollment(setup, {
        userId: actor.userId,
        ipAddress,
        occurredAt: now(),
        webauthnProvider,
      }),
  });
}

export async function finishPasskeyEnrollment(
  challengeId: unknown,
  response: unknown,
): Promise<{ message: string; recoveryCodes: string[] }> {
  "use server";

  const setup = composeAuth().setup;
  const { repos } = setup;
  const webauthnProvider = createRequestPasskeyProvider(repos);

  const result = await executeSessionServerFunction({
    name: "auth.passkey.enroll.finish",
    access: { kind: "session" },

    parse: (): Result<
      {
        challengeId: WebauthnChallengeId;
        response: RegistrationResponseJSON;
      },
      DomainError
    > => {
      const parsedChallengeId = WebauthnChallengeId.parse(challengeId);
      if (isErr(parsedChallengeId)) return parsedChallengeId;
      if (!isRegistrationResponse(response)) {
        return Err(fail("invalid_passkey_request"));
      }
      return Ok({ challengeId: parsedChallengeId.value, response });
    },

    execute: async (ctx, command) => {
      const verified = await verifyPasskeyEnrollment(
        setup.repos,
        webauthnProvider,
        {
          userId: ctx.actor.userId,
          challengeId: command.challengeId,
          response: command.response,
          ipAddress: ctx.ipAddress,
          verifiedAt: ctx.now(),
        },
      );
      if (isErr(verified)) return verified;

      return completeFactorEnrollment(ctx, setup, {
        method: "passkey",
        enrollment: verified.value,
      });
    },
  });

  setSessionCookie(result.sessionToken);

  return {
    message: "Clave de acceso configurada",
    recoveryCodes: result.recoveryCodes,
  };
}

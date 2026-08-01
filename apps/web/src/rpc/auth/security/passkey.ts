import type { RegistrationResponseJSON } from "@simplewebauthn/server";

import { isRegistrationResponse } from "~/domain/auth/passkey/credential-response";
import type { PasskeyEnrollmentChallenge } from "~/domain/auth/passkey/types";
import { fail, type DomainError } from "~/domain/errors";
import { WebauthnChallengeId } from "~/domain/ids";
import { setSessionCookie } from "~/server/auth/session/cookies";
import { executeSessionServerFunction } from "~/server/platform/action";
import { application } from "~/server/platform/composition/application";
import { Err, isErr, Ok, type Result } from "~/shared/result";

export async function beginPasskeyEnrollment(): Promise<PasskeyEnrollmentChallenge> {
  "use server";

  return executeSessionServerFunction({
    name: "auth.passkey.enroll.begin",
    access: { kind: "session" },

    execute: (ctx) => application.auth.security.startPasskeyEnrollment(ctx),
  });
}

export async function finishPasskeyEnrollment(
  challengeId: unknown,
  response: unknown,
): Promise<{ message: string; recoveryCodes: string[] }> {
  "use server";

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
      return application.auth.security.finishPasskeyEnrollment(ctx, command);
    },
  });

  setSessionCookie(result.sessionToken);

  return {
    message: "Clave de acceso configurada",
    recoveryCodes: result.recoveryCodes,
  };
}

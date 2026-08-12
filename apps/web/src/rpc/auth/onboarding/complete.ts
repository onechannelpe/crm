import type { RegistrationResponseJSON } from "@simplewebauthn/server";

import { isRegistrationResponse } from "~/domain/auth/passkey/credential-response";
import { fail, type DomainError } from "~/domain/errors";
import { WebauthnChallengeId } from "~/domain/ids";
import { setSessionCookie } from "~/server/auth/session/cookies";
import { getApplication } from "~/server/composition/application";
import { executeSessionServerFunction } from "~/server/platform/action";
import { Err, isErr, Ok, type Result } from "~/shared/result";
import { isPlainRecord } from "~/shared/type-guards";

type ParsedCompleteOnboardingInput =
  | { method: "none" }
  | {
      method: "passkey";
      challengeId: WebauthnChallengeId;
      response: RegistrationResponseJSON;
    }
  | { method: "totp"; code: string };

function parseCompletionInput(
  input: unknown,
): Result<ParsedCompleteOnboardingInput, DomainError> {
  if (!isPlainRecord(input)) {
    return Err(fail("invalid_input"));
  }

  switch (input.method) {
    case "none":
      return Ok({ method: "none" });

    case "passkey": {
      const challengeId = WebauthnChallengeId.parse(input.challengeId);

      if (isErr(challengeId)) {
        return challengeId;
      }

      if (!isRegistrationResponse(input.response)) {
        return Err(fail("invalid_passkey_request"));
      }

      return Ok({
        method: "passkey",
        challengeId: challengeId.value,
        response: input.response,
      });
    }

    case "totp":
      return typeof input.code === "string" && /^\d{6}$/.test(input.code)
        ? Ok({ method: "totp", code: input.code })
        : Err(fail("totp_code_invalid"));

    default:
      return Err(fail("invalid_input"));
  }
}

export async function completeOnboardingAction(input: unknown): Promise<{
  redirectTo: string;
  recoveryCodes: string[];
}> {
  "use server";

  const result = await executeSessionServerFunction({
    name: "auth.onboarding.complete",
    access: { kind: "session" },
    parse: () => parseCompletionInput(input),

    execute: (ctx, command) => {
      switch (command.method) {
        case "none":
          return getApplication().auth.onboarding.completeWithoutFactor(ctx);

        case "passkey":
          return getApplication().auth.onboarding.completeWithPasskey(
            ctx,
            command,
          );

        case "totp":
          return getApplication().auth.onboarding.completeWithTotp(
            ctx,
            command.code,
          );

        default:
          return command satisfies never;
      }
    },
  });

  setSessionCookie(result.sessionToken);

  return {
    redirectTo: result.redirectTo,
    recoveryCodes: result.recoveryCodes,
  };
}

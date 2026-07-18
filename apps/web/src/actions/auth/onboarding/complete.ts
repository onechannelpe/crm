"use server";

import type { RegistrationResponseJSON } from "@simplewebauthn/server";

import { isRegistrationResponse } from "~/lib/auth/passkey/credential-response";
import { setSessionCookie } from "~/lib/auth/session/cookies";
import { createLogger } from "~/lib/observability/logger";
import { isPlainRecord } from "~/lib/type-guards";
import { verifyPasskeyEnrollment } from "~/server/auth/factors/passkey/service";
import { verifyTotpEnrollment } from "~/server/auth/factors/totp-enrollment";
import { createRequestPasskeyProvider } from "~/server/auth/infrastructure/request-passkey-provider";
import { completeOnboarding } from "~/server/auth/onboarding/complete";
import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import { fail, type DomainError } from "~/server/shared/domain-error";
import { WebauthnChallengeId } from "~/server/shared/ids";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

const logger = createLogger("auth-onboarding-complete-action");

type ParsedCompleteOnboardingInput =
  | { method: "none" }
  | {
      method: "passkey";
      challengeId: WebauthnChallengeId;
      response: RegistrationResponseJSON;
    }
  | { method: "totp"; code: string };

interface CompletionResult {
  redirectTo: string;
  recoveryCodes: string[];
}

function parseCompletionInput(
  input: unknown,
): Result<ParsedCompleteOnboardingInput, DomainError> {
  if (!isPlainRecord(input)) {
    logger.warn("invalid_input: request body is not a plain record", {
      input,
    });
    return Err(fail("invalid_input"));
  }

  switch (input.method) {
    case "none":
      return Ok({ method: input.method });
    case "passkey": {
      const challengeId = WebauthnChallengeId.parse(input.challengeId);
      if (isErr(challengeId)) {
        logger.warn("invalid_webauthn_challenge_id on onboarding complete", {
          challengeId: input.challengeId,
          error: challengeId.error,
        });
        return challengeId;
      }
      if (!isRegistrationResponse(input.response)) {
        logger.warn(
          "invalid_passkey_request: malformed registration response",
          {
            response: input.response,
          },
        );
        return Err(fail("invalid_passkey_request"));
      }
      return Ok({
        method: input.method,
        challengeId: challengeId.value,
        response: input.response,
      });
    }
    case "totp":
      return typeof input.code === "string" && /^\d{6}$/.test(input.code)
        ? Ok({ method: input.method, code: input.code })
        : Err(fail("totp_code_invalid"));
    default:
      logger.warn("invalid_input: unrecognized onboarding method", {
        method: input.method,
      });
      return Err(fail("invalid_input"));
  }
}

export async function completeOnboardingAction(
  input: unknown,
): Promise<CompletionResult> {
  const result = await runAction({
    name: "auth.onboarding.complete",
    access: { kind: "session" },
    parse: () => parseCompletionInput(input),
    execute: async (ctx, command) => {
      const setup = getServerRuntime().auth.setup;

      switch (command.method) {
        case "none":
          return completeOnboarding(ctx, setup, command);
        case "passkey": {
          const verified = await verifyPasskeyEnrollment(
            setup.repos,
            createRequestPasskeyProvider(setup.repos),
            {
              userId: ctx.actor.userId,
              challengeId: command.challengeId,
              response: command.response,
              ipAddress: ctx.ipAddress,
              verifiedAt: ctx.now(),
            },
          );
          if (isErr(verified)) return verified;

          return completeOnboarding(ctx, setup, {
            method: command.method,
            enrollment: verified.value,
          });
        }
        case "totp": {
          const verified = await verifyTotpEnrollment(setup.repos, {
            userId: ctx.actor.userId,
            code: command.code,
          });
          if (isErr(verified)) return verified;

          return completeOnboarding(ctx, setup, {
            method: command.method,
            enrollment: verified.value,
          });
        }
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

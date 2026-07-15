"use server";

import type { RegistrationResponseJSON } from "@simplewebauthn/server";

import { isRegistrationResponse } from "~/lib/auth/passkey/credential-response";
import { setSessionCookie } from "~/lib/auth/session/cookies";
import { verifyPasskeyEnrollment } from "~/server/auth/factors/passkey/service";
import { verifyTotpEnrollment } from "~/server/auth/factors/totp-enrollment";
import { createRequestPasskeyProvider } from "~/server/auth/infrastructure/request-passkey-provider";
import { completeOnboarding } from "~/server/auth/onboarding/complete";
import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import { fail, type DomainError } from "~/server/shared/domain-error";
import { WebauthnChallengeId } from "~/server/shared/ids";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

interface CompletionResult {
  redirectTo: string;
  recoveryCodes: string[];
}

export async function completeOnboardingWithoutFactor(): Promise<CompletionResult> {
  const result = await runAction({
    name: "auth.onboarding.complete_without_factor",
    access: { kind: "session" },
    execute: (ctx) =>
      completeOnboarding(ctx, getServerRuntime().auth.setup, {
        method: "none",
      }),
  });

  setSessionCookie(result.sessionToken);
  return { redirectTo: result.redirectTo, recoveryCodes: [] };
}

export async function completeOnboardingWithPasskey(input: {
  challengeId: unknown;
  response: unknown;
}): Promise<CompletionResult> {
  const result = await runAction({
    name: "auth.onboarding.complete_with_passkey",
    access: { kind: "session" },
    parse: (): Result<
      {
        challengeId: WebauthnChallengeId;
        response: RegistrationResponseJSON;
      },
      DomainError
    > => {
      const challengeId = WebauthnChallengeId.parse(input.challengeId);
      if (!challengeId.ok) return challengeId;
      if (!isRegistrationResponse(input.response)) {
        return Err(fail("invalid_passkey_request"));
      }
      return Ok({
        challengeId: challengeId.value,
        response: input.response,
      });
    },
    execute: async (ctx, command) => {
      const setup = getServerRuntime().auth.setup;
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
        method: "passkey",
        enrollment: verified.value,
      });
    },
  });

  setSessionCookie(result.sessionToken);
  return {
    redirectTo: result.redirectTo,
    recoveryCodes: result.recoveryCodes,
  };
}

export async function completeOnboardingWithTotp(input: {
  code: unknown;
}): Promise<CompletionResult> {
  const result = await runAction({
    name: "auth.onboarding.complete_with_totp",
    access: { kind: "session" },
    parse: (): Result<{ code: string }, DomainError> => {
      if (typeof input.code !== "string" || !/^\d{6}$/.test(input.code)) {
        return Err(fail("totp_code_invalid"));
      }
      return Ok({ code: input.code });
    },
    execute: async (ctx, command) => {
      const setup = getServerRuntime().auth.setup;
      const verified = await verifyTotpEnrollment(setup.repos, {
        userId: ctx.actor.userId,
        code: command.code,
      });
      if (isErr(verified)) return verified;

      return completeOnboarding(ctx, setup, {
        method: "totp",
        enrollment: verified.value,
      });
    },
  });

  setSessionCookie(result.sessionToken);
  return {
    redirectTo: result.redirectTo,
    recoveryCodes: result.recoveryCodes,
  };
}

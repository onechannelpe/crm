"use server";

import type { RegistrationResponseJSON } from "@simplewebauthn/server";

import { installSession } from "~/actions/auth/install-session";
import type { Phone } from "~/lib/phone/pe-mobile";
import { completeOnboarding as completeOnboardingService } from "~/server/auth/flows/complete-onboarding";
import { enrollPasskey } from "~/server/auth/flows/passkey-enrollment";
import { createRequestPasskeyProvider } from "~/server/auth/infrastructure/request-passkey-provider";
import { issueRecoveryCodesIfAbsent } from "~/server/auth/recovery/issue-recovery-codes";
import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import type { WebauthnChallengeId } from "~/server/shared/ids";
import { isErr, Ok } from "~/server/shared/result";

export async function completeOnboarding(
  phone: Phone,
): Promise<{ redirectTo: string }> {
  const onboarding = getServerRuntime().auth.onboarding;

  const result = await runAction({
    name: "auth.onboarding.complete",
    access: { kind: "session" },

    execute: (ctx) =>
      completeOnboardingService(onboarding, {
        session: ctx.actor,
        phone,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      }),
  });

  await installSession(result.sessionToken);

  return { redirectTo: result.redirectTo };
}

export async function completePasskeyOnboarding(
  phone: Phone,
  challengeId: WebauthnChallengeId,
  response: RegistrationResponseJSON,
): Promise<{ redirectTo: string; recoveryCodes: string[] }> {
  const onboarding = getServerRuntime().auth.onboarding;

  const result = await runAction({
    name: "auth.onboarding.complete_passkey",
    access: { kind: "session" },

    execute: async (ctx) => {
      const enrolled = await enrollPasskey(onboarding.repos, {
        userId: ctx.actor.userId,
        challengeId,
        response,
        ipAddress: ctx.ipAddress,
        webauthnProvider: createRequestPasskeyProvider(onboarding.repos),
      });

      if (isErr(enrolled)) {
        return enrolled;
      }

      const recoveryCodes =
        (await issueRecoveryCodesIfAbsent(
          onboarding.repos,
          ctx.actor.userId,
        )) ?? [];

      const session = {
        ...ctx.actor,
        strongAuthMethod: "passkey" as const,
        strongAuthAt: ctx.now(),
      };

      const completed = await completeOnboardingService(onboarding, {
        session,
        phone,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });
      if (isErr(completed)) {
        return completed;
      }

      return Ok({ ...completed.value, recoveryCodes });
    },
  });

  await installSession(result.sessionToken);

  return { redirectTo: result.redirectTo, recoveryCodes: result.recoveryCodes };
}

"use server";

import type { RegistrationResponseJSON } from "@simplewebauthn/server";

import { installSession } from "~/actions/auth/install-session";
import type { Phone } from "~/lib/phone/pe-mobile";
import { completeOnboarding as completeOnboardingService } from "~/server/auth/flows/complete-onboarding";
import { enrollPasskey } from "~/server/auth/flows/passkey-enrollment";
import { createRequestPasskeyProvider } from "~/server/auth/infrastructure/request-passkey-provider";
import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";
import { isErr } from "~/server/shared/result";

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
  challengeId: number,
  response: RegistrationResponseJSON,
): Promise<{ redirectTo: string }> {
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

      const session = {
        ...ctx.actor,
        strongAuthMethod: "passkey" as const,
        strongAuthAt: ctx.now(),
      };

      return completeOnboardingService(onboarding, {
        session,
        phone,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });
    },
  });

  await installSession(result.sessionToken);

  return { redirectTo: result.redirectTo };
}

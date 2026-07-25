"use server";

import type { OnboardingSnapshot } from "~/contracts/auth";
import { fail, type DomainError } from "~/domain/errors";
import { parsePhone } from "~/domain/phone/pe-mobile";
import { saveOnboardingProfile } from "~/server/auth/onboarding/save-profile";
import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import { Err, Ok, type Result } from "~/shared/result";

export function submitOnboardingProfile(input: {
  phone: unknown;
}): Promise<OnboardingSnapshot> {
  return runAction({
    name: "auth.onboarding.save_profile",
    access: { kind: "session" },
    parse: (): Result<
      NonNullable<ReturnType<typeof parsePhone>>,
      DomainError
    > => {
      const phone =
        typeof input.phone === "string" ? parsePhone(input.phone) : null;
      return phone ? Ok(phone) : Err(fail("invalid_phone"));
    },
    execute: (ctx, phone) =>
      saveOnboardingProfile(getServerRuntime().auth.setup, {
        userId: ctx.actor.userId,
        phone,
        now: ctx.now(),
      }),
  });
}

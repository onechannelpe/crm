"use server";

import { parsePhone, type Phone } from "~/lib/phone/pe-mobile";
import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import { fail, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, isErr, type Result } from "~/server/shared/result";

import { getOnboardingRequirements } from "../policy";
import { completeOnboarding } from "./index";

function persistOnboardingPhone(rawPhone: string): Promise<Phone> {
  return runAction({
    name: "auth.onboarding.submit_profile",
    access: { kind: "session" },
    parse: (): Result<Phone, DomainError> => {
      const phone = parsePhone(rawPhone);
      if (!phone) return Err(fail("invalid_phone"));
      return Ok(phone);
    },

    execute: async (ctx, phone) => {
      const updated = await getServerRuntime().users.updatePhone(
        ctx.actor.userId,
        phone,
      );
      if (isErr(updated)) return Err(fail("phone_in_use"));
      return Ok(phone);
    },
  });
}

export async function submitOnboardingProfile(input: {
  phone: string;
}): Promise<{ redirectTo: string }> {
  const phone = await persistOnboardingPhone(input.phone);

  const requirements = await getOnboardingRequirements();
  if (!requirements.requiredActions.includes("configure_strong_auth")) {
    return completeOnboarding(phone);
  }

  return {
    redirectTo: "/onboarding?step=security-choice",
  };
}

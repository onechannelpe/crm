"use server";

import { requireSession } from "~/lib/auth/access/session";
import { parsePhone } from "~/lib/phone/pe-mobile";
import { getServerRuntime } from "~/server/runtime";
import { fail, throwDomain } from "~/server/shared/domain-error";
import { isErr } from "~/server/shared/result";

import { getOnboardingRequirements } from "../policy";
import { completeOnboarding } from "./index";

export async function submitOnboardingProfile(input: {
  phone: string;
}): Promise<{ redirectTo: string }> {
  const phone = parsePhone(input.phone);
  if (!phone) {
    throwDomain(fail("invalid_phone"));
  }
  const session = await requireSession();
  const updated = await getServerRuntime().users.updatePhone(
    session.userId,
    phone,
  );
  if (isErr(updated)) {
    throwDomain(fail("phone_in_use"));
  }

  const requirements = await getOnboardingRequirements();
  if (!requirements.requiredActions.includes("configure_strong_auth")) {
    return completeOnboarding(phone);
  }

  return {
    redirectTo: "/onboarding?step=security-choice",
  };
}

"use server";

import { isValidOnboardingPhone } from "~/features/onboarding/model/onboarding-phone";
import { validationError } from "~/lib/app-errors";

import { getOnboardingRequirements } from "../policy";
import { completeOnboarding } from "./index";

export async function submitOnboardingProfile(input: {
  phone: string;
}): Promise<{ redirectTo: string }> {
  const phone = input.phone.replace(/\D+/g, "").slice(0, 9);
  if (!isValidOnboardingPhone(phone)) {
    throw validationError("El número debe tener 9 dígitos");
  }

  const requirements = await getOnboardingRequirements();
  if (!requirements.requiredActions.includes("configure_strong_auth")) {
    return completeOnboarding(phone);
  }

  return {
    redirectTo: `/onboarding?step=security-choice&phone=${encodeURIComponent(phone)}`,
  };
}

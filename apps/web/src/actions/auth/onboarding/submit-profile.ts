"use server";

import { validationError } from "~/lib/app-errors";
import { isValidPeMobile, normalizePeMobileInput } from "~/lib/phone/pe-mobile";

import { getOnboardingRequirements } from "../policy";
import { completeOnboarding } from "./index";

export async function submitOnboardingProfile(input: {
  phone: string;
}): Promise<{ redirectTo: string }> {
  const phone = normalizePeMobileInput(input.phone);
  if (!isValidPeMobile(phone)) {
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

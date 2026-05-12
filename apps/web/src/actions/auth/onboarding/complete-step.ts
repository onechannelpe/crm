"use server";

import { isValidOnboardingPhone } from "~/features/onboarding/model/onboarding-phone";
import { validationError } from "~/lib/app-errors";

import { completeOnboarding } from "./index";

export async function completeOnboardingStep(input: {
  phone: string;
}): Promise<{ redirectTo: string }> {
  if (!isValidOnboardingPhone(input.phone)) {
    throw validationError("El número debe tener 9 dígitos");
  }

  return completeOnboarding(input.phone);
}

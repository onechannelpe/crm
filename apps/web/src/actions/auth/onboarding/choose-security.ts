"use server";

import { isValidOnboardingPhone } from "~/features/onboarding/model/onboarding-phone";
import { validationError } from "~/lib/app-errors";

export async function chooseSecurity(input: {
  phone: string;
  method: "passkey-step" | "totp-step";
}): Promise<{ redirectTo: string }> {
  if (!isValidOnboardingPhone(input.phone)) {
    throw validationError("El número debe tener 9 dígitos");
  }

  return {
    redirectTo: `/onboarding?step=${input.method}&phone=${encodeURIComponent(input.phone)}`,
  };
}

"use server";

import type { RegistrationResponseJSON } from "@simplewebauthn/server";

import { getMe } from "~/actions/auth/session";
import { validationError } from "~/lib/app-errors";
import { parsePhone } from "~/lib/phone/pe-mobile";

import { completePasskeyOnboarding } from "./index";

export async function finishPasskeyOnboardingStep(input: {
  challengeId: number;
  response: RegistrationResponseJSON;
  phone?: string;
}): Promise<{ redirectTo: string }> {
  const currentUser = await getMe();
  const phone = parsePhone(input.phone) ?? parsePhone(currentUser?.phone);
  if (!phone) {
    throw validationError("El número debe tener 9 dígitos y empezar con 9");
  }

  return completePasskeyOnboarding(phone, input.challengeId, input.response);
}

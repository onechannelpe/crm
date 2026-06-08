"use server";

import type { RegistrationResponseJSON } from "@simplewebauthn/server";

import { getMe } from "~/actions/auth/session";
import { parsePhone } from "~/lib/phone/pe-mobile";
import { validationFault } from "~/server/shared/domain-error";

import { completePasskeyOnboarding } from "./index";

export async function finishPasskeyOnboardingStep(input: {
  challengeId: number;
  response: RegistrationResponseJSON;
}): Promise<{ redirectTo: string }> {
  const currentUser = await getMe();
  const phone = parsePhone(currentUser?.phone);
  if (!phone) {
    throw validationFault("El número debe tener 9 dígitos y empezar con 9");
  }

  return completePasskeyOnboarding(phone, input.challengeId, input.response);
}

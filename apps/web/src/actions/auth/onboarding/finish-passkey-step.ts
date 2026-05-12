"use server";

import type { RegistrationResponseJSON } from "@simplewebauthn/server";

import { getMe } from "~/actions/auth/session";
import { validationError } from "~/lib/app-errors";
import { fromPeMobileE164 } from "~/lib/phone/pe-mobile";

import { completePasskeyOnboarding } from "./index";

export async function finishPasskeyOnboardingStep(input: {
  challengeId: number;
  response: RegistrationResponseJSON;
}): Promise<{ redirectTo: string }> {
  const currentUser = await getMe();
  const persisted = fromPeMobileE164(currentUser?.phoneE164);
  if (!persisted) {
    throw validationError("El número debe tener 9 dígitos y empezar con 9");
  }

  return completePasskeyOnboarding(
    persisted,
    input.challengeId,
    input.response,
  );
}

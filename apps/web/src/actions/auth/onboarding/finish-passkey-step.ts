"use server";

import type { RegistrationResponseJSON } from "@simplewebauthn/server";

import { completePasskeyOnboarding } from "./index";

export async function finishPasskeyOnboardingStep(input: {
  phone: string;
  challengeId: number;
  response: RegistrationResponseJSON;
}): Promise<{ redirectTo: string }> {
  return completePasskeyOnboarding(
    input.phone,
    input.challengeId,
    input.response,
  );
}

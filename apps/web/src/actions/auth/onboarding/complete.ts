"use server";

import type { RegistrationResponseJSON } from "@simplewebauthn/server";

import { getMe } from "~/actions/auth/session";
import { parsePhone } from "~/lib/phone/pe-mobile";
import { fail, throwDomain } from "~/server/shared/domain-error";
import { asWebauthnChallengeId } from "~/server/shared/ids";

import { completeOnboarding, completePasskeyOnboarding } from "./index";

async function requireCurrentUserPhone() {
  const currentUser = await getMe();
  const phone = parsePhone(currentUser?.phone);
  if (!phone) {
    throwDomain(fail("invalid_phone"));
  }

  return phone;
}

export async function completeOnboardingFromCurrentSession(): Promise<{
  redirectTo: string;
}> {
  return completeOnboarding(await requireCurrentUserPhone());
}

export async function completeOnboardingWithPasskey(input: {
  challengeId: string;
  response: RegistrationResponseJSON;
}): Promise<{ redirectTo: string }> {
  return completePasskeyOnboarding(
    await requireCurrentUserPhone(),
    asWebauthnChallengeId(input.challengeId),
    input.response,
  );
}

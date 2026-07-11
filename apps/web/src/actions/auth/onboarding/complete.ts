"use server";

import type { RegistrationResponseJSON } from "@simplewebauthn/server";

import { getMe } from "~/actions/auth/session";
import { parsePhone } from "~/lib/phone/pe-mobile";
import { fail, throwDomain } from "~/server/shared/domain-error";
import { WebauthnChallengeId } from "~/server/shared/ids";
import { isErr } from "~/server/shared/result";

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
  const phone = await requireCurrentUserPhone();
  const challengeId = WebauthnChallengeId.parse(input.challengeId);
  if (isErr(challengeId)) throwDomain(challengeId.error);

  return completePasskeyOnboarding(phone, challengeId.value, input.response);
}

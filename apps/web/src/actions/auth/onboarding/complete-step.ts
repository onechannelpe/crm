"use server";

import { getMe } from "~/actions/auth/session";
import { parsePhone } from "~/lib/phone/pe-mobile";
import { fail, throwDomain } from "~/server/shared/domain-error";

import { completeOnboarding } from "./index";

export async function completeOnboardingStep(): Promise<{
  redirectTo: string;
}> {
  const currentUser = await getMe();
  const phone = parsePhone(currentUser?.phone);
  if (!phone) {
    throwDomain(fail("invalid_phone"));
  }

  return completeOnboarding(phone);
}

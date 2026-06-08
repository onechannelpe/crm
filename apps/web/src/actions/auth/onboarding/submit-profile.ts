"use server";

import { requireSession } from "~/lib/auth/access/session";
import { parsePhone } from "~/lib/phone/pe-mobile";
import { getServerRuntime } from "~/server/runtime";
import { conflictFault, validationFault } from "~/server/shared/domain-error";
import { isErr } from "~/server/shared/result";

import { getOnboardingRequirements } from "../policy";
import { completeOnboarding } from "./index";

export async function submitOnboardingProfile(input: {
  phone: string;
}): Promise<{ redirectTo: string }> {
  const phone = parsePhone(input.phone);
  if (!phone) {
    throw validationFault("El número debe tener 9 dígitos");
  }
  const session = await requireSession();
  const updated = await getServerRuntime().users.updatePhone(
    session.userId,
    phone,
  );
  if (isErr(updated)) {
    throw conflictFault("Este número de WhatsApp ya está en uso");
  }

  const requirements = await getOnboardingRequirements();
  if (!requirements.requiredActions.includes("configure_strong_auth")) {
    return completeOnboarding(phone);
  }

  return {
    redirectTo: "/onboarding?step=security-choice",
  };
}

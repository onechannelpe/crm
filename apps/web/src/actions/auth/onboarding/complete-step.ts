"use server";

import { getMe } from "~/actions/auth/session";
import { validationError } from "~/lib/app-errors";

import { completeOnboarding } from "./index";

function normalizePhone(value: string | null | undefined): string {
  if (!value) return "";
  const digits = value.replace(/\D+/g, "");
  if (digits.startsWith("51") && digits.length === 11) {
    return digits.slice(2);
  }
  return digits.slice(0, 9);
}

export async function completeOnboardingStep(): Promise<{
  redirectTo: string;
}> {
  const currentUser = await getMe();
  const persisted = normalizePhone(currentUser?.phoneE164);
  if (persisted.length !== 9) {
    throw validationError("El número debe tener 9 dígitos");
  }

  return completeOnboarding(persisted);
}

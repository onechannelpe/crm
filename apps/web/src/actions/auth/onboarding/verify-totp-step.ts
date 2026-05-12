"use server";

import { finishTotpEnrollment } from "../security/totp";

export async function verifyTotpOnboardingStep(input: {
  code: string;
}): Promise<{ recoveryCodes: string[] }> {
  const recoveryCodes = await finishTotpEnrollment(input.code);
  return { recoveryCodes };
}

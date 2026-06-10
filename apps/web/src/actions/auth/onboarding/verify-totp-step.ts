"use server";

import { finishTotpEnrollment } from "../security/totp";

export async function verifyTotpOnboardingStep(input: {
  code: string;
}): Promise<{ recoveryCodes: string[]; message: string }> {
  return finishTotpEnrollment(input.code);
}

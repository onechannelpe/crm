import type { User } from "~/lib/db/schema";

import type { StrongAuthStatus } from "./strong-auth-status";
import { requiresStrongAuthRole } from "./strong-auth-status";

export type PasswordLoginPolicy =
  | "password_only"
  | "password_or_totp"
  | "password_bootstrap"
  | "passkey_only";

export function getPasswordLoginPolicy(input: {
  role: User["role"];
  onboardingCompleted: boolean;
  strongAuthStatus: StrongAuthStatus;
}): PasswordLoginPolicy {
  if (!requiresStrongAuthRole(input.role)) {
    return "password_only";
  }

  if (!input.strongAuthStatus.hasVerifiedStrongAuth) {
    return input.onboardingCompleted
      ? "password_or_totp"
      : "password_bootstrap";
  }

  if (input.strongAuthStatus.hasTotp) {
    return "password_or_totp";
  }

  return "passkey_only";
}

import type { OnboardingRequirements } from "~/server/auth/policy/types";

export type Step =
  | "password"
  | "profile"
  | "security-choice"
  | "passkey-step"
  | "totp-step"
  | "done";

export interface Facts {
  requirements: OnboardingRequirements;
  hasPhone: boolean;
}

export interface ViewState {
  step: Step;
  securityRequired: boolean;
  canFinishWithoutSecurity: boolean;
}

import type { OnboardingRequirements } from "~/server/auth/policy/types";

export type Step =
  | "profile"
  | "security-choice"
  | "passkey-step"
  | "totp-step"
  | "pending-step"
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

export interface OnboardingStateInput {
  onboardingCompleted: boolean;
  passwordChangeRequired: boolean;
  hasPhone: boolean;
  requiresStrongAuth: boolean;
  strongAuthConfigured: boolean;
}

const SESSION_CLASSES = ["pre_auth", "recovery_setup", "app"] as const;
const PRIMARY_AUTH_METHODS = ["password", "google", "passkey"] as const;
const STRONG_AUTH_METHODS = [
  "totp",
  "passkey",
  "federated",
  "recovery",
] as const;

export type SessionClass = (typeof SESSION_CLASSES)[number];
export type PrimaryAuthMethod = (typeof PRIMARY_AUTH_METHODS)[number];
export type StrongAuthMethod = (typeof STRONG_AUTH_METHODS)[number];

export function isSessionClass(value: string): value is SessionClass {
  return SESSION_CLASSES.some((item) => item === value);
}

export function resolveSessionClass(input: {
  onboardingCompleted: boolean;
  recoveryCodesAcknowledgementRequired: boolean;
}): SessionClass {
  if (!input.onboardingCompleted) return "pre_auth";
  return input.recoveryCodesAcknowledgementRequired ? "recovery_setup" : "app";
}

export function isPrimaryAuthMethod(value: string): value is PrimaryAuthMethod {
  return PRIMARY_AUTH_METHODS.some((item) => item === value);
}

export function isStrongAuthMethod(value: string): value is StrongAuthMethod {
  return STRONG_AUTH_METHODS.some((item) => item === value);
}

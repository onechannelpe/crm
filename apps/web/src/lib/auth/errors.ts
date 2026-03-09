export const AUTH_FLOW_ERROR_CODES = [
  "invalid_credentials",
  "strong_auth_required",
  "passkey_required",
  "invalid_totp",
] as const;

export type AuthFlowErrorCode = (typeof AUTH_FLOW_ERROR_CODES)[number];

export const AUTH_FLOW_MESSAGES = {
  invalid_credentials: "Invalid credentials",
  strong_auth_required: "Strong authentication required",
  passkey_required: "Use a passkey or configure an authenticator app",
  invalid_totp: "Invalid TOTP code",
} as const satisfies Record<AuthFlowErrorCode, string>;

export type InvalidCredentialsError = {
  kind: "invalid_credentials";
};

export type StrongAuthRequiredError = {
  kind: "strong_auth_required";
};

export type PasskeyRequiredError = {
  kind: "passkey_required";
};

export type InvalidTotpError = {
  kind: "invalid_totp";
};

export type AuthFlowError =
  | InvalidCredentialsError
  | StrongAuthRequiredError
  | PasskeyRequiredError
  | InvalidTotpError;

export function authFlowErrorMessage(code: AuthFlowErrorCode): string {
  return AUTH_FLOW_MESSAGES[code];
}

export const AUTH_FLOW_ERROR_CODES = [
  "invalid_credentials",
  "strong_auth_required",
  "passkey_required",
  "invalid_totp",
] as const;

export type AuthFlowErrorCode = (typeof AUTH_FLOW_ERROR_CODES)[number];

const AUTH_FLOW_MESSAGES = {
  invalid_credentials: "Invalid credentials",
  strong_auth_required: "Strong authentication required",
  passkey_required: "Use a passkey or configure an authenticator app",
  invalid_totp: "Invalid TOTP code",
} as const satisfies Record<AuthFlowErrorCode, string>;

export class AuthFlowError extends Error {
  readonly code: AuthFlowErrorCode;

  constructor(code: AuthFlowErrorCode) {
    super(AUTH_FLOW_MESSAGES[code]);
    this.name = "AuthFlowError";
    this.code = code;
  }
}

export function isAuthFlowError(error: unknown): error is AuthFlowError {
  return error instanceof AuthFlowError;
}

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

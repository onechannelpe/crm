import { encodeBase32LowerCaseNoPadding } from "@oslojs/encoding";

const TOKEN_BYTES = 20;
const TOKEN_PATTERN = /^[a-z2-7]{32}$/;

// The invite token is stored and looked up verbatim (see the `token` column):
// it is a shareable credential, not a private secret, so there is no hash step.
export function generateInviteToken(): string {
  const bytes = new Uint8Array(TOKEN_BYTES);
  crypto.getRandomValues(bytes);
  return encodeBase32LowerCaseNoPadding(bytes);
}

export function isValidInviteTokenFormat(token: string): boolean {
  return TOKEN_PATTERN.test(token);
}

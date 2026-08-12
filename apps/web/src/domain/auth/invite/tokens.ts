import { encodeBase32LowerCaseNoPadding } from "@oslojs/encoding";

const TOKEN_BYTES = 20;
const TOKEN_PATTERN = /^[a-z2-7]{32}$/;

// Invite tokens are credentials, not passwords. Store them verbatim.
export function generateInviteToken(): string {
  const bytes = new Uint8Array(TOKEN_BYTES);
  crypto.getRandomValues(bytes);
  return encodeBase32LowerCaseNoPadding(bytes);
}

export function isValidInviteTokenFormat(token: string): boolean {
  return TOKEN_PATTERN.test(token);
}

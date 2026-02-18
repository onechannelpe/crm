import { sha256 } from "@oslojs/crypto/sha2";
import {
  encodeBase32LowerCaseNoPadding,
  encodeHexLowerCase,
} from "@oslojs/encoding";

const TOKEN_BYTES = 20;
const TOKEN_PATTERN = /^[a-z2-7]{32}$/;

export function generateInviteToken(): string {
  const bytes = new Uint8Array(TOKEN_BYTES);
  crypto.getRandomValues(bytes);
  return encodeBase32LowerCaseNoPadding(bytes);
}

export function hashInviteToken(token: string): string {
  const payload = new TextEncoder().encode(`invite:${token}`);
  return encodeHexLowerCase(sha256(payload));
}

export function isValidInviteTokenFormat(token: string): boolean {
  return TOKEN_PATTERN.test(token);
}

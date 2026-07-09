import { sha256 } from "@oslojs/crypto/sha2";
import {
  encodeBase32LowerCaseNoPadding,
  encodeHexLowerCase,
} from "@oslojs/encoding";

// 20 random bytes encoded as base32lower-no-padding (32 chars). The cookie
// carries this; the database stores the SHA-256 hash, so a leak of the
// sessions table cannot forge cookies.
export function generateSessionToken(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return encodeBase32LowerCaseNoPadding(bytes);
}

// SHA-256 of the cookie token, hex-encoded. The cookie carries the token;
// the sessions table carries this hash, so a leaked sessions table cannot be
// used to forge cookies.
export function hashSessionToken(token: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hash = sha256(data);
  return encodeHexLowerCase(hash);
}

// 32 lowercase base32 characters (20 bytes of entropy); rejects anything else
// before it reaches a database lookup.
export function isValidTokenFormat(token: string): boolean {
  return /^[a-z2-7]{32}$/.test(token);
}

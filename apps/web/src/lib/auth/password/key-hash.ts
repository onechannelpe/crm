import { encodeHexLowerCase } from "@oslojs/encoding";
import { sha256 } from "@oslojs/crypto/sha2";

export function hashAuthKey(value: string): string {
  const bytes = new TextEncoder().encode(value);
  return encodeHexLowerCase(sha256(bytes));
}

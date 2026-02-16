import { randomBytes } from "node:crypto";

import { hashPassword, verifyPassword } from "~/lib/auth/password/password";

const CODE_COUNT = 10;
const CODE_BYTES = 5;

function toCode(bytes: Buffer): string {
  return bytes.toString("hex").toUpperCase();
}

export function generateRecoveryCodes(): string[] {
  return Array.from({ length: CODE_COUNT }, () =>
    toCode(randomBytes(CODE_BYTES)),
  );
}

export async function hashRecoveryCodes(codes: string[]): Promise<string[]> {
  return Promise.all(codes.map((code) => hashPassword(code)));
}

export async function matchesRecoveryCode(
  code: string,
  hash: string,
): Promise<boolean> {
  return verifyPassword(hash, code);
}

import { createHmac, randomBytes } from "node:crypto";

import { encodeBase32LowerCaseNoPadding } from "@oslojs/encoding";

import { recoveryConfig } from "~/lib/env";

const CODE_COUNT = 10;
// 7 random bytes (56 bits) keep printed codes legible. The server-held pepper
// prevents offline guesses, and the recovery throttle bounds online guesses.
const CODE_BYTES = 7;
const GROUP_SIZE = 4;

// HMAC recovery codes instead of slow-hashing them: the server-held pepper
// prevents offline guesses, and deterministic hashes support indexed redemption.
function normalizeCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z2-7]/g, "");
}

function group(code: string): string {
  return code.match(new RegExp(`.{1,${GROUP_SIZE}}`, "g"))?.join("-") ?? code;
}

export function generateRecoveryCodes(): string[] {
  return Array.from({ length: CODE_COUNT }, () =>
    group(
      encodeBase32LowerCaseNoPadding(randomBytes(CODE_BYTES)).toUpperCase(),
    ),
  );
}

// Accepts a code with or without the display grouping ("ABCD-EF23" or "abcdef23")
// so a user can type it back however they read it off paper.
export function hashRecoveryCode(code: string): string {
  return createHmac("sha256", recoveryConfig().recoveryCodePepper)
    .update(normalizeCode(code))
    .digest("hex");
}

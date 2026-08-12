import { randomBytes } from "node:crypto";

import {
  decodeBase32IgnorePadding,
  encodeBase32UpperCaseNoPadding,
} from "@oslojs/encoding";
import {
  createTOTPKeyURI,
  generateTOTP,
  verifyTOTPWithGracePeriod,
} from "@oslojs/otp";

import { PLATFORM_NAME } from "~/shared/branding";

const SECRET_BYTES = 20; // 160 bits per Copenhagen recommendations
const PERIOD_SECONDS = 30;
const DIGITS = 6;
const GRACE_PERIOD_SECONDS = 30;

function decodeSecret(secretBase32: string): Uint8Array {
  return decodeBase32IgnorePadding(secretBase32);
}

export function generateTotpSecret(): string {
  return encodeBase32UpperCaseNoPadding(randomBytes(SECRET_BYTES));
}

export function buildTotpProvisioningUri(
  secretBase32: string,
  email: string,
): string {
  return createTOTPKeyURI(
    PLATFORM_NAME,
    email,
    decodeSecret(secretBase32),
    PERIOD_SECONDS,
    DIGITS,
  );
}

export function verifyTotpCode(secretBase32: string, token: string): boolean {
  return verifyTOTPWithGracePeriod(
    decodeSecret(secretBase32),
    PERIOD_SECONDS,
    DIGITS,
    token,
    GRACE_PERIOD_SECONDS,
  );
}

export function generateCurrentTotpCode(secretBase32: string): string {
  return generateTOTP(decodeSecret(secretBase32), PERIOD_SECONDS, DIGITS);
}

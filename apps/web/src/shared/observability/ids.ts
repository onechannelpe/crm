import { encodeHexLowerCase } from "@oslojs/encoding";

function randomHex(bytes: number): string {
  const value = new Uint8Array(bytes);
  crypto.getRandomValues(value);
  return encodeHexLowerCase(value);
}

export function generateTraceId(): string {
  return randomHex(16);
}

export function generateRequestId(): string {
  return randomHex(12);
}

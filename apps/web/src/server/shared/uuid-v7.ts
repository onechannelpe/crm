import { randomBytes } from "node:crypto";

function toHex(value: number): string {
  return value.toString(16).padStart(2, "0");
}

export function createUuidV7(now = Date.now()): string {
  const bytes = randomBytes(16);

  const timestamp = Math.max(0, Math.min(now, 0xffff_ffff_ffff));
  bytes[0] = (timestamp / 0x1_0000_0000_00) & 0xff;
  bytes[1] = (timestamp / 0x1_0000_0000) & 0xff;
  bytes[2] = (timestamp / 0x1_0000_00) & 0xff;
  bytes[3] = (timestamp / 0x1_0000) & 0xff;
  bytes[4] = (timestamp / 0x100) & 0xff;
  bytes[5] = timestamp & 0xff;

  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, toHex).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

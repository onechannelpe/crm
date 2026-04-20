import { createHash, randomBytes } from "node:crypto";

export function generateDownloadToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export const DOWNLOAD_TOKEN_TTL_MS = 60_000;

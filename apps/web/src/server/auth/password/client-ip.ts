import { securityConfig } from "~/server/platform/config/env";

export function getClientIp(
  headers: Headers,
  trustedProxy = securityConfig().trustedProxy === "true",
): string {
  if (!trustedProxy) {
    return "127.0.0.1";
  }

  const cfIp = normalizeIp(headers.get("cf-connecting-ip"));
  if (cfIp) {
    return cfIp;
  }

  const forwardedIp = normalizeIp(
    headers.get("x-forwarded-for")?.split(",", 1)[0],
  );
  if (forwardedIp) {
    return forwardedIp;
  }

  const realIp = normalizeIp(headers.get("x-real-ip"));
  if (realIp) {
    return realIp;
  }

  return "127.0.0.1";
}

function normalizeIp(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase();
  return normalized ? normalized.slice(0, 64) : null;
}

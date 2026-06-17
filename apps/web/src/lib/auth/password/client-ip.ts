import { serverEnv } from "~/lib/env";

export function getClientIp(
  headers: Headers,
  trustedProxy = isTrustedProxyEnabled(),
): string {
  if (!trustedProxy) return "127.0.0.1";

  const cfIp = cleanIp(headers.get("cf-connecting-ip"));
  if (cfIp) return cfIp;

  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = cleanIp(forwarded.split(",")[0] ?? "");
    if (first) return first;
  }

  const realIp = cleanIp(headers.get("x-real-ip"));
  if (realIp) return realIp;

  return "127.0.0.1";
}

function isTrustedProxyEnabled(): boolean {
  return serverEnv().security.trustedProxy === "true";
}

function cleanIp(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  return normalized.slice(0, 64);
}

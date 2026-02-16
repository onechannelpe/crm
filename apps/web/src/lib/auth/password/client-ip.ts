export function getClientIp(headers: Headers): string {
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

function cleanIp(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  return normalized.slice(0, 64);
}

function getForwardedOrigin(headers: Headers): string | null {
  const forwarded = headers.get("forwarded");
  if (forwarded) {
    const protoMatch = forwarded.match(/(?:^|[;,]\s*)proto=([^;,\s]+)/i);
    const hostMatch = forwarded.match(/(?:^|[;,]\s*)host=([^;,\s]+)/i);
    const proto = stripForwardedValue(protoMatch?.[1]);
    const host = stripForwardedValue(hostMatch?.[1]);
    if (proto && host) {
      return `${proto}://${host}`;
    }
  }

  const proto = headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const host = headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  if (proto && host) {
    return `${proto}://${host}`;
  }

  return null;
}

function stripForwardedValue(value: string | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().replace(/^"|"$/g, "");
  return normalized || null;
}

export function resolvePublicOrigin(
  request: Request,
  policy: { trustedProxy: boolean },
): string {
  if (policy.trustedProxy) {
    const forwardedOrigin = getForwardedOrigin(request.headers);
    if (forwardedOrigin) {
      return forwardedOrigin;
    }
  }

  return new URL(request.url).origin;
}

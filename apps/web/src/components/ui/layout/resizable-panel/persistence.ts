import { getRequestEvent, isServer } from "solid-js/web";

function parseCookieValue(
  cookieString: string,
  cookieName: string,
): string | null {
  const prefix = `${cookieName}=`;

  for (const rawCookie of cookieString.split(";")) {
    const cookie = rawCookie.trim();

    if (cookie.startsWith(prefix)) {
      return cookie.slice(prefix.length);
    }
  }

  return null;
}

function readRawCookie(cookieName: string): string | null {
  if (isServer) {
    const cookieHeader = getRequestEvent()?.request.headers.get("cookie") ?? "";
    return parseCookieValue(cookieHeader, cookieName);
  }

  return parseCookieValue(document.cookie, cookieName);
}

export function readNumberFromCookie(
  cookieName: string,
  defaultValue: number,
  clamp: (value: number) => number,
): number {
  const raw = readRawCookie(cookieName);

  if (raw === null) {
    return defaultValue;
  }

  const parsed = Number.parseInt(raw, 10);

  if (Number.isNaN(parsed)) {
    return defaultValue;
  }

  return clamp(parsed);
}

export function persistNumberToCookie(
  cookieName: string,
  value: number,
  maxAgeSeconds: number,
  clamp: (value: number) => number,
): number {
  const clampedValue = clamp(value);

  if (!isServer) {
    document.cookie = `${cookieName}=${clampedValue}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax`;
  }

  return clampedValue;
}

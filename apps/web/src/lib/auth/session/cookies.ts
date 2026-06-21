import { getCookie, setCookie, deleteCookie } from "@solidjs/start/http";

const COOKIE_NAME = "session";

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

function serializeSessionCookieValue(
  token: string,
  options?: { maxAge?: number },
): string {
  const secure = isProduction() ? "; Secure" : "";
  const maxAge =
    options?.maxAge === undefined
      ? `; Max-Age=${COOKIE_MAX_AGE}`
      : `; Max-Age=${options.maxAge}`;
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly${secure}; SameSite=Lax${maxAge}`;
}

export function getSessionCookie(): string | undefined {
  return getCookie(COOKIE_NAME);
}

export function setSessionCookie(token: string): void {
  setCookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}

export function deleteSessionCookie(): void {
  deleteCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    path: "/",
  });
}

export function appendSessionCookie(headers: Headers, token: string): void {
  headers.append("Set-Cookie", serializeSessionCookieValue(token));
}

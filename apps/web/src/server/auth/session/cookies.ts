import { getCookie, setCookie, deleteCookie } from "@solidjs/start/http";

import { isProduction } from "~/shared/observability/runtime-env";

const COOKIE_NAME = "session";
// Parks the administrator's own session token while they impersonate another
// user, so exiting impersonation can restore it.
const IMPERSONATOR_COOKIE_NAME = "impersonator_session";

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

export function getImpersonatorCookie(): string | undefined {
  return getCookie(IMPERSONATOR_COOKIE_NAME);
}

export function setImpersonatorCookie(token: string): void {
  setCookie(IMPERSONATOR_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}

export function deleteImpersonatorCookie(): void {
  deleteCookie(IMPERSONATOR_COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    path: "/",
  });
}

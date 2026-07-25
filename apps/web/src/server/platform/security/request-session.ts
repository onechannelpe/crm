import { deleteCookie, getCookie, setCookie } from "@solidjs/start/http";

const COOKIE_NAME = "request_session";
const COOKIE_MAX_AGE = 60 * 60 * 24;

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function getRequestSessionCookie(): string | undefined {
  return getCookie(COOKIE_NAME);
}

export function setRequestSessionCookie(id: string): void {
  setCookie(COOKIE_NAME, id, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}

export function deleteRequestSessionCookie(): void {
  deleteCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    path: "/",
  });
}

export function getRequestSessionMaxAgeSeconds(): number {
  return COOKIE_MAX_AGE;
}

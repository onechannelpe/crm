import { setCookie as vinxiSetCookie, deleteCookie as vinxiDeleteCookie } from "vinxi/http";
import { SESSION_MAX_AGE } from "./session";

const SESSION_COOKIE = "session";

export function setSessionTokenCookie(token: string): void {
  const maxAgeSeconds = Math.floor((Number(SESSION_MAX_AGE) || 0) / 1000);
  vinxiSetCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: maxAgeSeconds,
    path: "/",
  });
}

export function deleteSessionTokenCookie(): void {
  vinxiDeleteCookie(SESSION_COOKIE);
}

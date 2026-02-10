import type { Context } from "hono";
import { deleteCookie, setCookie } from "hono/cookie";
import { SESSION_MAX_AGE } from "./session";

const SESSION_COOKIE = "session";

export function setSessionTokenCookie(c: Context, token: string): void {
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax",
    maxAge: Math.floor(SESSION_MAX_AGE / 1000),
    path: "/",
  });
}

export function deleteSessionTokenCookie(c: Context): void {
  deleteCookie(c, SESSION_COOKIE);
}

import { getCookie, setCookie, deleteCookie } from "vinxi/http";

const COOKIE_NAME = "session";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

export function getSessionCookie(): string | undefined {
    return getCookie(COOKIE_NAME);
}

export function setSessionCookie(token: string): void {
    const isProduction = process.env.NODE_ENV === "production";

    setCookie(COOKIE_NAME, token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        maxAge: COOKIE_MAX_AGE,
        path: "/",
    });
}

export function deleteSessionCookie(): void {
    const isProduction = process.env.NODE_ENV === "production";

    deleteCookie(COOKIE_NAME, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        path: "/",
    });
}

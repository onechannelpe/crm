import { getCookie, setCookie } from "@solidjs/start/http";
import { signHmac } from "./hmac";

export const CSRF_CONFIG = {
    /**
     * __Host- prefix ensures the cookie is:
     * 1. Secure (HTTPS only)
     * 2. No domain attribute (origin-bound)
     * 3. Path=/
     */
    COOKIE_NAME: "__Host-csrf_token",
    HEADER_NAME: "x-csrf-token",
    FORM_FIELD: "csrf_token",
};

export async function generateCsrfToken(): Promise<string> {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const value = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
        "",
    );
    const secret = process.env.SESSION_SECRET || "fallback_dont_use_in_prod";
    const signature = await signHmac(value, secret);
    return `${value}.${signature}`;
}

export function setCsrfCookie(token: string): void {
    setCookie(CSRF_CONFIG.COOKIE_NAME, token, {
        httpOnly: false,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24, // 24 hours
    });
}

export function getCsrfFromCookie(): string | undefined {
    return getCookie(CSRF_CONFIG.COOKIE_NAME);
}

export async function verifyCsrf(request: Request): Promise<boolean> {
    const cookieToken = getCookie(CSRF_CONFIG.COOKIE_NAME);
    if (!cookieToken) return false;

    const [value, signature] = cookieToken.split(".");
    if (!value || !signature) return false;

    const secret = process.env.SESSION_SECRET || "fallback_dont_use_in_prod";
    const expectedSignature = await signHmac(value, secret);
    if (signature !== expectedSignature) return false;

    const headerToken = request.headers.get(CSRF_CONFIG.HEADER_NAME);
    if (headerToken === cookieToken) return true;

    const contentType = request.headers.get("content-type");
    const isForm =
        contentType?.includes("application/x-www-form-urlencoded") ||
        contentType?.includes("multipart/form-data");

    if (isForm) {
        try {
            const formData = await request.clone().formData();
            const formToken = formData.get(CSRF_CONFIG.FORM_FIELD);
            if (formToken === cookieToken) return true;
        } catch {
            // Ignore parsing errors
        }
    }

    return false;
}

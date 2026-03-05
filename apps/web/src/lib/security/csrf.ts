import { getCookie, setCookie } from "@solidjs/start/http";

import { env } from "~/lib/env";

import { CSRF_CONFIG } from "./csrf-config";
import { signHmac, verifyHmac } from "./hmac";

const ONE_DAY_SECONDS = 60 * 60 * 24;

export async function generateCsrfToken(): Promise<string> {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const value = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
    "",
  );
  const signature = await signHmac(value, env.sessionSecret);
  return `${value}.${signature}`;
}

export function setCsrfCookie(token: string): void {
  setCookie(CSRF_CONFIG.COOKIE_NAME, token, {
    httpOnly: false,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: ONE_DAY_SECONDS,
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

  const valid = await verifyHmac(value, signature, env.sessionSecret);
  if (!valid) return false;

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

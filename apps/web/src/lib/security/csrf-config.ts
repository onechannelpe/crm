export const CSRF_CONFIG = {
  HEADER_NAME: "x-csrf-token",
  FORM_FIELD: "csrf_token",
} as const;

export function getCsrfCookieName(): string {
  return import.meta.env.PROD ? "__Host-csrf_token" : "csrf_token";
}

export const CSRF_CONFIG = {
  COOKIE_NAME: "__Host-csrf_token",
  HEADER_NAME: "x-csrf-token",
  FORM_FIELD: "csrf_token",
} satisfies Record<string, string>;

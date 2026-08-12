// Split out from cookies.ts so this stays a plain constant: cookies.ts pulls
// in @solidjs/start/http, and this name is also needed by
// resolve-from-event.ts, which must not.
export const SESSION_COOKIE_NAME = "session";

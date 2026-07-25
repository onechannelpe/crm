const COOKIE_MAX_AGE = 600;
const STATE_COOKIE_NAME = "google_oauth_state";
const CODE_VERIFIER_COOKIE_NAME = "google_code_verifier";

function serializeOAuthCookie(
  name: string,
  value: string,
  maxAge: number,
): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${name}=${value}; Path=/; HttpOnly${secure}; SameSite=Lax; Max-Age=${maxAge}`;
}

function readCookieMap(header: string | null): ReadonlyMap<string, string> {
  if (!header) return new Map();

  return new Map(
    header
      .split(";")
      .map((pair) => {
        const separator = pair.indexOf("=");
        if (separator < 0) return null;

        const key = pair.slice(0, separator).trim();
        const value = decodeURIComponent(pair.slice(separator + 1).trim());
        return [key, value] as const;
      })
      .filter((entry): entry is readonly [string, string] => entry !== null),
  );
}

export function readGoogleOAuthCookies(header: string | null): {
  state: string | null;
  codeVerifier: string | null;
} {
  const cookies = readCookieMap(header);
  return {
    state: cookies.get(STATE_COOKIE_NAME) ?? null,
    codeVerifier: cookies.get(CODE_VERIFIER_COOKIE_NAME) ?? null,
  };
}

export function appendGoogleOAuthChallengeCookies(
  headers: Headers,
  params: { state: string; codeVerifier: string },
): void {
  headers.append(
    "Set-Cookie",
    serializeOAuthCookie(STATE_COOKIE_NAME, params.state, COOKIE_MAX_AGE),
  );
  headers.append(
    "Set-Cookie",
    serializeOAuthCookie(
      CODE_VERIFIER_COOKIE_NAME,
      params.codeVerifier,
      COOKIE_MAX_AGE,
    ),
  );
}

export function appendClearedGoogleOAuthCookies(headers: Headers): void {
  headers.append("Set-Cookie", serializeOAuthCookie(STATE_COOKIE_NAME, "", 0));
  headers.append(
    "Set-Cookie",
    serializeOAuthCookie(CODE_VERIFIER_COOKIE_NAME, "", 0),
  );
}

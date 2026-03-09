import { generateCodeVerifier, generateState } from "arctic";

import { googleOAuth } from "~/lib/auth/google/google-oauth";

const COOKIE_MAX_AGE = 600; // 10 minutes

function buildOAuthCookie(name: string, value: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${name}=${value}; Path=/; HttpOnly${secure}; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE}`;
}

export async function GET(): Promise<Response> {
  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const url = googleOAuth.createAuthorizationURL(state, codeVerifier, [
    "openid",
    "profile",
    "email",
  ]);

  return new Response(null, {
    status: 302,
    headers: new Headers([
      ["Location", url.toString()],
      ["Set-Cookie", buildOAuthCookie("google_oauth_state", state)],
      ["Set-Cookie", buildOAuthCookie("google_code_verifier", codeVerifier)],
    ]),
  });
}

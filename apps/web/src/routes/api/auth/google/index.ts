import { generateCodeVerifier, generateState } from "arctic";

import { googleOAuth } from "~/lib/auth/google/google-oauth";
import { appendGoogleOAuthChallengeCookies } from "~/lib/auth/google/google-oauth-cookies";

export async function GET(): Promise<Response> {
  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const url = googleOAuth.createAuthorizationURL(state, codeVerifier, [
    "openid",
    "profile",
    "email",
  ]);

  const headers = new Headers([["Location", url.toString()]]);
  appendGoogleOAuthChallengeCookies(headers, { state, codeVerifier });

  return new Response(null, { status: 302, headers });
}

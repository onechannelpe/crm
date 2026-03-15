import type { APIEvent } from "@solidjs/start/server";
import { decodeIdToken } from "arctic";

import { googleOAuth, parseGoogleClaims } from "~/lib/auth/google/google-oauth";
import { submitGoogleLogin } from "~/lib/auth/login-flow";
import { getClientIp } from "~/lib/auth/password/client-ip";
import { privilegedLoginAlertSender, repos } from "~/server/shared/context";

const SESSION_MAX_AGE = 30 * 24 * 60 * 60;

function parseCookies(header: string | null): Record<string, string> {
  if (!header) return {};
  return Object.fromEntries(
    header.split(";").flatMap((pair) => {
      const eq = pair.indexOf("=");
      if (eq < 0) return [];
      const key = pair.slice(0, eq).trim();
      const value = decodeURIComponent(pair.slice(eq + 1).trim());
      return [[key, value]];
    }),
  );
}

function buildSessionCookie(token: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `session=${token}; Path=/; HttpOnly${secure}; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}`;
}

function clearOAuthCookies(): string[] {
  const clear = "Path=/; HttpOnly; SameSite=Lax; Max-Age=0";
  return [`google_oauth_state=; ${clear}`, `google_code_verifier=; ${clear}`];
}

function badRequest(): Response {
  return new Response("Bad request", { status: 400 });
}

function redirectToLogin(url: URL, error: string): Response {
  const loginUrl = new URL("/login", url.origin);
  loginUrl.searchParams.set("error", error);
  const clearHeaders = new Headers([
    ["Location", loginUrl.toString()],
    ...clearOAuthCookies().map((v) => ["Set-Cookie", v] as [string, string]),
  ]);
  return new Response(null, { status: 302, headers: clearHeaders });
}

export async function GET(event: APIEvent): Promise<Response> {
  const url = new URL(event.request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const cookies = parseCookies(event.request.headers.get("cookie"));
  const storedState = cookies["google_oauth_state"] ?? null;
  const codeVerifier = cookies["google_code_verifier"] ?? null;

  if (!code || !state || !storedState || !codeVerifier) {
    return badRequest();
  }

  if (state !== storedState) {
    return badRequest();
  }

  let googleUserId: string;

  try {
    const tokens = await googleOAuth.validateAuthorizationCode(
      code,
      codeVerifier,
    );
    const claims = decodeIdToken(tokens.idToken());
    const profile = parseGoogleClaims(claims);
    googleUserId = profile.sub;
  } catch {
    return badRequest();
  }

  const oauthAccount = await repos.oauthAccounts.findByProvider(
    "google",
    googleUserId,
  );

  if (!oauthAccount) {
    return redirectToLogin(url, "google_not_linked");
  }

  const user = await repos.users.findById(oauthAccount.user_id);
  if (!user || !user.is_active) {
    return redirectToLogin(url, "google_not_linked");
  }

  const ipAddress = getClientIp(event.request.headers);
  const userAgent = event.request.headers.get("user-agent") ?? null;
  const result = await submitGoogleLogin(
    {
      userId: user.id,
      ipAddress,
      userAgent,
      trustedFederatedMfa: false,
    },
    repos,
    privilegedLoginAlertSender,
  );
  if (result.ok === false) {
    return redirectToLogin(
      url,
      result.error.kind === "strong_auth_required"
        ? "strong_auth_required"
        : "google_not_linked",
    );
  }

  const destination =
    result.value.kind === "totp_required"
      ? `/login/verify?flow=${result.value.flow.id}`
      : result.value.kind === "passkey_required"
        ? `/login/passkey?flow=${result.value.flow.id}`
        : result.value.result.onboardingCompleted
          ? "/"
          : "/onboarding";

  const responseHeaders = new Headers([
    ["Location", destination],
    ...(result.value.kind === "complete"
      ? [["Set-Cookie", buildSessionCookie(result.value.result.token)]]
      : []),
    ...clearOAuthCookies().map((v) => ["Set-Cookie", v] as [string, string]),
  ]);

  return new Response(null, { status: 302, headers: responseHeaders });
}

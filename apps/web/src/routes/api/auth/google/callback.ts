import type { APIEvent } from "@solidjs/start/server";
import { decodeIdToken } from "arctic";

import { getDefaultAppPath } from "~/lib/auth/access/route-policy";
import { googleOAuth, parseGoogleClaims } from "~/lib/auth/google/google-oauth";
import { getClientIp } from "~/lib/auth/password/client-ip";
import { createSession } from "~/lib/auth/session/session-manager";
import { repos } from "~/server/shared/context";

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
    const loginUrl = new URL("/login", url.origin);
    loginUrl.searchParams.set("error", "google_not_linked");
    const clearHeaders = new Headers([
      ["Location", loginUrl.toString()],
      ...clearOAuthCookies().map((v) => ["Set-Cookie", v] as [string, string]),
    ]);
    return new Response(null, { status: 302, headers: clearHeaders });
  }

  const user = await repos.users.findById(oauthAccount.user_id);
  if (!user || !user.is_active) {
    const loginUrl = new URL("/login", url.origin);
    loginUrl.searchParams.set("error", "google_not_linked");
    const clearHeaders = new Headers([
      ["Location", loginUrl.toString()],
      ...clearOAuthCookies().map((v) => ["Set-Cookie", v] as [string, string]),
    ]);
    return new Response(null, { status: 302, headers: clearHeaders });
  }

  const ipAddress = getClientIp(event.request.headers);
  const userAgent = event.request.headers.get("user-agent") ?? null;

  const token = await createSession(
    user.id,
    user.branch_id,
    user.role,
    ipAddress,
    userAgent,
    "google",
    Date.now(),
  );

  await repos.auditLogs.create({
    user_id: user.id,
    action: "login",
    entity_type: "user",
    entity_id: user.id,
    changes: null,
    created_at: Date.now(),
  });

  const destination =
    user.onboarding_completed_at !== null
      ? getDefaultAppPath(user.role)
      : "/onboarding";

  const responseHeaders = new Headers([
    ["Location", destination],
    ["Set-Cookie", buildSessionCookie(token)],
    ...clearOAuthCookies().map((v) => ["Set-Cookie", v] as [string, string]),
  ]);

  return new Response(null, { status: 302, headers: responseHeaders });
}

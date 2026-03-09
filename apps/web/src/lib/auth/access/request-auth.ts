import { verifyCsrf } from "../../security/csrf";
import { getSessionCookie } from "../session/cookies";
import {
  validateSessionToken,
  type SessionValidationResult,
} from "../session/session-manager";
import { canAccessPath, getDefaultAppPath } from "./route-policy";

export interface AuthRequestEvent {
  request: Request;
  locals?: App.RequestEventLocals;
}

export interface AuthRequestDeps {
  getSessionCookie: () => string | null | undefined;
  validateSessionToken: (token: string) => Promise<SessionValidationResult>;
}

const defaultDeps: AuthRequestDeps = {
  getSessionCookie,
  validateSessionToken,
};

export type AuthRequestDecision =
  | { kind: "allow" }
  | { kind: "redirect_login" }
  | { kind: "redirect_onboarding" }
  | { kind: "redirect_home"; to: string }
  | { kind: "reject"; response: Response };

export function isPublicPath(pathname: string): boolean {
  return (
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/_") ||
    pathname.startsWith("/releases") ||
    pathname.startsWith("/docs") ||
    pathname === "/privacy" ||
    pathname === "/terms" ||
    pathname.includes(".")
  );
}

export async function enforceAuthRequest(
  event: AuthRequestEvent,
  deps: AuthRequestDeps = defaultDeps,
): Promise<AuthRequestDecision> {
  const url = new URL(event.request.url);

  if (event.request.method !== "GET" && event.request.method !== "HEAD") {
    // 1. Basic Origin vs Host check (already present)
    const origin = event.request.headers.get("Origin");
    const host = event.request.headers.get("Host");
    if (origin && new URL(origin).host !== host) {
      return {
        kind: "reject",
        response: new Response("CSRF validation failed (Origin mismatch)", {
          status: 403,
        }),
      };
    }

    // 2. Double-Submit Cookie Check
    const isCsrfValid = await verifyCsrf(event.request);
    if (!isCsrfValid) {
      return {
        kind: "reject",
        response: new Response("CSRF validation failed", { status: 403 }),
      };
    }
  }

  if (isPublicPath(url.pathname)) return { kind: "allow" };

  const token = deps.getSessionCookie();
  if (!token) {
    return { kind: "redirect_login" };
  }

  const { session } = await deps.validateSessionToken(token);
  if (!session) {
    return { kind: "redirect_login" };
  }

  if (!session.onboardingCompleted && url.pathname !== "/onboarding") {
    return { kind: "redirect_onboarding" };
  }

  if (session.onboardingCompleted && url.pathname === "/onboarding") {
    return { kind: "redirect_home", to: getDefaultAppPath(session.role) };
  }

  if (url.pathname === "/") {
    return { kind: "redirect_home", to: getDefaultAppPath(session.role) };
  }

  if (!canAccessPath(session.role, url.pathname)) {
    return { kind: "redirect_home", to: getDefaultAppPath(session.role) };
  }

  event.locals = event.locals ?? {};
  event.locals.session = session;
  return { kind: "allow" };
}

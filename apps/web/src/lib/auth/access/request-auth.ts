import { getSessionCookie } from "../session/cookies";
import {
  validateSessionToken,
  type SessionValidationResult,
} from "../session/session-manager";

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
  | { kind: "reject"; response: Response };

export function isPublicPath(pathname: string): boolean {
  return (
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/_") ||
    pathname.includes(".")
  );
}

export async function enforceAuthRequest(
  event: AuthRequestEvent,
  deps: AuthRequestDeps = defaultDeps,
): Promise<AuthRequestDecision> {
  const url = new URL(event.request.url);

  if (event.request.method !== "GET") {
    const origin = event.request.headers.get("Origin");
    const host = event.request.headers.get("Host");
    if (origin && new URL(origin).host !== host) {
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

  event.locals = event.locals ?? {};
  event.locals.session = session;
  return { kind: "allow" };
}

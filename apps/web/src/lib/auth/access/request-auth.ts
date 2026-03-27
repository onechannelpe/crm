import { verifyCsrf } from "../../security/csrf";
import { getSessionCookie } from "../session/cookies";
import {
  validateSessionToken,
  type SessionValidationResult,
} from "../session/session-manager";
import { createLogger } from "~/lib/observability/logger";
import { canAccessPath, getDefaultAppPath } from "./route-policy";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const logger = createLogger("auth-request-guard");

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
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/_") ||
    pathname.startsWith("/releases") ||
    pathname.startsWith("/docs") ||
    pathname === "/privacy" ||
    pathname === "/terms" ||
    pathname.includes(".")
  );
}

export function enforceCsrfRequestPolicy(request: Request): string | null {
  if (SAFE_METHODS.has(request.method)) {
    return null;
  }

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite) {
    if (fetchSite === "same-origin") {
      return null;
    }

    if (fetchSite === "cross-site" || fetchSite === "same-site") {
      return "CSRF validation failed (Fetch Metadata)";
    }

    if (fetchSite === "none") {
      return "CSRF validation failed (Fetch Metadata)";
    }

    return "CSRF validation failed (Fetch Metadata)";
  }

  const sourceOrigin = getSourceOrigin(request);
  if (!sourceOrigin) {
    return "CSRF validation failed (Origin missing)";
  }

  const targetOrigin = getTargetOrigin(request);
  if (sourceOrigin !== targetOrigin) {
    return "CSRF validation failed (Origin mismatch)";
  }

  return null;
}

function getSourceOrigin(request: Request): string | null {
  const origin = request.headers.get("origin");
  if (origin) {
    return normalizeOrigin(origin);
  }

  const referer = request.headers.get("referer");
  if (!referer) {
    return null;
  }

  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

export function getTargetOrigin(request: Request): string {
  if (process.env.TRUSTED_PROXY === "true") {
    const forwardedOrigin = getForwardedOrigin(request.headers);
    if (forwardedOrigin) {
      return forwardedOrigin;
    }
  }

  return new URL(request.url).origin;
}

function normalizeOrigin(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function getForwardedOrigin(headers: Headers): string | null {
  const forwarded = headers.get("forwarded");
  if (forwarded) {
    const protoMatch = forwarded.match(/(?:^|[;,]\s*)proto=([^;,\s]+)/i);
    const hostMatch = forwarded.match(/(?:^|[;,]\s*)host=([^;,\s]+)/i);
    const proto = stripForwardedValue(protoMatch?.[1]);
    const host = stripForwardedValue(hostMatch?.[1]);
    if (proto && host) {
      return `${proto}://${host}`;
    }
  }

  const proto = headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const host = headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  if (proto && host) {
    return `${proto}://${host}`;
  }

  return null;
}

function stripForwardedValue(value: string | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().replace(/^"|"$/g, "");
  return normalized || null;
}

export async function enforceAuthRequest(
  event: AuthRequestEvent,
  deps: AuthRequestDeps = defaultDeps,
): Promise<AuthRequestDecision> {
  const url = new URL(event.request.url);

  if (!SAFE_METHODS.has(event.request.method)) {
    const csrfPolicyError = enforceCsrfRequestPolicy(event.request);
    if (csrfPolicyError) {
      logCsrfReject(event, csrfPolicyError);
      return {
        kind: "reject",
        response: new Response(csrfPolicyError, { status: 403 }),
      };
    }

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

  if (session.sessionClass === "pre_auth" && url.pathname !== "/onboarding") {
    return { kind: "redirect_onboarding" };
  }

  if (
    session.sessionClass === "app" &&
    session.onboardingCompleted &&
    url.pathname === "/onboarding"
  ) {
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

function logCsrfReject(event: AuthRequestEvent, reason: string): void {
  const request = event.request;
  logger.warn("csrf_request_rejected", {
    reason,
    method: request.method,
    path: new URL(request.url).pathname,
    fetchSite: request.headers.get("sec-fetch-site"),
    origin: request.headers.get("origin"),
    targetOrigin: getTargetOrigin(request),
    requestId: event.locals?.observability?.requestId ?? null,
    traceId: event.locals?.observability?.traceId ?? null,
  });
}

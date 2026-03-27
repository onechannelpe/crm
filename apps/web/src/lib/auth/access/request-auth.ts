import { getRequestPublicOrigin } from "~/lib/http/public-origin";
import { createLogger } from "~/lib/observability/logger";

import { verifyCsrf } from "../../security/csrf";
import { canAccessPath, getDefaultAppPath } from "./route-policy";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const logger = createLogger("auth-request-guard");

export interface AuthRequestEvent {
  request: Request;
  locals?: App.RequestEventLocals;
}

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

export function enforceCsrfRequestPolicy(
  request: Request,
  targetOrigin = getTargetOrigin(request),
): string | null {
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
  return getRequestPublicOrigin(request);
}

function normalizeOrigin(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export async function enforceAuthRequest(
  event: AuthRequestEvent,
): Promise<AuthRequestDecision> {
  const url = new URL(event.request.url);
  const requestContext = event.locals?.requestContext;
  const targetOrigin =
    requestContext?.publicOrigin ?? getTargetOrigin(event.request);

  if (!SAFE_METHODS.has(event.request.method)) {
    const csrfPolicyError = enforceCsrfRequestPolicy(
      event.request,
      targetOrigin,
    );
    if (csrfPolicyError) {
      logCsrfReject(event, csrfPolicyError, targetOrigin);
      return {
        kind: "reject",
        response: new Response(csrfPolicyError, { status: 403 }),
      };
    }

    const csrfToken = requestContext
      ? await requestContext.getRequestCsrfToken()
      : null;
    const isCsrfValid = csrfToken
      ? await verifyCsrf(event.request, csrfToken)
      : false;
    if (!isCsrfValid) {
      return {
        kind: "reject",
        response: new Response("CSRF validation failed", { status: 403 }),
      };
    }
  }

  if (isPublicPath(url.pathname)) return { kind: "allow" };

  const session = requestContext ? await requestContext.getAuthSession() : null;
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
  return { kind: "allow" };
}

function logCsrfReject(
  event: AuthRequestEvent,
  reason: string,
  targetOrigin: string,
): void {
  const request = event.request;
  logger.warn("csrf_request_rejected", {
    reason,
    method: request.method,
    path: new URL(request.url).pathname,
    fetchSite: request.headers.get("sec-fetch-site"),
    origin: request.headers.get("origin"),
    targetOrigin,
    requestId: event.locals?.requestContext?.observability.requestId ?? null,
    traceId: event.locals?.requestContext?.observability.traceId ?? null,
  });
}

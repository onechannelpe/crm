import { createLogger } from "~/lib/observability/logger";
import {
  getWebhookPolicy,
  WEBHOOK_BODY_LIMIT_BYTES,
} from "~/lib/webhooks/registry";

import { verifyCsrf } from "../../security/csrf";
import { classifyRequest, isApiPath } from "./request-class";
import { canAccessPath, getDefaultAppPath } from "./route-policy";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const logger = createLogger("auth-request-guard");

export interface AuthRequestEvent {
  request: Request;
  locals: App.RequestEventLocals;
}

export type AuthRequestDecision =
  | { kind: "allow" }
  | { kind: "redirect_login" }
  | { kind: "redirect_onboarding" }
  | { kind: "redirect_home"; to: string }
  | { kind: "reject"; response: Response };

function reject(status: number, message: string): AuthRequestDecision {
  return { kind: "reject", response: new Response(message, { status }) };
}

export function enforceCsrfRequestPolicy(
  request: Request,
  targetOrigin: string,
): string | null {
  if (SAFE_METHODS.has(request.method)) {
    return null;
  }

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite) {
    return fetchSite === "same-origin"
      ? null
      : "CSRF validation failed (Fetch Metadata)";
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

function normalizeOrigin(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

// Machine requests use provider signatures instead of browser session and CSRF.
async function enforceWebhookRequest(
  request: Request,
  pathname: string,
): Promise<AuthRequestDecision> {
  const policy = getWebhookPolicy(pathname);
  if (!policy) return reject(403, "Forbidden");
  if (policy.unsignedMethods.includes(request.method)) return { kind: "allow" };

  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > WEBHOOK_BODY_LIMIT_BYTES) {
    return reject(413, "Payload Too Large");
  }

  // Read a clone so the route handler can still consume the original body.
  const rawBody = await request.clone().text();
  if (Buffer.byteLength(rawBody) > WEBHOOK_BODY_LIMIT_BYTES) {
    return reject(413, "Payload Too Large");
  }

  if (!policy.verify({ request, rawBody })) {
    return reject(403, "Forbidden");
  }

  return { kind: "allow" };
}

export async function enforceAuthRequest(
  event: AuthRequestEvent,
): Promise<AuthRequestDecision> {
  const url = new URL(event.request.url);
  const requestClass = classifyRequest(url.pathname);

  if (requestClass === "machine") {
    return enforceWebhookRequest(event.request, url.pathname);
  }

  const requestContext = event.locals.requestContext;
  const targetOrigin = requestContext.publicOrigin;

  if (!SAFE_METHODS.has(event.request.method)) {
    const csrfPolicyError = enforceCsrfRequestPolicy(
      event.request,
      targetOrigin,
    );
    if (csrfPolicyError) {
      logCsrfReject(event, csrfPolicyError, targetOrigin);
      return reject(403, csrfPolicyError);
    }

    const csrfToken = await requestContext.getRequestCsrfToken();
    const isCsrfValid = csrfToken
      ? await verifyCsrf(event.request, csrfToken)
      : false;
    if (!isCsrfValid) {
      return reject(403, "CSRF validation failed");
    }
  }

  if (requestClass === "public") return { kind: "allow" };

  const session = await requestContext.getAuthSession();
  if (!session) {
    // Browser navigations get a login redirect; API clients get a status code
    // they can act on instead of an opaque 302 to an HTML page.
    return isApiPath(url.pathname)
      ? reject(401, "Unauthorized")
      : { kind: "redirect_login" };
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
    requestId: event.locals.requestContext.observability.requestId,
    traceId: event.locals.requestContext.observability.traceId,
  });
}

import { getRequestEvent } from "solid-js/web";

import type { AuthSession } from "~/lib/auth/access/session-types";
import { getClientIp } from "~/lib/auth/password/client-ip";
import { getSessionCookie } from "~/lib/auth/session/cookies";
import { validateSessionToken } from "~/lib/auth/session/session-manager";
import type { ActionRequestContext } from "~/lib/observability/context";
import {
  deleteRequestSessionCookie,
  getRequestSessionCookie,
  getRequestSessionMaxAgeSeconds,
  setRequestSessionCookie,
} from "~/lib/security/request-session";
import { repos } from "~/server/shared/context";

import { getRequestPublicOrigin } from "./public-origin";

export type RequestAuthState = "anonymous" | "pre_auth" | "app";
const REQUEST_SESSION_ACTIVITY_UPDATE_MS = 5 * 60 * 1000;

export interface RequestContext {
  publicOrigin: string;
  clientIp: string;
  userAgent: string | null;
  observability: ActionRequestContext;
  authState: RequestAuthState;
  csrfToken: string | null;
  session: AuthSession | null;
}

export async function buildRequestContext(
  request: Request,
  observability: ActionRequestContext,
): Promise<RequestContext> {
  const [session, requestSession] = await Promise.all([
    loadRequestSession(),
    loadRequestSessionState(request),
  ]);

  return {
    publicOrigin: getRequestPublicOrigin(request),
    clientIp: getClientIp(request.headers),
    userAgent: request.headers.get("user-agent") ?? null,
    observability,
    authState: session?.sessionClass ?? "anonymous",
    csrfToken: requestSession?.csrfToken ?? null,
    session,
  };
}

export function getRequestContext(): RequestContext {
  const event = getRequestEvent();
  const context = event?.locals?.requestContext;
  if (!context) {
    throw new Error("Missing request context");
  }
  return context;
}

export function getRequestClientMetadata(): {
  ipAddress: string;
  userAgent: string | null;
} {
  const context = getRequestContext();
  return {
    ipAddress: context.clientIp,
    userAgent: context.userAgent,
  };
}

async function loadRequestSession(): Promise<AuthSession | null> {
  const token = getSessionCookie();
  if (!token) {
    return null;
  }

  const { session } = await validateSessionToken(token);
  return session;
}

async function loadRequestSessionState(
  request: Request,
): Promise<{ id: string; csrfToken: string } | null> {
  const existingId = getRequestSessionCookie();
  if (existingId) {
    const existing = await repos.requestSessions.findById(existingId);
    const now = Date.now();
    if (existing && existing.expires_at >= now) {
      if (now - existing.last_activity > REQUEST_SESSION_ACTIVITY_UPDATE_MS) {
        void repos.requestSessions
          .updateActivity(existing.id, now)
          .catch(() => {});
      }
      return { id: existing.id, csrfToken: existing.csrf_token };
    }
    deleteRequestSessionCookie();
  }

  if (!shouldBootstrapRequestSession(request)) {
    return null;
  }

  const now = Date.now();
  const id = crypto.randomUUID();
  const csrfToken = crypto.randomUUID().replace(/-/g, "");
  const expiresAt = now + getRequestSessionMaxAgeSeconds() * 1000;

  await repos.requestSessions.create({
    id,
    csrf_token: csrfToken,
    created_at: now,
    last_activity: now,
    expires_at: expiresAt,
  });
  setRequestSessionCookie(id);

  return { id, csrfToken };
}

function shouldBootstrapRequestSession(request: Request): boolean {
  if (request.method !== "GET") {
    return false;
  }

  const url = new URL(request.url);
  if (url.pathname.includes(".") || url.pathname.startsWith("/_")) {
    return false;
  }

  const accept = request.headers.get("accept") ?? "";
  return accept.includes("text/html");
}

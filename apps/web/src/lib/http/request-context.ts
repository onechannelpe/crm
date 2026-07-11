import { getRequestEvent } from "solid-js/web";

import type { AuthSession } from "~/lib/auth/access/session-types";
import { getClientIp } from "~/lib/auth/password/client-ip";
import { getSessionCookie } from "~/lib/auth/session/cookies";
import { securityConfig } from "~/lib/env";
import type { ActionRequestContext } from "~/lib/observability/context";
import {
  deleteRequestSessionCookie,
  getRequestSessionCookie,
  getRequestSessionMaxAgeSeconds,
  setRequestSessionCookie,
} from "~/lib/security/request-session";
import { getServerRuntime } from "~/server/platform/container";

import { resolvePublicOrigin } from "./public-origin";

const REQUEST_SESSION_ACTIVITY_UPDATE_MS = 5 * 60 * 1000;

export interface RequestContext {
  publicOrigin: string;
  clientIp: string;
  userAgent: string | null;
  observability: ActionRequestContext;
  csrfToken: string | null;
  getAuthSession(): Promise<AuthSession | null>;
  getRequestCsrfToken(): Promise<string | null>;
}

export async function buildRequestContext(
  request: Request,
  observability: ActionRequestContext,
): Promise<RequestContext> {
  const initialRequestSession = shouldBootstrapRequestSession(request)
    ? await loadRequestSessionState(request, true)
    : null;
  let authSessionPromise: Promise<AuthSession | null> | null = null;
  let requestSessionPromise: Promise<{
    id: string;
    csrfToken: string;
  } | null> | null = initialRequestSession
    ? Promise.resolve(initialRequestSession)
    : null;

  return {
    publicOrigin: resolvePublicOrigin(request, {
      trustedProxy: securityConfig().trustedProxy === "true",
    }),
    clientIp: getClientIp(request.headers),
    userAgent: request.headers.get("user-agent") ?? null,
    observability,
    csrfToken: initialRequestSession?.csrfToken ?? null,
    getAuthSession() {
      authSessionPromise ??= loadRequestSession();
      return authSessionPromise;
    },
    async getRequestCsrfToken() {
      requestSessionPromise ??= loadRequestSessionState(request, false);
      const requestSession = await requestSessionPromise;
      return requestSession?.csrfToken ?? null;
    },
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

  return getServerRuntime().auth.sessionService.resolve(token);
}

async function loadRequestSessionState(
  request: Request,
  createIfMissing: boolean,
): Promise<{ id: string; csrfToken: string } | null> {
  const existingId = getRequestSessionCookie();
  const requestSessions = getServerRuntime().security.requestSessions;
  if (existingId) {
    const existing = await requestSessions.findById(existingId);
    const now = new Date();
    if (existing && existing.expires_at >= now) {
      if (
        now.getTime() - existing.last_activity.getTime() >
        REQUEST_SESSION_ACTIVITY_UPDATE_MS
      ) {
        void requestSessions.updateActivity(existing.id, now).catch(() => {});
      }
      return { id: existing.id, csrfToken: existing.csrf_token };
    }
    deleteRequestSessionCookie();
  }

  if (!createIfMissing) {
    return null;
  }

  const now = new Date();
  const id = crypto.randomUUID();
  const csrfToken = crypto.randomUUID().replace(/-/g, "");
  const expiresAt = new Date(
    now.getTime() + getRequestSessionMaxAgeSeconds() * 1000,
  );

  await requestSessions.create({
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

import "server-only";
import { getRequestEvent } from "solid-js/web";

import type { AuthSession } from "~/domain/auth/access/session-types";
import { getClientIp } from "~/server/auth/password/client-ip";
import { getSessionCookie } from "~/server/auth/session/cookies";
import {
  deleteRequestSessionCookie,
  getRequestSessionCookie,
  getRequestSessionMaxAgeSeconds,
  setRequestSessionCookie,
} from "~/server/platform/security/request-session";

import { resolvePublicOrigin } from "./public-origin";

const REQUEST_SESSION_ACTIVITY_UPDATE_MS = 5 * 60 * 1000;

export type AuthPrincipal = AuthSession;

export type CsrfState =
  | { kind: "not_applicable" }
  | { kind: "missing" }
  | { kind: "available"; token: string };

export interface RequestContext {
  traceId: string;
  requestId: string;
  route: string;
  method: string;
  startedAt: number;
  nonce: string;
  csrf: CsrfState;
  principal: AuthPrincipal | null;
  publicOrigin: string;
  clientIp: string;
  userAgent: string | null;
}

interface RequestSessionStore {
  findById(id: string): Promise<{
    id: string;
    csrf_token: string;
    expires_at: Date;
    last_activity: Date;
  } | null>;
  updateActivity(id: string, now: Date): Promise<void>;
  create(input: {
    id: string;
    csrf_token: string;
    created_at: Date;
    last_activity: Date;
    expires_at: Date;
  }): Promise<void>;
}

export interface RequestContextDeps {
  resolveAuthSession(this: void, token: string): Promise<AuthSession | null>;
  requestSessions: RequestSessionStore;
}

export async function buildRequestContext(
  request: Request,
  identity: {
    traceId: string;
    requestId: string;
    startedAt: number;
    nonce: string;
  },
  deps: RequestContextDeps,
  trustedProxy: boolean,
): Promise<RequestContext> {
  const [principal, requestSession] = await Promise.all([
    loadRequestSession(deps.resolveAuthSession),
    loadRequestSessionState(
      request,
      shouldBootstrapRequestSession(request),
      deps.requestSessions,
    ),
  ]);
  const url = new URL(request.url);

  return {
    ...identity,
    route: url.pathname,
    method: request.method,
    csrf: requestSession
      ? { kind: "available", token: requestSession.csrfToken }
      : { kind: "missing" },
    principal,
    publicOrigin: resolvePublicOrigin(request, {
      trustedProxy,
    }),
    clientIp: getClientIp(request.headers, trustedProxy),
    userAgent: request.headers.get("user-agent") ?? null,
  };
}

export function buildAnonymousRequestContext(
  request: Request,
  identity: {
    traceId: string;
    requestId: string;
    startedAt: number;
    nonce: string;
  },
  trustedProxy: boolean,
): RequestContext {
  const url = new URL(request.url);

  return {
    ...identity,
    route: url.pathname,
    method: request.method,
    csrf: { kind: "not_applicable" },
    principal: null,
    publicOrigin: resolvePublicOrigin(request, { trustedProxy }),
    clientIp: getClientIp(request.headers, trustedProxy),
    userAgent: request.headers.get("user-agent") ?? null,
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

async function loadRequestSession(
  resolveAuthSession: RequestContextDeps["resolveAuthSession"],
): Promise<AuthSession | null> {
  const token = getSessionCookie();
  if (!token) {
    return null;
  }

  return resolveAuthSession(token);
}

async function loadRequestSessionState(
  request: Request,
  createIfMissing: boolean,
  requestSessions: RequestSessionStore,
): Promise<{ id: string; csrfToken: string } | null> {
  const existingId = getRequestSessionCookie();
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

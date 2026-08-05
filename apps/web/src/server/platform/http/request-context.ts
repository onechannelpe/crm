import { getRequestEvent } from "solid-js/web";

import type { AuthSession } from "~/domain/auth/access/session-types";
import { getClientIp } from "~/server/auth/password/client-ip";
import { getSessionCookie } from "~/server/auth/session/cookies";
import type { OperationContext } from "~/server/platform/operation/context";
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
  /**
   * The instant this request entered the system, read once by the identify
   * middleware. Everything the request goes on to do inherits it, including
   * server functions, so one request cannot stamp two different times.
   */
  startedAt: Date;
  /**
   * Monotonic origin for measuring how long the request took. Separate from
   * `startedAt` on purpose: a stamp must be wall clock so it can be written and
   * compared, an elapsed measurement must not be, or a clock adjustment
   * mid-request turns into a negative duration.
   */
  startedTicks: number;
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
  updateActivity(id: string, lastActivity: Date): Promise<void>;
  create(input: {
    id: string;
    csrf_token: string;
    created_at: Date;
    last_activity: Date;
    expires_at: Date;
  }): Promise<void>;
}

export interface RequestIdentity {
  traceId: string;
  requestId: string;
  startedAt: Date;
  startedTicks: number;
  nonce: string;
}

export interface RequestContextDeps {
  resolveAuthSession(
    this: void,
    token: string,
    operation: OperationContext,
  ): Promise<AuthSession | null>;
  requestSessions: RequestSessionStore;
}

export async function buildRequestContext(
  request: Request,
  identity: RequestIdentity,
  deps: RequestContextDeps,
  trustedProxy: boolean,
): Promise<RequestContext> {
  // Session expiry, activity refresh and request-session bootstrap all judge
  // against the instant the request arrived, not against a second reading taken
  // however long authentication happened to take.
  const requestedAt = identity.startedAt;
  const [principal, requestSession] = await Promise.all([
    loadRequestSession(deps.resolveAuthSession, { operationAt: requestedAt }),
    loadRequestSessionState(
      request,
      shouldBootstrapRequestSession(request),
      deps.requestSessions,
      requestedAt,
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
  identity: RequestIdentity,
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

/**
 * The current request as an operation. Route handlers and unauthenticated
 * server functions use this instead of `new Date()`, so everything one request
 * writes agrees on when it happened. Authenticated server functions get the
 * same instant through `AppContext`, which inherits it from here.
 */
export function getRequestOperation(): OperationContext {
  return { operationAt: getRequestContext().startedAt };
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
  operation: OperationContext,
): Promise<AuthSession | null> {
  const token = getSessionCookie();
  if (!token) {
    return null;
  }

  return resolveAuthSession(token, operation);
}

async function loadRequestSessionState(
  request: Request,
  createIfMissing: boolean,
  requestSessions: RequestSessionStore,
  requestedAt: Date,
): Promise<{ id: string; csrfToken: string } | null> {
  const existingId = getRequestSessionCookie();
  if (existingId) {
    const existing = await requestSessions.findById(existingId);
    if (existing && existing.expires_at >= requestedAt) {
      if (
        requestedAt.getTime() - existing.last_activity.getTime() >
        REQUEST_SESSION_ACTIVITY_UPDATE_MS
      ) {
        void requestSessions
          .updateActivity(existing.id, requestedAt)
          .catch(() => {});
      }
      return { id: existing.id, csrfToken: existing.csrf_token };
    }
    deleteRequestSessionCookie();
  }

  if (!createIfMissing) {
    return null;
  }

  const id = crypto.randomUUID();
  const csrfToken = crypto.randomUUID().replace(/-/g, "");
  const expiresAt = new Date(
    requestedAt.getTime() + getRequestSessionMaxAgeSeconds() * 1000,
  );

  await requestSessions.create({
    id,
    csrf_token: csrfToken,
    created_at: requestedAt,
    last_activity: requestedAt,
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

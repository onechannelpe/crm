import { getRequestEvent } from "solid-js/web";

import type { AuthSession } from "~/lib/auth/access/session-types";
import { getClientIp } from "~/lib/auth/password/client-ip";
import { getSessionCookie } from "~/lib/auth/session/cookies";
import { validateSessionToken } from "~/lib/auth/session/session-manager";
import type { ActionRequestContext } from "~/lib/observability/context";

import { getRequestPublicOrigin } from "./public-origin";

export type RequestAuthState = "anonymous" | "pre_auth" | "app";

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
  const session = await loadRequestSession();

  return {
    publicOrigin: getRequestPublicOrigin(request),
    clientIp: getClientIp(request.headers),
    userAgent: request.headers.get("user-agent") ?? null,
    observability,
    authState: session?.sessionClass ?? "anonymous",
    csrfToken: session?.csrfToken ?? null,
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

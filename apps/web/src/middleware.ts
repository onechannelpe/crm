import "server-only";
import { redirect } from "@solidjs/router";
import { createMiddleware } from "@solidjs/start/middleware";
import type { FetchEvent } from "@solidjs/start/server";
import { getRequestEvent } from "solid-js/web";

import { middlewareConfig } from "./server/platform/config/middleware-config";
import { enforceAuthRequest } from "./server/platform/http/request-auth";
import {
  buildAnonymousRequestContext,
  buildRequestContext,
} from "./server/platform/http/request-context";
import { generateRequestId, generateTraceId } from "./shared/observability/ids";
import { isProduction } from "./shared/observability/runtime-env";

type StartMiddleware = Extract<
  Parameters<typeof createMiddleware>[0],
  readonly unknown[]
>[number];

function fetchEvent(): FetchEvent {
  const event = getRequestEvent();
  if (!event) {
    throw new Error("Missing SolidStart request event");
  }
  return event;
}

const identifyRequest: StartMiddleware = async (event, next) => {
  const requestEvent = fetchEvent();
  const nonce = crypto.randomUUID().replaceAll("-", "");
  const identity = {
    traceId: generateTraceId(),
    requestId: generateRequestId(),
    startedAt: Date.now(),
    nonce,
  };
  const { trustedProxy } = middlewareConfig();

  requestEvent.locals = {
    ...requestEvent.locals,
    requestContext: buildAnonymousRequestContext(
      event.req,
      identity,
      trustedProxy,
    ),
    nonce,
  };

  return next();
};

const applySecurityResponseState: StartMiddleware = async (event, next) => {
  const requestEvent = fetchEvent();
  const nonce = requestEvent.locals.requestContext.nonce;

  const { sentryIngestHost } = middlewareConfig();
  const sentryConnectSrc = sentryIngestHost
    ? ` https://${sentryIngestHost}`
    : "";
  const csp = `
    default-src 'self';
    script-src 'nonce-${nonce}' 'strict-dynamic';
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: blob:;
    font-src 'self' data:;
    connect-src 'self'${sentryConnectSrc};
    object-src 'none';
    frame-ancestors 'none';
    form-action 'self';
    base-uri 'none';
  `.replace(/\s+/g, " ");

  event.res.headers.set("Content-Security-Policy", csp);
  event.res.headers.set("X-Frame-Options", "DENY");
  event.res.headers.set("X-Content-Type-Options", "nosniff");
  event.res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  event.res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  );
  if (isProduction()) {
    event.res.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains",
    );
  }
  return next();
};

const resolveSession: StartMiddleware = async (_event, next) => {
  const event = fetchEvent();
  const current = event.locals.requestContext;
  if (isPrerenderRoute(current.route)) {
    return next();
  }

  const { createRequestContextDependencies } =
    await import("./server/auth/ui/resolve-request-context");
  const { trustedProxy } = middlewareConfig();

  event.locals.requestContext = await buildRequestContext(
    event.request,
    {
      traceId: current.traceId,
      requestId: current.requestId,
      startedAt: current.startedAt,
      nonce: current.nonce,
    },
    createRequestContextDependencies(),
    trustedProxy,
  );

  return next();
};

const enforceNavigationPolicy: StartMiddleware = async (_event, next) => {
  const event = fetchEvent();
  const decision = await enforceAuthRequest(event);

  if (decision.kind === "allow") {
    return next();
  }
  if (decision.kind === "reject") {
    return decision.response;
  }
  if (decision.kind === "redirect_login") {
    return redirect("/login");
  }
  if (decision.kind === "redirect_onboarding") {
    return redirect("/onboarding");
  }
  if (decision.kind === "redirect_recovery_setup") {
    return redirect("/recovery-codes");
  }

  return redirect(decision.to);
};

const recordRequestTiming: StartMiddleware = async (event, next) => {
  const response = await next();
  const context = fetchEvent().locals.requestContext;
  const duration = Date.now() - context.startedAt;
  event.res.headers.set("Server-Timing", `app;dur=${duration}`);
  return response;
};

function isPrerenderRoute(pathname: string): boolean {
  return (
    pathname === "/legal/privacy" ||
    pathname === "/legal/terms" ||
    pathname === "/updates" ||
    pathname === "/docs" ||
    pathname.startsWith("/docs/")
  );
}

export default createMiddleware([
  identifyRequest,
  applySecurityResponseState,
  resolveSession,
  enforceNavigationPolicy,
  recordRequestTiming,
]);

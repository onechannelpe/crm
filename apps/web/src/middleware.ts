import "server-only";
import { redirect } from "@solidjs/router";
import { createMiddleware } from "@solidjs/start/middleware";
import type { FetchEvent } from "@solidjs/start/server";
import { getRequestEvent } from "solid-js/web";

import { sentryConfig } from "./server/platform/config/env";
import { enforceAuthRequest } from "./server/platform/http/request-auth";
import { buildRequestContext } from "./server/platform/http/request-context";
import { requestContextDeps } from "./server/platform/http/request-context-deps";
import type { ActionRequestContext } from "./server/platform/observability/context";
import { generateRequestId, generateTraceId } from "./shared/observability/ids";

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
  const url = event.url;

  requestEvent.locals = {
    ...requestEvent.locals,
    requestContext: undefined as never,
    nonce: "",
  };
  event.context.requestObservability = {
    traceId: generateTraceId(),
    requestId: generateRequestId(),
    routePath: url.pathname,
    httpMethod: event.req.method,
    requestStartedAt: Date.now(),
  };

  return next();
};

const applySecurityResponseState: StartMiddleware = async (event, next) => {
  const requestEvent = fetchEvent();
  const nonce = crypto.randomUUID().replaceAll("-", "");
  requestEvent.locals.nonce = nonce;

  const { sentryIngestHost } = sentryConfig();
  const sentryConnectSrc = sentryIngestHost
    ? ` https://${sentryIngestHost}`
    : "";
  const csp = `
    default-src 'self';
    script-src 'nonce-${nonce}' 'strict-dynamic';
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: blob: https:;
    font-src 'self' data:;
    connect-src 'self'${sentryConnectSrc};
    object-src 'none';
    frame-ancestors 'none';
    form-action 'self';
    base-uri 'none';
  `.replace(/\s+/g, " ");

  event.res.headers.set("Content-Security-Policy", csp);
  return next();
};

const resolveSession: StartMiddleware = async (_event, next) => {
  const event = fetchEvent();
  const observability = event.nativeEvent.context
    .requestObservability as ActionRequestContext;

  event.locals.requestContext = await buildRequestContext(
    event.request,
    observability,
    requestContextDeps,
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
  const duration = Date.now() - context.observability.requestStartedAt;
  event.res.headers.set("Server-Timing", `app;dur=${duration}`);
  return response;
};

export default createMiddleware([
  identifyRequest,
  applySecurityResponseState,
  resolveSession,
  enforceNavigationPolicy,
  recordRequestTiming,
]);

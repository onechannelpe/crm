import { redirect } from "@solidjs/router";
import { createMiddleware } from "@solidjs/start/middleware";

import { enforceAuthRequest } from "~/lib/auth/access/request-auth";
import { serverEnv } from "~/lib/env";
import { buildRequestContext } from "~/lib/http/request-context";
import { generateRequestId, generateTraceId } from "~/lib/observability/ids";

const { sentryIngestHost } = serverEnv().sentry;

export default createMiddleware({
  onRequest: async (event) => {
    const url = new URL(event.request.url);
    event.locals = event.locals ?? {};

    // Generate nonce for CSP (Defense-in-depth against XSS)
    const nonce = crypto.randomUUID().replace(/-/g, "");
    event.locals.nonce = nonce;

    const observability = {
      traceId: generateTraceId(),
      requestId: generateRequestId(),
      routePath: url.pathname,
      httpMethod: event.request.method,
      requestStartedAt: Date.now(),
    };
    event.locals.requestContext = await buildRequestContext(
      event.request,
      observability,
    );

    // Nonce-based strict CSP per https://docs.solidjs.com/solid-start/guides/security
    // 'unsafe-eval' is required for SolidStart SSR hydration.
    // 'unsafe-inline' in style-src is required — first-party style={{}} props compile to inline styles.
    const sentryConnectSrc = sentryIngestHost
      ? ` https://${sentryIngestHost}`
      : "";
    const csp = `
      default-src 'self';
      script-src 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval';
      style-src 'self' 'unsafe-inline';
      img-src 'self' data: https:;
      font-src 'self' data:;
      connect-src 'self'${sentryConnectSrc};
      object-src 'none';
      frame-ancestors 'none';
      form-action 'self';
      base-uri 'none';
    `.replace(/\s+/g, " ");

    event.response.headers.set("Content-Security-Policy", csp);

    const decision = await enforceAuthRequest(event);

    if (decision.kind === "reject") {
      decision.response.headers.set("Content-Security-Policy", csp);
      return decision.response;
    }
    if (decision.kind === "redirect_login") {
      const response = redirect("/login");
      response.headers.set("Content-Security-Policy", csp);
      return response;
    }
    if (decision.kind === "redirect_onboarding") {
      const response = redirect("/onboarding");
      response.headers.set("Content-Security-Policy", csp);
      return response;
    }
    if (decision.kind === "redirect_home") {
      const response = redirect(decision.to);
      response.headers.set("Content-Security-Policy", csp);
      return response;
    }
    return undefined;
  },
});

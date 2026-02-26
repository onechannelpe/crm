import { redirect } from "@solidjs/router";
import { createMiddleware } from "@solidjs/start/middleware";

import { enforceAuthRequest } from "~/lib/auth/access/request-auth";
import { generateRequestId, generateTraceId } from "~/lib/observability/ids";
import {
  generateCsrfToken,
  getCsrfFromCookie,
  setCsrfCookie,
} from "~/lib/security/csrf";

export default createMiddleware({
  onRequest: async (event) => {
    const url = new URL(event.request.url);
    event.locals = event.locals ?? {};

    // Generate nonce for CSP (Defense-in-depth against XSS)
    const nonce = crypto.randomUUID().replace(/-/g, "");
    event.locals.nonce = nonce;

    event.locals.observability = {
      traceId: generateTraceId(),
      requestId: generateRequestId(),
      routePath: url.pathname,
      httpMethod: event.request.method,
      requestStartedAt: Date.now(),
    };

    if (event.request.method === "GET") {
      const csrfToken = getCsrfFromCookie();
      if (!csrfToken) {
        setCsrfCookie(await generateCsrfToken());
      }
    }

    const decision = await enforceAuthRequest(event);

    // Set Strict Content Security Policy
    // We allow 'unsafe-inline' for styles as many UI libraries depend on it,
    // but we use nonces for scripts to neutralize XSS.
    const csp = `
      default-src 'self';
      script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-inline' https:;
      style-src 'self' 'unsafe-inline';
      img-src 'self' data: https:;
      font-src 'self' data:;
      connect-src 'self';
      frame-ancestors 'none';
      form-action 'self';
      base-uri 'none';
    `.replace(/\s+/g, " ");

    event.response.headers.set("Content-Security-Policy", csp);

    if (decision.kind === "reject") return decision.response;
    if (decision.kind === "redirect_login") return redirect("/login");
    if (decision.kind === "redirect_onboarding") return redirect("/onboarding");
    if (decision.kind === "redirect_home") return redirect(decision.to);
  },
});

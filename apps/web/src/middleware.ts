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

    const csrfToken = getCsrfFromCookie();
    if (!csrfToken) {
      setCsrfCookie(await generateCsrfToken());
    }

    // Nonce-based strict CSP per https://docs.solidjs.com/solid-start/guides/security
    // 'unsafe-eval' is required for SolidStart SSR hydration.
    // 'unsafe-inline' in style-src is required — first-party style={{}} props compile to inline styles.
    const csp = `
      default-src 'self';
      script-src 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval';
      style-src 'self' 'unsafe-inline';
      img-src 'self' data: https:;
      font-src 'self' data:;
      object-src 'none';
      frame-ancestors 'none';
      form-action 'self';
      base-uri 'none';
    `.replace(/\s+/g, " ");

    event.response.headers.set("Content-Security-Policy", csp);

    const decision = await enforceAuthRequest(event);

    if (decision.kind === "reject") return decision.response;
    if (decision.kind === "redirect_login") return redirect("/login");
    if (decision.kind === "redirect_onboarding") return redirect("/onboarding");
    if (decision.kind === "redirect_home") return redirect(decision.to);
  },
});

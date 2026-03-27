import type { RequestContext } from "~/lib/http/request-context";

declare namespace App {
  interface RequestObservabilityContext {
    traceId: string;
    requestId: string;
    routePath: string | null;
    httpMethod: string | null;
    requestStartedAt: number;
  }

  interface RequestEventLocals {
    requestContext?: RequestContext;
    nonce: string;
  }
}
